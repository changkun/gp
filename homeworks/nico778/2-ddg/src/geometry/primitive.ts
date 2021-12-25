// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import { timeStamp } from 'console';
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
    let a = this.vert?.position;
    let b = this.twin?.vert?.position;

    let ev = b!.sub(a!);
    return ev!;
  }
  cotan(): number {
    // TODO: Compute the cotan formula at this edge, if an edge
    // is on the boundary, then return zero.
    if(this.onBoundary) return 0.0;

    let a = this.prev!.vector();
    let b = this.next!.vector().scale(-1.0);

    let cotangent = a.dot(b) / a.cross(b).len();
    return cotangent;
  }
  angle(): number {
    // TODO: compute the tip angle at this edge.
    //use unit vector not length
    let a = this.prev!.vector().unit();
    let b = this.vector().scale(-1.0).unit();
    //-1.0 and 1.0 for range
    return Math.acos(Math.max(-1.0, Math.min(1.0, a.dot(b))));
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
    let a = this.halfedge!.vector();
    //both vectors same direction
    let b = this.halfedge!.prev!.vector().scale(-1.0);

    let normal = a.cross(b).unit();
    return normal;
  }
  area(): number {
    // TODO: compute the area of this face.
    let a = this.halfedge!.vector();
    //both vectors same direction
    let b = this.halfedge!.prev!.vector().scale(-1.0);
    // 0.5 for triangle
    let area = 0.5 * a.cross(b).len();
    return area;
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
    
    if(method === NormalMethod.EqualWeighted) {
      console.log('normal equal');
      let n = new Vector();
      this.halfedges(h => { n = n.add(h.face!.normal()) });
      return n.unit();
    }
    if(method === NormalMethod.AreaWeighted) {
      console.log('normal area');
      let n = new Vector();
      this.halfedges(h => { n = n.add(h.face!.normal().scale(h.next!.face!.area())) });
      return n.unit();
    }
    if(method === NormalMethod.AngleWeighted) {
      console.log('normal angle');
      let n = new Vector();
      this.halfedges(h => { n = n.add(h.face!.normal().scale(h.next!.angle())) });
      return n.unit();
    } else {
      return new Vector(0,0,0,0);
    }

  
  }
  
  curvature(method = CurvatureMethod.None): number {
    // TODO: compute curvature given different method:
    // 1. None
    // 2. Mean
    // 3. Gaussian
    // 4. Kmin
    // 5. Kmax
    const [k1, k2, kMin, kMax] = this.principalCurvature();

    switch(method) {
      case 'None':
        return 0;
      case 'Mean':
        if(this.gaussianCurvature() < 0) {
          return -0.5 * (k1 + k2);
        } else {
          return 0.5 * (k1 + k2);
        }
      case 'Caussian':
        return this.gaussianCurvature();
      case 'Kmin':
        return kMin;
      case 'Kmax':
        return kMax;
      default:
        return 0;
    }
  }
  voronoiCell() {
    let area = 0;
    this.halfedges(h => {
      let a = h.prev!.vector().len();
      let b = h.vector().len();
      area += (a*a*h.prev!.cotan() + b*b*h.cotan()) / 8;
    });
    return area;
  }

  laplaceBeltrami() {
    //discretization with cotangent
    const a = this.voronoiCell();
    let sum = new Vector();
    this.halfedges(h => { sum = sum.add(h.vector().scale(h.cotan() + h.twin!.cotan())) });
    return sum.scale(1 / (2 * a));
  }

  angleDefect() {
    let angleTotal = 0;
    this.halfedges(h => {
      angleTotal += h.angle();
    });
    return 2 * Math.PI - angleTotal;
  }
 

  principalCurvature() {
    let meanNormal = this.meanCurvature();
    let gauss = this.gaussianCurvature();
    const mnSquared = meanNormal * meanNormal;
    let H;
    let K;

    let k1 = meanNormal - Math.sqrt(mnSquared - gauss);
    let k2 = meanNormal + Math.sqrt(mnSquared - gauss);

    if(this.gaussianCurvature() < 0) {
      H = -0.5 * (k1 + k2);
    } else {
      H = 0.5 * (k1 + k2);
    }

    K = k1*k2;

    let kMin = H - Math.sqrt((H*H) - gauss);
    let kMax = H + Math.sqrt((H*H) - gauss);
    
    return[k1, k2, kMin, kMax];
  }
  // NOTE: you can add more methods if needed
  meanCurvature() {
    return 0.5 * this.laplaceBeltrami().len(); 
  }

  gaussianCurvature() {
    //approximation with angle defect
    return this.angleDefect();
  }

  kminCurvature() {
    let [k1, k2] = this.principalCurvature()
    let H;

    if(this.gaussianCurvature() < 0) {
      H = -0.5 * (k1 + k2);
    } else {
      H = 0.5 * (k1 + k2);
    }

    let kmin = this.meanCurvature() - Math.sqrt(H*H - this.gaussianCurvature());
    let kmax = this.meanCurvature() + Math.sqrt(H*H - this.gaussianCurvature());
    return kmin;
  }

  kmaxCurvature() {
    const mean = this.meanCurvature();
    const gauss = this.gaussianCurvature();
    const Mean = Math.pow(mean, 2);
    
    let k1 = mean - Math.sqrt(Mean - gauss);
    let k2 = mean + Math.sqrt(Mean - gauss);
    if(k1 > k2) {
      return k1; 
    } else {
      return k2;
    }
  }
}
