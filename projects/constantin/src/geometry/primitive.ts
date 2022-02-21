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
    // Compute vertex normal given different method:
    // 1. EqualWeighted
    // 2. AreaWeighted
    // 3. AngleWeighted
    let n = new Vector();
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
  curvature(method = CurvatureMethod.Mean): number {
    // Compute curvature given different method:
    // 1. None
    // 2. Mean
    // 3. Gaussian
    // 4. Kmin
    // 5. Kmax
    const [k1, k2] = this.principalCurvature();
    switch (method) {
      case CurvatureMethod.Mean:
        return (k1 + k2) * 0.5;
      case CurvatureMethod.Gaussian:
        return k1 * k2;
      case CurvatureMethod.Kmin:
        return k1 * 0.1;
      case CurvatureMethod.Kmax:
        return k2 * 0.1;
      case CurvatureMethod.None:
        return 0;
    }
  }
  // NOTE: you can add more methods if you need here
  principalCurvature() {
    const n = this.meanCurvature();
    const K = this.angleDefect();
    const H = K > 0 ? n.len() : -n.len();

    let d = H * H - K;
    d = d <= 0 ? 0 : Math.sqrt(d);
    return [H - d, H + d];
  }
  meanCurvature(): Vector {
    const a = this.voronoiCell();
    let sum = new Vector();
    this.halfedges(h => {
      if (h.onBoundary || h.twin!.onBoundary) {
        return;
      }
      sum = sum.add(h.vector().scale(h.cotan() + h.twin!.cotan()));
    });
    return sum.scale(1 / (2 * a));
  }
  angleDefect(): number {
    let sum = 0.0;
    this.halfedges(h => {
      if (h.onBoundary || h.twin!.onBoundary) {
        return;
      }
      sum += h.next!.angle();
    });
    return 2 * Math.PI - sum;
  }
  voronoiCell(): number {
    let a = 0;
    this.halfedges(h => {
      const u = h.prev!.vector().len();
      const v = h.vector().len();
      a += (u * u * h.prev!.cotan() + v * v * h.cotan()) / 8;
    });
    return a;
  }
}
