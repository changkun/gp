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
    
    //grab 1 face per iteration
    for(let i=0; i<indices.length; i+=3) {
      let a = indices[i]
      let b = indices[i+1]
      let c = indices[i+2]
      //fill vertex array
      //check if vertex already exists
      //add vertex at correct position
      if(!this.verts[a]) {
        this.verts[a] = new Vertex(positions[a]) 
      }
      if(!this.verts[b]) {
        this.verts[b] = new Vertex(positions[b]) 
      }
      if(!this.verts[c]) {
        this.verts[c] = new Vertex(positions[c]) 
      }

      //construct halfedges
      //if(!this.halfedges[i]) {
        //if(!(this.verts[a].halfedge && this.verts[a].halfedge?.next?.vert == this.verts[b]))
        this.halfedges[i] = new Halfedge()
        this.halfedges[i].vert = this.verts[a]

      //if(!this.halfedges[i+1]) {
        //if(!(this.verts[b].halfedge && this.verts[b].halfedge?.next?.vert == this.verts[c]))
        this.halfedges[i+1] = new Halfedge()
        this.halfedges[i+1].vert = this.verts[b]
      
      //if(!this.halfedges[i+2]) {
        //if(!(this.verts[c].halfedge && this.verts[c].halfedge?.prev?.prev?.vert == this.verts[a]))
        this.halfedges[i+2] = new Halfedge()
        this.halfedges[i+2].vert = this.verts[c]
      
      //create face and assign halfedge
      this.faces[i/3] = new Face()
      this.faces[i/3].halfedge = this.halfedges[i]

      //add available halfedge properties
      this.halfedges[i].face = this.faces[i/3]
      this.halfedges[i].prev = this.halfedges[i+2]
      this.halfedges[i].next = this.halfedges[i+1]

      this.halfedges[i+1].face = this.faces[i/3]
      this.halfedges[i+1].prev = this.halfedges[i]
      this.halfedges[i+1].next = this.halfedges[i+2]

      this.halfedges[i+2].face = this.faces[a/3]
      this.halfedges[i+2].prev = this.halfedges[i+1]
      this.halfedges[i+2].next = this.halfedges[i]
    }

    //check if twin of halfedges has been constructed
    for(let j = 0; j < this.halfedges.length; j++) {
      for(let k = 0; k < this.halfedges.length; k++) {
        if(!this.halfedges[j].twin) {
          if(j !== k && this.halfedges[j].next!.vert === this.halfedges[k].vert && this.halfedges[j].vert === this.halfedges[k].next!.vert) {
            this.halfedges[j].twin = this.halfedges[k]
          }
        }
      }
    }

    //construct edges
    let e = 0
    
    for(let j = 0; j < this.halfedges.length; j++) {
      if(!this.halfedges[j].edge) {
        if(this.halfedges[j].onBoundary === false) {
        this.edges[e] = new Edge()
        this.halfedges[j].edge = this.edges[e]
        this.edges[e].halfedge = this.halfedges[j]
        if(this.halfedges[j].twin) {
          this.halfedges[j].twin!.edge = this.edges[e]
          e += 1
        }
      }
      }
    }

    //add halfedge boundary property
    var t = 0
    for(let j = 0; j < this.halfedges.length; j++) {
      if(!this.halfedges[j].twin) {
        this.halfedges[j].onBoundary = true
        t += 1
      }
    }

    //construct boundary halfedges and edges
    var b = 0
    var end = this.halfedges.length
    for(let j = 0; j < this.halfedges.length; j++) {
      if(this.halfedges[j].onBoundary === true) {
        this.halfedges[end+b] = new Halfedge()
        this.halfedges[end+b].vert = this.halfedges[j].next!.vert
        this.halfedges[end+b].face = this.halfedges[j].face
        this.halfedges[j].twin = this.halfedges[end+b]
        this.halfedges[end+b].twin = this.halfedges[j]
        this.edges[e] = new Edge()
        this.edges[e].halfedge = this.halfedges[end+b]
        this.halfedges[j].edge = this.edges[e]
        this.halfedges[end+b].edge = this.edges[e]
        b += 1
        e += 1
      }
    }

    //add halfedge boundary property
    for(let j = 0; j < this.halfedges.length; j++) {
      if(this.halfedges[j].onBoundary === true) {
        this.halfedges[j].twin!.onBoundary = true
      }
    }
    
    //construct boundary loop, only one direction for now
    for(let j = 0; j < this.halfedges.length; j++) {
      if(this.halfedges[j].onBoundary === true && !this.halfedges[j].next) {
        for(let k = 0; k < this.halfedges.length; k++) {
          if(this.halfedges[k].onBoundary === true && !this.halfedges[k].next && this.halfedges[j].twin?.vert === this.halfedges[k].vert) {
            this.halfedges[j].next = this.halfedges[k]
            /*for(let l = 0; l < this.halfedges.length; k++) {
              if(this.halfedges[l].onBoundary === true && !this.halfedges[l].prev && this.halfedges[j].twin?.vert === this.halfedges[k].vert) {
                this.halfedges[j].next = this.halfedges[k]
              }
            }*/
          }
        }
      }
    }

    /*for(let i = 0; i < this.edges.length; i++) {
      if(this.edges[i].halfedge?.onBoundary == true) {
        
      }
    }*/



    /*console.log(t)
    console.log(b)
    console.log(positions.length)
    console.log(this.verts.length)
    console.log(indices.length/3)
    console.log(this.faces.length)
    console.log(this.halfedges.length)
    console.log(this.edges.length)*/ 

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
