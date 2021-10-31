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
    //const position1=positions[indices[0]];

    //this.appendSingleTriangle(positions[indices[0]],positions[indices[1]],positions[indices[2]]);
    //for(let i=0;i<indices.length-3;i+=3){
    //  this.appendSingleTriangle(positions[indices[i+0]],positions[indices[i+1]],positions[indices[i+2]]);
    //}

    // first step: create all the vertices
    for(let i=0;i<positions.length;i++){
      const vertex=new Vertex(positions[i]);
      // we'l need the id later
      vertex.idx=i;
      this.verts.push(vertex);
    }

    for(let i=0;i<=indices.length-3;i+=3){
      //this.appendSingleTriangle(positions[indices[i+0]],positions[indices[i+1]],positions[indices[i+2]]);
      this.appendFace(indices[i],indices[i+1],indices[i+2]);
    }

    this.validateUsingEuler();

    console.log("Source:N vertices"+this.verts.length);
    console.log("Source:N indices"+indices.length);
    console.log("N faces:"+this.faces.length);
  }

  // search for a halfedge that goes from idx1 to idx2
  // returns the halfedge if found, null otherwise
  findHalfedge(idx1:number,idx2:number):Halfedge | null{
    for(let i=0;i<this.halfedges.length;i++){
      const halfedge=this.halfedges[i];
      const vert1=halfedge.prev?.vert;
      const vert2=halfedge.vert;
      if(vert1?.idx==idx1 && vert2?.idx==idx2){
        //console.log("Found a matching halfedge");
        return halfedge;
      }
    }
    return null;
  }

  // Creates and Appends a new Edge. Call this with 2 opposite half edges
  // (aka twins).
  appendEdgeAndWriteTwins(newHe:Halfedge,oppositeHe:Halfedge){
    if(newHe.twin!=null || oppositeHe.twin!=null){
      console.log("One of these halfedges alread has a twin");
    }
    var edge=new Edge();
    edge.halfedge=oppositeHe;
    newHe.twin=oppositeHe;
    oppositeHe.twin=newHe;
    this.edges.push(edge);
  }
  

  // each call to appendFace adds 
  // 1 new face
  // 3 new half-edges
  // up to 3 new edges
  appendFace(idx1:number,idx2:number,idx3:number){
    // 3 new halfedges (appended later)
    var halfedge1=new Halfedge(); //goes from idx1 to idx2
    var halfedge2=new Halfedge(); //goes from idx2 to idx3
    var halfedge3=new Halfedge(); //goes from idx3 to idx1
    // 1 new face (appended later)
    var face1=new Face;

    if(idx1>this.verts.length || idx2>this.verts.length || idx3>this.verts.length){
      console.log("Fucking hell");
    }

    face1.halfedge=halfedge1;

    const vertex1=this.verts[idx1];
    const vertex2=this.verts[idx2];
    const vertex3=this.verts[idx3];

    // if we have already added a halfedge that goes from vertex number x to vertex number y (or y to x),
    // we have a new edge. And every time we have a new edge, we can assign the twin value for both halfedges
    var oppositeHalfedge=this.findHalfedge(idx2,idx1);
    if(oppositeHalfedge!=null){
      this.appendEdgeAndWriteTwins(halfedge1,oppositeHalfedge);
    }
    oppositeHalfedge=this.findHalfedge(idx3,idx2);
    if(oppositeHalfedge!=null){
      this.appendEdgeAndWriteTwins(halfedge2,oppositeHalfedge);
    }
    oppositeHalfedge=this.findHalfedge(idx1,idx3);
    if(oppositeHalfedge!=null){
      this.appendEdgeAndWriteTwins(halfedge3,oppositeHalfedge);
    }

    // Doesn't really matter, but if a Vertex is already assigned a halfedge, don't ovverride it
    if(!vertex1.halfedge){
      vertex1.halfedge=halfedge1;
    }
    if(!vertex2.halfedge){
      vertex2.halfedge=halfedge2;
    }
    if(!vertex3.halfedge){
      vertex3.halfedge=halfedge3;
    }
    /*vertex1.halfedge=halfedge1;
    vertex2.halfedge=halfedge2;
    vertex3.halfedge=halfedge3;*/

    // the vertex each halfedge points to
    halfedge1.vert=vertex2;
    halfedge2.vert=vertex3;
    halfedge3.vert=vertex1;

    halfedge1.face=face1;
    halfedge2.face=face1;
    halfedge3.face=face1;

    halfedge1.prev=halfedge3;
    halfedge1.next=halfedge2;

    halfedge2.next=halfedge3;
    halfedge2.prev=halfedge1;

    halfedge3.next=halfedge1;
    halfedge3.prev=halfedge2;

    // append everything newly generated on the output array
    this.halfedges.push(halfedge1);
    this.halfedges.push(halfedge2);
    this.halfedges.push(halfedge3);
    this.faces.push(face1);
  }

  validateUsingEuler(){
    // total number of half-edges should be "close" to 2x number of edges
    if(this.halfedges.length!=this.edges.length*2!){
      console.log("n of half-edges and edges*2 does not match"+this.halfedges.length+"!="+(this.edges.length*2));
    }
    // total number of half-edges must be exactly 3x number of faces
    if(this.halfedges.length!=this.faces.length*3){
      console.log("n of half-edges and faces*3 does not macth"+this.halfedges.length+"!="+(this.faces.length*3));
    }
    //console.log("Hmm");
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
