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
import { OneFactor } from 'three';

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
    const edges = new Map();
    for (let i = 0; i < indices.length; i += 3) {
      for (let j = 0; j < 3; j++) {
        // check a face
        let a = indices[i + j];
        let b = indices[i + ((j + 1) % 3)];

        if (a > b) {
          const tmp = b;
          b = a;
          a = tmp;
        }

        // store the edge if not exists
        const e = `${a}-${b}`;
        if (!edges.has(e)) {
          edges.set(e, [a, b]);
        }
      }
    }

    this.verts = new Array(positions.length);
    this.edges = new Array(edges.size);
    this.faces = new Array(indices.length / 3);
    this.halfedges = new Array(edges.size * 2);

    const idx2vert = new Map();
    for (let i = 0; i < positions.length; i++) {
      let v = new Vertex(positions[i]);
      this.verts[i] = v;
      idx2vert.set(i, v);

      v = new Vertex(new Vector(positions[i].x, positions[i].y, positions[i].z));

      this.vertsOrig[i] = v;
    }

    let eidx = 0;
    const existedHe = new Map();
    const hasTwin = new Map();

    // construct halfedges, edges
    for (let i = 0; i < indices.length; i += 3) {
      // construct face
      const f = new Face();
      this.faces[i / 3] = f;

      // construct halfedges of the face
      for (let j = 0; j < 3; j++) {
        const he = new Halfedge();
        this.halfedges[i + j] = he;
      }

      // construct connectivities of the new halfedges
      for (let j = 0; j < 3; j++) {
        // halfedge from vertex a to vertex b
        let a = indices[i + j];
        let b = indices[i + ((j + 1) % 3)];

        // halfedge properties
        const he = this.halfedges[i + j];
        he.next = this.halfedges[i + ((j + 1) % 3)];
        he.prev = this.halfedges[i + ((j + 2) % 3)];
        he.onBoundary = false;
        hasTwin.set(he, false);
        he.vertsOrig = this.vertsOrig;

        const v = idx2vert.get(a);
        he.vert = v;
        v.halfedge = he;

        he.face = f;
        f.halfedge = he;

        // swap if index a > b, for twin checking
        if (a > b) {
          const tmp = b;
          b = a;
          a = tmp;
        }
        const ek = `${a}-${b}`;
        if (existedHe.has(ek)) {
          // if a halfedge has been created before, then
          // it is the twin halfedge of the current halfedge
          const twin = existedHe.get(ek);
          he.twin = twin;
          twin.twin = he;
          he.edge = twin.edge;

          hasTwin.set(he, true);
          hasTwin.set(twin, true);
        } else {
          // new halfedge
          const e = new Edge();
          this.edges[eidx] = e;
          eidx++;
          he.edge = e;
          e.halfedge = he;

          existedHe.set(ek, he);
        }
      }
    }

    // create boundary halfedges and hidden faces for the boundary
    let hidx = indices.length;
    for (let i = 0; i < indices.length; i++) {
      const he = this.halfedges[i];
      if (hasTwin.get(he)) {
        continue;
      }

      // handle halfedge that has no twin
      const f = new Face(); // hidden face
      const bcycle = []; // boundary cycle
      let current = he;
      do {
        const bhe = new Halfedge(); // boundary halfedge
        this.halfedges[hidx] = bhe;
        hidx++;
        bcycle.push(bhe);

        // grab the next halfedge along the boundary that does not
        // have a twin halfedge
        let next = <Halfedge>current.next;
        while (hasTwin.get(next)) {
          next = <Halfedge>next.twin!.next;
        }

        // set the current halfedge's attributes
        bhe.vert = next.vert;
        bhe.edge = current.edge;
        bhe.onBoundary = true;

        // point the new halfedge and face to each other
        bhe.face = f;
        f.halfedge = bhe;

        // point the new halfedge and twin to each other
        bhe.twin = current;
        current.twin = bhe;

        current = next;
      } while (current !== he);

      // link the cycle of boundary halfedges together
      const n = bcycle.length;
      for (let j = 0; j < n; j++) {
        bcycle[j].next = bcycle[(j + n - 1) % n];
        bcycle[j].prev = bcycle[(j + 1) % n];
        hasTwin.set(bcycle[j], true);
        hasTwin.set(bcycle[j].twin, true);
      }
    }

    // reset indices
    let index = 0;
    this.verts.forEach(v => {
      v.idx = index++;
    });
    index = 0;
    this.edges.forEach(e => {
      e.idx = index++;
    });
    index = 0;
    this.faces.forEach(f => {
      f.idx = index++;
    });
    index = 0;
    this.halfedges.forEach(h => {
      h.idx = index++;
    });
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

    // Reset vertices to original positions
    this.vertsOrig.forEach((v, index) => {
      this.verts[index].position.x = v.position.x;
      this.verts[index].position.y = v.position.y;
      this.verts[index].position.z = v.position.z;
    });

    for(let t = 1; t < timeStep; t++) {

      //   1. Build f(t)
      let f = DenseMatrix.zeros(this.verts.length, 3);
      for(let i = 0; i < this.verts.length; i++) {
        f.set(this.verts[i].position.x, i, 0);
        f.set(this.verts[i].position.y, i, 1);
        f.set(this.verts[i].position.z, i, 2);
      }
      
      //   2. Build the mass matrix `M`
      let M = new Triplet(this.verts.length, this.verts.length);          

      for(let i = 0; i < this.verts.length; i++) {
        if(weightType === 'Uniform') {
          let neighbor_verts = this.verts[i].getNeighbors();
          M.addEntry(1/neighbor_verts.length, i, i);
        }
        else if(weightType === 'Cotan') {
          M.addEntry(1/this.verts[i].vertexArea(), i, i);
        }
      }
      const massMatrix = SparseMatrix.fromTriplet(M); // actually M^-1

      //   3. Build the Laplace weight matrix `W` for the given `weightType` in laplaceWeightMatrix
      const weightMatrix = this.laplaceWeightMatrix(weightType);
      
      //   4. Solve linear system (M - tλW)f' = Mf using a Cholesky solver.
      //let A = massMatrix.plus(weightMatrix.timesReal(-1.0 * smoothStep));
      //let b = massMatrix.toDense().timesDense(f);

      let L = massMatrix.timesSparse(weightMatrix); // L = DW
      let A = SparseMatrix.identity(this.verts.length, this.verts.length).plus(L.timesReal(-1.0 * smoothStep)); // (I - lambda * L)
      let b = f;

      const f_new = A.chol().solvePositiveDefinite(b);
      console.log(f_new)

      //   5. Update the position of mesh vertices based on the solution f'.
      for(let i = 0; i < this.verts.length; i++) {
        this.verts[i].position.x = f_new.get(i, 0);
        this.verts[i].position.y = f_new.get(i, 1);
        this.verts[i].position.z = f_new.get(i, 2);
      }

      /* let y = weightMatrix.toDense();
      let txt = '';
      for(let a = 0; a < y.nRows(); a++ ) {
        for(let b = 0; b < y.nCols(); b++ ) {
          txt += y.get(a,b) + '  ';
        }
        console.log(txt)
        txt = '';
      } */

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

    const W = new Triplet(this.verts.length, this.verts.length);   

    if(weightType === 'Uniform') {
      for(let i = 0; i < this.verts.length; i++) {
        // Calculate neighbor vertices for vertex i
        let neighbor_verts = this.verts[i].getNeighbors();
        
        // Set uniform neighbor weights
        neighbor_verts.forEach(v => {
          W.addEntry(1 + 1e-8, i, v!.idx);
        });
        console.assert(i === this.verts[i].idx)
        // Set own weight
        W.addEntry( -neighbor_verts.length + 1e-8, i, i);
        
      }
    }
    else if(weightType === 'Cotan') {
      // TODO
      for(let i = 0; i < this.verts.length; i++) {
        
        let neighbor_verts = this.verts[i].getNeighbors();
        let sum = 0;
        neighbor_verts.forEach(v => {
          const cot = 0.5 * ( this.verts[i].halfedge!.cotan() + this.verts[i].halfedge!.twin!.cotan() );
          sum += cot;
          W.addEntry( cot , i, v!.idx);
        });

        W.addEntry( -sum, i, i);
      }
    }
    const weightMatrix = SparseMatrix.fromTriplet(W);
    return weightMatrix;
  }
}
