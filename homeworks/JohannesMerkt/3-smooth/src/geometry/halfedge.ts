// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

// API Usage about @penrose/linear-algebra:
//
//   - There are two types of matrices: SparseMatrix and DenseMatrix
//   - SparseMatrix.identity(n, n) gives you a identity matrix with
//     n x n dimension
//   - Triplet represents a small structure to hold non-zero entries in
//     SparseMatrix, each entry is (x, i, j). To construct a SparseMatrix,
//     here is an example:
//
//       let A = new Triplet(2, 2)          // Triplet for 2x2 SparseMatrix
//       A.addEntry(1, 0, 0)                // A(0, 0) += 1
//       A.addEntry(2, 1, 1)                // A(1, 1) += 2
//       return SparseMatrix.fromTriplet(T) // Construct SparseMatrix
//
//   - A.timesSparse(B) returns A*B where A and B are SparseMatrix.
//   - A.plus(B) returns A+B where A and B are SparseMatrix.
//   - A.timesReal(s) returns sA where A is SparseMatrix and s is a real number.
//   - A.chol() returns a sparse Cholesky decomposition.
//   - A.solvePositiveDefinite(b) solves linear equation Ax=b where
//     A is a Cholesky decomposition, and b is a DenseMatrix, and x is the solution.
//   - For a DenseMatrix A, one can use A.set(x, i, j) for A(i,j)=x,
//     and A.get(i, j) returns A(i,j).
//
// Further APIs regarding @penrose/linear-algebra can be found
// in node_modules/@penrose/linear-algebra/docs/*.html, but the above
// information are all the APIs you need for this project.
import {SparseMatrix, DenseMatrix, Triplet} from '@penrose/linear-algebra';
import {Vertex, Edge, Face, Halfedge} from './primitive';
import {Vector} from '../linalg/vec';

export enum WeightType {
  Uniform = 'Uniform',
  Cotan = 'Cotan',
}

export class HalfedgeMesh {
  color: Vector;
  wireframe: Vector;

  // The following four fields are the key fields to represent half-edge based
  // meshes.
  vertsOrig: Vertex[]; // The original copy of all vertex positions
  verts: Vertex[]; // The current vertex that are updated after smooth for actual rendering
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

    this.vertsOrig = [];
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
    this.vertsOrig = new Array(positions.length);
    this.faces = new Array(indices.length / 3);

