// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import {Vertex, Edge, Face, Halfedge} from './primitive';
import {Vector} from '../linalg/vec';

export class HalfedgeMesh {
  color: Vector;
  wireframe: Vector;

  // The following four fields are the key fields to represent half-edge based
  // meshes.
  verts: Vertex[]; // a list of vertices
  edges: Edge[]; // a list of edges
  faces: Face[]; // a list of faces
  halfedges: Halfedge[]; // a list of halfedges

  /**
   * constructor constructs the halfedge-based mesh representation.
   *
   * @param {string} data is a text string from an .obj file
   */
  constructor(data: string) {
    this.color = new Vector(0, 128, 255, 1);
    this.wireframe = new Vector(125, 125, 125, 1);

    // load .obj file
    const indices: number[] = [];
    const positions: Vector[] = [];
    const lines = data.split('\n');
    for (let line of lines) {
      line = line.trim();
      const tokens = line.split(' ');
      switch (tokens[0].trim()) {
        case 'v':
          positions.push(
            new Vector(
              parseFloat(tokens[1]),
              parseFloat(tokens[2]),
              parseFloat(tokens[3]),
              1
            )
          );
          break;
        case 'f':
          // only load indices of vertices
          for (let i = 1; i < tokens.length; i++) {
            const vv = tokens[i].split('/');
            indices.push(parseInt(vv[0]) - 1);
          }
          break;
      }
    }

    this.verts = [];
    this.edges = [];
    this.faces = [];
    this.halfedges = [];
    this.buildMesh(indices, positions);
  }

