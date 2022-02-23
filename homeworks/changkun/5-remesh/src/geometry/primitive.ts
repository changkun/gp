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
  err?: number;
  removed: boolean;

  constructor() {
    this.idx = -1;
    this.removed = false;
  }
  error(): number {
    // Implemented edge error.
    //
    // We do not work on boundary edges, set their error to infinity, so
    // that the priority queue will never pop these edges.
    //
    // This is preferred. Boundary of a mesh are considered as features,
    // except the faulty noisy meshes. If that happens, we need clean up
    // the mesh first.

    if (this.err! > -1) {
      return this.err!;
    }

    // We do not work on boundary edges, set their error to infinity, so
    // that the priority queue will never pop these edges.
    //
    // This is preferred. Boundary of a mesh are considered as features,
    // except the faulty noisy meshes. If that happens, we need clean up
    // the mesh first.
    if (this.halfedge!.onBoundary || this.halfedge!.twin!.onBoundary) {
      this.err = 1e9;
      return this.err;
    }

    const q = this.quadric();
    const v = this.bestVertex();
    this.err = this.quadricError(q, v);
    return this.err;
  }
  /**
   * bestVertex returns the optimal vertex that can replaces the connecting vertices
   * of the given edge.
   * @returns {Vector}
   */
  bestVertex() {
    // Estimate the best replacing vertex by computing the quadric error.
    // If a quadric is ill-posed, search a best vertex on the current edge
    // The search process should sample a position iteratively from one
    // to the other. Use the one with least quadric error.

    const q = this.quadric();
    const dd = Math.abs(q.det());
    if (dd > 1e-3) {
      // prettier-ignore
      const qq = new Matrix(
        q.x00, q.x01, q.x02, q.x03,
        q.x10, q.x11, q.x12, q.x13,
        q.x20, q.x21, q.x22, q.x23,
        0, 0, 0, 1
      ).inv()
      const v = new Vector(qq.x03, qq.x13, qq.x23, 1);
      if (!isNaN(v.x) && !isNaN(v.y) && !isNaN(v.z)) {
        return v;
      }
    }

    // Ill-posed quadric equation, just search best vertex on the edge.
    const n = 16;
    const a = this.halfedge!.vert!.pos;
    const b = this.halfedge!.next!.vert!.pos;
    const d = b.sub(a);
    let beste = -1.0;
    let bestv = new Vector(0, 0, 0, 1);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const v = a.add(d.scale(t));
      const e = this.quadricError(q, v);
      if (beste < 0 || e < beste) {
        beste = e;
        bestv = v;
      }
    }
    return bestv;
  }
  /**
   * quadric computes and returns the quadric matrix of the given edge
   * @returns {Matrix}
   */
  quadric() {
    // Compute Edge Quadric Matrix
    const v1q = this.halfedge!.vert!.quadric();
    const v2q = this.halfedge!.twin!.vert!.quadric();
    return v1q.add(v2q);
  }
  quadricError(q: Matrix, v: Vector): number {
    // prettier-ignore
    return (
      v.x*q.x00*v.x + v.y*q.x10*v.x + v.z*q.x20*v.x + q.x30*v.x +
      v.x*q.x01*v.y + v.y*q.x11*v.y + v.z*q.x21*v.y + q.x31*v.y +
      v.x*q.x02*v.z + v.y*q.x12*v.z + v.z*q.x22*v.z + q.x32*v.z +
      v.x*q.x03     + v.y*q.x13     + v.z*q.x23     + q.x33
    )
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
  quadric() {
    // TODO: Compute Face Quadric
    const n = this.normal();

    // the vertex refering to the v1
    const x = this.halfedge!.vert!.pos.x;
    const y = this.halfedge!.vert!.pos.y;
    const z = this.halfedge!.vert!.pos.z;

    const a = n.x;
    const b = n.y;
    const c = n.z;
    const d = -a * x - b * y - c * z;
    // prettier-ignore
    const m = new Matrix(
      a*a, a*b, a*c, a*d,
      a*b, b*b, b*c, b*d,
      a*c, b*c, c*c, c*d,
      a*d, b*d, c*d, d*d,
    );
    return m;
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
   * @returns {Matrix}
   */
  quadric() {
    // Compute vertex quadric
    let q = new Matrix();
    this.faces(f => {
      q = q.add(f.quadric());
    });
    return q;
  }
}
