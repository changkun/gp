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

  

  // Deletes the face, without reassigning any vertices or edges.
  deleteFace(face: Face) {
    console.log("Removing face " + face!.idx)
    console.log("Removing halfedge " + face.halfedge!.idx)
    console.log("Removing halfedge " + face.halfedge!.next!.idx)
    console.log("Removing halfedge " + face.halfedge!.next!.next!.idx)
    console.log(face)
    this.halfedges[face.halfedge!.idx] = null;
    this.halfedges[face.halfedge!.next!.idx] = null;
    this.halfedges[face.halfedge!.next!.next!.idx] = null;
    this.faces[face!.idx] = null;
    //this.edges[face.halfedge!.edge!.idx] = null;
    //this.halfedges[face.halfedge!.idx] = null;
  }

  // Reassigns the vertex v_old of the face to v_new.
  // The old vertex is not removed from anywhere.
  reassignVertex(face: Face, v_old: Vertex, v_new: Vertex) {
    
    console.log("Reassign Vertex")
    console.log("Face",face)
    console.log("v_old",v_old)
    console.log("v_new",v_new)
    let edges = [face.halfedge!, face.halfedge!.next!, face.halfedge!.next!.next!];
    let index = edges.findIndex(edge => edge!.vert!.idx === v_old!.idx);
    console.log("edges",edges)
    console.assert(index > -1, {index: index, vert: v_old, errorMsg: "The vertex is not part of the face"}); // v_old has to be part of the face

    console.assert(edges.findIndex(edge => edge!.vert!.idx === v_new!.idx) < 0, {vert: v_new, errorMsg: "The vertex should not be part of the face"}); // v_new should not be part of the face
    
    edges[index].vert = v_new;
    v_new.halfedge = edges[index]; // TODO: Is this correct?
    //edges[index].twin!.next!.vert = v_new;
  }

  collapse(edge: Edge) {
    let vert_remove = edge.halfedge!.vert!;
    let vert_keep = edge.halfedge!.twin!.vert!;

    console.log("Collapsing edge")
    console.log("edge",edge)
    console.log("vert_remove",vert_remove)
    console.log("vert_keep",vert_keep)
    
    

    // Get neighbors of vert_remove
    const e0 = edge.halfedge;
    const neighbor_verts = [e0!.twin!.vert!]; 
    const neighbor_faces = [e0!.twin!.face];
    const neighbor_edges = [];
    for(let e = e0!.twin!.next!.twin!; e != e0!.twin; e = e!.next!.twin!) {
      neighbor_verts.push(e.vert!);
      neighbor_faces.push(e.face);
      neighbor_edges.push(e.edge)

      if(e.onBoundary ||e.twin!.onBoundary) {
        console.log("BOUNDARY");
        throw new Error("BOUJNDAR");
        
      }
    }
    console.log("neighbor_verts",neighbor_verts)
    console.log("neighbor_faces",neighbor_faces)
    console.log("neighbor_edges",neighbor_edges)
    let c = 0;

    // Delete neighbor faces (only two, since the objetc is manifold), and reassign the other faces
    neighbor_faces.forEach(face => {
      console.log("Neighbor")
      console.log("face",face)
      if(face!.idx === edge.halfedge!.face!.idx || face!.idx === edge.halfedge!.twin!.face!.idx) {
        this.deleteFace(face!);
        c++;
      }
      else {
        this.reassignVertex(face!, vert_remove, vert_keep);
      }
    });
    console.log("Removing vert " + vert_remove.idx)
    console.log("Removing edge " + edge.idx)
    this.verts[vert_remove.idx] = null;
    this.edges[edge.idx] = null;
    if(c !== 2) {
      throw new Error("NOT ENOUGH FACES DELETEDF");
      
    }
    this.resetIndices();

    // Re-calculate neighbor error
    neighbor_edges.forEach(e => {
      e!.err = -1;
    });

    // TODO: Handle possibility of v_new pointing to the deleted edge
    //if(!this.halfedges[vert_keep.halfedge!.idx]) vert_keep.halfedge =


  }

  simplify(reduceRatio: number) {
    // TODO: implement QEM simplification algorithm
    //
    // Hints:
    //    - Boundary edges maybe skipped without handling
    //    - Use the provided EdgeQueue to maintain a priority queue
    //    - If necessary, use the provided resetIndices
    //    - Carefully maintain the edge collapse as it may easily be wrong
    //      It is recommended to first start with a simply cube object.
    //    - To mark remove an object, one can assign null to the array, then
    //      calling resetIndices will filter out all null elements. (Only call
    //      at the end of each simplification round)
    //
    // Additional Task:
    //    - Be able to handle meshes with boundary (need preserve the boundary)
    console.assert	= function(cond, text){
      if( cond )	return;
      console.log(text)
      throw new Error("Assertion failed!");
    };
    let quadrics = [];
    let edgeQueue = new EdgeQueue((a: Edge, b: Edge) => a.error > b.error);

    /* let edges : Edge[] = [];
    for(let edge of this.edges) {
      if(edge) edges.push(edge);
    } */

    this.edges.forEach(edge => {
      if(edge) edgeQueue.push(edge);
    });

    //edgeQueue.push(...edges);

    console.log("Edge Queue")
    console.log(edgeQueue);

    // Number of faces that should be removed.
    const reducedFaces = Math.floor(this.faces.length * reduceRatio);
    let targetFaces = this.faces.length-reducedFaces;

    console.log("Collapsing " + this.faces.length + " faces to " + targetFaces + " faces.")
    while(this.faces.length > targetFaces) {
      console.log("Amount of faces: " + this.faces.length)
      let edge = edgeQueue.pop();

      // Edge 

      // Edge Collapse
      this.collapse(edge);
      
     

      /* this.verts[vert.idx] = null;
      this.faces[edge.halfedge!.face!.idx] = null;
      this.halfedges[edge.halfedge!.idx] = null;
      this.edges[edge.idx] = null; */

      // Update neighbour edge errors

    }
  }
}
