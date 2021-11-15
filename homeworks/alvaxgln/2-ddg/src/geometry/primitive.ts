// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import { createGunzip } from 'zlib';
import {Vector} from '../linalg/vec';



export class Halfedge {
  vert?: Vertex;
  edge?: Edge;
  face?: Face;

  prev?: Halfedge;
  next?: Halfedge;
  twin?: Halfedge;

  idx: number;
  onBoundary: boolean;

  ctg(x: number): number { return 1 / Math.tan(x); }

  constructor() {
    this.idx = -1;
    this.onBoundary = false;
  }
  vector(): Vector {

    // TODO: compute the edge vector.
    let vector = this.next!.vert!.position.sub(this.vert!.position);
    return vector;
  }
  cotan(): number {
    // TODO: Compute the cotan formula at this edge, if an edge
    // is on the boundary, then return zero.
    if (this.onBoundary) return 0;

    let a = this.twin!.prev!.angle();
    let b = this.prev!.angle();

    return this.ctg(a) + this.ctg(b);
  }
  angle(): number {
    // TODO: compute the tip angle at this edge.
    // calculates the corner angle at the halfedges vertex in the halfedges face
    return Math.acos((this.vector().dot(this.prev!.twin!.vector()))/(this.vector().len() * this.prev!.twin!.vector().len()));
    //return 0;
  }
}

export class Edge {
  halfedge?: Halfedge;
  idx: number;

  constructor() {
    this.idx = -1;
  }
}

export class Face {
  halfedge?: Halfedge;
  idx: number;

  constructor() {
    this.idx = -1;
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

  normal(): Vector {
    // TODO: compute the face normal of this face.
    //return new Vector(1,1,1,1);
    if (this.halfedge?.onBoundary) return new Vector();

    let v1 = this.halfedge!.vector().scale(-1);
    let v2 = this.halfedge!.prev!.vector();
    return v1.cross(v2).unit();


  }
  area(): number {
    // TODO: compute the area of this face.
    let v1 = this.halfedge!.vector();
    let v2 = this.halfedge!.prev!.twin!.vector();

    return v1.cross(v2).len()/2;
  }
}

export enum NormalMethod {
  EqualWeighted = 'Equal Weighted',
  AreaWeighted = 'Area Weighted',
  AngleWeighted = 'Angle Weighted',
}

export enum CurvatureMethod {
  None = 'None',
  Mean = 'Mean',
  Gaussian = 'Caussian',
  Kmin = 'Kmin',
  Kmax = 'Kmax',
}

export class Vertex {
  position: Vector;
  halfedge?: Halfedge;
  idx: number;

  constructor(position: Vector) {
    this.position = position;
    this.idx = -1;
  }
  faces(fn: (f: Face, i: number) => void) {
    let start = true;
    let i = 0;
    for (
      let h = this.halfedge;
      start || h !== this.halfedge;
      h = h!.twin!.next
    ) {
      if (h!.onBoundary) {
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
    for (
      let h = this.halfedge;
      start || h !== this.halfedge;
      h = h!.twin!.next
    ) {
      fn(h!, i);
      start = false;
      i++;
    }
  }

  normal(method = NormalMethod.EqualWeighted): Vector {
    // TODO: compute vertex normal given different method:
    
    let sum_vector = new Vector();

    // 1. EqualWeighted
    if (method == NormalMethod.EqualWeighted){
    this.faces((face, i) =>{
      sum_vector = sum_vector.add(face.normal());
      })
    }

    // 2. AreaWeighted
    if (method == NormalMethod.AreaWeighted){
    this.faces((face, i) =>{
      sum_vector = sum_vector.add(face.normal()).scale(face.area());
      })
    }
    // 3. AngleWeighted
    if (method == NormalMethod.AngleWeighted){
    this.halfedges((h, i) =>{
      sum_vector = sum_vector.add(h.face!.normal()).scale(h.angle());
      })
    }
      //

/*     if (method == NormalMethod.AngleWeighted){
      this.faces((face, i) =>{
        sum_vector = sum_vector.add(face.normal()).scale(face.halfedge!.angle());
        })
      }
 */     

    return sum_vector.scale(1/sum_vector.len());
  }
  curvature(method = CurvatureMethod.Mean): number {

    let h = this.gausCurv() > 0 ? this.meanCurv(): -this.meanCurv();
    let k1 = h - Math.sqrt((h*h) -this.gausCurv());
    let k2 = h + Math.sqrt((h*h) -this.gausCurv());


    // TODO: compute curvature given different method:
    // 1. None
    if (method == CurvatureMethod.None) return 1;
    // 2. Mean
    if (method == CurvatureMethod.Mean) return (k1 + k2) / 2;
    
    // 3. Gaussian
    if (method == CurvatureMethod.Gaussian) return this.gausCurv();
    

    // 4. Kmin
    if (method == CurvatureMethod.Kmin) return k1;

    // 5. Kmax
    if (method == CurvatureMethod.Kmax) return k2;

    return 1;
    
  }
  // NOTE: you can add more methods if needed

  //calculate Mean curvature using Laplace Beltrami
  meanCurv(): number {
    let sum_vector = new Vector();

    //TODO: Calculate Area of voronoi cell
    let a = this.voronoi();

    this.halfedges((he,i) =>{
      
      if (he.onBoundary ||he.twin?.onBoundary) return;
      sum_vector = sum_vector.add(he.vector().scale(he.cotan()));
      //a += he.face!.area();
    })

    //
    let H =  (sum_vector.scale(1/(2*a)).len() /2);

    return H;
  }

  //calculate Gauss Curvature
  gausCurv(): number {

    //Sum all tip angles at this vertex
    let sum = 0;
    this.halfedges((he: Halfedge, i: number) =>{
      sum += he.angle();
    })

    //Calculate angle defect:
    let K = 2 * Math.PI - sum;

    return K;
  }

  voronoi(): number {
    let area = 0;
    
    this.halfedges((h,i) =>{
      let v1 = h.vector().len();
      let v2 = h.prev!.vector().len();
      let a = h.next!.angle();
      let b = h.prev!.angle();
      
      area += ((v1*v1*h.ctg(a)) + (v2*v2*h.ctg(b)))/8;

    })
    return area;
  }


}
