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
import {DenseMatrix, SparseMatrix, Triplet} from '@penrose/linear-algebra';
import {Vector} from '../linalg/vec';
import {HalfedgeMesh} from './halfedge_mesh';
import {Halfedge} from './primitive';

export enum WeightType {
  Uniform = 'Uniform',
  Cotan = 'Cotan',
}

export enum BoundaryType {
  Disk = 'disk',
  Rectangle = 'rect',
}

export class ParameterizedMesh extends HalfedgeMesh {
  /**
   * constructor constructs the halfedge-based mesh representation.
   *
   * @param {string} data is a text string from an .obj file
   */
  constructor(data: string) {
    super(data);
  }
  /**
   * flatten computes the UV coordinates of the given triangle mesh.
   *
   * This implementation reuiqres the mesh contains at least one
   * boundary loop.
   *
   * @param {BoundaryType} boundaryType 'disk', or 'rect'
   * @param {WeightType} laplaceWeight 'uniform', or 'cotan'
   */
  flatten(boundaryType: BoundaryType, laplaceWeight: WeightType) {
    //    1. check if the mesh contains at least a boundary. Otherwise, throw an error.
    if (!(this.boundaries.length > 0)) {
      throw new Error('HalfedgeMesh has no boundary: cannot flatten');
    }
    //    2. compute boundary uv coordinates depending on the boundary type.
    const [U, V] = this.computeBoundaryMatrices(boundaryType);
    //    3. compute matrix depending on the laplacian weight type.
    const L = this.computeInteriorMatrix(U, V, laplaceWeight);
    //    4. solve linear equation.
    // solve L*U' = U and L*V' = V
    const lowerUpperFactorization = L.lu();
    const Utick = lowerUpperFactorization.solveSquare(U);
    const Vtick = lowerUpperFactorization.solveSquare(V);
    //    5. assign computed uv to corresponding vertex uv.
    this.verts.forEach(vert => {
      vert.uv = new Vector(
        0.5 + Utick.get(vert.idx),
        0.5 + Vtick.get(vert.idx),
        0
      );
    });
  }

  /**
   * computeBoundaryMatrices computes and returns the two matrices for
   * boundary vertices.
   *
   * @param {BoundaryType} boundaryType 'disk', or 'rect'
   */
  computeBoundaryMatrices(
    boundaryType: BoundaryType
  ): [typeof DenseMatrix, typeof DenseMatrix] {
    const U = DenseMatrix.zeros(this.verts.length); // ommitted second argument is 1 by default so a vector
    const V = DenseMatrix.zeros(this.verts.length);
    const boundaryHalfedges: Halfedge[] = [];
    this.boundaries[0].halfedges(halfedge => boundaryHalfedges.push(halfedge));
    if (boundaryType === BoundaryType.Disk) {
      boundaryHalfedges.forEach((halfedge, index) => {
        const rotation = index / boundaryHalfedges.length;
        U.set(0.5 * Math.cos(2 * Math.PI * rotation), halfedge.vert!.idx);
        V.set(0.5 * Math.sin(2 * Math.PI * rotation), halfedge.vert!.idx);
      });
    } else {
      boundaryHalfedges.forEach((halfedge, index) => {
        const boundaryPosition = (index / boundaryHalfedges.length) * 4;
        let sideOffset = boundaryPosition;
        let x = sideOffset;
        let y = 0;
        if (boundaryPosition > 1 && boundaryPosition <= 2) {
          sideOffset = boundaryPosition - 1;
          y = sideOffset;
          x = 1;
        }
        if (boundaryPosition > 2 && boundaryPosition <= 3) {
          sideOffset = boundaryPosition - 2;
          x = 1 - sideOffset;
          y = 1;
        }
        if (boundaryPosition > 3 && boundaryPosition <= 4) {
          sideOffset = boundaryPosition - 3;
          y = 1 - sideOffset;
          x = 0;
        }
        U.set(x - 0.5, halfedge.vert!.idx);
        V.set(y - 0.5, halfedge.vert!.idx);
      });
    }
    return [U, V];
  }

  /**
   * computeInteriorMatrices returns the sparse matrix for interior vertices.
   *
   * @param U the U dimension of boundary vertices
   * @param V the V dimension of boundary vertices
   * @param laplaceWeight the weight type of laplacian
   */
  computeInteriorMatrix(
    U: typeof DenseMatrix,
    V: typeof DenseMatrix,
    laplaceWeight: WeightType
  ): typeof SparseMatrix {
    const T = new Triplet(this.verts.length, this.verts.length);
    if (laplaceWeight === WeightType.Uniform) {
      this.verts.forEach(vert => {
        if (U.get(vert.idx) !== 0 || V.get(vert.idx) !== 0) {
          T.addEntry(1, vert.idx, vert.idx);
        } else {
          let weight = 0;
          vert.halfedges(halfedge => {
            weight += 1;
            T.addEntry(1, vert.idx, halfedge.twin!.vert!.idx);
          });
          T.addEntry(-weight, vert.idx, vert.idx);
        }
      });
    } else {
      this.verts.forEach(vert => {
        if (U.get(vert.idx) !== 0 || V.get(vert.idx) !== 0) {
          T.addEntry(1, vert.idx, vert.idx);
        } else {
          let weight = 0;
          vert.halfedges(halfedge => {
            const cotan = (halfedge.cotan() + halfedge.twin!.cotan()) / 2;
            weight += cotan;
            T.addEntry(cotan, vert.idx, halfedge.twin!.vert!.idx);
          });
          T.addEntry(-weight, vert.idx, vert.idx);
        }
      });
    }
    return SparseMatrix.fromTriplet(T);
  }
}