  /**
   * buildMesh builds half-edge based connectivity for the given vertex index buffer
   * and vertex position buffer.
   *
   * @param indices is the vertex index buffer that contains all vertex indices.
   * @param positions is the vertex buffer that contains all vertex positions.
   */
  buildMesh(indices: number[], positions: Vector[]) {
    console.log(indices.length);
    console.log(positions.length);
    console.log('start');
    // TODO: preinit arrays size for performance improvements
    //this.faces = new Array(indices.length / 3);
    this.verts = new Array(positions.length);
    this.faces = new Array(indices.length / 3);

    // create all vertices at once
    for (let i = 0; i < positions.length; i++) {
      const vert = new Vertex(positions[i]);
      vert.idx = i;
      this.verts[i] = vert;
    }

    const orderIds = (a: number, b: number) => {
      if (a < b) {
        return {a: b, b: a};
      }
      return {a, b};
    };

    const getOrderedIdKey = (a: number, b: number) => {
      const ordered = orderIds(a, b);
      return ordered.a + '-' + ordered.b;
    };

    // find all unique edges
    const edges = new Map<
      string,
      {
        vertA: number;
        vertB: number;
        created: boolean;
        halfA: number;
        halfB: number;
      }
    >();
    for (let i = 0; i < indices.length; i += 3) {
      for (let j = 0; j < 3; j++) {
        const a = indices[i + j];
        const b = indices[i + ((j + 1) % 3)];
        const key = getOrderedIdKey(a, b);
        if (!edges.has(key)) {
          // store the edge
          const orderedIds = orderIds(a, b);
          edges.set(key, {
            vertA: orderedIds.a,
            vertB: orderedIds.b,
            created: false,
            halfA: -1,
            halfB: -1,
          });
        }
      }
    }

    this.edges = new Array(edges.size);
    this.halfedges = new Array(edges.size * 2);
    let nextEdgeID = 0;

    // create faces, edges and halfedges
    for (let i = 0; i < indices.length; i += 3) {
      const f = new Face();
      f.idx = i / 3;
      this.faces[i / 3] = f;

      for (let j = 0; j < 3; j++) {
        const a = indices[i + j];
        const b = indices[i + ((j + 1) % 3)];
        const key = getOrderedIdKey(a, b);
        const edge = edges.get(key);
        if (edge) {
          if (!edge.created) {
            const e = new Edge();
            e.idx = nextEdgeID;
            const he1 = new Halfedge();
            he1.edge = e;
            he1.vert = this.verts[edge.vertA];
            he1.onBoundary = true;
            const he1ID = nextEdgeID * 2;
            he1.idx = he1ID;
            const he2 = new Halfedge();
            he2.edge = e;
            he2.vert = this.verts[edge.vertB];
            he2.onBoundary = true;
            const he2ID = nextEdgeID * 2 + 1;
            he2.idx = he2ID;
            he1.twin = he2;
            he2.twin = he1;
            this.verts[a].halfedge = he1;
            this.verts[b].halfedge = he2;
            if (a === edge.vertB) {
              this.verts[a].halfedge = he2;
              this.verts[b].halfedge = he1;
            }
            e.halfedge = he1;
            /* if (a === edge.a) {
              he1.onBoundary = false;
              he2.onBoundary = true;
            } else {
              he2.onBoundary = false;
              he1.onBoundary = true;
            } */
            this.edges[nextEdgeID] = e;
            this.halfedges[he1ID] = he1;
            this.halfedges[he2ID] = he2;
            nextEdgeID++;
            edge.created = true;
            edge.halfA = he1.idx;
            edge.halfB = he2.idx;
          }
          let faceHalfedgeID = edge.halfA;
          if (a === edge.vertB) {
            faceHalfedgeID = edge.halfB;
          }
          const he = this.halfedges[faceHalfedgeID];
          // assign first halfedge to face
          if (j === 0) {
            f.halfedge = he;
          }
          he.onBoundary = false;
        } else {
          throw new Error('Edge could not be found in edge map');
        }
      }

      // link prev and next halfedge circles
      for (let j = 0; j < 3; j++) {
        const a = indices[i + j];
        const b = indices[i + ((j + 1) % 3)];
        const key = getOrderedIdKey(a, b);
        const edge = edges.get(key);
        if (edge) {
          let faceHalfedgeID = edge.halfA;
          if (a === edge.vertB) {
            faceHalfedgeID = edge.halfB;
          }
          const he = this.halfedges[faceHalfedgeID];
          he.face = f;
          // next linking
          const nextKey = getOrderedIdKey(
            indices[i + ((j + 1) % 3)],
            indices[i + ((j + 2) % 3)]
          );
          const nextEdge = edges.get(nextKey);
          he.next = this.halfedges[nextEdge!.halfA];
          if (indices[i + ((j + 1) % 3)] === nextEdge!.vertB) {
            he.next = this.halfedges[nextEdge!.halfB];
          }
          // prev linking
          const prevKey = getOrderedIdKey(
            indices[i + ((j + 2) % 3)],
            indices[i + ((j + 3) % 3)]
          );
          const prevEdge = edges.get(prevKey);
          he.prev = this.halfedges[prevEdge!.halfA];
          if (indices[i + ((j + 2) % 3)] === prevEdge!.vertB) {
            he.prev = this.halfedges[prevEdge!.halfB];
          }
        } else {
          throw new Error('Edge could not be found in edge map');
        }
      }
    }
    // finally create halfedge loops for boundaries
    // first get all halfedges that are at a boundary
    const noNextBoundaryHalfedge = new Map<number, Halfedge>();
    const boundaryHalfedges = new Map<number, Halfedge>();
    for (let i = 0; i < this.halfedges.length; i++) {
      const he = this.halfedges[i];
      if (he.onBoundary) {
        const key = he.vert!.idx;
        boundaryHalfedges.set(key, he); // TODO: what if maybe two boundary edges on one vert!?
        noNextBoundaryHalfedge.set(key, he);
      }
    }
    // now find neighbours
    while (noNextBoundaryHalfedge.size > 0) {
      const values = noNextBoundaryHalfedge.entries().next().value;
      const key = values[0] as number;
      const he = values[1] as Halfedge;
      const nextVert = he.twin!.vert!;
      if (boundaryHalfedges.has(nextVert.idx)) {
        const nextHE = boundaryHalfedges.get(nextVert.idx)!;
        he.next = nextHE;
        nextHE.prev = he;
      }
      if (he.next && he.prev) {
        boundaryHalfedges.delete(key);
      }
      noNextBoundaryHalfedge.delete(key);
    }

    // test the halfedge implementation
    let noTwinCount = 0;
    let noNextCount = 0;
    let noPrevCount = 0;
    let noVertCount = 0;
    let noEdgeCount = 0;
    let noFaceCount = 0;
    let boundaryCount = 0;
    for (let i = 0; i < this.halfedges.length; i++) {
      const he = this.halfedges[i];
      if (!he.vert) {
        noVertCount++;
      }
      if (!he.edge) {
        noEdgeCount++;
      }
      if (!he.face && !he.onBoundary) {
        noFaceCount++;
      }
      if (!he.prev) {
        noPrevCount++;
      }
      if (!he.next) {
        noNextCount++;
      }
      if (!he.twin) {
        noTwinCount++;
      }
      if (he.onBoundary) {
        boundaryCount++;
      }
    }
    console.log('HE no vert count: ' + noVertCount);
    console.log('HE no edge count: ' + noEdgeCount);
    console.log('HE no face count: ' + noFaceCount);
    console.log('HE no prev count: ' + noPrevCount);
    console.log('HE no next count: ' + noNextCount);
    console.log('HE no twin count: ' + noTwinCount);
    console.log('HE boundary count: ' + boundaryCount);

    let noHECount = 0;
    for (let i = 0; i < this.verts.length; i++) {
      const vert = this.verts[i];
      if (!vert.halfedge) {
        noHECount++;
      }
    }
    console.log('VERT no he count: ' + noHECount);

    noHECount = 0;
    for (let i = 0; i < this.edges.length; i++) {
      const edge = this.edges[i];
      if (!edge.halfedge) {
        noHECount++;
      }
    }
    console.log('EDGE no he count: ' + noHECount);

    noHECount = 0;
    for (let i = 0; i < this.faces.length; i++) {
      const face = this.faces[i];
      if (!face.halfedge) {
        noHECount++;
      }
    }
    console.log('FACE no he count: ' + noHECount);
  }
}
