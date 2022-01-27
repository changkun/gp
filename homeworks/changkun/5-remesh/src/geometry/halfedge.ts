// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import {Vertex, Edge, Face, Halfedge} from './primitive';
import {Vector} from '../linalg/vec';
import {EdgeQueue} from './pq';

export enum WeightType {
  Uniform = 'Uniform',
  Cotan = 'Cotan',
}

export class HalfedgeMesh {
  color: Vector;
  wireframe: Vector;

  // The following four fields are the key fields to represent half-edge based
  // meshes.
  verts: (Vertex | null)[]; // for update
  edges: (Edge | null)[]; // a list of edges
  faces: (Face | null)[]; // a list of faces
  halfedges: (Halfedge | null)[]; // a list of halfedges
  boundaries: Face[]; // an array of boundary loops

  /**
   * constructor constructs the halfedge-based mesh representation.
   *
   * @param {string} data is a text string from an .obj file
   */
  constructor(data: string) {
    this.color = new Vector(0, 128, 255, 1);
    this.wireframe = new Vector(125, 125, 125, 1);

    // load .obj file
    const indices: number[] = [];
    const positions: Vector[] = [];
    const lines = data.split('\n');
    for (let line of lines) {
      line = line.trim();
      const tokens = line.split(' ');
      switch (tokens[0].trim()) {
        case 'v':
          positions.push(
            new Vector(
              parseFloat(tokens[1]),
              parseFloat(tokens[2]),
              parseFloat(tokens[3]),
              1
            )
          );
          break;
        case 'f':
          // only load indices of vertices
          for (let i = 1; i < tokens.length; i++) {
            const vv = tokens[i].split('/');
            indices.push(parseInt(vv[0]) - 1);
          }
          break;
      }
    }

    this.verts = [];
    this.edges = [];
    this.faces = [];
    this.halfedges = [];
    this.boundaries = [];

    const t0 = performance.now();
    this.buildMesh(indices, positions);
    const t1 = performance.now();
    console.log(`Halfedge mesh build time: ${t1 - t0} ms`);
  }

  /**
   * buildMesh builds half-edge based connectivity for the given vertex index buffer
   * and vertex position buffer.
   *
   * @param indices is the vertex index buffer that contains all vertex indices.
   * @param positions is the vertex buffer that contains all vertex positions.
   */
  buildMesh(indices: number[], positions: Vector[]) {
    // We assume the input mesh is a manifold mesh.
    const edges = new Map();
    for (let i = 0; i < indices.length; i += 3) {
      for (let j = 0; j < 3; j++) {
        // check a face
        let a = indices[i + j];
        let b = indices[i + ((j + 1) % 3)];

        if (a > b) {
          const tmp = b;
          b = a;
          a = tmp;
        }

        // store the edge if not exists
        const e = `${a}-${b}`;
        if (!edges.has(e)) {
          edges.set(e, [a, b]);
        }
      }
    }

    this.verts = new Array(positions.length);
    this.edges = new Array(edges.size);
    this.faces = new Array(indices.length / 3);
    this.halfedges = new Array(edges.size * 2);

    const idx2vert = new Map();
    for (let i = 0; i < positions.length; i++) {
      const v = new Vertex(positions[i]);
      v.idx = i;
      this.verts[i] = v;
      idx2vert.set(i, v);
    }

    let eidx = 0;
    const existedHe = new Map();
    const hasTwin = new Map();

    // construct halfedges, edges
    let edgeIdx = 0;
    let faceIdx = 0;
    let heIdx = 0;
    for (let i = 0; i < indices.length; i += 3) {
      // construct face
      const f = new Face();
      f.idx = faceIdx++;
      this.faces[i / 3] = f;

      // construct halfedges of the face
      for (let j = 0; j < 3; j++) {
        const he = new Halfedge();
        he.idx = heIdx++;
        this.halfedges[i + j] = he;
      }

      // construct connectivities of the new halfedges
      for (let j = 0; j < 3; j++) {
        // halfedge from vertex a to vertex b
        let a = indices[i + j];
        let b = indices[i + ((j + 1) % 3)];

        // halfedge properties
        const he = this.halfedges[i + j];
        he!.next = <Halfedge>this.halfedges[i + ((j + 1) % 3)];
        he!.prev = <Halfedge>this.halfedges[i + ((j + 2) % 3)];
        he!.onBoundary = false;
        hasTwin.set(he, false);

        const v = idx2vert.get(a);
        he!.vert = v;
        v.halfedge = he;

        he!.face = f;
        f.halfedge = <Halfedge>he;

        // swap if index a > b, for twin checking
        if (a > b) {
          const tmp = b;
          b = a;
          a = tmp;
        }
        const ek = `${a}-${b}`;
        if (existedHe.has(ek)) {
          // if a halfedge has been created before, then
          // it is the twin halfedge of the current halfedge
          const twin = existedHe.get(ek);
          he!.twin = twin;
          twin.twin = he;
          he!.edge = twin.edge;

          hasTwin.set(he, true);
          hasTwin.set(twin, true);
        } else {
          // new halfedge
          const e = new Edge();
          e.idx = edgeIdx++;
          this.edges[eidx] = e;
          eidx++;
          he!.edge = e;
          e.halfedge = <Halfedge>he;

          existedHe.set(ek, he);
        }

        // FIXME: non-manifold edge count checking
      }
    }

    // create boundary halfedges and hidden faces for the boundary
    let hidx = indices.length;
    for (let i = 0; i < indices.length; i++) {
      const he = this.halfedges[i];
      if (hasTwin.get(he)) {
        continue;
      }

      // handle halfedge that has no twin
      const f = new Face(); // hidden face
      this.boundaries.push(f);

      const bcycle = []; // boundary cycle
      let current = he;
      do {
        const bhe = new Halfedge(); // boundary halfedge
        bhe.idx = heIdx++;
        this.halfedges[hidx] = bhe;
        hidx++;
        bcycle.push(bhe);

        // grab the next halfedge along the boundary that does not
        // have a twin halfedge
        let next = <Halfedge>current!.next;
        while (hasTwin.get(next)) {
          next = <Halfedge>next.twin!.next;
        }

        // set the current halfedge's attributes
        bhe.vert = next.vert;
        bhe.edge = current!.edge;
        bhe.onBoundary = true;

        // point the new halfedge and face to each other
        bhe.face = f;
        f.halfedge = bhe;

        // point the new halfedge and twin to each other
        bhe.twin = <Halfedge>current;
        current!.twin = bhe;

        current = next;
      } while (current !== he);

      // link the cycle of boundary halfedges together
      const n = bcycle.length;
      for (let j = 0; j < n; j++) {
        bcycle[j].next = bcycle[(j + n - 1) % n];
        bcycle[j].prev = bcycle[(j + 1) % n];
        hasTwin.set(bcycle[j], true);
        hasTwin.set(bcycle[j].twin, true);
      }
    }
    this.resetIndices();
  }

