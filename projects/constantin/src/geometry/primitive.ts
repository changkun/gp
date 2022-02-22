// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
// Modified by Constantin Geier <constantin.geier@campus.lmu.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import {Vector} from '../linalg/vec';
import { Helper } from '../helper/Helper';

export class Halfedge {
  vert?: Vertex;
  edge?: Edge;
  face?: Face;

  prev?: Halfedge;
  next?: Halfedge;
  twin?: Halfedge;

  idx: number;
  onBoundary: boolean;

  constructor() {
    this.idx = -1;
    this.onBoundary = false;
  }
  vector(): Vector {
    const a = this.next!.vert!;
    const b = this.vert!;
    return a.position.sub(b.position);
  }
  cotan(): number {
    // Compute the cotan formula at this edge, if an edge
    // is on the boundary, then return zero.
    if (this.onBoundary) {
      return 0;
    }
    const u = this.prev!.vector();
    const v = this.next!.vector().scale(-1);
    return u.dot(v) / u.cross(v).len();
  }
  angle(): number {
    // Compute the tip angle at this edge.
    const u = this.prev!.vector().unit();
    const v = this.next!.vector().scale(-1).unit();
    return Math.acos(Math.max(-1, Math.min(1, u.dot(v))));
  }
  validate(){
    let valid=true;
    if(!this.vert){
      console.log("Halfedge"+this.idx+"has no assigned vertex");
      valid=false;
    }
    if(!this.edge){
      console.log("Halfedge"+this.idx+"has no assigned edge");
      valid=false;
    }
    if(!this.face){
      console.log("Halfedge"+this.idx+"has no assigned face");
      valid=false;
    }
    if(!this.prev){
      console.log("Halfedge"+this.idx+"has no prev");
      valid=false;
    }
    if(!this.next){
      console.log("Halfedge"+this.idx+"has no next");
      valid=false;
    }
    if(!this.twin){
      console.log("Halfedge"+this.idx+"has no twin");
      valid=false;
    }
    if(!valid){
      console.log("Halfedge"+this.idx+" valid:"+(valid ? "Y":"N"));
    }
    this.vector();
    this.cotan();
    this.angle();
    if(this.next!.next!.idx != this.prev!.idx){
      console.log("Hmm");
    }
    //assert(this.vert !== null);
  }
}

export class Edge {
  halfedge?: Halfedge;
  idx: number;

  //constructor(halfedge:Halfedge) {
  constructor() {  
    //this.halfedge=halfedge;
    this.idx = -1;
  }

  validate(){
    const valid=this.halfedge!=null;
    if(!valid){
      console.log("Edge"+this.idx+" valid:"+(valid ? "Y":"N"));
    }
  }
}

export class Face {
  halfedge?: Halfedge;
  idx: number;

  constructor() {
    this.idx = -1;
  }
  validate(){
    const valid=this.halfedge!=null;
    if(!valid){
      console.log("Face"+this.idx+" valid:"+(valid ? "Y":"N"));
    }
    this.vertices((v, i) => {
      if(!v){
        console.log("X");
      }
    });
    const tris=this.asTriangle();
    if(tris.length!=3){
      console.log("Face"+this.idx+" asTriangle() error");
    }
    this.normal();
    this.area();
  }
  vertices(fn: (v: Vertex, n: number) => void) {
    let start = true;
    let i = 0;
    for (let h = this.halfedge; start || h !== this.halfedge; h = h!.next) {
      fn(h!.vert!, i);
      start = false;
      i++;
    }
  }

  asTriangle():Vector[]{
    let ret=new Array<Vector>(3);
    let count=0;
    this.vertices((v, i) => {
      if(i<3){
        ret[i]=v.position;
      }
      count++;
    });
    if(count!=3){
      throw new Error("Count not 3");
    }

    return ret;
  }

  normal(): Vector {
    // Compute the face normal of this face.
    if (this.halfedge!.onBoundary) {
      console.log("Boundary");
      return new Vector(0, 0, 0);
    }
    const h = this.halfedge!;
    const a = h.vert!.position.sub(h.next!.vert!.position);
    const b = h.prev!.vert!.position.sub(h.vert!.position).scale(-1);
    return a.cross(b).unit();
  }
  area(): number {
    // Compute the area of this face.
    const h = this.halfedge!;
    if (h.onBoundary) {
      return 0;
    }
    const a = h.vert!.position.sub(h.next!.vert!.position);
    const b = h.prev!.vert!.position.sub(h.vert!.position).scale(-1);
    return a.cross(b).len() * 0.5;
  }
}

export enum NormalMethod {
  EqualWeighted = 'Equal Weighted',
  AreaWeighted = 'Area Weighted',
  AngleWeighted = 'Angle Weighted',
}

export class Vertex {
  position: Vector;
  halfedge?: Halfedge;
  idx: number;

  constructor(position: Vector) {
    this.position = position;
    this.idx = -1;
  }
  validate(){
    let valid=true;
    if(!this.halfedge){
      valid=false;
      console.log("Vertex"+this.idx+" has no halfedge");
    }
    this.faces((f,i)=>{

    });
    this.halfedges((h,i)=>{

    });
  }
  faces(fn: (f: Face, i: number) => void) {
    let start = true;
    let i = 0;
    let max=0;
    for (
      let h = this.halfedge;
      start || h !== this.halfedge;
      h = h!.twin!.next
    ) {
      max++;
      if(max>64){
        console.log("Something wrong with faces of Vertex:"+this.idx);
        break;
      }
      if (h==null || h!.onBoundary) {
        continue;
      }
      fn(h!.face!, i);
      start = false;
      i++;
    }
  }
  halfedges(fn: (h: Halfedge, i: number) => void) {
    let start = true;
    let i = 0;
    let max=0;
    for (
      let h = this.halfedge;
      start || h !== this.halfedge;
      h = h!.twin!.next
    ) {
      max++;
      if(max>64){
        console.log("Something wrong with halfedges of Vertex:"+this.idx);
        break;
      }
      fn(h!, i);
      start = false;
      i++;
    }
  }

  normal(method = NormalMethod.EqualWeighted): Vector {
    // Compute vertex normal given different method:
    // 1. EqualWeighted
    // 2. AreaWeighted
    // 3. AngleWeighted
    let n = new Vector();
    if(!this.halfedge){
      return new Vector();
    }else{
      //return this.halfedge!.face!.normal();
    }
    switch (method) {
      case NormalMethod.EqualWeighted:
        this.faces(f => {
          n = n.add(f.normal());
        });
        return n.unit();

      case NormalMethod.AreaWeighted:
        this.faces(f => {
          n = n.add(f.normal().scale(f.area()));
        });
        return n.unit();

      case NormalMethod.AngleWeighted:
        this.halfedges(h => {
          n = n.add(h.face!.normal().scale(h.next!.angle()));
        });
        return n.unit();
    }
  }
}
