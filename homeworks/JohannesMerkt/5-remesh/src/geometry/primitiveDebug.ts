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
    if (!this.next) {
      throw new Error('Halfedge has no next');
    }
    if (!this.vert || !this.next!.vert) {
      throw new Error('Halfedge has no vert');
    }
    const a = this.next!.vert!;
    const b = this.vert!;
    return a.pos.sub(b.pos);
  }

  cotan(): number {
    if (this.onBoundary) {
      return 0;
    }
    if (!this.prev) {
      throw new Error('Halfedge has no prev');
    }
    if (!this.next) {
      throw new Error('Halfedge has no next');
    }
    const u = this.prev!.vector();
    const v = this.next!.vector().scale(-1);
    return u.dot(v) / u.cross(v).len();
  }

  angle(): number {
    if (!this.prev) {
      throw new Error('Halfedge has no prev');
    }
    if (!this.next) {
      throw new Error('Halfedge has no next');
    }
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
    /*if (this.err > -1) {
      return this.err;
    } */

    if (!this.halfedge) {
      throw new Error('Edge has no halfedge assigned');
    }
    if (!this.halfedge!.twin) {
      throw new Error('Halfedge has no twin assigned');
    }

    if (this.halfedge!.onBoundary || this.halfedge!.twin!.onBoundary) {
      return Infinity;
    }

    return this.calculateError(this.quadric(), this.bestVertex());
  }
  /**
   * bestVertex returns the optimal vertex that can replaces the connecting vertices
   * of the given edge.
   */
  bestVertex(): Vector {
    const quadric = this.quadric();
    const absDeterminant = Math.abs(quadric.det());
    if (absDeterminant > 1e-3) {
      const quadricCopy = quadric.copy();
      quadricCopy.x30 = 0;
      quadricCopy.x31 = 0;
      quadricCopy.x32 = 0;
      quadricCopy.x33 = 1;
      quadricCopy.inv();
      const vert = new Vector(
        quadricCopy.x03,
        quadricCopy.x13,
        quadricCopy.x23
      );
      if (!isNaN(vert.x) && !isNaN(vert.y) && !isNaN(vert.z)) {
        return vert;
      }
    }

    if (!this.halfedge) {
      throw new Error('edge has no halfedge assigned');
    }
    if (!this.halfedge!.next) {
      throw new Error('halfedge has no next assigned');
    }
    if (!this.halfedge!.vert || !this.halfedge!.next!.vert) {
      throw new Error('halfedge has no vert assigned');
    }

    const steps = 16;
    const vertA = this.halfedge!.vert!.pos;
    const vertB = this.halfedge!.next!.vert!.pos;
    const vecAB = vertB.sub(vertA);
    let bestEdgeError = -1.0;
    let bestVert = new Vector();
    for (let i = 0; i <= steps; i++) {
      const newVert = vertA.add(vecAB.scale(i / steps));
      const error = this.calculateError(quadric, newVert);
      if (bestEdgeError < 0 || error < bestEdgeError) {
        bestEdgeError = error;
        bestVert = newVert;
      }
    }
    return bestVert;
  }
  /**
   * quadric computes and returns the quadric matrix of the given edge
   */
  quadric(): Matrix {
    if (!this.halfedge) {
      throw new Error('edge has no halfedge assigned');
    }
    if (!this.halfedge.twin) {
      throw new Error('halfedge has no twin assigned');
    }
    if (!this.halfedge.vert || !this.halfedge.twin!.vert) {
      throw new Error('halfedge has no vert assigned');
    }
    return this.halfedge!.vert!.quadric().add(
      this.halfedge!.twin!.vert!.quadric()
    );
  }

  calculateError(quadric: Matrix, vert: Vector) {
    return (
      Math.pow(vert.x, 2) * quadric.x00 +
      vert.x * vert.y * quadric.x10 +
      vert.x * vert.z * quadric.x20 +
      vert.x * quadric.x30 +
      vert.y * vert.x * quadric.x01 +
      Math.pow(vert.y, 2) * quadric.x11 +
      vert.y * vert.z * quadric.x21 +
      vert.y * quadric.x31 +
      vert.z * vert.x * quadric.x02 +
      vert.z * vert.y * quadric.x12 +
      Math.pow(vert.z, 2) * quadric.x22 +
      vert.z * quadric.x32 +
      vert.x * quadric.x03 +
      vert.y * quadric.x13 +
      vert.z * quadric.x23 +
      quadric.x33
    );
  }

  connectedToVert(vert: Vertex) {
    if (!this.halfedge) {
      throw new Error('edge has no halfedge assigned');
    }
    if (!this.halfedge.twin) {
      throw new Error('halfedge has no twin assigned');
    }
    return this.halfedge.vert === vert || this.halfedge.twin!.vert === vert;
  }

  faces(): [Face, Face] {
    if (!this.halfedge) {
      throw new Error('edge has no halfedge assigned');
    }
    if (!this.halfedge.twin) {
      throw new Error('halfedge has no twin assigned');
    }
    if (!this.halfedge.face || !this.halfedge.twin!.face) {
      throw new Error('halfedge has no face assigned');
    }
    return [this.halfedge!.face!, this.halfedge!.twin!.face!];
  }

  connectedToFace(face: Face) {
    const faces = this.faces();
    return faces[0] === face || faces[1] === face;
  }

  sharesFace(edge: Edge) {
    const faces = edge.faces();
    const myFaces = this.faces();
    return (
      myFaces[0] === faces[0] ||
      myFaces[0] === faces[1] ||
      myFaces[1] === faces[0] ||
      myFaces[1] === faces[0]
    );
  }

  sharesFaces(edge: Edge) {
    const faces = edge.faces();
    const myFaces = this.faces();
    console.log(
      'face ' +
        faces[0].idx +
        ' ' +
        faces[1].idx +
        ' vs ' +
        myFaces[0].idx +
        ' ' +
        myFaces[1].idx
    );
    return (
      (myFaces[0] === faces[0] && myFaces[1] === faces[1]) ||
      (myFaces[1] === faces[0] && myFaces[0] === faces[1])
    );
  }

  onBoundary() {
    if (!this.halfedge) {
      throw new Error('edge has no halfedge assigned');
    }
    if (!this.halfedge.twin) {
      throw new Error('halfedge has no twin assigned');
    }
    return this.halfedge!.onBoundary || this.halfedge!.twin!.onBoundary;
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
      if (!h) {
        throw new Error('face halfedge or halfedge next is undefined');
      }
      fn(h.vert!, i);
      start = false;
      i++;
    }
  }
  halfedges(fn: (he: Halfedge, n: number) => void) {
    let start = true;
    let i = 0;
    for (let h = this.halfedge; start || h !== this.halfedge; h = h!.next) {
      if (!h) {
        throw new Error('face halfedge or halfedge next is undefined');
      }
      fn(h, i);
      start = false;
      i++;
    }
  }
  normal(): Vector {
    if (!this.halfedge) {
      throw new Error('Face has no halfedge');
    }
    if (this.halfedge.onBoundary) {
      return new Vector(0, 0, 0, 0);
    }
    if (!this.halfedge.prev) {
      throw new Error('Halfedge has no prev');
    }
    if (!this.halfedge.vert || !this.halfedge.prev.vert) {
      throw new Error('Halfedge has no vert');
    }
    // normals should based on the current position rather than
    // original position.
    const h = this.halfedge;
    const a = h.vert!.pos.sub(h.next!.vert!.pos);
    const b = h.prev!.vert!.pos.sub(h.vert!.pos).scale(-1);
    return a.cross(b).unit();
  }
  area(): number {
    if (!this.halfedge) {
      throw new Error('Face has no halfedge');
    }
    // Compute the area of this face.
    const h = this.halfedge;
    if (h.onBoundary) {
      return 0;
    }
    if (!this.halfedge.prev) {
      throw new Error('Halfedge has no prev');
    }
    if (!this.halfedge.vert || !this.halfedge.prev.vert) {
      throw new Error('Halfedge has no vert');
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
    if (!this.halfedge) {
      throw new Error('face is missing a halfedge');
    }
    if (!this.halfedge!.vert) {
      throw new Error('halfedge is missing a vert');
    }
    const position = this.halfedge!.vert!.pos;
    const normal = this.normal();
    const normPos =
      -normal.x * position.x - normal.y * position.y - normal.z * position.z;
    const t01 = normal.x * normal.y;
    const t02 = normal.x * normal.z;
    const t03 = normal.x * normPos;
    const t12 = normal.y * normal.z;
    const t13 = normal.y * normPos;
    const t23 = normal.z * normPos;
    return new Matrix(
      Math.pow(normal.x, 2),
      t01,
      t02,
      t03,
      t01,
      Math.pow(normal.y, 2),
      t12,
      t13,
      t02,
      t12,
      Math.pow(normal.z, 2),
      t23,
      t03,
      t13,
      t23,
      Math.pow(normPos, 2)
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
      if (!h) {
        throw new Error('Vert halfedge or halfedge twin next is undefined');
      }
      if (h.edge!.removed) {
        console.log('broken halfedgeid ' + h.idx);
        console.log('removed edgeId ' + h.edge!.idx);
        throw new Error('Halfedge shouldnt point to removed edge');
      }
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
      if (!h) {
        throw new Error('Vert halfedge or halfedge twin next is undefined');
      }
      if (h.edge!.removed) {
        console.log('broken halfedgeid ' + h.idx);
        console.log('removed edgeId ' + h.edge!.idx);
        throw new Error('Halfedge shouldnt point to removed edge');
      }
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
    let quadricMatrix = new Matrix();
    this.faces(face => {
      quadricMatrix = quadricMatrix.add(face.quadric());
    });
    return quadricMatrix;
  }
}
