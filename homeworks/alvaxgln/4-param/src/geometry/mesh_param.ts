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
      	  if (this.boundaries.length == 0) throw new Error("no boundary");

    //    2. compute boundary uv coordinates depending on the boundary type.
          let [U,V] = this.computeBoundaryMatrices(boundaryType);

    //    3. compute matrix depending on the laplacian weight type.
          let L = this.computeInteriorMatrix(U,V,laplaceWeight);
    //    4. solve linear equation and assing computed uv to corresponding vertex uv.

      /**
       * L * u' = U
       * L * v' = V
       * -> solve for u' and v' 
       * 
       *    From documentation:
       *    solve the linear system Ax = b, where A is a square sparse matrix
            let A = SparseMatrix.identity(5, 5);
            let b = DenseMatrix.ones(5, 1);

            let lu = A.lu();
            let x = lu.solveSquare(b);

            b.scaleBy(5);
            x = lu.solveSquare(b); // factorization is reused
      */

    const lu = L.lu();
    let u_ = lu.solveSquare(U);
    let v_ = lu.solveSquare(V);

     for (let v of this.verts) {
      v.uv = new Vector((u_.get(v.idx)), (v_.get(v.idx)));
      }

 


    //

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

    let num = 0;

    //loop over vertices in boundary face to get number of them 
    this.boundaries[0].vertices((v)=>{
      num++      
    });


    //check BoundaryType    
    if (boundaryType =='disk'){
      //loop over vertices in boundary face again to set coordinates
      this.boundaries[0].vertices((v, i)=>{

        //get vertex position on circumference of unit circle (equivalent to angle in rad)
        let angle = i/num * 2 * Math.PI;
        let uv = this.getCircle(angle);
        U.set(uv.u, v.idx);
        V.set(uv.v, v.idx);

        //for debugging:
        //v.uv = new Vector(uv.u, uv.v);

      });
    }

    if (boundaryType == 'rect'){
      //loop over vertices in boundary face again to set coordinates
      this.boundaries[0].vertices((v, i)=>{

        let uv = this.getRect(i,num);
        U.set(uv.u, v.idx);
        V.set(uv.v, v.idx);

        //for debugging:
        //v.uv = new Vector(uv.u, uv.v);

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

    // TODO: compute the left hand side of the linear parameterization system
    // for interior vertices that we want to compute their parameterization.
    //
    // Note that the interior matrix is essentially the Laplace matrix, but
    // the elements that corresponding to the boundary vertices are zerored out.

    for (let v of this.verts){

      let i = v.idx;

      // if there is an entry for v in U or V it's a boundary vertex
      if (U.get(i) != 0|| V.get(i) != 0) {
        T.addEntry(1,i,i);
      }

      else {
        //if no boundary vertex calculate Laplace
        let sum = 0;
        if (laplaceWeight == 'Uniform'){
          v.halfedges((h)=>{

            //neighbor vertex index
            let j = h.twin!.vert!.idx;

            T.addEntry(1,i,j);
            sum++

          })

          T.addEntry(-sum,i,i);

        }

        if (laplaceWeight == 'Cotan'){
          v.halfedges((h)=>{

            //neighbor vertex index
            let j= h.twin!.vert!.idx;
            let entry = (h.cotan()+ h.twin!.cotan())/2;
            T.addEntry(entry,i,j);
            sum += entry;

          })

          T.addEntry(-sum,i,i);

        }

      }

    }

    return SparseMatrix.fromTriplet(T);
  }

/**  
   * given position on the circumference returns uv coordinates on the circle with r = 1
   *@param p is the position of the point on the circle circumference length, which is identical to the angle of the point in rad.
   * => you can get the x and y coordinates on the unit circle by using x=cos(theta) and y=sin(theta) and shift them by 1,1 to get into u,v
   * starting point for p = 0 is (2,1) in u,v
  **/
  getCircle(p: number): {u: number, v: number}{

    //multiply by 0.5 to get it to fit canvas
    const x = (Math.cos(p) +1) * 0.5;
    const y = (Math.sin(p) +1) * 0.5;

    let result = {
      u : x,
      v : y
    }
    return result
  }

/**  
  *@param i index of the vertex WITHIN the face
  *@param n number of vertices in the face
 **/ 
  getRect(i: number, n: number): {u: number, v: number}{
    
    //len is side length of the rectangle
    const len = 1;
    //pos is position on Rectangle circumference
    const pos = i * 4 * len / (n);


    //for debugging
/*     if (i == 0 || pos == (4*len)){
      console.log("this is i:", i);
      console.log("this is pos:", pos);
      }
 */

    let x = 0;
    let y = 0; 

    // vertex lies on bottom edge
    if(pos <= len){
      x = pos;
      y = 0;
    }

    //vertex lies on right edge
    else if(pos <= 2 * len){
      x = len;
      y = pos-len;
    }

    //vertex lies on top edge
    else if(pos <= 3 * len){
      x = len - (pos - (2*len));
      y = len;
    }

    //vertex lies on left edge
    else {
      x = 0;
      y = len - (pos - (3*len));
    }
    
    let result = {
      u : x,
      v : y
    }

    return result;
  }


}
