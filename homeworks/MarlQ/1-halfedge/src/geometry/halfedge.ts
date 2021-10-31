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
    
    // DEBUG
    // let duplicates = 0;
    // indices = indices.slice(0, 120); 

    positions.forEach((p, i) => {
      const vert = new Vertex(p);
      vert.idx = i;
      this.verts.push(vert);
    });

    for(let index = 2; index < indices.length; index+=3) {
      const face = new Face();
      face.idx = Math.floor(index/3);
      this.faces.push(face);

      const halfedges: Halfedge[] = [];

      for(let edge_count = 0; edge_count < 3; edge_count++) {
        let edge: Edge;

        let halfedge: Halfedge;

        let vertex_from = this.verts[indices[index - 2 + edge_count]];
        let vertex_to = this.verts[indices[index - 2 + ((edge_count+1) % 3)]];

        halfedge = new Halfedge();
        halfedge.onBoundary = true;

        
        let existing_twin = this.halfedges.find( aV => aV.vert?.idx === vertex_to.idx && aV.next?.vert?.idx === vertex_from.idx);
        if(existing_twin) { // Twin halfedge exists
          //duplicates++ // DEBUG

          halfedge.onBoundary = false;
          existing_twin.onBoundary = false;

          halfedge.twin = existing_twin;
          existing_twin.twin = halfedge;

          if(halfedge.twin.edge) edge = halfedge.twin.edge;
          else {
            console.log("ERROR: NO EDGE ON TWIN"); // Should never occur (thanks Typescript)
            edge = new Edge();
          }
        }
        else { // Create new edge
          edge = new Edge();
          edge.idx = index-2+edge_count;
          this.edges.push(edge);
        }

        if(edge_count > 0) {
          halfedge.prev = halfedges[edge_count-1];
          halfedges[edge_count-1].next = halfedge;
        }

        if(edge_count === 2) {
          halfedge.next = halfedges[0];
          halfedges[0].prev = halfedge;
          vertex_to.halfedge = halfedge; // Last vertex points to last halfedge
        }

        edge.halfedge = halfedge; // TODO: Is this correct? In theory it should not matter...
        halfedge.edge = edge;

        if(edge_count === 0) face.halfedge = halfedge; // Face points to first halfedge
        halfedge.face = face;
        halfedge.vert = vertex_from;

        halfedges.push(halfedge);
        this.halfedges.push(halfedge);
      }
    }

    let index = 0;
    this.halfedges.forEach(h => {
      h.idx = index++;
    });
  
  /* DEBUG CODE
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
