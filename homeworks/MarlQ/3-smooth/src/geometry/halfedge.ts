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
    // We can assume the input mesh is a manifold mesh.
    
    // DEBUG
    // let duplicates = 0;
    //indices = indices.slice(0, 120); 

    positions.forEach((p, i) => {
      const vert = new Vertex(p);
      vert.idx = i;
      this.verts.push(vert);
    });

    for(let index = 0; index < indices.length; index+=3) {
      const face = new Face();
      face.idx = Math.floor((index+3)/3);
      this.faces.push(face);

      const halfedges: Halfedge[] = []; // The current three halfedges around the face

      for(let edge_count = 0; edge_count < 3; edge_count++) {
        let edge: Edge;

        let halfedge: Halfedge;

        // Assign vertices
        let vertex_from = this.verts[indices[index + edge_count]];
        let vertex_to: Vertex;
        if(edge_count === 2) vertex_to = this.verts[indices[index]];
        else vertex_to = this.verts[indices[index + edge_count + 1]];

        let existing_halfedge = this.halfedges.find( he => he.twin!.vert!.idx === vertex_to.idx && he.vert!.idx === vertex_from.idx);
        if(existing_halfedge) {
          // Halfedge & Twin exists
          halfedge = existing_halfedge;

          halfedge.onBoundary = false;
          //halfedge.twin!.onBoundary = false;

          edge = halfedge.twin!.edge!;
        }
        else {
          // Create new Edge
          halfedge = new Halfedge();
          halfedge.onBoundary = false;

          let twin: Halfedge = new Halfedge;
          edge = new Edge();
          edge.idx = index + edge_count;
          this.edges.push(edge);

          twin.onBoundary = true;
          twin.edge = edge;
          twin.vert = vertex_to;
          
          halfedge.twin = twin;
          twin.twin = halfedge;

          edge.halfedge = halfedge;
          halfedge.edge = edge;
          halfedge.vert = vertex_from;

          this.halfedges.push(twin);
        }

        // Assign prev and next
        if(edge_count > 0) {
          halfedge.prev = halfedges[edge_count-1];
          halfedges[edge_count-1].next = halfedge;
        }
        if(edge_count === 2) {
          halfedge.next = halfedges[0];
          halfedges[0].prev = halfedge;
        }

        halfedge.face = face;
        vertex_to.halfedge = halfedge; // Last vertex points to last halfedge

        if(edge_count === 0) face.halfedge = halfedge; // Face points to first halfedge

        halfedges.push(halfedge);
        this.halfedges.push(halfedge);
    }
  }
    let index = 0;
    this.halfedges.forEach(h => {
      h.idx = index++;
    });

    // Assign next/prev for boundary edges
    const boundaryEdges = this.halfedges.filter(h => h.onBoundary && !h.face);
    boundaryEdges.forEach(h => {
      if(!h.next) {
        let next = boundaryEdges.find(oe => h.twin!.vert!.idx === oe.vert!.idx);
        h.next = next;
        next!.prev = h;
      }
    });

    /* DEBUG CODE
    this.halfedges.forEach(h => {
      if(!h.edge || !h.next || !h.prev || !h.next || !h.twin || !h.vert) {
        console.log(h)
        this.halfedges.forEach(l => {
          if(l !== h && l != h.twin && l.edge === h.edge) {
            console.log("Should it be this one?")
            console.log(l)
          }
        });
      }
    });
    
    console.log(boundaryEdges);
  
    let should_be = this.edges.length+duplicates;
    let is = this.halfedges.length
    if(should_be !== is) console.log("ERROR: WRONG NUMBER OF HALFEDGES (should be: " + should_be + " , is: " + is + " )");
    if(duplicates === 0) console.log("WEIRD: NO DUPLICATES")

    this.halfedges.forEach(he => {
      if(he.next?.next?.next != he) {
        console.log("ERROR: NON CIRCULAR");
        console.log(he);
        console.log(he.next?.next?.next);
      }
      if(he.onBoundary && he.twin?.face && he.face) {
        console.log("ERROR: SHOULD NOT BE ON BOUNDARY");
        console.log(he);
      }
      if(!he.onBoundary && (!he.twin?.face || !he.face)) {
        console.log("ERROR: SHOULD BE ON BOUNDARY");
        console.log(he);
      }
      if(he.vert?.halfedge == he) {
        console.log("ERROR: VERT POINTS BACK");
        console.log(he);
      }
    }); */
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
    //   2. Build the mass matrix `M`
    //   3. Build the Laplace weight matrix `W` for the given `weightType` in laplaceWeightMatrix
    //   4. Solve linear system (M - tλW)f' = Mf using a Cholesky solver.
    //   5. Update the position of mesh vertices based on the solution f'.
    //

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

  }
}
