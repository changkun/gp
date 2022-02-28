// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
// Modified by Nicolas Mogicato <n.mogicato@campus.lmu.de>
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
import { domainToASCII } from 'url';
const matrixInverse = require('../../node_modules/matrix-inverse');

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
  vertsDefOrig: Vertex[];
  vertsfinal: Vector[];
  vertsOffset: Vector[]; //offset of vertices
  tangents: number[]; //direction of tangents

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
    this.vertsDefOrig = [];
    this.vertsfinal = [];
    this.vertsOffset = [];
    this.tangents = [];
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
    // TODO: use the halfedge structrue implementation from Homework 1.
    // We assume the input mesh is a manifold mesh.
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
    this.vertsOrig = new Array(positions.length);
    this.edges = new Array(edges.size);
    this.faces = new Array(indices.length / 3);
    this.halfedges = new Array(edges.size * 2);
    this.vertsDefOrig = new Array(positions.length);
    this.vertsfinal = new Array(positions.length);
    this.vertsOffset = new Array(positions.length);
    this.tangents = new Array(positions.length);

    const idx2vert = new Map();
    for (let i = 0; i < positions.length; i++) {
      const v = new Vertex(positions[i]);
      this.verts[i] = v;
      idx2vert.set(i, v);
    }
/*
    const idx2vertOrig = new Map();
    for (let i = 0; i < positions.length; i++) {
      const v = new Vertex(positions[i]);
      this.vertsOrig[i] = v;
      idx2vertOrig.set(i, v);
    }*/

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

        //he.vertsOrig = this.vertsOrig;

        const v = idx2vert.get(a);
        he.vert = v;
        v.halfedge = he;
