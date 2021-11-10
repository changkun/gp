// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

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

  constructor() {
    this.idx = -1;
    this.onBoundary = false;
  }
  vector(): Vector {
    // TODO: compute the edge vector.
    // assuming that the vertex of each halfedge is the "starting vertex" of this halfedge
    if(this.vert && this.next && this.next.vert){
     const pos1=this.vert.position;
     const pos2=this.next.vert.position;
     return pos2.sub(pos1);
    //return new Vector(pos2.x-pos1.x,pos2.y-pos1.y,pos2.z-pos1.z);
    }  
    return new Vector();
  }
  cotan(): number {
    // TODO: Compute the cotan formula at this edge, if an edge
    // is on the boundary, then return zero.
    // From https://www.cuemath.com/cotangent-formula/
    // cot A = Adjacent side / Opposite side
    // And from https://stackoverflow.com/questions/31159016/how-to-efficiently-calculate-cotangents-from-vectors
    // cot(a, b) = (a * b) / |a x b|, where a and b are vectors
    if(this.onBoundary)return 0;
    const vecAdjacent=this.vector();
    const vecOposite=this.next!.vector();
    return vecAdjacent.dot(vecOposite)/vecAdjacent.cross(vecOposite).len();
  }
  angle(): number {
    // TODO: compute the tip angle at this edge.
    // from https://www.euclideanspace.com/maths/algebra/vectors/angleBetween/
    // Step 1: normalize both vectors
    // Step 2: angle = acos(v1•v2)
    // Note: a normalized vector is also called the unit vector
    const vec1=this.vector().unit();
    const vec2=this.next!.vector().unit();
    return Math.acos(vec1.dot(vec2));
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
    // Define the Face (aka plane) using two vectors
    // calculate the vector perpendicular to them using cross product
    // normalize the vector (unit)
    const vec1=this.halfedge!.vector();
    const vec2=this.halfedge!.next!.vector();
    return vec1.cross(vec2).unit();
  }
  area(): number {
    // TODO: compute the area of this face.
    // simple: https://atozmath.com/example/Vectors.aspx?he=e&q=atri
    const vec1=this.halfedge!.vector();
    const vec2=this.halfedge!.next!.vector();
    return 0.5*vec1.cross(vec2).len();
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
    // 1. EqualWeighted
    // 2. AreaWeighted
    // 3. AngleWeighted
    // NOTE: since we normalize the normal in the end anyway, we don't
    // need to divide the final vector by count (==3)
    var sum=new Vector(0);
    var count=0;
    switch(method){
      case NormalMethod.EqualWeighted:
        this.faces(f=>{ sum=sum.add(f.normal());count++});
        return sum.scale(1.0/count).unit();
      case NormalMethod.AreaWeighted:
        this.faces(f=>{ sum=sum.add(f.normal().scale(Math.abs(f.area())));count++});
        return sum.scale(1.0/count).unit();
      case NormalMethod.AngleWeighted:
        this.faces(f=>{ sum=sum.add(f.normal().scale(f.halfedge!.cotan()));count++});
        return sum.scale(1.0/count).unit();
    }
  }

  curvature(method = CurvatureMethod.Mean): number {
    // TODO: compute curvature given different method:
    // 1. None
    // 2. Mean
    // 3. Gaussian
    // 4. Kmin
    // 5. Kmax
    return 1;
  }
  // NOTE: you can add more methods if needed
}
