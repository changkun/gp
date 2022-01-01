// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import {Vector} from '../linalg/vec';
import {Matrix} from '../linalg/mat';

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
    return a.pos.sub(b.pos);
  }
  cotan(): number {
    if (this.onBoundary) {
      return 0;
    }
    const u = this.prev!.vector();
    const v = this.next!.vector().scale(-1);
    return u.dot(v) / u.cross(v).len();
  }
  angle(): number {
    const u = this.prev!.vector().unit();
    const v = this.next!.vector().scale(-1).unit();
    return Math.acos(Math.max(-1, Math.min(1, u.dot(v))));
  }
}

export class Edge {
  halfedge?: Halfedge;
  idx: number;
  err: number;
  removed: boolean;

  constructor() {
    this.idx = -1;
    this.removed = false;
    this.err = -1; // an error is guaranteed to be positive, hence initialize it as negative values.
  }
  error(): number {
    
    // If the error is cached, then return immediately.
    if (this.err > -1) {
      return this.err;
    }

    if(this.removed || this.halfedge!.onBoundary || this.halfedge!.twin!.onBoundary) {
      return Number.POSITIVE_INFINITY;
    }

    const pos = this.bestVertex();
    const quadric = this.quadric();
    this.err = Edge.positionError(pos, quadric);

    return this.err;
  }

  private static positionError(v: Vector, q: Matrix): number { // FIXME: For some reason, many errors are negative??
    const error = v.x * (v.x*q.x00 + v.y*q.x10 + v.z*q.x20 + q.x30) 
                  + v.y * (v.x*q.x01 + v.y +q.x11 + v.z*q.x21 + q.x31)
                  + v.z * (v.x*q.x02 + v.y*q.x12 + v.z*q.x22 + q.x32)
                  + (v.x*q.x03 + v.y*q.x13 + v.z*q.x23 + q.x33);
    return error;
  }

  /**
   * bestVertex returns the optimal vertex that can replaces the connecting vertices
   * of the given edge.
   */
  bestVertex(): Vector {
    let v = this.halfedge!.vert!.pos;
    
    try{ 
      // 1st try: quadric matrix is invertible
      let quadric = this.quadric();
      quadric.x30 = 0;
      quadric.x31 = 0;
      quadric.x32 = 0;
      quadric.x33 = 1;
      quadric = quadric.inv();
      let h = quadric.mul(new Vector(0,0,0,1));
      if(h instanceof Vector) v = h; // I hate Typescript
    }
    catch(e) {
      if(e !== 'zero determinant') {
        throw(e);
      }
      // 2nd try: chose vertex along edge segment
      const resolution = 5; // Determines how often the line segment is divided
      const quadric = this.quadric();

      const v2 = this.halfedge!.twin!.vert!.pos;
      let error_min = Number.POSITIVE_INFINITY;

      // Try out v and v2
      let best_pos = v;
      
      const v2_error = Edge.positionError(v2, quadric);
      if(v2_error < error_min) {
        error_min = v2_error;
        best_pos = v2;
      }
      
      let sample_points : Vector[] = [v, v2];
      // Sample edge by continuously dividing up the line segment into halves
      for(let step = 0; step < resolution; step++) {
       let newSamples = sample_points.slice();

        for(let div = 0; div < sample_points.length - 1; div++) {
          let half = sample_points[div].add(sample_points[div+1]).scale(1/2);
          let error = Edge.positionError(half, quadric);
          if(error < error_min) {
            best_pos = half;
            error_min = error;
          }
          newSamples.splice(div + 1, 0, half);
        }
        sample_points = newSamples;
      }
      v = best_pos;
    }
    //v.w = 1;
    
    
    return v;
  }
  /**
   * quadric computes and returns the quadric matrix of the given edge
   */
  quadric(): Matrix {
    return this.halfedge!.vert!.quadric().add(this.halfedge!.twin!.vert!.quadric());
  }
}

export class Face {
  halfedge?: Halfedge;
  idx: number;
  removed: boolean;

  constructor() {
    this.idx = -1;
    this.removed = false;
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
  halfedges(fn: (he: Halfedge, n: number) => void) {
    let start = true;
    let i = 0;
    for (let h = this.halfedge; start || h !== this.halfedge; h = h!.next) {
      fn(h!, i);
      start = false;
      i++;
    }
  }
  normal(): Vector {
    if (this.halfedge!.onBoundary) {
      return new Vector(0, 0, 0, 0);
    }
    // normals should based on the current position rather than
    // original position.
    const h = this.halfedge!;
    const a = h.vert!.pos.sub(h.next!.vert!.pos);
    const b = h.prev!.vert!.pos.sub(h.vert!.pos).scale(-1);
    return a.cross(b).unit();
  }
  area(): number {
    // Compute the area of this face.
    const h = this.halfedge!;
    if (h.onBoundary) {
      return 0;
    }
    const a = h.vert!.pos.sub(h.next!.vert!.pos);
    const b = h.prev!.vert!.pos.sub(h.vert!.pos).scale(-1);
    return a.cross(b).len() * 0.5;
  }
  /**
   * quadric computes and returns the quadric matrix of the given face
   * @returns {Matrix}
   */
  quadric(): Matrix {
    const normal = this.normal();
    const pos = this.halfedge!.vert!.pos;
    const nx = -normal.x * pos.x - normal.y * pos.y - normal.z * pos.z;
    // FIXME: Performance, the Matrix is symmetric (less computations needed)
    return new Matrix(normal.x*normal.x, normal.x*normal.y, normal.x*normal.z, normal.x*nx,
      normal.y*normal.x, normal.y*normal.y, normal.y*normal.z, normal.y*nx,
      normal.z*normal.x, normal.z*normal.y, normal.z*normal.z, normal.z*nx,
      nx*normal.x, nx*normal.y, nx*normal.z, nx*nx
      );
    }
}

export enum NormalMethod {
  EqualWeighted = 'Equal Weighted',
  AreaWeighted = 'Area Weighted',
  AngleWeighted = 'Angle Weighted',
}

export class Vertex {
  pos: Vector;
  posOrig: Vector;
  halfedge?: Halfedge;
  idx: number;

  constructor(pos: Vector) {
    this.pos = pos;
    this.posOrig = new Vector(pos.x, pos.y, pos.z, 1);
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
  vertices(fn: (h: Vertex, i: number) => void) {
    this.halfedges((h, i) => {
      fn(h.next!.vert!, i);
    });
  }
  normal(method = NormalMethod.EqualWeighted): Vector {
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
  /**
   * quadric computes and returns the quadric matrix of the given vertex
   */
  quadric(): Matrix {
    let sum = new Matrix();

    this.faces(face => {
      sum = sum.add(face.quadric());
    });

    return sum;
  }
}
