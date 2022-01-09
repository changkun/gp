// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import {Vertex, Edge, Face, Halfedge} from './primitive';
import {Vector} from '../linalg/vec';
import {EdgeQueue} from './pq';
import { Vector3 } from 'three';

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

    // Number of faces that should be removed.
    const reducedFaces = Math.floor(this.faces.length * reduceRatio);

    //create edgequeue
    let equeue = new EdgeQueue( (edge, edge2)=>{
      return edge.error() < edge2.error();
    })

    //enqueue edges
    this.edges.forEach(e=>{
      if (e!=null){
        equeue.push(e);
      }
    })


    //console.log("Test 1")

    //to test
    //const num_faces = this.faces.length -22000;

    //Amount of faces remaining after reduction
    const num_faces = this.faces.length-reducedFaces;


     while(this.faces.length > num_faces){

      equeue = new EdgeQueue( (edge, edge2)=>{
        return edge.error() < edge2.error();
      })

      //enqueue edges
      this.edges.forEach(e=>{
        if (e!=null){
          equeue.push(e);
        }
      })
      
      //console.log("in while loop");

      //Pop Edge from Queue:
      let e = equeue.pop();

      //check if edge is already collapsed, and proceed with next, if so
      if (e.removed){
        console.log("edge discarded (already removed)");
        continue
      }

      //also use a different edge if v3 is the same as v4
      if (e.halfedge!.prev!.vert!.idx == e.halfedge!.twin!.prev!.vert!.idx){
        e.err = Number.POSITIVE_INFINITY;
        console.log("edge discarded (v3 = v4)");
        continue
      }

      if ((this.faces.length-num_faces) %4000 == 0){
      console.log("Number of faces to reduce:"+ (this.faces.length-num_faces));
      console.log("edge to be collapsed:");
      console.log(e);
      }
      //collapse e at best Position
      this.edgeCollapse(e.halfedge!,e.bestVertex());

    }
 


  }

  /**
   * collapses an edge at specified position
   * @param h: the halfedge to be collapsed
   * @param x: position vector of the new vertex
   * idea: "glue" together h.prev and h.next, as well as h.twin.prev and h.twin.next
   */
  edgeCollapse(h: Halfedge, x: Vector){

    //TODO: Check if a Vertex of edge is part of boundary and then stop
    //TODO: Check if v3 == v4;
    //TODO: Check for unsafe Collapse, and skip edge if collapse is unsafe

    const v1 = h.vert!;
    const v2 = h.next!.vert!;
    const v3 = h.prev!.vert!;
    const v4 = h.twin!.prev!.vert!;

    const h1 = h.twin!;
    const h2 = h.next!;
    const h3 = h.prev!;
    const h4 = h.twin!.next!;
    const h5 = h.twin!.prev!;

    const h2t = h2.twin!;
    const h3t = h3.twin!;
    const h4t = h4.twin!;
    const h5t = h5.twin!;

    const f1 = h.face;
    const f2 = h.twin!.face;

    //new Vertex
    let v_x = new Vertex(x);

    //set position of new vertex
    v_x.pos = x;

    //reassign halfedges to new vertex
    v1.halfedges((v)=>{
      v.vert = v_x;
    });

    v2.halfedges((v)=>{
      v.vert = v_x;
    })

    
    //set safe halfedge for new vertex
    v_x.halfedge = h3t;

    // set new twins for face outer halfedges
    h3t.twin = h2t;
    h2t.twin = h3t;

    h4t.twin = h5t;
    h5t.twin = h4t;

    //reassign halfedge of edges
    h3t.edge!.halfedge = h3t;
    h2t.edge! = h3t.edge!;

    h4t.edge!.halfedge = h4t;
    h5t.edge! = h4t.edge!;

    //assign new halfedges to v3, and v4
    v3.halfedge = h2t;
    v4.halfedge = h4t;

    
    //halfedges to be deleted:
    let h_del = [h.idx, h1.idx, h2.idx, h3.idx, h4.idx, h5.idx];

    /*
    let h_del = new Array();
    h_del.push(h.idx);
    h_del.push(h2.idx);
    h_del.push(h3.idx);

    h_del.push(h1.idx);
    h_del.push(h5.idx);
    h_del.push(h4.idx);
    */

    //edges to be deleted:
    let e_del = [h.edge!.idx, h2.edge!.idx, h5.edge!.idx];

    // faces to be deleted
    let f_del = [f1!.idx, f2!.idx];

    //console.log("Built arrays for idxs of unused geometry");

    //delete unused geometry
    for (let i of h_del){
      this.halfedges[i] = null;
    }

    for (let i of e_del){
      //mark edges as removed
      this.edges[i]!.removed = true;
      this.edges[i] = null;
    }
    


    for (let i of f_del){
      this.faces[i] = null;
    }

    this.verts[v2.idx] = null;
    this.verts[v1.idx] = null;

    //console.log("deleted old geometry");

    this.verts[v1.idx] = v_x;

    //reset error for modified edges
    v_x.halfedges((h,i)=>{
      
       /*  console.log("Now in Halfedges of vert:");
        console.log(h);
        console.log(h.twin?.next); */
    
      h.edge!.err = -1;
    })


    this.resetIndices();
    //console.log("indices reset");
    
    
  }
}

