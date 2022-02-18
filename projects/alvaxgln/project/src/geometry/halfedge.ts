// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import {Vertex, Edge, Face, Halfedge} from './primitive';
import {Vector} from '../linalg/vec';
import {EdgeQueue} from './pq';

export enum WeightType {
  Uniform = 'Uniform',
  Cotan = 'Cotan',
}

export class HalfedgeMesh {
  color: Vector;
  wireframe: Vector;

  // The following four fields are the key fields to represent half-edge based
  // meshes.
  verts: (Vertex | null)[]; // for update
  edges: (Edge | null)[]; // a list of edges
  faces: (Face | null)[]; // a list of faces
  halfedges: (Halfedge | null)[]; // a list of halfedges
  boundaries: Face[]; // an array of boundary loops

  
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

    this.verts = [];
    this.edges = [];
    this.faces = [];
    this.halfedges = [];
    this.boundaries = [];

    const t0 = performance.now();
    this.buildMesh(indices, positions);
    const t1 = performance.now();
    console.log(`Halfedge mesh build time: ${t1 - t0} ms`);
  }

  /**
   * buildMesh builds half-edge based connectivity for the given vertex index buffer
   * and vertex position buffer.
   *
   * @param indices is the vertex index buffer that contains all vertex indices.
   * @param positions is the vertex buffer that contains all vertex positions.
   */
  buildMesh(indices: number[], positions: Vector[]) {
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
    this.edges = new Array(edges.size);
    this.faces = new Array(indices.length / 3);
    this.halfedges = new Array(edges.size * 2);

    const idx2vert = new Map();
    for (let i = 0; i < positions.length; i++) {
      const v = new Vertex(positions[i]);
      v.idx = i;
      this.verts[i] = v;
      idx2vert.set(i, v);
    }

    let eidx = 0;
    const existedHe = new Map();
    const hasTwin = new Map();

    // construct halfedges, edges
    let edgeIdx = 0;
    let faceIdx = 0;
    let heIdx = 0;
    for (let i = 0; i < indices.length; i += 3) {
      // construct face
      const f = new Face();
      f.idx = faceIdx++;
      this.faces[i / 3] = f;

      // construct halfedges of the face
      for (let j = 0; j < 3; j++) {
        const he = new Halfedge();
        he.idx = heIdx++;
        this.halfedges[i + j] = he;
      }

      // construct connectivities of the new halfedges
      for (let j = 0; j < 3; j++) {
        // halfedge from vertex a to vertex b
        let a = indices[i + j];
        let b = indices[i + ((j + 1) % 3)];

        // halfedge properties
        const he = this.halfedges[i + j];
        he!.next = <Halfedge>this.halfedges[i + ((j + 1) % 3)];
        he!.prev = <Halfedge>this.halfedges[i + ((j + 2) % 3)];
        he!.onBoundary = false;
        hasTwin.set(he, false);

        const v = idx2vert.get(a);
        he!.vert = v;
        v.halfedge = he;

        he!.face = f;
        f.halfedge = <Halfedge>he;

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
          he!.twin = twin;
          twin.twin = he;
          he!.edge = twin.edge;

          hasTwin.set(he, true);
          hasTwin.set(twin, true);
        } else {
          // new halfedge
          const e = new Edge();
          e.idx = edgeIdx++;
          this.edges[eidx] = e;
          eidx++;
          he!.edge = e;
          e.halfedge = <Halfedge>he;

          existedHe.set(ek, he);
        }

        // FIXME: non-manifold edge count checking
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
      this.boundaries.push(f);

      const bcycle = []; // boundary cycle
      let current = he;
      do {
        const bhe = new Halfedge(); // boundary halfedge
        bhe.idx = heIdx++;
        this.halfedges[hidx] = bhe;
        hidx++;
        bcycle.push(bhe);

        // grab the next halfedge along the boundary that does not
        // have a twin halfedge
        let next = <Halfedge>current!.next;
        while (hasTwin.get(next)) {
          next = <Halfedge>next.twin!.next;
        }

        // set the current halfedge's attributes
        bhe.vert = next.vert;
        bhe.edge = current!.edge;
        bhe.onBoundary = true;

        // point the new halfedge and face to each other
        bhe.face = f;
        f.halfedge = bhe;

        // point the new halfedge and twin to each other
        bhe.twin = <Halfedge>current;
        current!.twin = bhe;

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
    this.resetIndices();
  }
  /**
   * resetIndices clears all null elements and reset the indices
   */
  resetIndices() {
    // clear null elements
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notnull = (e: any) => (e === null ? false : true);
    this.verts = this.verts.filter(notnull);
    this.edges = this.edges.filter(notnull);
    this.faces = this.faces.filter(notnull);
    this.halfedges = this.halfedges.filter(notnull);
    this.boundaries = this.boundaries.filter(notnull);

    // reset indices
    let index = 0;
    this.verts.forEach(v => {
      v!.idx = index++;
    });
    index = 0;
    this.edges.forEach(e => {
      e!.idx = index++;
    });
    index = 0;
    this.faces.forEach(f => {
      f!.idx = index++;
    });
    index = 0;
    this.halfedges.forEach(h => {
      h!.idx = index++;
    });
    index = 0;
    this.boundaries.forEach(b => {
      b.idx = index++;
    });
  }

  simplify(reduceRatio: number) {
    // TODO: implement QEM simplification algorithm
    //
    // Hints:
    //    - Boundary edges maybe skipped without handling
    //    - Use the provided EdgeQueue to maintain a priority queue
    //    - If necessary, use the provided resetIndices
    //    - Carefully maintain the edge collapse as it may easily be wrong
    //      It is recommended to first start with a simply cube object.
    //    - To mark remove an object, one can assign null to the array, then
    //      calling resetIndices will filter out all null elements. (Only call
    //      at the end of each simplification round)
    //
    // Additional Task:
    //    - Be able to handle meshes with boundary (need preserve the boundary)

    // Number of faces that should be removed.
    const reducedFaces = Math.floor(this.faces.length * reduceRatio);
  }

//TODO: sort edges by error
categorizeEdges(){
  
  //reset indices before categorization
  this.resetIndices();

  let longEdges = new Array();
  let shortEdges = new Array();
  let driftingEdges = new Array();

  //find irregular vertices
  const l = this.edges.length;

  //sort edges into arrays
  for(let i=0; i<l; i++){
    const e = this.edges[i]!;

    //if edge was deleted continue
    if(e == null) continue;

    const h = e.halfedge!;
    const v1 = h.vert!
    const v2 = h.twin!.vert!
    
    const deg1 = v1.deg_error(v1.deg());
    const deg2 = v2.deg_error(v2.deg());

    //if the edge has two irregular vertices add it to the appropriate array

    //short edge
    if(deg1 < 0 && deg2 < 0){
      shortEdges.push(e);
      this.collapse(e, v1.pos.add(h.vector().scale(0.5)));
      this.basicEdgeFlip();
    }

    //long edge
    if(deg1 > 0 && deg2 > 0){
      shortEdges.push(e);
      this.split(e);
      this.basicEdgeFlip();
    }

    //drifting edge
    if((deg1 > 0 && deg2 < 0) || (deg1 < 0 && deg2 > 0)){
      driftingEdges.push(e);
    }

  }

}

  basicEdgeFlip(){

    this.resetIndices();

    //Step 1 basic edge flips:
    let l = this.edges.length;

    //set flipped true if an edge was flipped during that round
    let flipped = 0;
    
    do{
      flipped = 0;
    //do rounds of flipping until no further improvement of regularity
    for (let i = 0; i<l; i++){
      let e = this.edges[i]!;
      //console.log(e);
      let flip = e.halfedge!.detectFlip();
      if(flip) {
        flipped = flipped + this.flip(e);
        //debug
        //console.log("Halfedge number " + i + ": " + flip + "!");
      }
  
    }

      console.log(flipped + " Edges were flipped!");
    }while (flipped > 0);
    //this.resetIndices();
  }

  //Regularize the halfedge mesh
  //TODO: everything
  regularize(){

  console.log("regular!");

  this.basicEdgeFlip();

  this.categorizeEdges();

  console.log("End of regular!");

  //this.testOperations()



  }
  
  testOperations(){
/* 
   for (let i = 0; i <1000; i++){
    let h = this.halfedges[i]!;
    let flip = h.detectFlip();
    
    if(flip) {
      this.flip(h.edge!);
      console.log("Halfedge number " + i + ": " + flip + "!")
      
    
    }
  }

 */ 

  //maybe check he 465/466 for bad angles

  

/* //Test edge operations
  const e = this.edges[1]!;
  const e2 = this.edges[14]!;
  //this.faces[150] = null;
  //const e3 = this.faces[150]!.halfedge!.edge!;
  //this.resetIndices();
  //this.split(e3);
 */

  //console.log(e);
  //this.split(e2);
  //this.flip(e);
  //this.newCollapse(e2, e2!.halfedge!.vert!.pos.add(e2!.halfedge!.vector().scale(0.5)));
  //this.resetIndices();
 

  //console.log(this.verts[this.verts.length-1]);

/*
//For testing
let v = this.verts[4]!;
console.log(v);
v.pos = v.angle_smooth();
 */



  //this.flip(this.halfedges[2]!);


  }

  //applies one round of angle based smoothing to the mesh
  //TODO: Add parameters
  angle_smooth(){

    //create array for updated vertex positions
    let verts_smooth = [];

    //calculate new position for all vertices and store them
    for (let [i,v] of this.verts.entries()){

      //console.log(i, v);
      verts_smooth[i] = v!.angle_smooth();
    
    }
    
    //Apply new positions to mesh vertices
    //note: two loops are necessary because we need to use unmodified vertex positions for all the calculations
    for (let [i,v] of verts_smooth.entries()){
    
      this.verts[i]!.pos! = v;
    
    }
    
    console.log("Angle based smoothing finished");

  }


  //flips the halfedge h
  flip(e: Edge): number{

  //TODO: fix indices

  //TODO: Check for flipped faces (maybe compare normals before and after)

  //TODO: Handle bad angles:
  //check for too big/small angle between f0 and f1


  //halfedges involved
  const h = e.halfedge!
  const h_twin = h.twin!;
  const h1 = h.next!;
  const h2 = h.prev!;
  const h3 = h_twin.next!;
  const h4 = h_twin.prev!;

  //dont flip boundary edges
  if(h.onBoundary || h_twin.onBoundary){
    console.log("Edge on Boundary, edge was not flipped!");
    return 0;
  }

  //When angle between h4->h1 or h2->h3 is too large don't flip
  //When angle between f0 and f1 is too large or too small don't flip
  //check angles:
  const angle1 = h4.vector().scale(-1).angle(h1.vector());
  const angle2 = h2.vector().scale(-1).angle(h3.vector());
  

  //TODO: Change 3 to Math.PI
  if(angle1>=3 || angle2>=3){
    console.log("Bad angles, edge was not flipped!");
    return 0;
  }


  //vertices involved
  const v0 = h.vert!;
  const v1 = h1.vert!;
  const v2 = h2.vert!;
  const v3 = h4.vert!;

  //faces involved
  const f0 = h.face!;
  const f1 = h_twin.face!;


  //set vertex halfedges to safe halfedges
  v0.halfedge = h3;
  v1.halfedge = h1;

  //set face halfedges to safe halfedges
  f0.halfedge = h1;
  f1.halfedge = h3;

  //set halfedge faces correctly
  h1.face = f0;
  h4.face = f0;

  h2.face = f1;
  h3.face = f1;

  //reassign connectivity

  //h
  h.vert = v2;
  h.next = h4;
  h.prev = h1;

  //h_twin
  h_twin.vert = v3;
  h_twin.next = h2;
  h_twin.prev = h3;

  //h1
  h1.next = h;
  h1.prev = h4;

  //h2
  h2.next = h3;
  h2.prev = h_twin;

  //h3
  h3.next = h_twin;
  h3.prev = h2;

  //h4
  h4.next = h1;
  h4.prev = h;

  console.log("flipped!");
  return 1;

  }

  //splits edge in the middle
  newSplit(e: Edge) {

    //TODO: Handle Boundary
    if (e.halfedge!.onBoundary || e.halfedge!.twin!.onBoundary){
      
      console.log("edge on boundary, not split!")
      return;

      }

    //get relevant halfedges
    const h0 = e.halfedge!;
    const h1 = h0.next!;
    const h2 = h0.prev!;
    const h0_t = h0.twin!;
    const h3 = h0_t.next!;
    const h4 = h0_t.prev!;

    //get faces
    const f0 = h0.face!;
    const f1 = new Face();
    const f2 = h0_t.face!;
    const f3 = new Face();

    //set safe halfedges for faces
    f0.halfedge = h2;
    f1.halfedge = h3;
    f2.halfedge = h4;
    f3.halfedge = h1;

    //get position of new vertex, and create it
    const pos = h0.vert!.pos!.add(h0.vector().scale(0.5));
    let v = new Vertex(pos);

    //create new halfedges
    let new_h0 = new Halfedge();
    let new_h1 = new Halfedge();
    let new_h2 = new Halfedge();
    let new_h3 = new Halfedge();

    let new_h2_t = new Halfedge();
    let new_h3_t = new Halfedge();

    //create new edges
    //TODO: Add third edge
    let e_v2 = new Edge();
    let e_v3 = new Edge();
    //let e_3...

    //assign halfedges to new edges
    e_v2.halfedge = new_h2;
    e_v3.halfedge = new_h3;

    //assign edges to new halfedges
    new_h0.edge = h0.edge;
    new_h1.edge = h0_t.edge;

    new_h2.edge = e_v2;
    new_h3.edge = e_v3;
    new_h2_t.edge = e_v2;
    new_h3_t.edge = e_v3;

    //assign faces to new halfedges
    new_h0.face = f1;
    new_h1.face = f3;
    new_h2.face = f0;
    new_h3.face = f2;

    new_h2_t.face = f3;
    new_h3_t.face = f1;

    //assign vert to new halfedges
    new_h0.vert = v;
    new_h1.vert = v;
    new_h2.vert = v;
    new_h3.vert = v;

    new_h2_t.vert = h2.vert!;
    new_h3_t.vert = h4.vert!;


    //set twins
    new_h0.twin = h0;
    h0.twin = new_h0;

    new_h1.twin = h0_t;
    h0_t.twin = new_h1;

    new_h2.twin = new_h2_t;
    new_h2_t.twin = new_h2;

    new_h3.twin = new_h3_t;
    new_h3_t.twin = new_h3;

    //set next and prev
    h0.next = new_h2;

    new_h2.next = h2;
    new_h2.prev = h0;
    
    h1.next = new_h2_t;
    h1.prev = new_h1;

    h2.prev = new_h2;

    new_h2_t.next = new_h1;
    new_h2_t.prev = h1;

    new_h1.next = h1;
    new_h1.prev = new_h2_t;

    h3.next = new_h3_t;
    h3.prev = new_h0;

    new_h3_t.next = new_h0;
    new_h3_t.prev = h3;

    new_h0.next = h3;
    new_h0.prev = new_h3_t;

    h0_t.next = new_h3;

    new_h3.next = h4;
    new_h3.prev = h0_t;

    h4.prev = new_h3;

    //set halfedge for new vertex
    v.halfedge = new_h1;
    
    //TODO: Fix indices

    //add new connectivity to mesh
    //TODO: Use fewer push calls
    this.verts.push(v);

    this.halfedges.push(new_h0);
    this.halfedges.push(new_h1);
    this.halfedges.push(new_h2);
    this.halfedges.push(new_h3);

    this.halfedges.push(new_h2_t);
    this.halfedges.push(new_h3_t);

    this.faces.push(f1);
    this.faces.push(f3);

    this.edges.push(e_v2);
    this.edges.push(e_v3);


    console.log("edge: " + e +" was split!")

  }

  /**
   * splits an edge in the middle
   * @param e: the edge to be split
   * 
   */
    split(e: Edge){

      const h = e.halfedge!;
      const h_t = h.twin!;

      if(h.onBoundary || h_t.onBoundary){
        console.log("Edge on boundary, not split")
        return;
      }

      const h1 = h.next!;
      const h2 = h.prev!;
      const h0 = h_t.next!;
      const h3 = h0.next!;

      //create new halfedges
      let h_new = new Halfedge();
      let h_t_new = new Halfedge();
      let h_2_new = new Halfedge();
      let h_2_t_new = new Halfedge();
      let h_3_new = new Halfedge();
      let h_3_t_new = new Halfedge();

      const v0 = h.vert!;
      const v1 = h1.vert!;
      const v2 = h2.vert!;
      const v3 = h3.vert!;

      const f0 = h.face!;
      const f2 = h_t.face!;

      //create new faces
      const f1 = new Face();
      const f3 = new Face();


      //create new edges
      let e_new = new Edge();
      let e_2_new = new Edge();
      let e_3_new = new Edge();

      //create new vertex
      let m = new Vertex(v0.pos.add(h.vector().scale(0.5)));


      //assign connectivity:
      
      //assign old stuff to correct things
      h0.face = f1;
      h1.face = f3;
      
      f1.halfedge = h0;
      f3.halfedge = h1;
      f0.halfedge = h2;
      f2.halfedge = h3;

      e.halfedge = h;

      //assign new stuff

      //assign halfedges to edges
      e_new.halfedge = h_t;
      e_2_new.halfedge = h_2_new;
      e_3_new.halfedge = h_3_new;

      //assign edges to halfedges
      h_t_new.edge = e;
      h_t.edge = e_new;
      h_new.edge = e_new;
      h_2_new.edge = e_2_new;
      h_3_new.edge = e_3_new;
      h_2_t_new.edge = e_2_new;
      h_3_t_new.edge = e_3_new;

      //assign verts to halfedges
      h_2_new.vert = m;
      h_3_new.vert = m;
      h_new.vert = m;
      h_t_new.vert = m;

      h_2_t_new.vert = v2;
      h_3_t_new.vert = v3;
      
      //assign faces to halfedges
      h_new.face = f3;
      h_t_new.face = f1;
      h_2_new.face = f0;
      h_2_t_new.face = f3;
      h_3_new.face = f2;
      h_3_t_new.face = f1;

      //assign halfedge to new vert
      m.halfedge = h_new;

      //assign halfedge pointers

      //f0
      h.next = h_2_new;
      h_2_new.next = h2;
      h_2_new.prev = h;
      h2.prev = h_2_new;

      h.twin = h_t_new;
      h_2_new.twin = h_2_t_new;

      //f1
      h0.next = h_3_t_new;
      h0.prev = h_t_new;
      h_3_t_new.next = h_t_new;
      h_3_t_new.prev = h0;
      h_t_new.next = h0;
      h_t_new.prev = h_3_t_new;

      h_t_new.twin = h;
      h_3_t_new.twin = h_3_new;

      //f2
      h3.prev = h_3_new;
      h_t.next = h_3_new;
      h_3_new.next = h3;
      h_3_new.prev = h_t;

      h_3_new.twin = h_3_t_new;
      h_t.twin = h_new;

      //f3
      h1.next = h_2_t_new;
      h1.prev = h_new;
      h_2_t_new.next = h_new;
      h_2_t_new.prev = h1;
      h_new.next = h1;
      h_new.prev = h_2_t_new;

      h_new.twin = h_t;
      h_2_t_new.twin = h_2_new;

      //add new elements to mesh
      this.verts.push(m);
      this.faces.push(f3,f1);
      this.halfedges.push(h_new, h_2_new, h_3_new, h_t_new, h_2_t_new, h_3_t_new);
      this.edges.push(e_new, e_2_new, e_3_new);

      console.log("edge was split")

    }

  /**
   * collapses an edge at specified position
   * @param e: the edge to be collapsed
   * @param x: position vector of the new vertex
   * idea: "glue" together h.prev and h.next, as well as h.twin.prev and h.twin.next
   */
   newCollapse(e: Edge, x: Vector){

    //TODO: Check if a Vertex of edge is part of boundary and then stop
    //TODO: Check if v3 == v4;
    //TODO: Check for unsafe Collapse, and skip edge if collapse is unsafe

    const h = e.halfedge!;

    //check for boundary
    if(h.onBoundary || h.twin!.onBoundary){
      console.log("Edge on boundary, was not collapsed");
      return;
    }

    const v1 = h.vert!;
    const v2 = h.next!.vert!;
    const v3 = h.prev!.vert!;
    const v4 = h.twin!.prev!.vert!;

    if(v3 == v4){
      console.log("V3=V4, edge was not collapsed");
      return;
    }

    const h1 = h.twin!;
    const h2 = h.next!;
    const h3 = h.prev!;
    const h4 = h.twin!.next!;
    const h5 = h.twin!.prev!;

    const h2t = h2.twin!;
    const h3t = h3.twin!;
    const h4t = h4.twin!;
    const h5t = h5.twin!;

    const f1 = h.face;
    const f2 = h.twin!.face;


    //new Vertex
    let v_x = new Vertex(x);

    //set position of new vertex
    v_x.pos = x;
    //v_x.pos = new Vector()

    //reassign halfedges to new vertex
    v1.halfedges((v)=>{
      v.vert = v_x;
    });

    v2.halfedges((v)=>{
      v.vert = v_x;
    })

    
    //set safe halfedge for new vertex
    v_x.halfedge = h3t;

    // set new twins for face outer halfedges
    h3t.twin = h2t;
    h2t.twin = h3t;

    h4t.twin = h5t;
    h5t.twin = h4t;

    //reassign halfedge of edges
    h3t.edge!.halfedge = h3t;
    h2t.edge! = h3t.edge!;

    h4t.edge!.halfedge = h4t;
    h5t.edge! = h4t.edge!;

    //assign new halfedges to v3, and v4
    v3.halfedge = h2t;
    v4.halfedge = h4t;

    
    //halfedges to be deleted:
    let h_del = [h.idx, h1.idx, h2.idx, h3.idx, h4.idx, h5.idx];


    //edges to be deleted:
    let e_del = [h.edge!.idx, h2.edge!.idx, h5.edge!.idx];

    // faces to be deleted
    let f_del = [f1!.idx, f2!.idx];

    //console.log("Built arrays for idxs of unused geometry");

    //delete unused geometry
    for (let i of h_del){
      this.halfedges[i] = null;
    }

    for (let i of e_del){
      //mark edges as removed
      this.edges[i]!.removed = true;
      this.edges[i] = null;
    }
    


    for (let i of f_del){
      this.faces[i] = null;
    }

    this.verts[v2.idx] = null;
    this.verts[v1.idx] = null;

    //console.log("deleted old geometry");

    this.verts[v1.idx] = v_x;

    //reset error for modified edges
    v_x.halfedges((h,i)=>{
      
       /*  console.log("Now in Halfedges of vert:");
        console.log(h);
        console.log(h.twin?.next); */
    
      h.edge!.err = -1;
    })


    this.resetIndices();
    console.log("edge collapsed!");
    
    
  }

  /**
   * collapses an edge at specified position
   * @param e: the edge to be collapsed
   * @param x: position vector of the new vertex
   * idea: "glue" together h.prev and h.next, as well as h.twin.prev and h.twin.next
   */
   collapse(e: Edge, x: Vector){

    //TODO: Check if a Vertex of edge is part of boundary and then stop
    //TODO: Check if v3 == v4;
    //TODO: Check for unsafe Collapse, and skip edge if collapse is unsafe

    this.resetIndices();

    const h = e.halfedge!;

    //check for boundary
    if(h.onBoundary || h.twin!.onBoundary){
      console.log("Edge on boundary, was not collapsed");
      return;
    }

    const v1 = h.vert!;
    const v2 = h.next!.vert!;
    const v3 = h.prev!.vert!;
    const v4 = h.twin!.prev!.vert!;

    if(v3 == v4){
      console.log("V3=V4, edge was not collapsed");
      return;
    }

    const h1 = h.twin!;
    const h2 = h.next!;
    const h3 = h.prev!;
    const h4 = h.twin!.next!;
    const h5 = h.twin!.prev!;

    const h2t = h2.twin!;
    const h3t = h3.twin!;
    const h4t = h4.twin!;
    const h5t = h5.twin!;

    const f1 = h.face!;
    const f2 = h.twin!.face!;

    //remaining edges
    const e1 = h3t.edge!;
    const e2 = h4t.edge!;

    //edges to delete:
    const e3 = h2.edge!;
    const e4 = h5.edge!;

    //set position of new vertex
    v1.pos = x;
    //v_x.pos = new Vector()


    v2.halfedges((v)=>{
      v.vert = v1;
    })

    
    //set safe halfedge for new vertex
    v1.halfedge = h3t;

    // set new twins for face outer halfedges
    h3t.twin = h2t;
    h2t.twin = h3t;

    h4t.twin = h5t;
    h5t.twin = h4t;

    //reassign halfedge of edges
    e1.halfedge = h3t;
    h2t.edge = e1;

    e2.halfedge = h4t;
    h5t.edge = e2;

    //assign new halfedges to v3, and v4
    v3.halfedge = h2t;
    v4.halfedge = h4t;

    
    //halfedges to be deleted:
    let h_del = [h.idx, h1.idx, h2.idx, h3.idx, h4.idx, h5.idx];


    //edges to be deleted:
    let e_del = [e.idx, e3.idx, e4.idx];

    // faces to be deleted
    let f_del = [f1.idx, f2.idx];

    //console.log("Built arrays for idxs of unused geometry");

    //delete unused geometry
    for (let i of h_del){
      this.halfedges[i] = null;
    }

    for (let i of e_del){
      //mark edges as removed
      this.edges[i]!.removed = true;
      this.edges[i] = null;
    }
    


    for (let i of f_del){
      this.faces[i] = null;
    }

    this.verts[v2.idx] = null;

    //console.log("deleted old geometry");

    //reset error for modified edges
    v1.halfedges((h,i)=>{
      
       /*  console.log("Now in Halfedges of vert:");
        console.log(h);
        console.log(h.twin?.next); */
    
      h.edge!.err = -1;
    })


    this.resetIndices();
    console.log("edge collapsed!");
    
    
  }



}

