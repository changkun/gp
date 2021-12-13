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
    // TODO: Implement Tutte's barycentric embedding
    //
    // Implementation procedure:
    //
    //    1. check if the mesh contains at least a boundary. Otherwise, throw an error.
    //    2. compute boundary uv coordinates depending on the boundary type.
    //    3. compute matrix depending on the laplacian weight type.
    //    4. solve linear equation and assing computed uv to corresponding vertex uv.
    //
    let matrices = this.computeBoundaryMatrices(boundaryType);  
    let uCoo = matrices[0];
    let vCoo = matrices[1];

    //compute laplacian matrix 
    let A = this.computeInteriorMatrix(uCoo, vCoo, laplaceWeight);

    let lu = A.lu();
    let u = lu.solveSquare(uCoo);
    let v = lu.solveSquare(vCoo);

    for(let vert of this.verts) {
      //add 0.5 here not in cBM 
      vert.uv = new Vector(u.get(vert.idx) + 0.5, v.get(vert.idx) + 0.5, 0);
    }
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
    const U = DenseMatrix.zeros(this.verts.length);
    const V = DenseMatrix.zeros(this.verts.length);

    // TODO: compute the right hand side of the linear parameterization system
    // for boundary vertices depending on the type of the boundary.
    //
    // Note that the coordinates of boundary vertices is derived from the
    // property of "convex in order".
    
    let bhes = 0;
    this.boundaries[0].halfedges(() => bhes++);
    const radius = 0.5;

    switch(boundaryType) {
      case 'disk':
        this.boundaries[0].halfedges((h, i) => {  
          U.set((radius*Math.cos(2*Math.PI*i/bhes) + radius) - 0.5, h!.vert!.idx);
          V.set((radius*Math.sin(2*Math.PI*i/bhes) + radius) - 0.5, h!.vert!.idx);
        });
        break
      case 'rect':
        let dist = 0;
        let index = 0;
        let i = 0;

        this.boundaries[0].halfedges(h => {
          let flip = (-1) ** ((index / 2) << 0);
          let step = (i/bhes) * 4;
          let u = 0;
          let v = 0;

          if(dist >= 1) {
            if(index%2 == 0) {
              u = flip * -0.5;
              v = flip * 0.5;
            } else {
              u = flip * -0.5;
              v = flip * -0.5;
            }

            dist -= 1;
            i = 0;
            index++;

          } else {
            if(index%2 == 0) {
              u = flip * (0.5-step);
              v = flip * (0.5);
            } else {
              u = flip * (-0.5);
              v = flip * (0.5-step);
            }

            dist += (1/bhes) * 4;
            i++;

          }
          U.set(u, h.vert!.idx);
          V.set(v, h.vert!.idx);
        });
        break
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

    // TODO: compute the left hand side of the linear parameterization system
    // for interior vertices that we want to compute their parameterization.
    //
    // Note that the interior matrix is essentially the Laplace matrix, but
    // the elements that corresponding to the boundary vertices are zerored out.
    
  
  for(const vert of this.verts) {
    const i = vert.idx;
    if(U.get(i) != 0 || V.get(i) != 0) {
      T.addEntry(1, i, i);
    } else {
    let sum = 1e-8;
    vert.halfedges(h => {
      let w = 0;
      switch(laplaceWeight) {
        case 'Uniform':
          w = 1;
          break
        case 'Cotan':
          w = (h.cotan() + h!.twin!.cotan())/2;
          break
      }
      sum += w;
      T.addEntry(-w, i, h!.twin!.vert!.idx);
    })
    T.addEntry(sum, i, i);
  }
  }

    return SparseMatrix.fromTriplet(T);
  }
}
