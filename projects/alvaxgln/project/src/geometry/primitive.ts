// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import {Vector} from '../linalg/vec';
import {Matrix} from '../linalg/mat';



export class Halfedge {
  vert?: Vertex;
  edge?: Edge;
  face?: Face;

  prev?: Halfedge;
  next?: Halfedge;
  twin?: Halfedge;

  idx: number;
  onBoundary: boolean;

  //returns difference of the degree from 6
  deg_error(x: number){
    return Math.abs(x-6);
  }


  constructor() {
    this.idx = -1;
    this.onBoundary = false;
  }
  vector(): Vector {
    const a = this.next!.vert!;
    const b = this.vert!;
    return a.pos.sub(b.pos);
  }
  cotan(): number {
    if (this.onBoundary) {
      return 0;
    }
    const u = this.prev!.vector();
    const v = this.next!.vector().scale(-1);
    return u.dot(v) / u.cross(v).len();
  }
  angle(): number {
    const u = this.prev!.vector().unit();
    const v = this.next!.vector().scale(-1).unit();
    return Math.acos(Math.max(-1, Math.min(1, u.dot(v))));
  }

  //Checks if edge should be flipped
  //TODO: handle boundary
  detectFlip(){

    //TODO: check for bad angles and return false if bad angles are detected

    //TODO: Check for boundary and skip if edge is on boundary
    if (this.onBoundary) return false;

    //verts of this face
    const v0 = this.vert!;
    const v1 = this.next!.vert!;
    const v2 = this.prev!.vert!;

    //vert of twins face
    const v3 = this.twin!.prev!.vert!;


    //Calculate angle of faces
    const f0 = v0.halfedge!.face!;
    const f1 = v3.halfedge!.face!;
    const face_angle = f0.normal().angle(f1.normal())+Math.PI;

    //Print angle for debug
    //console.log("Winkel: "+ face_angle);
    if (face_angle < 1/3 * (2*Math.PI) || face_angle > 2/3 * (2*Math.PI)) return false;

    //calculates error of degree for current connectivity
    let deg_error_current = v0.deg_error(v0.deg()) + v1.deg_error(v1.deg()) + v2.deg_error(v2.deg()) + v3.deg_error(v3.deg());

    //calculates error of degree if edge was flipped
    let deg_error_new = v0.deg_error(v0.deg()-1) + v1.deg_error(v1.deg()-1) + v2.deg_error(v2.deg()+1) + v3.deg_error(v3.deg()+1);

    //returns true if the current edge error is greater then then one with edge flipped
    return deg_error_current > deg_error_new;

  }
}

export class Edge {
  halfedge?: Halfedge;
  idx: number;
  err: number;
  removed: boolean;

  constructor() {
    this.idx = -1;
    this.removed = false;
    this.err = -1; // an error is guaranteed to be positive, hence initialize it as negative values.
  }
  error(): number {
    // If the error is cached, then return immediately.
    if (this.err > -1) {
      return this.err;
    }

    // TODO: implemented edge error.
    //
    // Hint:
    //    We do not work on boundary edges, set their error to infinity, so
    //    that the priority queue will never pop these edges.
    //
    //    This is preferred. Boundary of a mesh are considered as features,
    //    except the faulty noisy meshes. If that happens, we need clean up
    //    the mesh first.
    return this.err;
  }
  /**
   * bestVertex returns the optimal vertex that can replaces the connecting vertices
   * of the given edge.
   */
  bestVertex(): Vector {
    // TODO: estimate the best replacing vertex by computing
    // the quadric error.
    //
    // Hint:
    //      If a quadric is ill-posed, search a best vertex on the current edge
    //      The search process should sample a position iteratively from one
    //      to the other. Use the one with least quadric error.
    return new Vector(0, 0, 0, 1);
  }
  /**
   * quadric computes and returns the quadric matrix of the given edge
   */
  quadric(): Matrix {
    // TODO: Compute Edge Quadric Matrix
    return new Matrix();
  }
}

export class Face {
  halfedge?: Halfedge;
  idx: number;
  removed: boolean;

  constructor() {
    this.idx = -1;
    this.removed = false;
  }
  vertices(fn: (v: Vertex, n: number) => void) {
    let start = true;
    let i = 0;
    for (let h = this.halfedge; start || h !== this.halfedge; h = h!.next) {
      fn(h!.vert!, i);
      start = false;
      i++;
    }
  }
  halfedges(fn: (he: Halfedge, n: number) => void) {
    let start = true;
    let i = 0;
    for (let h = this.halfedge; start || h !== this.halfedge; h = h!.next) {
      fn(h!, i);
      start = false;
      i++;
    }
  }
  normal(): Vector {
    if (this.halfedge!.onBoundary) {
      return new Vector(0, 0, 0, 0);
    }
    // normals should based on the current position rather than
    // original position.
    const h = this.halfedge!;
    const a = h.vert!.pos.sub(h.next!.vert!.pos);
    const b = h.prev!.vert!.pos.sub(h.vert!.pos).scale(-1);
    return a.cross(b).unit();
  }
  area(): number {
    // Compute the area of this face.
    const h = this.halfedge!;
    if (h.onBoundary) {
      return 0;
    }
    const a = h.vert!.pos.sub(h.next!.vert!.pos);
    const b = h.prev!.vert!.pos.sub(h.vert!.pos).scale(-1);
    return a.cross(b).len() * 0.5;
  }
  /**
   * quadric computes and returns the quadric matrix of the given face
   * @returns {Matrix}
   */
  quadric(): Matrix {
    // TODO: Compute Face Quadric
    return new Matrix();
  }
}

export enum NormalMethod {
  EqualWeighted = 'Equal Weighted',
  AreaWeighted = 'Area Weighted',
  AngleWeighted = 'Angle Weighted',
}

