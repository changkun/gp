// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import {Vertex, Edge, Face, Halfedge} from './primitive';
import {Vector} from '../linalg/vec';
import {Matrix} from '../linalg/mat';
import {Quaternion} from '../linalg/quaternion';

export class HalfedgeMesh {
  // context is a transformation context (model matrix) that accumulates
  // applied transformation matrices (multiplied from the left side) for
  // the given mesh.
  //
  // context is a persistent status for the given mesh and can be reused
  // for each of the rendering frames unless the mesh intentionally
  // calls the resetContext() method.
  context: Matrix;
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
    // context is initialized as an identity matrix.
    // prettier-ignore
    this.context = new Matrix(
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    );
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

    this.verts = []; // an array of Vertex object
    this.edges = []; // an array of Edge object
    this.faces = []; // an array of Face object
    this.halfedges = []; // an array of Halfedge object
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
    // TODO: build the halfedge connectivity.
    //
    // We can assume the input mesh is a manifold mesh.


    //create vertices with vertex positions
    for (let i in positions){
      this.verts[i] = new Vertex(positions[i]);
      this.verts[i].idx = parseInt(i);
    }

    //loop over indices array for faces
    //load indices of one face per iteration
    for (let i = 0; i < indices.length; i+=3){

      //load face indices
      let idx_a = indices[i];
      let idx_b = indices[i+1];
      let idx_c = indices[i+2];

      //check if halfedges already exist:
      //edgefound is true when there is an existing halfedge a->b or b->c or c->a
      //in that case the direction of the halfedges has to be reversed
      let edgefound = this.halfedges.filter(halfedge => halfedge.vert!.idx == idx_a && halfedge.next!.vert!.idx == idx_b).length != 0;
          edgefound = this.halfedges.filter(halfedge => halfedge.vert!.idx == idx_b && halfedge.next!.vert!.idx == idx_c).length != 0;
          edgefound = this.halfedges.filter(halfedge => halfedge.vert!.idx == idx_c && halfedge.next!.vert!.idx == idx_a).length != 0;


      //create halfedges and face
      let edge_a = new Halfedge();
      let edge_b = new Halfedge();
      let edge_c = new Halfedge();
      let face = new Face();

      //assign vertices
      edge_a.vert = this.verts[idx_a];
      edge_b.vert = this.verts[idx_b];
      edge_c.vert = this.verts[idx_c];
      
      //assign index
      edge_a.idx = i;
      edge_b.idx = i+1;
      edge_c.idx = i+2;
      
      //assign face
      edge_a.face = face;
      edge_b.face = face;
      edge_c.face = face;

      //assign face index and halfedge
      face.idx = i/3;
      face.halfedge = edge_a;
      

      //if halfedge already exists reverse direction of face halfedges      
      if (edgefound) {

        //assign next and previous values
        edge_a.next = edge_c;
        edge_a.prev = edge_b;

        edge_b.next = edge_a;
        edge_b.prev = edge_c;

        edge_c.next = edge_b;
        edge_c.prev = edge_a;
      
      }

      else {
      
        //assign next and previous values
        edge_a.next = edge_b;
        edge_a.prev = edge_c;

        edge_b.next = edge_c;
        edge_b.prev = edge_a;

        edge_c.next = edge_a;
        edge_c.prev = edge_b;

      }

      //add edges and Faces to arrays
      this.halfedges.push(edge_a);
      this.halfedges.push(edge_b);
      this.halfedges.push(edge_c);
      this.faces.push(face);

    }


  //create array to temporarily store boundary halfedges
  const boundarys: Halfedge[] =  [];

  //index for Edge Objects
  let edge_idx = 0;

  //connect halfedges with twins and create new halfedge for twinless, also create edge objects
  this.halfedges.forEach((halfedge, index) =>  {

    //if twin exists: nothing to do
    if (halfedge.twin != null) return;

    //twins are not connected yet
    else {
    
    //search for twin and return twin in opposite
    let opposite = this.halfedges.slice(index,this.halfedges.length).find(x => x.vert!.idx == halfedge.vert!.idx && x.next!.vert!.idx == halfedge.next!.vert!.idx);
    
    //if no twin exists create new boundary halfedge
    if (opposite == null){

      opposite = new Halfedge();
      opposite.onBoundary = true;
      opposite.vert = halfedge.next?.vert;
      //set index for boundary halfedge
      opposite.idx = this.halfedges.length + boundarys.length;
      boundarys.push(opposite);

    }

    //set twin values
    halfedge.twin = opposite;
    opposite.twin = halfedge;

    //create Edge Object
    let edge = new Edge();
    edge.idx = edge_idx;

    //increment edge index
    edge_idx ++;

    //assign halfedge to edge and edge to halfedges
    edge.halfedge = halfedge;
    halfedge.edge = edge;
    opposite.edge = edge;

    //add edge to array
    this.edges.push(edge);

    }

  });


  //connect Boundaryhalfedges
  boundarys.forEach(halfedge => {

    //find, and connect next boundaryhalfedge
    halfedge.next = boundarys.find(x=> x.vert == halfedge.twin!.vert);
    halfedge.next!.prev = halfedge;

    //add boundary halfedges to array
    this.halfedges.push(halfedge);
  })



  }

  /**
   * modelMatrix returns the transformation context as the model matrix
   * for the current frame (or at call time).
   *
   * @returns the model matrix at call time.
   */
  modelMatrix(): Matrix {
    return this.context;
  }
  /**
   * reset resets the transformation context.
   */
  resetContext() {
    this.context = new Matrix(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  }
  /**
   * scale applies scale transformation on the given mesh.
   * @param sx is a scaling factor on x-axis
   * @param sy is a scaling factor on y-axis
   * @param sz is a scaling factor on z-axis
   */
  // prettier-ignore
  scale(sx: number, sy: number, sz: number) {
      const scaleM = new Matrix(
        sx, 0,  0, 0,
        0, sy,  0, 0,
        0,  0, sz, 0,
        0,  0,  0, 1
      );
      this.context = <Matrix>scaleM.mul(this.context);
    }
  /**
   * translate applies translation on the given mesh.
   * @param tx is a translation factor on x-axis
   * @param ty is a translation factor on y-axis
   * @param tz is a translation factor on z-axis
   */
  // prettier-ignore
  translate(tx: number, ty: number, tz: number) {
      const transM = new Matrix(
        1, 0, 0, tx,
        0, 1, 0, ty,
        0, 0, 1, tz,
        0, 0, 0, 1
      );
      this.context = <Matrix>transM.mul(this.context);
    }
  /**
   * rotate applies rotation on the given mesh.
   * @param dir is a given rotation direction.
   * @param angle is a given rotation angle counterclockwise.
   */
  rotate(dir: Vector, angle: number) {
    const u = dir.unit();
    const cosa = Math.cos(angle / 2);
    const sina = Math.sin(angle / 2);
    const q = new Quaternion(cosa, sina * u.x, sina * u.y, sina * u.z);
    this.context = <Matrix>q.toRotationMatrix().mul(this.context);
  }
}