/*
        const w = idx2vertOrig.get(a);
        he.vert = w;
        w.halfedge = he;*/


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
      //console.log(n);
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
    //assigning at the end
    this.halfedges.forEach(h => {
      h.vertsOrig = this.vertsOrig;
      h.vertsDefOrig = this.vertsDefOrig;
      h.idx = index++;
    });

    this.verts.forEach(vert => {
      let v = new Vertex(new Vector(vert.position.x, vert.position.y, vert.position.z));
      v.idx = vert.idx;
      this.vertsOrig[v.idx] = v;
      this.vertsDefOrig[v.idx] = v;
    });
  }

  deform1(angle: number) {
    //vector that defines rotation axis
    let start = new Vector(2.25, 0, 0); 

    //translation matrix
    //translates space so rotation axis goes through origin
    const T = DenseMatrix.zeros(4,4);
    T.set(1, 0, 0);
    T.set(0, 0, 1);
    T.set(0, 0, 2);
    T.set(-start.x, 0, 3);

    T.set(0, 1, 0);
    T.set(1, 1, 1);
    T.set(0, 1, 2);
    T.set(-start.y, 1, 3);

    T.set(0, 2, 0);
    T.set(0, 2, 1);
    T.set(1, 2, 2);
    T.set(-start.z, 2, 3);

    T.set(0, 3, 0);
    T.set(0, 3, 1);
    T.set(0, 3, 2);
    T.set(1, 3, 3);

    //inverse of translation matrix
    //needed after rotation
    const T_inv = DenseMatrix.zeros(4,4);

    T_inv.set(1, 0, 0);
    T_inv.set(0, 0, 1);
    T_inv.set(0, 0, 2);
    T_inv.set(start.x, 0, 3);

    T_inv.set(0, 1, 0);
    T_inv.set(1, 1, 1);
    T_inv.set(0, 1, 2);
    T_inv.set(start.y, 1, 3);

    T_inv.set(0, 2, 0);
    T_inv.set(0, 2, 1);
    T_inv.set(1, 2, 2);
    T_inv.set(start.z, 2, 3);

    T_inv.set(0, 3, 0);
    T_inv.set(0, 3, 1);
    T_inv.set(0, 3, 2);
    T_inv.set(1, 3, 3);

    //rotation matrix
    let R = DenseMatrix.zeros(4,4);
    
    R.set(Math.cos(angle*(Math.PI/180)), 0, 0);
    R.set(Math.sin(angle*(Math.PI/180)), 0, 1);
    R.set(0, 0, 2);
    R.set(0, 0, 3);

    R.set(-Math.sin(angle*(Math.PI/180)), 1, 0);
    R.set(Math.cos(angle*(Math.PI/180)), 1, 1);
    R.set(0, 1, 2);
    R.set(0, 1, 3);

    R.set(0, 2, 0);
    R.set(0, 2, 1);
    R.set(1, 2, 2);
    R.set(0, 2, 3);

    R.set(0, 3, 0);
    R.set(0, 3, 1);
    R.set(0, 3, 2);
    R.set(1, 3, 3);

    //perform deformation
    for(let i=227; i<this.verts.length; i++) {
      let x1 = this.verts[i].position.x;
      let y1 = this.verts[i].position.y;
      let z1 = this.verts[i].position.z;

      let vert = DenseMatrix.zeros(4,1);
      vert.set(x1, 0, 0);
      vert.set(y1, 1, 0);
      vert.set(z1, 2, 0);
      vert.set(1, 3, 0);

      let res = T_inv.timesDense(R).timesDense(T).timesDense(vert);

      this.verts[i].position.x = res.get(0,0);
      this.verts[i].position.y = res.get(1,0);
      this.verts[i].position.z = res.get(2,0);
    }
  }

  deform2(angle: number) {
    //vector that defines rotation axis
    let start = new Vector(-2.25, 0, 0); 

    //translation matrix
    //translates space so rotation axis goes through origin
    const T = DenseMatrix.zeros(4,4);
    T.set(1, 0, 0);
    T.set(0, 0, 1);
    T.set(0, 0, 2);
    T.set(-start.x, 0, 3);

    T.set(0, 1, 0);
    T.set(1, 1, 1);
    T.set(0, 1, 2);
    T.set(-start.y, 1, 3);

    T.set(0, 2, 0);
    T.set(0, 2, 1);
    T.set(1, 2, 2);
    T.set(-start.z, 2, 3);

    T.set(0, 3, 0);
    T.set(0, 3, 1);
    T.set(0, 3, 2);
    T.set(1, 3, 3);

    //inverse of translation matrix
    //needed after rotation
    const T_inv = DenseMatrix.zeros(4,4);

    T_inv.set(1, 0, 0);
    T_inv.set(0, 0, 1);
    T_inv.set(0, 0, 2);
    T_inv.set(start.x, 0, 3);

    T_inv.set(0, 1, 0);
    T_inv.set(1, 1, 1);
    T_inv.set(0, 1, 2);
    T_inv.set(start.y, 1, 3);

    T_inv.set(0, 2, 0);
    T_inv.set(0, 2, 1);
    T_inv.set(1, 2, 2);
    T_inv.set(start.z, 2, 3);

    T_inv.set(0, 3, 0);
    T_inv.set(0, 3, 1);
    T_inv.set(0, 3, 2);
    T_inv.set(1, 3, 3);

    //rotation matrix
    let R = DenseMatrix.zeros(4,4);
    
    R.set(Math.cos(angle*(Math.PI/180)), 0, 0);
    R.set(-Math.sin(angle*(Math.PI/180)), 0, 1);
    R.set(0, 0, 2);
    R.set(0, 0, 3);

    R.set(Math.sin(angle*(Math.PI/180)), 1, 0);
    R.set(Math.cos(angle*(Math.PI/180)), 1, 1);
    R.set(0, 1, 2);
    R.set(0, 1, 3);

    R.set(0, 2, 0);
    R.set(0, 2, 1);
    R.set(1, 2, 2);
    R.set(0, 2, 3);

    R.set(0, 3, 0);
    R.set(0, 3, 1);
    R.set(0, 3, 2);
    R.set(1, 3, 3);

    //perform deformation
    for(let i=107; i<this.verts.length; i++) {
      let x1 = this.verts[i].position.x;
      let y1 = this.verts[i].position.y;
      let z1 = this.verts[i].position.z;

      let vert = DenseMatrix.zeros(4,1);
      vert.set(x1, 0, 0);
      vert.set(y1, 1, 0);
      vert.set(z1, 2, 0);
      vert.set(1, 3, 0);

      let res = T_inv.timesDense(R).timesDense(T).timesDense(vert);

      this.verts[i].position.x = res.get(0,0);
      this.verts[i].position.y = res.get(1,0);
      this.verts[i].position.z = res.get(2,0);
    }

    this.verts.forEach (v => {
      this.vertsDefOrig[v.idx]= v;
    });
  }

  //construct rest coordinate system of smoothed original mesh
  restCS() {
    let rest = DenseMatrix.zeros(4, 4);

    this.verts.forEach(v => {
      let n = v.normal();
      let help1 = new Vector(1,0,0,0);
      let help2 = new Vector(0,1,0,0);
      let help3 = new Vector(0,0,1,0);
      let t1 = (n.cross(help1));
      let t2 = (n.cross(help2));
      let t3 = (n.cross(help3));
      let t = new Vector;
      if(t1.len() > t2.len() && t1.len() > t3.len()) {
        t = t1.unit();
        this.tangents[v.idx] = 1;
      } else if(t2.len() > t1.len() && t2.len() > t3.len()) {
        t = t2.unit();
        this.tangents[v.idx] = 2;
      } else {
        t = t3.unit();
        this.tangents[v.idx] = 3;
      }
      
      let b = (n.cross(t)).unit();

      rest.set(t.x, 0, 0);
      rest.set(n.x, 0, 1);
      rest.set(b.x, 0, 2);
      rest.set(v.position.x, 0, 3);

      rest.set(t.y, 1, 0);
      rest.set(n.y, 1, 1);
      rest.set(b.y, 1, 2);
      rest.set(v.position.y, 1, 3);

      rest.set(t.z, 2, 0);
      rest.set(n.z, 2, 1);
      rest.set(b.z, 2, 2);
      rest.set(v.position.z, 2, 3);

      rest.set(t.w, 3, 0);
      rest.set(n.w, 3, 1);
      rest.set(b.w, 3, 2);
      rest.set(v.position.w, 3, 3);

      const M = [
        [rest.get(0,0), rest.get(0,1), rest.get(0,2), rest.get(0,3)],
        [rest.get(1,0), rest.get(1,1), rest.get(1,2), rest.get(1,3)],
        [rest.get(2,0), rest.get(2,1), rest.get(2,2), rest.get(2,3)],
        [rest.get(3,0), rest.get(3,1), rest.get(3,2), rest.get(3,3)]
      ];

      //use of node module
      const M_inv = matrixInverse(M);

      for(let i=0; i<4; i++) {
        for(let j=0; j<4; j++) {
          rest.set(M_inv[i][j], i, j);
        }
      }

      let p = DenseMatrix.zeros(4, 1);
      p.set(this.vertsOrig[v.idx].position.x,0,0);
      p.set(this.vertsOrig[v.idx].position.y,1,0);
      p.set(this.vertsOrig[v.idx].position.z,2,0);
      p.set(this.vertsOrig[v.idx].position.w,3,0);

      let offset = rest.timesDense(p);

      let v_offset = new Vector;
      v_offset.x = offset.get(0,0);
      v_offset.y = offset.get(1,0);
      v_offset.z = offset.get(2,0);
      v_offset.w = offset.get(3,0);

      this.vertsOffset[v.idx] = v_offset;
  });
  }

  //construct rest coordinate system of smoothed deformed mesh
  currentCS(idx: number) {
    //matrix for rest coordinate system
    let current = DenseMatrix.zeros(4, 4);
    
    let v = this.verts[idx];
    let n = v.normal();
    let help1 = new Vector(1,0,0,0);
    let help2 = new Vector(0,1,0,0);
    let help3 = new Vector(0,0,1,0);
    let t1 = (n.cross(help1));
    let t2 = (n.cross(help2));
    let t3 = (n.cross(help3));
    let t = new Vector;
    if(this.tangents[v.idx] == 1) {
      t = t1.unit();
    } else if(this.tangents[v.idx] == 2) {
      t = t2.unit();
    } else {
      t = t3.unit();
    }
    let b = (n.cross(t)).unit();

    current.set(t.x, 0, 0);
    current.set(n.x, 0, 1);
    current.set(b.x, 0, 2);
    current.set(v.position.x, 0, 3);

    current.set(t.y, 1, 0);
    current.set(n.y, 1, 1);
    current.set(b.y, 1, 2);
    current.set(v.position.y, 1, 3);

    current.set(t.z, 2, 0);
    current.set(n.z, 2, 1);
    current.set(b.z, 2, 2);
    current.set(v.position.z, 2, 3);

    current.set(t.w, 3, 0);
    current.set(n.w, 3, 1);
    current.set(b.w, 3, 2);
    current.set(v.position.w, 3, 3);

    return current;
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
    //Build f(t)
    let f = DenseMatrix.zeros(this.vertsOrig.length, 3);
    //fill matrix
    this.vertsOrig.forEach(vert => {
      f.set(vert.position.x, vert.idx, 0);
      f.set(vert.position.y, vert.idx, 1);
      f.set(vert.position.z, vert.idx, 2);
    });
    
    //Build the mass matrix `M`
    let T = new Triplet(this.verts.length, this.verts.length);
  
    this.verts.forEach(v => {
        T.addEntry(1, v.idx, v.idx);
    });
    this.verts.forEach(v => {
      //multiplying with 100 solves previous issue
      T.addEntry(v.voronoiCell() * 100, v.idx, v.idx);
    });
    
    let M = SparseMatrix.fromTriplet(T);
    //Build the Laplace weight matrix `W` for the given `weightType` in laplaceWeightMatrix
    let W = this.laplaceWeightMatrix(weightType);
  
    //Solve linear system (M - tλW)f' = Mf using a Cholesky solver
    let F = M.plus(W.timesReal(1000*smoothStep));
    let fQM = F.chol().solvePositiveDefinite(M.timesDense(f));

    //Update the position of mesh vertices based on the solution f'
    this.verts.forEach(v => {
      v.position.x = fQM.get(v.idx, 0);
      v.position.y = fQM.get(v.idx, 1);
      v.position.z = fQM.get(v.idx, 2);
    });
    
    this.restCS();

    //restore original mesh for next steps
    this.verts.forEach (v => {
      v.position.x = this.vertsOrig[v.idx].position.x;
      v.position.y = this.vertsOrig[v.idx].position.y;
      v.position.z = this.vertsOrig[v.idx].position.z;
    });
  }

  smoothDef(weightType: WeightType, timeStep: number, smoothStep: number) {
    //Build f(t)
    let f = DenseMatrix.zeros(this.verts.length, 3);
    //fill matrix
    this.vertsDefOrig.forEach(vert => {
      f.set(vert.position.x, vert.idx, 0);
      f.set(vert.position.y, vert.idx, 1);
      f.set(vert.position.z, vert.idx, 2);
    });
    
    //Build the mass matrix `M`
    let T = new Triplet(this.verts.length, this.verts.length);
  
    this.verts.forEach(v => {
      T.addEntry(1, v.idx, v.idx);
    });
    this.verts.forEach(v => {
      //multiplying with 100 solves previous issue
      T.addEntry(v.voronoiCell() * 100, v.idx, v.idx);
    });
    
    let M = SparseMatrix.fromTriplet(T);
    //Build the Laplace weight matrix `W` for the given `weightType` in laplaceWeightMatrix
    let W = this.laplaceWeightMatrix(weightType);
  
    //Solve linear system (M - tλW)f' = Mf using a Cholesky solver
    let F = M.plus(W.timesReal(1000*smoothStep));
    let fQM = F.chol().solvePositiveDefinite(M.timesDense(f));

    //Update the position of mesh vertices based on the solution f'
    this.verts.forEach(v => {
      v.position.x = fQM.get(v.idx, 0);
      v.position.y = fQM.get(v.idx, 1);
      v.position.z = fQM.get(v.idx, 2);
    });
  }

  delta(weightType: WeightType, timeStep: number, smoothStep: number) {
    this.smoothDef(weightType, timeStep, smoothStep);
    let vMatrix = DenseMatrix.zeros(4,1);

    this.verts.forEach(v => {
      let current = this.currentCS(v.idx);

      vMatrix.set(this.vertsOffset[v.idx].x, 0, 0);
      vMatrix.set(this.vertsOffset[v.idx].y, 1, 0);
      vMatrix.set(this.vertsOffset[v.idx].z, 2, 0);

      let d = current.timesDense(vMatrix);

      this.vertsfinal[v.idx] = new Vector(0,0,0,0);
      this.vertsfinal[v.idx].x = d.get(0,0);
      this.vertsfinal[v.idx].y = d.get(1,0);
      this.vertsfinal[v.idx].z = d.get(2,0);
    });

    //set final vertex positions with delta
    this.verts.forEach(v => {
      v.position.x = (this.vertsfinal[v.idx].x);
      v.position.y = (this.vertsfinal[v.idx].y);
      v.position.z = (this.vertsfinal[v.idx].z);
    });
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
    let T = new Triplet(this.verts.length, this.verts.length);

    if (weightType === WeightType.Uniform) {
      this.verts.forEach(v => {
        let entry = 1e-8;
        v.halfedges(h => {
          let w = 1;
          entry += w;
          T.addEntry(-w, v.idx, h.twin!.vert!.idx);
        });
        T.addEntry(entry, v.idx, v.idx);
      });
    } else {
      this.verts.forEach(v => {
        let entry = 1e-8;
        v.halfedges(h => {
          let w = (h.cotan() + h.twin!.cotan()) / 2;
          entry += w;
          T.addEntry(-w, v.idx, h.twin!.vert!.idx);
        });
        T.addEntry(entry, v.idx, v.idx);
      });
    }

    return SparseMatrix.fromTriplet(T);
  }
}
