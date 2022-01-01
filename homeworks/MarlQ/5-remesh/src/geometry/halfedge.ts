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

  

  // Deletes the face
  deleteFace(face: Face, v_remove: Vertex, v_keep: Vertex) {
    let halfedges = [face.halfedge!, face.halfedge!.next!, face.halfedge!.next!.next!];
    let verts = [face.halfedge!.vert!, face.halfedge!.next!.vert!, face.halfedge!.next!.next!.vert!];
    
    let overlap = verts.filter(v => v.idx !== v_remove.idx && v.idx !== v_keep.idx)[0];

    const ne : Halfedge[] = [];
    overlap.halfedges(he => {
      ne.push(he);
    })

    /* const ne = [overlap.halfedge];
    for(let e = overlap.halfedge!.twin!.next!; e != overlap.halfedge; e = e!.twin!.next!) {
      ne.push(e);
    } */

    const he_vert_to_vert_keep = ne.find(he => he!.next!.vert!.idx === v_keep.idx)!;
    const he_vert_remove_to_vert = ne.find(he => he!.next!.vert!.idx === v_remove.idx)!.twin!;

    this.edges[he_vert_to_vert_keep!.edge!.idx]!.removed = true;
    this.edges[he_vert_to_vert_keep!.edge!.idx] = null;

    halfedges.forEach(he => {
      //this.halfedges[he.idx]!.removed = true;
      this.halfedges[he.idx] = null;
      
    })
    this.faces[face!.idx]!.removed = true;
    this.faces[face!.idx] = null;

    if(he_vert_to_vert_keep.face!.idx === face.idx) { // he_vert_to_vert_keep belongs to the face
      /* v_keep.halfedge = he_vert_to_vert_keep.twin; */ 
      overlap.halfedge = he_vert_remove_to_vert.twin; 
      

      he_vert_remove_to_vert.twin!.twin = he_vert_to_vert_keep.twin;
      he_vert_to_vert_keep.twin!.twin = he_vert_remove_to_vert.twin;
      he_vert_to_vert_keep.twin!.edge = he_vert_remove_to_vert.edge;

      he_vert_to_vert_keep.twin!.edge!.halfedge = he_vert_remove_to_vert.twin;
      
    } else { // he_vert_to_vert_keep twin belongs to the face
      /* v_keep.halfedge = he_vert_remove_to_vert; */
      overlap.halfedge = he_vert_to_vert_keep;

      he_vert_remove_to_vert.twin = he_vert_to_vert_keep;
      he_vert_to_vert_keep.twin = he_vert_remove_to_vert;
      he_vert_to_vert_keep.edge = he_vert_remove_to_vert.edge;

      he_vert_to_vert_keep.edge!.halfedge = he_vert_remove_to_vert;
      
      //he_vert_remove_to_vert.vert = v_keep;
    }
  }

  collapse(edge: Edge) {
    const newVertexPos = edge.bestVertex();
    let vert_remove = edge.halfedge!.vert!;
    let vert_keep = edge.halfedge!.twin!.vert!;

    //const e0 = edge.halfedge;
    const outgoing_halfedges_from_old_vert : Halfedge[] = [];
    const neighbor_edges : Edge[] = [];

    vert_remove.halfedges(he => {
      outgoing_halfedges_from_old_vert.push(he);
      neighbor_edges.push(he!.edge!);
    });
    vert_keep.halfedge = edge.halfedge!.twin!.next!.next!.twin;
    this.deleteFace(edge.halfedge!.twin!.face!, vert_remove, vert_keep);
    this.deleteFace(edge.halfedge!.face!, vert_remove, vert_keep);

    outgoing_halfedges_from_old_vert.forEach(he => {
      he!.vert = vert_keep;
    });

    // Remove vertex and collapsed edge
    this.verts[vert_remove.idx] = null;
    this.edges[edge.idx]!.removed = true;
    this.edges[edge.idx] = null;

    // Re-calculate neighbor error
    neighbor_edges.forEach(e => {
      if(!e.removed) {
        e!.err = -1;
      }
    });
    vert_keep.pos = newVertexPos;
  }

  simplify(reduceRatio: number) {
    console.assert	= function(cond, text){
      if( cond )	return;
      console.log(text)
      throw new Error("Assertion failed!");
    };

    let edgeQueue = new EdgeQueue((a: Edge, b: Edge) => a.error() < b.error());

    this.edges.forEach(edge => {
      //console.assert(edge!.error() >= 0, {index: edge!.error, edge: edge, errorMsg: "The edge error should not be negative!"});
      if(edge) edgeQueue.push(edge);
    });

    // Number of faces that should be removed.
    const reducedFaces = Math.floor(this.faces.length * reduceRatio);
    let targetFaces = this.faces.length-reducedFaces;

    let facecount = this.faces.length;

    while((facecount > targetFaces) && edgeQueue.size()) {
      let edge = edgeQueue.pop();

      // Check whether edge is valid

      // Edge already removed
      if(!edge) {
        continue;
      }

      if(edge.removed) {
        continue;
      }
      // Vertex to remove on boundary
      let onBoundary = false;

      edge.halfedge!.vert!.halfedges(he => {
        if(he.onBoundary || he.twin!.onBoundary) {
          onBoundary = true;
        }
      });
      if(onBoundary) continue;
      
      // Joint neighbourhood vertices must be exactly two
      let neighbors_keep : Vertex[] = [];
      let neighbors_remove : Vertex[] = [];
      edge.halfedge!.twin!.vert!.vertices(v => {
        neighbors_keep.push(v)
      });
      edge.halfedge!.vert!.vertices(v => {
        neighbors_remove.push(v)
      })

      if(neighbors_keep.filter(e => neighbors_remove.includes(e)).length !== 2) {
        continue;
      }
      if(neighbors_keep[0]!.idx === neighbors_keep[1]!.idx) {
        console.log("Both vertices are the same!");
        continue;
      }

      // Edge Collapse
      this.collapse(edge);

      // TODO: Collapse for final face

      facecount -= 2;
    }
    this.resetIndices();
  }
}
