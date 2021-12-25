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
import { Vertex } from './primitive';

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
    // Implement Tutte's barycentric embedding
    //
    // Implementation procedure:
    //
    //    1. check if the mesh contains at least a boundary. Otherwise, throw an error.
    console.log(this.boundaries)
    if(this.boundaries.length === 0) {
      // TODO: Error
      return;
    }

    //    2. compute boundary uv coordinates depending on the boundary type.
    let UV = this.computeBoundaryMatrices(boundaryType);

    //    3. compute matrix depending on the laplacian weight type.
    let L = this.computeInteriorMatrix(UV[0], UV[1], laplaceWeight);

    //    4. solve linear equation and assing computed uv to corresponding vertex uv.
    let chol = L.lu();
		UV[0] = chol.solveSquare(UV[0]);
		UV[1] = chol.solveSquare(UV[1]);

    this.verts.forEach(vert => {
      vert.uv!.x = UV[0].get(vert.idx);
      vert.uv!.y = UV[1].get(vert.idx);
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
    const U = DenseMatrix.zeros(this.verts.length);
    const V = DenseMatrix.zeros(this.verts.length);

    // compute the right hand side of the linear parameterization system
    // for boundary vertices depending on the type of the boundary.
    //
    // Note that the coordinates of boundary vertices is derived from the
    // property of "convex in order".
    // TODO: Compute longest boundary
    let boundary_verts: Vertex[] = [];
    let start = true;
    for (let h = this.boundaries[0].halfedge; start || h !== this.boundaries[0].halfedge; h = h!.next) {
      boundary_verts.push(h!.vert!)
      start = false;
    }

    if(boundaryType === 'disk') {
      let index = 0;
      let angle_base = 2 * Math.PI / (boundary_verts.length+1);
      boundary_verts.forEach(vert => {
        let angle = angle_base * index;
        vert.uv!.x = 0.5 - 0.5*Math.cos(angle);
        vert.uv!.y = 0.5 - 0.5*Math.sin(angle);
        U.set(vert.uv!.x, vert.idx);
        V.set(vert.uv!.y, vert.idx);
        index++;
      });
    }
    else if(boundaryType === 'rect') {
      let index = 0;
      let quarter = Math.floor(boundary_verts.length/4);
      let dist = 1/quarter;

      for(let i = 0; i < quarter; i++) {
        boundary_verts[index].uv!.x = i * dist + 0.000000000001; // For some reason, the vertex at 0,0 is not displayed.
        boundary_verts[index].uv!.y = 0;
        index++;
      }
      for(let i = 0; i < quarter; i++) {
        boundary_verts[index].uv!.x = 1;
        boundary_verts[index].uv!.y = i * dist;
        index++;
      }

      for(let i = 0; i < quarter; i++) {
        boundary_verts[index].uv!.x = 1 - i * dist;
        boundary_verts[index].uv!.y = 1;
        index++;
      }
    
      quarter = boundary_verts.length - index;
      dist = 1/quarter;
      for(let i = 0; i < quarter; i++) {
        boundary_verts[index].uv!.x = 0;
        boundary_verts[index].uv!.y = 1 - i * dist;
        index++;
      } 
      
      boundary_verts.forEach(vert => {
        U.set(vert.uv!.x, vert.idx);
        V.set(vert.uv!.y, vert.idx);
      });
    }

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
    const T = new Triplet(this.verts.length, this.verts.length);

    // compute the left hand side of the linear parameterization system
    // for interior vertices that we want to compute their parameterization.
    //
    // Note that the interior matrix is essentially the Laplace matrix, but
    // the elements that corresponding to the boundary vertices are zerored out.

    if(laplaceWeight === "Uniform") {
      this.verts.forEach(vert => {
        if(U.get(vert.idx) != 0 || V.get(vert.idx) != 0) {
          T.addEntry(1, vert.idx, vert.idx); // Boundary vertex
        }
        else {
          let sum = 0;
          const e0 = vert.halfedge;
          const neighbor_verts = [e0!.twin!.vert!];
          for(let e = e0!.twin!.next!.twin!; e != e0!.twin; e = e!.next!.twin!) {
            neighbor_verts.push(e.vert!);
          }
  
          neighbor_verts.forEach(neighbor => {
            T.addEntry(1, vert.idx, neighbor.idx);
            sum++;
          });
          T.addEntry(-sum, vert.idx, vert.idx);
        }
      });
    }
    else if(laplaceWeight === "Cotan") {
      this.verts.forEach(vert => {
        if(U.get(vert.idx) != 0 || V.get(vert.idx) != 0) {
          T.addEntry(1, vert.idx, vert.idx); // Boundary vertex
        }
        else {
          let sum = 0;
          const e0 = vert.halfedge;
          const neighbor_verts = [e0!.twin!.vert!];
          for(let e = e0!.twin!.next!.twin!; e != e0!.twin; e = e!.next!.twin!) {
            neighbor_verts.push(e.vert!);
          }
  
          neighbor_verts.forEach(neighbor => {
            let halfedge = neighbor.halfedge;
            while(halfedge!.twin!.vert != this.verts[vert.idx]) {
              halfedge = halfedge!.twin!.next;
            }
            const cot = 0.5 * ( halfedge!.cotan() + halfedge!.twin!.cotan() ); // 0.5 * cot alpha + cotan beta
            sum += cot;
            T.addEntry(cot, vert.idx, neighbor.idx);
          });
          T.addEntry(-sum, vert.idx, vert.idx);
        }
      });
    }
    

    return SparseMatrix.fromTriplet(T);
  }
}
