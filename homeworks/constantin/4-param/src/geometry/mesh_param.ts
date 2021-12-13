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
import { assert } from 'console';
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
    if(!(this.boundaries.length>0)){
      //assert("We need at least one boundary");
      console.log("We need at least one boundary");
      throw new Error("We need at least one boundary");
    }
    //    2. compute boundary uv coordinates depending on the boundary type.
    const UV=this.computeBoundaryMatrices(boundaryType);
    //    3. compute matrix depending on the laplacian weight type.
    const interior=this.computeInteriorMatrix(UV[0],UV[1],laplaceWeight);
    //    4. solve linear equation
    //
    console.log("solving Begin");
    const lu=interior.lu();
    const u1=lu.solveSquare(UV[0]);
    const v1=lu.solveSquare(UV[1]);
    // assing computed uv to corresponding vertex uv.
    for(let vert of this.verts){
      vert.uv!.x=u1.get(vert.idx);
      vert.uv!.y=v1.get(vert.idx);
    }
    console.log("solving End");
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
    console.log(" computeBoundaryMatrices Begin");
    const U = DenseMatrix.zeros(this.verts.length);
    const V = DenseMatrix.zeros(this.verts.length);

    const nHalfedges=this.halfedges.length;
    //if(boundaryType=='disk'){
      this.halfedges.forEach((he,idx)=>{
        // how much we move for this halfedge
        let delta=idx/nHalfedges;
        let u=Math.cos(2*Math.PI*delta);
        let v=Math.sin(2*Math.PI*delta);
        U.set(u,he.idx);
        V.set(v,he.idx);
      });
    //}
    // TODO: compute the right hand side of the linear parameterization system
    // for boundary vertices depending on the type of the boundary.
    //
    // Note that the coordinates of boundary vertices is derived from the
    // property of "convex in order".
    console.log(" computeBoundaryMatrices End");
    return [U, V]
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
    console.log("computeInteriorMatrix Begin");
    //const T = new Triplet(this.verts.length, this.verts.length);

    // TODO: compute the left hand side of the linear parameterization system
    // for interior vertices that we want to compute their parameterization.
    //
    // Note that the interior matrix is essentially the Laplace matrix, but
    // the elements that corresponding to the boundary vertices are zerored out.
    //return SparseMatrix.fromTriplet(T);
    const size = this.verts.length;
    let triplet = new Triplet(size, size);
    //TODO
    // copy paste from previous homework
    for (const vert of this.verts) {
      const idx = vert.idx;
      let weightSum = 0;
      vert.halfedges(he => {
        let weight = 0;
        switch (laplaceWeight) {
          case 'Uniform':
            weight = 1;
            break;
          case 'Cotan':
            // lecture: 1/2*(cotan(alpha)+cotan(beta))
            const cotanSum = he.cotan() + he.twin!.cotan();
            const cotanSumHalf = cotanSum / 2.0;
            weight = cotanSumHalf;
            break;
        }
        triplet.addEntry(weight, idx, he.twin!.vert!.idx);
        weightSum += weight;
      });
      triplet.addEntry(-weightSum, idx, idx);
    }
    // xxx
    const tmp = SparseMatrix.fromTriplet(triplet);
    console.log("computeInteriorMatrix End");
    return tmp;
  }
}
