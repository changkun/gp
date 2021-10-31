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

  idx: Number;
  onBoundary: boolean;

  constructor() {
    this.idx = -1;
    this.onBoundary = false;
  }
}

export class Edge {
  halfedge?: Halfedge;
  idx: Number;

  constructor() {
    this.idx = -1;
  }
}

export class Face {
  halfedge?: Halfedge;
  idx: Number;

  constructor() {
    this.idx = -1;
  }
  vertices(fn: (v: Vertex, n: number) => void) {
    let start = true;
    let i = 0;
    for (let h = this.halfedge; start || h !== this.halfedge; h = h!.next) {
      //console.log(h)
      fn(h!.vert!, i);
      start = false;
      i++;
    }
  }
}

export class Vertex {
  position: Vector;
  halfedge?: Halfedge;
  idx: Number;

  constructor(position: Vector) {
    this.position = position;
    this.idx = -1;
  }
}
