// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
// Modified by Constantin Geier <constantin.geier@campus.lmu.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.
import { Vertex, Edge, Face, Halfedge, NormalMethod } from './primitive';
import { Vector } from '../linalg/vec';

export class HalfedgeMesh {
  color: Vector;
  wireframe: Vector;

  // The following four fields are the key fields to represent half-edge based
  // meshes.
  verts: Vertex[]; // a list of vertices
  edges: Edge[]; // a list of edges
  faces: Face[]; // a list of faces
  halfedges: Halfedge[]; // a list of halfedges

  /**
   * constructs the halfedge-based mesh representation.
   * @param indices: The indices to construct the HalfedgeMesh from
   * @param vertices: The vertices to construct the HalfedgeMesh from
   */
  constructor(indices: number[],positions:Vector[]) {
    this.color = new Vector(0, 128, 255, 1);
    this.wireframe = new Vector(125, 125, 125, 1);
    this.verts = [];
    this.edges = [];
    this.faces = [];
    this.halfedges = [];
    this.buildMesh(indices, positions);
  }

  /**
   * buildMesh builds half-edge based connectivity for the given vertex index buffer
   * and vertex position buffer.
   *
   * @param indices is the vertex index buffer that contains all vertex indices.
   * @param positions is the vertex buffer that contains all vertex positions.
   */
  buildMesh(indices: number[], positions: Vector[]) {
    // If the input mesh is a non-manifold,this method might add additional edges to the input mesh
    // If any vertices of the input mesh are isolated vertices, those vertices will be removed
    console.log("HE construction begin");
    // here we don't add additional edges yet.
    const edges = new Map();
    for (let i = 0; i < indices.length; i += 3) {
      //check a face
      for (let j = 0; j < 3; j++) {
        var a = indices[i + j];
        var b = indices[i + (j + 1) % 3];
        // A edge going from idx X to idx Y is the same as
        // an edge going from Y to X 
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
      this.verts[i] = v;
      idx2vert.set(i, v);
    }

    let eidx = 0;
    const existedHe = new Map();
    const hasTwin = new Map();

    // construct halfedges, edges
    for (let i = 0; i < indices.length; i += 3) {
      // construct face
      const f = new Face();
      this.faces[i / 3] = f;

      // construct halfedges of the face
      for (let j = 0; j < 3; j++) {
        const he = new Halfedge();
        this.halfedges[i + j] = he;
      }

      // construct connectivities of the new halfedges
      for (let j = 0; j < 3; j++) {
        // halfedge from vertex a to vertex b
        var a = indices[i + j];
        var b = indices[i + (j + 1) % 3];

        // halfedge properties
        const he = this.halfedges[i + j];
        he.next = this.halfedges[i + (j + 1) % 3];
        he.prev = this.halfedges[i + (j + 2) % 3];
        he.onBoundary = false;
        hasTwin.set(he, false);

        const v = idx2vert.get(a);
        he.vert = v;
        v.halfedge = he;

        he.face = f;
        f.halfedge = he;

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
          he.twin = twin;
          twin.twin = he;
          he.edge = twin.edge;

          hasTwin.set(he, true);
          hasTwin.set(twin, true);

          // when we have "consumed" this halfedge, we cannot reuse it anymore - in case of a non-manifold this 
          // might result in additional edges
          existedHe.delete(ek);
        } else {
          // new halfedge
          const e = new Edge();
          if(eidx>=this.edges.length){
            console.log("Adding new Edge to fix non-manifold");
            this.edges.push(new Edge());
          }
          this.edges[eidx] = e;
          eidx++;
          he.edge = e;
          e.halfedge = he;

          existedHe.set(ek, he);
        }
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
      let bcycle = [];      // boundary cycle
      let current = he;
      do {
        const bhe = new Halfedge() // boundary halfedge
        this.halfedges[hidx] = bhe;
        hidx++;
        bcycle.push(bhe);

        // grab the next halfedge along the boundary that does not
        // have a twin halfedge
        var next = current.next;

        while (hasTwin.get(next)) {
          next = next?.twin?.next;
        }

        // set the current halfedge's attributes
        bhe.vert = next?.vert;
        bhe.edge = current.edge;
        bhe.onBoundary = true;

        // point the new halfedge and face to each other
        bhe.face = f;
        f.halfedge = bhe;

        // point the new halfedge and twin to each other
        bhe.twin = current;
        current.twin = bhe;

        current = next!;
      } while (current != he)

      // link the cycle of boundary halfedges together
      const n = bcycle.length
      for (let j = 0; j < n; j++) {
        bcycle[j].next = bcycle[(j + n - 1) % n];
        bcycle[j].prev = bcycle[(j + 1) % n];
        hasTwin.set(bcycle[j], true);
        hasTwin.set(bcycle[j].twin, true);
      }
    }

    // reset indices
    let index = 0
    this.verts.forEach(v => { v.idx = index++ })
    index = 0
    this.edges.forEach(e => { e.idx = index++ })
    index = 0
    this.faces.forEach(f => { f.idx = index++ })
    index = 0
    this.halfedges.forEach(h => { h.idx = index++ });
    // remove unused vertices
    let tmp=new Array<Vertex>();
    for(let i=0;i<this.verts.length;i++){
      const vert=this.verts[i];
      if(vert.halfedge){
        vert.idx=tmp.length;
        tmp.push(vert);
      }
    }
    this.verts=tmp;
    console.log("HE construction end");
  }

  validate(){
    console.log("validate begin");
    for(let i=0;i<this.verts.length;i++){
      this.verts[i].validate();
    }
    for(let i=0;i<this.edges.length;i++){
      this.edges[i].validate();
    }
    for(let i=0;i<this.faces.length;i++){
      this.faces[i].validate();
    }
    for(let i=0;i<this.halfedges.length;i++){
      this.halfedges[i].validate();
    }
    console.log("validate end");
  }
  
}