export class Vertex {
  pos: Vector;
  posOrig: Vector;
  halfedge?: Halfedge;
  idx: number;

  constructor(pos: Vector) {
    this.pos = pos;
    this.posOrig = new Vector(pos.x, pos.y, pos.z, 1);
    this.idx = -1;
  }
  faces(fn: (f: Face, i: number) => void) {
    let start = true;
    let i = 0;
    for (
      let h = this.halfedge;
      start || h !== this.halfedge;
      h = h!.twin!.next
    ) {
      if (h!.onBoundary) {
        continue;
      }
      fn(h!.face!, i);
      start = false;
      i++;
    }
  }
  halfedges(fn: (h: Halfedge, i: number) => void) {
    let start = true;
    let i = 0;
    for (
      let h = this.halfedge;
      start || h !== this.halfedge;
      h = h!.twin!.next
    ) {
      fn(h!, i);
      start = false;
      i++;
    }
  }
  vertices(fn: (h: Vertex, i: number) => void) {
    this.halfedges((h, i) => {
      fn(h.next!.vert!, i);
    });
  }
  normal(method = NormalMethod.EqualWeighted): Vector {
    let n = new Vector();
    switch (method) {
      case NormalMethod.EqualWeighted:
        this.faces(f => {
          n = n.add(f.normal());
        });
        return n.unit();

      case NormalMethod.AreaWeighted:
        this.faces(f => {
          n = n.add(f.normal().scale(f.area()));
        });
        return n.unit();

      case NormalMethod.AngleWeighted:
        this.halfedges(h => {
          n = n.add(h.face!.normal().scale(h.next!.angle()));
        });
        return n.unit();
    }
  }

  //returns the degree of a vertex
  //TODO: handle boundary
  deg(){
    let n = 0;
    this.halfedges(()=>{
      n++
    });
    return n;
  }

  //returns true if an edge connecting to the vertex lies on a boundary
  onBoundary() :boolean{
    let onBoundary = false;

    //check if any of the verts halfedges are on a boundary and set it to true if so
    this.halfedges(h=>{
      if (h.onBoundary || h.twin!.onBoundary) onBoundary = true;
    })
    
    return onBoundary;
  }

  //return error of degree (difference from optimum)
  deg_error(deg: number){

    let onBoundary = this.onBoundary();

    //optimal degree for boundary verts is 4
    if (onBoundary) {
      return Math.abs(deg-4);
    }

    //for all other vertices optimal degree is 6
    else{
      return Math.abs(deg-6);
    }

  }

 
  /**
   * calculates position of vertex after angle based smooting
   * 
   * Angle based smoothing is described in this paper: "DOI 10.1007/s00366-004-0282-6"
   * The procedure calculates a vertex-position for every edge connected to the vertex, and then moves the vertex to the average of those.
   * The positions are chosen so, that the angle at the vertex the respective edge connects to (left and right of the edge) are getting equalized.
   * 
   * It is described for 2D meshes in the paper and thus had to be modified for 3D models.
   * I decided rather then rotating the edges around the connecting vertices as described i would shift the vertex, (that should get smoothed) on the respective neighbouring edge to equalize the angles.
   * 
   * TODO: remove console logs for debugging
   */
  angle_smooth(): Vector{

    //if the vertex is on a boundary it should not move
    if(this.onBoundary()) return this.pos;

    let count = 0;
    let sum = new Vector(0,0,0,0);

    //calculate modified position of vertex for each halfedge
    this.halfedges((h,i)=>{

      //get positions of vertices
      const v = this.pos!;
      const p1 = h.next!.vert!.pos!;
      const p2 = h.prev!.vert!.pos!;
      const p0 = h.twin!.prev!.vert!.pos!;

      //get vectors
      const vec = v.sub(p1);
      const vec0 = p0.sub(p1);
      const vec1 = p2.sub(p1);

      //get angle a
      let a = vec0.angle(vec);
      //get angle b
      let b = vec1.angle(vec);


      //goal is to equalize a and b

      //get the larger angle of the two
      let max_angle = Math.max(a,b);

      //determine halfedge along which the vertex will be shifted
      let vec_shift = a>b? p0.sub(v) : p2.sub(v);

      //difference between angles
      let dif = Math.abs(a-b);
      //angle has to be reduced by half the difference
      let shift = dif/2;
      //ratio between shift and max_angle determines how far the vertex will be moved on the edge
      let ratio = shift/max_angle;


      //debugging
/*       console.log("Position of the vertices: v, p0, p1, p2");
      console.log(v);
      console.log(p0);
      console.log(p1);
      console.log(p2);

      console.log("Angles: a, b");
      console.log(a);
      console.log(b);
 */
      
      //new position on the edge after shifting
      let pos = v.add(vec_shift.scale(ratio));

      //debugging
/*       console.log("new position on halfedge:");
      console.log(pos);
 */
      //Find the new position by constructing a vector from p1 to pos, and then scale (p1->pos) to the original length of the edge
      pos = p1.add(pos.sub(p1).unit().scale(vec.len()));

/*       console.log("new position 2:");
      console.log(pos);
 */      

      //For weighted version find the new angle
      let ab = (a+b)/2
      let a_i = 1/(ab*ab)

      //add value to count
      count = count + a_i;
      //add value to sum
      sum = sum.add(pos.scale(a_i));

    }); 

    //multiply results
    let res = sum.scale(1/count);

/*     console.log("summe:");
    console.log(res);
 */

    //return new position vector
    return res;

  }

  /**
   * quadric computes and returns the quadric matrix of the given vertex
   */
  quadric(): Matrix {
    // TODO: compute vertex quadric
    return new Matrix();
  }


}
