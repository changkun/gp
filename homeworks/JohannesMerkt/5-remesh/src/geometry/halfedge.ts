// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import {Vertex, Edge, Face, Halfedge} from './primitive';
import {Vector} from '../linalg/vec';

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

  simplify(reduceRatio: number) {
    if (!this.edges) {
      throw new Error('Edges have not been initialized');
    }
    const edgeQueue: number[] = new Array(this.edges.length);
    const edgeErrorMap = new Map<number, number>();

    this.edges.forEach((edge, index) => {
      if (edge) {
        edgeQueue[index] = edge.idx;
        edgeErrorMap.set(edge.idx, edge.error());
      } else {
        throw new Error('Edge was null');
      }
    });
    edgeQueue.sort((a, b) => edgeErrorMap.get(b)! - edgeErrorMap.get(a)!);

    const faceCountGoal = Math.floor(this.faces.length * (1 - reduceRatio));
    let currentFaceCount = this.faces.length;
    while (faceCountGoal < currentFaceCount && edgeQueue.length > 0) {
      const edgeId = edgeQueue.pop()!;
      const edge = this.edges[edgeId];
      if (!edge) {
        continue;
      }
      if (edge.removed) {
        continue;
      }
      if (edge.onBoundary()) {
        continue;
      }
      const h12 = edge.halfedge!;
      const f1 = h12.face!;
      const e12 = edge;
      const v1 = h12.vert!;
      const h21 = h12.twin!;
      const f2 = h21.face!;
      const v2 = h21.vert!;
      const h24 = h12.next!;
      const e24 = h24.edge!;
      const h42 = h24.twin!;
      const h41 = h24.next!;
      const e14 = h41.edge!;
      const h14 = h41.twin!;
      const v4 = h41.vert!;
      const h13 = h21.next!;
      const e13 = h13.edge!;
      const h31 = h13.twin!;
      const h32 = h13.next!;
      const v3 = h32.vert!;
      const e23 = h32.edge!;
      const h23 = h32.twin!;
      // validation
      if (
        v1 === v2 ||
        v1 === v3 ||
        v1 === v4 ||
        v2 === v3 ||
        v2 === v4 ||
        v3 === v4
      ) {
        console.log(
          'v1 ' + v1.idx + ' v2 ' + v2.idx + ' v3 ' + v3.idx + ' v4 ' + v4.idx
        );
        console.log('Verts are being used twice');
        continue;
        // throw new Error('Verts are being used twice');
      }
      if (
        e12.onBoundary() ||
        e13.onBoundary() ||
        e14.onBoundary() ||
        e23.onBoundary() ||
        e24.onBoundary()
      ) {
        continue;
      }

      const v2Halfedges = new Map<number, Halfedge>();
      v2.halfedges(halfedge => {
        v2Halfedges.set(halfedge.idx, halfedge);
      });

      // create a map of all edges that need to have their error updated after modification
      const edges2Update = new Map<number, Edge>();
      v1.halfedges(halfedge => {
        if (halfedge.edge) {
          edges2Update.set(halfedge.edge.idx, halfedge.edge);
          halfedge.twin!.vert!.halfedges(he => {
            if (he.edge) {
              edges2Update.set(he.edge.idx, he.edge);
            }
          });
        }
      });
      v2.halfedges(halfedge => {
        if (halfedge.edge) {
          edges2Update.set(halfedge.edge.idx, halfedge.edge);
          halfedge.twin!.vert!.halfedges(he => {
            if (he.edge) {
              edges2Update.set(he.edge.idx, he.edge);
            }
          });
        }
      });
      v3.halfedges(halfedge => {
        if (halfedge.edge) {
          edges2Update.set(halfedge.edge.idx, halfedge.edge);
          halfedge.twin!.vert!.halfedges(he => {
            if (he.edge) {
              edges2Update.set(he.edge.idx, he.edge);
            }
          });
        }
      });
      v4.halfedges(halfedge => {
        if (halfedge.edge) {
          edges2Update.set(halfedge.edge.idx, halfedge.edge);
          halfedge.twin!.vert!.halfedges(he => {
            if (he.edge) {
              edges2Update.set(he.edge.idx, he.edge);
            }
          });
        }
      });

      // make sure reused elements reference elements that are not deleted
      e13.halfedge = h31;
      e14.halfedge = h14;
      v1.halfedge = h14;
      v3.halfedge = h31;
      v4.halfedge = h42;
      h23.vert = v1;
      v2Halfedges.forEach(halfedge => {
        halfedge.vert = v1;
      });
      // update edges
      h42.edge = e14;
      h23.edge = e13;
      // update twin relationship
      h14.twin = h42;
      h42.twin = h14;
      h31.twin = h23;
      h23.twin = h31;
      // update v1 vert position
      v1.pos = e12.bestVertex();
      // remove edge, face and halfedges that are collapsed
      e12.removed = true;
      e24.removed = true;
      e23.removed = true;
      this.edges[e12.idx] = null;
      this.edges[e24.idx] = null;
      this.edges[e23.idx] = null;
      this.verts[v2.idx] = null;
      f1.removed = true;
      f2.removed = true;
      this.faces[f1.idx] = null;
      this.faces[f2.idx] = null;
      this.halfedges[h12.idx] = null;
      this.halfedges[h21.idx] = null;
      this.halfedges[h24.idx] = null;
      this.halfedges[h41.idx] = null;
      this.halfedges[h32.idx] = null;
      this.halfedges[h13.idx] = null;

      currentFaceCount = currentFaceCount - 2;
      // update error value of edges
      edges2Update.forEach(edge => {
        if (!edge.removed) {
          edgeErrorMap.set(edge.idx, edge.error());
        }
      });
      edgeQueue.sort((a, b) => edgeErrorMap.get(b)! - edgeErrorMap.get(a)!);
    }
    this.resetIndices();
  }
}