  simplify(reduceRatio: number) {
    // Implement QEM simplification algorithm
    //   - Boundary edges maybe skipped without handling
    //   - Use the provided EdgeQueue to maintain a priority queue
    //   - If necessary, use the provided resetIndices
    //   - Carefully maintain the edge collapse as it may easily be wrong
    //     It is recommended to first start with a simply cube object.
    //   - To mark remove an object, one can assign null to the array, then
    //     calling resetIndices will filter out all null elements. (Only call
    //     at the end of each simplification round)
    //
    // Additional Task:
    //    - Be able to handle meshes with boundary (need preserve the boundary)

    if (this.boundaries.length !== 0) {
      // KNOWN ISSUES: this implementation does not fully work with
      // meshes that may contain boundaries, or have too few faces.
      // This is caused because of the following reasons:
      // 1. edge collapse is implemented via reconstructing everything
      // around that edge, it can miss invalid edge collapse operation
      // (see slides).
      // 2. if the mesh contains too few faces, the process of finding
      // opposite neighbor edges of the connecting vertices of the edge
      // can be problematic.
      // To fix this issue, we need to implement edge collapse in a
      // different way (and possibly more efficient):
      // 1. move a vertex, say v1, to the target position
      // 2. detect if edge collapse from v2 to v1 is still valid
      //    (detect flip faces). If not, skip this edge collapse
      //    operation and restore the position of v1.
      // 3. conduct edge collapse from v2 to v1.
      throw 'do not work on mesh with boundaries';
    }

    // build edge error priority queue
    const pq = new EdgeQueue((e1, e2) => {
      return e1.error() < e2.error();
    });
    for (let i = 0; i < this.edges.length; i++) {
      pq.push(this.edges[i]!);
    }

    let reducedFaces = Math.floor(this.faces.length * reduceRatio);

    // Before
    //
    //       /\
    //  \   /  \   /
    //   \ /    \ /
    // -- v1 -- v2 --
    //   / \    / \
    //  /   \  /   \
    //       \/
    //
    // After
    //    |
    //  \ | /
    //   \|/
    // -- v --
    //   /|\
    //  / | \
    //    |

    for (; reducedFaces > 0; ) {
      const e = pq.pop();
      if (e.removed) {
        continue;
      }

      // Two vertex for edge collapse
      const v1 = e.halfedge!.vert!;
      const v2 = e.halfedge!.twin!.vert!;

      // Clear them from the vertex indices
      this.verts[v1.idx] = null;
      this.verts[v2.idx] = null;

      // Clear everything connected with v1 and v2
      v1.halfedges(h => {
        h.edge!.removed = true;
        this.edges[h.edge!.idx] = null;
        this.faces[h.face!.idx] = null;
        this.halfedges[h.idx] = null;
        this.halfedges[h.twin!.idx] = null;
      });
      v2.halfedges(h => {
        h.edge!.removed = true;
        this.edges[h.edge!.idx] = null;
        this.faces[h.face!.idx] = null;
        this.halfedges[h.idx] = null;
        this.halfedges[h.twin!.idx] = null;
      });

      // Construct new vertex based on the best vertex calculation.
      const v = new Vertex(e.bestVertex());
      v.idx = this.verts.length;
      this.verts.push(v);

      // Find the 1-ring of v1-v2, in counterclock-wise order.
      let startHalfedge = null;
      if (v1.halfedge!.twin!.vert !== v2) {
        startHalfedge = v1.halfedge;
      } else {
        startHalfedge = v1.halfedge!.twin!.next;
      }
      let start = null;
      if (startHalfedge!.next!.twin!.vert !== v2) {
        start = startHalfedge!.next;
      } else {
        start = startHalfedge!.next!.twin!.next;
      }
      const oppositeEdges = [start];
      for (let current = start; ; ) {
        if (
          current!.next!.twin!.next!.twin!.vert!.idx === v2.idx ||
          current!.next!.twin!.next!.twin!.vert!.idx === v1.idx
        ) {
          current = current!.next!.twin!.next!.twin!.next;
        } else {
          current = current!.next!.twin!.next;
        }
        if (current?.idx === start?.idx) {
          break;
        }
        oppositeEdges.push(current);
      }

      // It is important to maintain the order of the new
      // edges. The implementation below depends on the order
      // to be conterclock-wise.
      const newEdges: Edge[] = [];
      const oppositeHalfdges: Halfedge[] = [];
      oppositeEdges.forEach(h => {
        this.faces[h!.face!.idx] = null;

        const e = new Edge();
        e.idx = this.edges.length;
        this.edges.push(e);

        e.halfedge = new Halfedge();
        e.halfedge.idx = this.halfedges.length;
        e.halfedge.edge = e;
        this.halfedges.push(e.halfedge);

        e.halfedge.twin = new Halfedge();
        e.halfedge.twin.idx = this.halfedges.length;
        e.halfedge.twin.edge = e;
        e.halfedge.twin.twin = e.halfedge;
        this.halfedges.push(e.halfedge.twin);

        newEdges.push(e);
        oppositeHalfdges.push(h!);
      });

      for (let i = 0; i < oppositeHalfdges.length; i++) {
        // build new connectivity between e1, e2, and h.
        const e1 = newEdges[i];
        const e2 = newEdges[(i + 1) % oppositeHalfdges.length];
        const h = oppositeHalfdges[i];

        // 1. connect opposite halfedge to new edges
        v.halfedge = e1.halfedge;
        e1.halfedge!.next = h;
        e1.halfedge!.prev = e2.halfedge!.twin;
        e2.halfedge!.twin!.next = e1.halfedge;
        e2.halfedge!.twin!.prev = h;
        h.prev = e1.halfedge;
        h.next = e2.halfedge!.twin;

        // 2. constrct new face
        const f = new Face();
        f.halfedge = e1.halfedge;
        f.idx = this.faces.length;
        this.faces.push(f);

        // 3. associate all edges to the new face
        e1.halfedge!.face = f;
        h.face = f;
        e2.halfedge!.twin!.face = f;

        // 4. associate vertex to new half
        e1.halfedge!.vert = v;
        e1.halfedge!.twin!.vert = h.vert;
        e2.halfedge!.vert = v;
        e2.halfedge!.twin!.vert = h.twin!.vert;

        // 5. this is necessary to prevent a vertex
        // reference to a removed halfedge
        h.vert!.halfedge = h;
      }

      // push new edges into priority queue, the push
      // will automatically adjust the order of elements.
      pq.push(...newEdges);
      reducedFaces -= 2;
    }
    this.resetIndices();
  }
  /**
   * resetIndices clears all null elements and reset the indices
   */
  resetIndices() {
    // clear null elements
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notnull = (e: any) => (e === null ? false : true);
    this.verts = this.verts.filter(notnull);
    this.edges = this.edges.filter(notnull);
    this.faces = this.faces.filter(notnull);
    this.halfedges = this.halfedges.filter(notnull);
    this.boundaries = this.boundaries.filter(notnull);

    // reset indices
    let index = 0;
    this.verts.forEach(v => {
      v!.idx = index++;
    });
    index = 0;
    this.edges.forEach(e => {
      e!.idx = index++;
    });
    index = 0;
    this.faces.forEach(f => {
      f!.idx = index++;
    });
    index = 0;
    this.halfedges.forEach(h => {
      h!.idx = index++;
    });
    index = 0;
    this.boundaries.forEach(b => {
      b.idx = index++;
    });
  }
}