    // create all vertices at once
    for (let i = 0; i < positions.length; i++) {
      const vert = new Vertex(positions[i].copy());
      vert.idx = i;
      this.verts[i] = vert;
      const vertOriginal = new Vertex(positions[i].copy());
      vertOriginal.idx = i;
      this.vertsOrig[i] = vertOriginal;
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
            he1.vertsOrig = this.vertsOrig;
            he1.face = f;
            he1.onBoundary = true;
            const he1ID = nextEdgeID * 2;
            he1.idx = he1ID;
            const he2 = new Halfedge();
            he2.edge = e;
            he2.vert = this.verts[edge.vertB];
            he2.vertsOrig = this.vertsOrig;
            he2.face = f;
            he2.onBoundary = true;
            const he2ID = nextEdgeID * 2 + 1;
            he2.idx = he2ID;
            he1.twin = he2;
            he2.twin = he1;
            this.verts[a].halfedge = he1;
            this.vertsOrig[a].halfedge = he1;
            this.verts[b].halfedge = he2;
            this.vertsOrig[b].halfedge = he2;
            if (a === edge.vertB) {
              this.verts[a].halfedge = he2;
              this.vertsOrig[a].halfedge = he2;
              this.verts[b].halfedge = he1;
              this.vertsOrig[b].halfedge = he1;
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

  /**
   * smooth performs the Laplacian smoothing algorithm.
   * @param weightType indicates the type of the weight for
   * constructing the Laplace matrix. Possible value could be: 'uniform',
   * 'cotan'.
   * @param timeStep the time step in Laplacian Smoothing algorithm
   * @param smoothStep the smooth step in Laplacian Smoothing algorithm
   */
  smooth(weightType: WeightType, timeStep: number, smoothStep: number) {
    // TODO: implmeent the Laplacian smoothing algorithm.
    //
    // Hint:
    //
    //   1. Build f(t)
    const f = DenseMatrix.zeros(this.vertsOrig.length, 3);
    this.vertsOrig.forEach(vert => {
      f.set(vert.position.x, vert.idx, 0);
      f.set(vert.position.y, vert.idx, 1);
      f.set(vert.position.z, vert.idx, 2);
    });
    //   2. Build the mass matrix `M`
    const T = new Triplet(this.verts.length, this.verts.length);
    if (weightType === WeightType.Uniform) {
      this.verts.forEach((vert, index) => {
        T.addEntry(vert.halfedgeCount(), index, index);
      });
    } else {
      this.verts.forEach((vert, index) => {
        T.addEntry(100 * vert.voronoiCell(), index, index);
      });
    }
    const M = SparseMatrix.fromTriplet(T);
    //   3. Build the Laplace weight matrix `W` for the given `weightType` in laplaceWeightMatrix
    const W = this.laplaceWeightMatrix(weightType);
    //   4. Solve linear system (M - tλW)f' = Mf using a Cholesky solver.
    const leftSide = M.plus(W.timesReal(timeStep * smoothStep));
    const rightSide = M.timesDense(f);
    const f_tick = leftSide.chol().solvePositiveDefinite(rightSide);
    //   5. Update the position of mesh vertices based on the solution f'.
    for (let i = 0; i < this.verts.length; i++) {
      const vert = this.verts[i];
      vert.position.x = f_tick.get(i, 0);
      vert.position.y = f_tick.get(i, 1);
      vert.position.z = f_tick.get(i, 2);
    }
  }

  /**
   * laplaceWeightMatrix returns the Laplace weight matrix for a given laplaceType
   * @param weightType indicates the type of the weight for
   * constructing the Laplace matrix.
   */
  laplaceWeightMatrix(weightType: WeightType) {
    // TODO: implement laplacian matrix for a given weight type.
    //
    // Hint: To avoid numeric issue when solving linear equation,
    // add 1e-8 to all elements.
    const T = new Triplet(this.verts.length, this.verts.length);
    if (weightType === WeightType.Uniform) {
      this.verts.forEach((vert, index) => {
        let weight = 1e-8;
        vert.halfedges(halfedge => {
          weight += 1;
          T.addEntry(-1, index, halfedge.twin!.vert!.idx);
        });
        T.addEntry(weight, index, index);
      });
    } else {
      this.verts.forEach((vert, index) => {
        let weight = 1e-8;
        vert.halfedges(halfedge => {
          const cotan = (halfedge.cotan() + halfedge.twin!.cotan()) / 2;
          weight += cotan;
          T.addEntry(-cotan, index, halfedge.twin!.vert!.idx);
        });
        T.addEntry(weight, index, index);
      });
    }

    return SparseMatrix.fromTriplet(T);
  }
}

// API Usage about @penrose/linear-algebra:
//
//   - There are two types of matrices: SparseMatrix and DenseMatrix
//   - SparseMatrix.identity(n, n) gives you a identity matrix with
//     n x n dimension
//   - Triplet represents a small structure to hold non-zero entries in
//     SparseMatrix, each entry is (x, i, j). To construct a SparseMatrix,
//     here is an example:
//
//       let A = new Triplet(2, 2)          // Triplet for 2x2 SparseMatrix
//       A.addEntry(1, 0, 0)                // A(0, 0) += 1
//       A.addEntry(2, 1, 1)                // A(1, 1) += 2
//       return SparseMatrix.fromTriplet(T) // Construct SparseMatrix
//
//   - A.timesSparse(B) returns A*B where A and B are SparseMatrix.
//   - A.plus(B) returns A+B where A and B are SparseMatrix.
//   - A.timesReal(s) returns sA where A is SparseMatrix and s is a real number.
//   - A.chol() returns a sparse Cholesky decomposition.
//   - A.solvePositiveDefinite(b) solves linear equation Ax=b where
//     A is a Cholesky decomposition, and b is a DenseMatrix, and x is the solution.
//   - For a DenseMatrix A, one can use A.set(x, i, j) for A(i,j)=x,
//     and A.get(i, j) returns A(i,j).
//
// Further APIs regarding @penrose/linear-algebra can be found
// in node_modules/@penrose/linear-algebra/docs/*.html, but the above
// information are all the APIs you need for this project.
