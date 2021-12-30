// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import {Vector} from '../linalg/vec';
import {Matrix} from '../linalg/mat';
import { Vector3 } from 'three';

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

    // TODO: implemented edge error.
    //
    // Hint:
    //    We do not work on boundary edges, set their error to infinity, so
    //    that the priority queue will never pop these edges.
    //
    //    This is preferred. Boundary of a mesh are considered as features,
    //    except the faulty noisy meshes. If that happens, we need clean up
    //    the mesh first.

    if (this.halfedge == undefined){
      console.log("No Halfedge at edge")
      return -1;
    }

    if (this.halfedge!.onBoundary || this.halfedge!.twin!.onBoundary) {
      this.err = Number.POSITIVE_INFINITY;
    }




    //Compute quadric error using formula: _x^T * Q * _x
    const q = this.quadric();
    const x = this.bestVertex();

    this.err = this.calcError(q,x);

    return this.err;
  }

  //Use subfunction to test different values:
  //Computes quadric error using formula: _x^T * Q * _x
  calcError(q: Matrix, x: Vector){
    return (
      x.x*q.x00*x.x + x.y*q.x10*x.x + x.z*q.x20*x.x + q.x30*x.x +
      x.x*q.x01*x.y + x.y*q.x11*x.y + x.z*q.x21*x.y + q.x31*x.y +
      x.x*q.x02*x.z + x.y*q.x12*x.z + x.z*q.x22*x.z + q.x32*x.z +
      x.x*q.x03     + x.y*q.x13     + x.z*q.x23     + q.x33
    );
  }


  /**
   * bestVertex returns the optimal vertex that can replaces the connecting vertices
   * of the given edge.
   */
  bestVertex(): Vector {
    // TODO: estimate the best replacing vertex by computing
    // the quadric error.
    //
    //      determine Position by solving _x^T * Q * _x
    //      From quadrics paper (https://www.cs.cmu.edu/~garland/Papers/quadrics.pdf), page 3: _v = ...

    const q = this.quadric();
    const d = Math.abs(q.det());

    //Matrix is invertable if determinant > 0
    if (d>0){
    const q2 = new Matrix(
      q.x00, q.x01, q.x02, q.x03,
      q.x10, q.x11, q.x12, q.x13,
      q.x20, q.x21, q.x22, q.x23,
      0,      0,      0,      1
    ).inv();
    
    //position for new x
    const x = new Vector(q2.x03, q2.x13,q2.x23,1);

    // check if Numbers are valid
    if (x.x != Number.NaN && x.y != Number.NaN && x.z != Number.NaN )
    return x;
    }

    //else: find better vertex
    const he = this.halfedge!;
    const vert = this.halfedge!.vert!;

    // Hint:
    //      If a quadric is ill-posed, search a best vertex on the current edge
    //      The search process should sample a position iteratively from one
    //      to the other. Use the one with least quadric error.
    //
    //  	  save best position and error:
    let v = new Vector();
    let err = -1;

    //number of positions on edge to check
    const n = 8;

    for (let i = 0; i<n; i++){
      let pos = vert.pos.add(he.vector().scale(i/n));
      let temp_e = this.calcError(q, pos);

      //if no error computed yet, or error is smaller then current minimum overwrite
      if (err < 0 || temp_e < err){
        err = temp_e;
        v = pos;
      }

    }

    return v;
  }

  /**
   * quadric computes and returns the quadric matrix of the given edge
   */
  quadric(): Matrix {

    // Edge Quadric Matrix = Q1+Q2 with Q1 and Q2 being the vertex quadrics of the edges vertices
    let v1 = this.halfedge!.vert!;
    let v2 = this.halfedge!.next!.vert!;

    const q1 = v1.quadric();
    const q2 = v2.quadric();

    return q1.add(q2);
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
    // TODO: Compute Face Quadric
    return new Matrix();
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
    // TODO: compute vertex quadric
    // Sum over face quadrics of the vertexes neighbouring faces
    let q = new Matrix();

    this.faces((f,i)=>{

      const n = f.normal();
      const x = n.x;
      const y = n.y;
      const z = n.z;
      const v_x = this.pos.x;
      const v_y = this.pos.y;
      const v_z = this.pos.z;

      //4th dimension coordinate for face quadric
      const d = -(x * v_x) -(y * v_y) -(z * v_z);

      //f_q is face quadric
      const f_q = new Matrix(
        x*x, x*y, x*z, x*d,
        x*y, y*y, y*z, y*d,
        x*z, z*y, z*z, z*d,
        x*d, y*d, z*d, d*d
      )
      q = q.add(f_q)

    })

    return q;
  }
}
