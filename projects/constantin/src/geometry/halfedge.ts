// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
// Modified by Constantin Geier <constantin.geier@campus.lmu.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.
import { Vertex, Edge, Face, Halfedge, NormalMethod } from './primitive';
import { Vector } from '../linalg/vec';
import { smoothstep } from 'three/src/math/MathUtils';
import { assert } from 'console';
import * as THREE from 'three'
import { Vector3 } from 'three';
import {AABB} from './aabb';
import { Voxelizer } from '../voxelizer';
import {VertexNormalsHelper} from 'three/examples/jsm/helpers/VertexNormalsHelper';

export enum WeightType {
  Uniform = 'Uniform',
  Cotan = 'Cotan',
}

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

  buildMesh2(indices: number[], positions: Vector[]){
    // first step: create all the vertices
    for(let i=0;i<positions.length;i++){
      const vertex=new Vertex(positions[i]);
      // we'l need the id later
      vertex.idx=i;
      this.verts.push(vertex);
    }

    for(let i=0;i<=indices.length-3;i+=3){
      //this.appendSingleTriangle(positions[indices[i+0]],positions[indices[i+1]],positions[indices[i+2]]);
      this.appendFace(indices[i],indices[i+1],indices[i+2]);
    }
  }
 // search for a halfedge that goes from idx1 to idx2
  // returns the halfedge if found, null otherwise
  findHalfedge(idx1:number,idx2:number):Halfedge | null{
    for(let i=0;i<this.halfedges.length;i++){
      const halfedge=this.halfedges[i];
      const vert1=halfedge.prev?.vert;
      const vert2=halfedge.vert;
      if(vert1?.idx==idx1 && vert2?.idx==idx2){
        //console.log("Found a matching halfedge");
        return halfedge;
      }
    }
    return null;
  }

  // Creates and Appends a new Edge. Call this with 2 opposite half edges
  // (aka twins).
  appendEdgeAndWriteTwins(newHe:Halfedge,oppositeHe:Halfedge){
    if(newHe.twin!=null || oppositeHe.twin!=null){
      console.log("One of these halfedges alread has a twin");
    }
    var edge=new Edge();
    edge.halfedge=oppositeHe;
    newHe.twin=oppositeHe;
    oppositeHe.twin=newHe;
    this.edges.push(edge);
  }
  

  // each call to appendFace adds 
  // 1 new face
  // 3 new half-edges
  // up to 3 new edges
  appendFace(idx1:number,idx2:number,idx3:number){
    // 3 new halfedges (appended later)
    var halfedge1=new Halfedge(); //goes from idx1 to idx2
    var halfedge2=new Halfedge(); //goes from idx2 to idx3
    var halfedge3=new Halfedge(); //goes from idx3 to idx1
    // 1 new face (appended later)
    var face1=new Face;

    if(idx1>this.verts.length || idx2>this.verts.length || idx3>this.verts.length){
      console.log("Fucking hell");
    }

    face1.halfedge=halfedge1;

    const vertex1=this.verts[idx1];
    const vertex2=this.verts[idx2];
    const vertex3=this.verts[idx3];

    // if we have already added a halfedge that goes from vertex number x to vertex number y (or y to x),
    // we have a new edge. And every time we have a new edge, we can assign the twin value for both halfedges
    var oppositeHalfedge=this.findHalfedge(idx2,idx1);
    if(oppositeHalfedge!=null){
      this.appendEdgeAndWriteTwins(halfedge1,oppositeHalfedge);
    }
    oppositeHalfedge=this.findHalfedge(idx3,idx2);
    if(oppositeHalfedge!=null){
      this.appendEdgeAndWriteTwins(halfedge2,oppositeHalfedge);
    }
    oppositeHalfedge=this.findHalfedge(idx1,idx3);
    if(oppositeHalfedge!=null){
      this.appendEdgeAndWriteTwins(halfedge3,oppositeHalfedge);
    }

    // Doesn't really matter, but if a Vertex is already assigned a halfedge, don't ovverride it
    if(!vertex1.halfedge){
      vertex1.halfedge=halfedge1;
    }
    if(!vertex2.halfedge){
      vertex2.halfedge=halfedge2;
    }
    if(!vertex3.halfedge){
      vertex3.halfedge=halfedge3;
    }
    /*vertex1.halfedge=halfedge1;
    vertex2.halfedge=halfedge2;
    vertex3.halfedge=halfedge3;*/

    // the vertex each halfedge points to
    halfedge1.vert=vertex2;
    halfedge2.vert=vertex3;
    halfedge3.vert=vertex1;

    halfedge1.face=face1;
    halfedge2.face=face1;
    halfedge3.face=face1;

    halfedge1.prev=halfedge3;
    halfedge1.next=halfedge2;

    halfedge2.next=halfedge3;
    halfedge2.prev=halfedge1;

    halfedge3.next=halfedge1;
    halfedge3.prev=halfedge2;

    // append everything newly generated on the output array
    this.halfedges.push(halfedge1);
    this.halfedges.push(halfedge2);
    this.halfedges.push(halfedge3);
    this.faces.push(face1);
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
    // build the halfedge connectivity
    console.log("HE construction begin");
    const edges = new Map();
    for (let i = 0; i < indices.length; i += 3) {
      for (let j = 0; j < 3; j++) { // check a face
        var a = indices[i + j]
        var b = indices[i + (j + 1) % 3]

        if (a > b) {
          const tmp = b
          b = a
          a = tmp
        }

        // store the edge if not exists
        const e = `${a}-${b}`
        if (!edges.has(e)) {
          edges.set(e, [a, b])
        }
      }
    }

    this.verts = new Array(positions.length)
    this.edges = new Array(edges.size)
    this.faces = new Array(indices.length / 3)
    this.halfedges = new Array(edges.size * 2)

    const idx2vert = new Map()
    for (let i = 0; i < positions.length; i++) {
      const v = new Vertex(positions[i])
      this.verts[i] = v
      idx2vert.set(i, v)
    }

    let eidx = 0
    let existedHe = new Map()
    let hasTwin = new Map()

    // construct halfedges, edges
    for (let i = 0; i < indices.length; i += 3) {
      // construct face
      const f = new Face()
      this.faces[i / 3] = f

      // construct halfedges of the face
      for (let j = 0; j < 3; j++) {
        const he = new Halfedge()
        this.halfedges[i + j] = he
      }

      // construct connectivities of the new halfedges
      for (let j = 0; j < 3; j++) {
        // halfedge from vertex a to vertex b
        var a = indices[i + j]
        var b = indices[i + (j + 1) % 3]

        // halfedge properties
        const he = this.halfedges[i + j]
        he.next = this.halfedges[i + (j + 1) % 3]
        he.prev = this.halfedges[i + (j + 2) % 3]
        he.onBoundary = false
        hasTwin.set(he, false)

        const v = idx2vert.get(a)
        he.vert = v
        v.halfedge = he

        he.face = f
        f.halfedge = he

        // swap if index a > b, for twin checking
        if (a > b) {
          const tmp = b
          b = a
          a = tmp
        }
        const ek = `${a}-${b}`
        if (existedHe.has(ek)) {
          // if a halfedge has been created before, then
          // it is the twin halfedge of the current halfedge
          const twin = existedHe.get(ek)
          he.twin = twin
          twin.twin = he
          he.edge = twin.edge

          hasTwin.set(he, true)
          hasTwin.set(twin, true)
        } else {
          // new halfedge
          const e = new Edge()
          this.edges[eidx] = e
          eidx++
          he.edge = e
          e.halfedge = he

          existedHe.set(ek, he)
        }

        // FIXME: non-manifold edge count checking
      }
    }

    // create boundary halfedges and hidden faces for the boundary
    let hidx = indices.length
    for (let i = 0; i < indices.length; i++) {
      const he = this.halfedges[i]
      if (hasTwin.get(he)) {
        continue
      }

      // handle halfedge that has no twin
      const f = new Face() // hidden face
      let bcycle = []      // boundary cycle
      let current = he
      do {
        const bhe = new Halfedge() // boundary halfedge
        this.halfedges[hidx] = bhe
        hidx++
        bcycle.push(bhe)

        // grab the next halfedge along the boundary that does not
        // have a twin halfedge
        var next = current.next;

        while (hasTwin.get(next)) {
          next = next?.twin?.next;
        }

        // set the current halfedge's attributes
        bhe.vert = next?.vert;
        bhe.edge = current.edge
        bhe.onBoundary = true

        // point the new halfedge and face to each other
        bhe.face = f
        f.halfedge = bhe

        // point the new halfedge and twin to each other
        bhe.twin = current
        current.twin = bhe

        current = next!;
      } while (current != he)

      // link the cycle of boundary halfedges together
      const n = bcycle.length
      for (let j = 0; j < n; j++) {
        bcycle[j].next = bcycle[(j + n - 1) % n]
        bcycle[j].prev = bcycle[(j + 1) % n]
        hasTwin.set(bcycle[j], true)
        hasTwin.set(bcycle[j].twin, true)
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
