// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import {Vector} from '../linalg/vec';

function triangleArea(a: number, b: number, c: number) {
  const semiperimeter = (a + b + c) / 2;
  return Math.sqrt(
    semiperimeter *
      (semiperimeter - a) *
      (semiperimeter - b) *
      (semiperimeter - c)
  );
}

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
    if (!this.twin) {
      throw new Error('halfedge has no twin assigned');
    }
    if (!this.vert || !this.twin!.vert) {
      throw new Error('halfedge has no vertex assigned');
    }
    return this.twin.vert!.position.sub(this.vert.position);
  }

  partialCotan(): Vector {
    if (this.onBoundary) {
      return new Vector();
    }
    if (!this.twin) {
      throw new Error('halfedge has no twin assigned');
    }
    if (!this.prev || !this.twin!.prev) {
      throw new Error('halfedge has no prev assigned');
    }
    const alhpa = this.twin!.prev!.angle();
    const beta = this.prev!.angle();
    const cot = (x: number) => {
      return 1 / Math.tan(x);
    };
    return this.vector().scale(cot(alhpa) + cot(beta));
  }

  angle(): number {
    // TODO: compute the tip angle at this edge.
    if (!this.prev) {
      throw new Error('halfedge has no prev assigned');
    }
    if (!this.prev!.twin) {
      throw new Error('halfedge has no twin assigned');
    }
    const faceAngle = Math.acos(
      this.vector().unit().dot(this.prev!.twin!.vector().unit())
    );
    return faceAngle;
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
    const positions: Vector[] = new Array(3);
    this.vertices((vert, number) => {
      positions[number] = vert.position;
    });
    const u = positions[1].sub(positions[0]);
    const v = positions[2].sub(positions[0]);
    return u.cross(v).unit();
  }

  area(): number {
    if (!this.halfedge) {
      throw new Error('face has no halfedge assigned');
    }
    if (!this.halfedge!.next) {
      throw new Error('halfedge has no next assigned');
    }
    if (!this.halfedge!.prev) {
      throw new Error('halfedge has no prev assigned');
    }
    const a = this.halfedge.vector().len();
    const b = this.halfedge.next!.vector().len();
    const c = this.halfedge.prev!.vector().len();
    return triangleArea(a, b, c);
    /* const semiperimeter = (a + b + c) / 2;
    return Math.sqrt(
      semiperimeter *
        (semiperimeter - a) *
        (semiperimeter - b) *
        (semiperimeter - c)
    ); */
  }

  circumcenter(halfedge: Halfedge) {
    if (halfedge.face?.idx !== this.idx) {
      throw new Error('halfedge doesnt belong to face');
    }
    const a = halfedge.vert!.position;
    const b = halfedge.prev!.vert!.position;
    const c = halfedge.next!.vert!.position;
    const acLengthPow = Math.pow(c.sub(a).len(), 2);
    const abLengthPow = Math.pow(b.sub(a).len(), 2);
    const crossbc = b.sub(a).cross(c.sub(a)).cross(b.sub(a));
    const crosscb = c.sub(a).cross(b.sub(a)).cross(c.sub(a));
    const dividend = crossbc.scale(acLengthPow).add(crosscb.scale(abLengthPow));
    const divisor = 2 * Math.pow(b.sub(a).cross(c.sub(a)).len(), 2);
    return a.add(dividend.scale(1 / divisor));
  }

  partialCellArea(halfedge: Halfedge) {
    const circumcenter = this.circumcenter(halfedge);
    const halfWay1 = halfedge.vert!.position.add(
      halfedge.vector().scale(1 / 2)
    );
    const he2 = halfedge.prev!.twin!;
    const halfWay2 = he2.vert!.position.add(he2.vector().scale(1 / 2));
    const vertexCircumcenter = halfedge.vert!.position.sub(circumcenter).len();
    const half1 = halfedge.vector().len() / 2;
    const half2 = he2.vector().len() / 2;
    const halfCircum1 = halfWay1.sub(circumcenter).len();
    const halfCircum2 = halfWay2.sub(circumcenter).len();

    return (
      triangleArea(vertexCircumcenter, half1, halfCircum1) +
      triangleArea(vertexCircumcenter, half2, halfCircum2)
    );
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
    const calculateVertexNormal = (weightFn: (face: Face) => number) => {
      let normalSum: Vector = new Vector();
      this.faces(face => {
        normalSum = normalSum.add(face.normal().scale(weightFn(face)));
      });
      return normalSum.unit();
    };
    if (method === NormalMethod.AreaWeighted) {
      return calculateVertexNormal(face => face.area());
    }
    if (method === NormalMethod.AngleWeighted) {
      return calculateVertexNormal(face => {
        if (!face.halfedge) {
          throw new Error('face has no halfedge assigned');
        }
        if (!face.halfedge.vert) {
          throw new Error('halfedge has no vert assigned');
        }
        let start = true;
        let he = face.halfedge!;
        while (start === true || he.vert!.idx !== this.idx) {
          if (!he.next) {
            throw new Error('halfedge has no next assigned');
          }
          he = he.next!;
          start = false;
        }
        return he.angle();
      });
    }
    return calculateVertexNormal(() => 1);
  }

  curvature(method = CurvatureMethod.Mean): number {
    if (method === CurvatureMethod.Mean) {
      return this.meanCurvature();
    }
    if (method === CurvatureMethod.Gaussian) {
      return this.gaussianCurvature();
    }
    if (method === CurvatureMethod.Kmin) {
      return this.kMinCurvature();
    }
    if (method === CurvatureMethod.Kmax) {
      return this.kMaxCurvature();
    }
    return 1;
  }

  meanCurvature() {
    let edgeCotanSum = new Vector();
    this.halfedges(halfedge => {
      edgeCotanSum = edgeCotanSum.add(halfedge.partialCotan());
    });
    let voronoiCellArea = 0;
    this.faces(face => {
      let he = face.halfedge!;
      let start = true;
      while (start === true || he.vert!.idx !== this.idx) {
        if (!he.next) {
          throw new Error('halfedge has no next assigned');
        }
        he = he.next!;
        start = false;
      }
      voronoiCellArea += face.partialCellArea(he);
    });
    const cotan = edgeCotanSum.scale(1 / (2 * voronoiCellArea));
    return cotan.len() / 2;
  }

  gaussianCurvature() {
    let angleSum = 0;
    this.halfedges(he => {
      angleSum += he.angle();
    });
    return 2 * Math.PI - angleSum;
  }

  kMinCurvature() {
    const mean = this.meanCurvature();
    const gaussian = this.gaussianCurvature();
    const powMean = Math.pow(mean, 2);
    const k1 = mean - Math.sqrt(powMean - gaussian);
    const k2 = mean + Math.sqrt(powMean - gaussian);
    return k1 > k2 ? k2 : k1;
  }

  kMaxCurvature() {
    const mean = this.meanCurvature();
    const gaussian = this.gaussianCurvature();
    const powMean = Math.pow(mean, 2);
    const k1 = mean - Math.sqrt(powMean - gaussian);
    const k2 = mean + Math.sqrt(powMean - gaussian);
    return k1 > k2 ? k1 : k2;
  }
}
