// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import {Vector} from '../linalg/vec';




export class Halfedge {
  vert?: Vertex;
  edge?: Edge;
  face?: Face;

  prev?: Halfedge;
  next?: Halfedge;
  twin?: Halfedge;

  idx: number;
  onBoundary: boolean;

  constructor() {
    this.idx = -1;
    this.onBoundary = false;
  }
  vector(): Vector {
    // TODO: compute the edge vector.
    // assuming that the vertex of each halfedge is the "starting vertex" of this halfedge
    const pos1=this.vert!.position;
    const pos2=this.next!.vert!.position;
    return pos2.sub(pos1);
  }
  cotan(): number {
    // TODO: Compute the cotan formula at this edge, if an edge
    // is on the boundary, then return zero.
    // From https://www.cuemath.com/cotangent-formula/
    // cot A = Adjacent side / Opposite side
    // And from https://stackoverflow.com/questions/31159016/how-to-efficiently-calculate-cotangents-from-vectors
    // cot(a, b) = (a * b) / |a x b|, where a and b are vectors
    if(this.onBoundary)return 0;
    const vecAdjacent=this.prev!.vector();
    const vecOposite=this.next!.vector().scale(-1);
    return vecAdjacent.dot(vecOposite)/vecAdjacent.cross(vecOposite).len();
  }

  // Well, this is actually not the tip angle, but the adjacent angle
  angle(): number {
    // TODO: compute the tip angle at this edge.
    // from https://www.euclideanspace.com/maths/algebra/vectors/angleBetween/
    // Step 1: normalize both vectors
    // Step 2: angle = acos(v1*v2)
    // Note: a normalized vector is also called the unit vector
    const vec1=this.prev!.vector().unit();
    const vec2=this.next!.vector().scale(-1).unit();
    // for numeric stability
    return Math.acos(Math.max(-1, Math.min(1, vec1.dot(vec2))));
  }

  // To calculate the tip angle, just use the "next halfedge" & angle() method
  tipAngle():number{
    return this.next!.angle();
  }

}

export class Edge {
  halfedge?: Halfedge;
  idx: number;

  constructor() {
    this.idx = -1;
  }
}

export class Face {
  halfedge?: Halfedge;
  idx: number;

  constructor() {
    this.idx = -1;
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

  normal(): Vector {
    // TODO: compute the face normal of this face.
    // From lecture: A normal is a unit vector along with the cross product of any given two tangent vectors
    // So it doesn't really matter which 2 halfedges we use, as long as they are tangent
    const vec1=this.halfedge!.vector();
    const vec2=this.halfedge!.next!.vector();
    return vec1.cross(vec2).unit();
  }
  area(): number {
    // TODO: compute the area of this face.
    const vec1=this.halfedge!.vector();
    const vec2=this.halfedge!.next!.vector();
    return Vector.calculateAreaTriangle(vec1,vec2);
  }

  // calculate the circumcenter of this face, aka the circumcenter
  // of a triangle
  // taken from https://gamedev.stackexchange.com/questions/60630/how-do-i-find-the-circumcenter-of-a-triangle-in-3d
  circumcenter():Vector{
    // the 3 points that form this face
    const a=this.halfedge!.vert!.position;
    const b=this.halfedge!.next!.vert!.position;
    const c=this.halfedge!.next!.next!.vert!.position;
    const ac=c.sub(a);
    const ab=b.sub(a);
    const abXac=ab.cross(ac);
    // this is the vector from a TO the circumsphere center
    const toCircumsphereCenter =(abXac.cross( ab ).scale(ac.len2()).add(ac.cross( abXac ).scale(ab.len2()))).scale(1.0/(2.0*abXac.len2()));
    const circumsphereRadius = toCircumsphereCenter.len() ;
    const ccs = a.add(toCircumsphereCenter); // now this is the actual 3space location
    return ccs;
  }


  // What is blue in the lecture on the slide with Voronoi cell
  // for one Face. To calculate the Full voronoi cell, just sum it up for all the Faces
  partialVoronoiCellArea():number{
    // basically 4 points that form a quadliteral
    const he=this.halfedge!;
    // first point who lies "half way" on the edge
    const p1=he.vert!.position.add(he.vector().scale(0.5));
    // in the image from thelecture, p2 would be the "center" aka i
    const p2=he.next!.vert!.position;
    const tmpHe=he.next!.next!;
    // also "half way" on the edge
    const p3=tmpHe.vert!.position.add(tmpHe.vector().scale(0.5));
    // 4th point is the circumcenter
    const p4=this.circumcenter();
    return Vector.calculateAreaQuadliteral(p1,p2,p3,p4);
  }

}

export enum NormalMethod {
  EqualWeighted = 'Equal Weighted',
  AreaWeighted = 'Area Weighted',
  AngleWeighted = 'Angle Weighted',
}

export enum CurvatureMethod {
  None = 'None',
  Mean = 'Mean',
  Gaussian = 'Caussian',
  Kmin = 'Kmin',
  Kmax = 'Kmax',
}

export class Vertex {
  position: Vector;
  halfedge?: Halfedge;
  idx: number;

  constructor(position: Vector) {
    this.position = position;
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

  normal(method = NormalMethod.EqualWeighted): Vector {
    // TODO: compute vertex normal given different method:
    // 1. EqualWeighted
    // 2. AreaWeighted
    // 3. AngleWeighted
    // from lecture: weighted average of the normal vectors of incident faces
    // NOTE: since we normalize the normal in the end anyway, we don't
    // need to divide the final vector by how many normals we did "sum up".
    var sum=new Vector(0);
    // loop through all faces whose normals need to be taken into account for this vertex normal
    // and sum them up, taking their weight (depending on the Method) into account.
    this.faces(f=>{ 
      var weight;
      switch(method){
        case NormalMethod.EqualWeighted:
          // weight of each face normal is just 1
          weight=1.0;
          break;
        case NormalMethod.AreaWeighted:
           // weight of each face normal is the area
          weight=f.area();
          break;   
        case NormalMethod.AngleWeighted:
          // weight of each face normal is the tip angle 
          weight=f.halfedge!.angle();
          break;  
      }
      sum=sum.add(f.normal().scale(weight));
    });
    // normalize the sum (unit length 1)
    return sum.unit();
  }

  curvature(method = CurvatureMethod.Mean): number {
    // TODO: compute curvature given different method:
    // 1. None
    // 2. Mean
    // 3. Gaussian
    // 4. Kmin
    // 5. Kmax
    switch(method){
      case CurvatureMethod.Gaussian:
         return this.calculateGausianCurvature();
      case CurvatureMethod.Mean:
        // we don't want the mean curvature as just an absolute value, use k1,k2 instead
        //return this.calculateMeanCurvature();
        const k1=this.calculatePrincipalCurvature();
        const k2=this.calculatePrincipalCurvature(false);
        return (k1+k2)*0.5;
      case CurvatureMethod.Kmin:{
        const k1=this.calculatePrincipalCurvature();
        const k2=this.calculatePrincipalCurvature(false);
        return Math.min(k1,k2);
      }
      case CurvatureMethod.Kmax:{
        const k1=this.calculatePrincipalCurvature();
        const k2=this.calculatePrincipalCurvature(false);
        return Math.max(k1,k2);
      }
    }
    return 1;
  }

  // calculate the angle defect of the tip angles
  // 2π−∑θj aka 2π - sum of all tip angles
  calculateAngleDefect():number {
    var sum=0.0;
    this.halfedges(h=>{ 
      sum+=h!.tipAngle();
    });
    return 2*Math.PI-sum;
  }

  // the voronoi cell (around) this vertex is just the sum of all
  // the partial voronoi cell areas
  calculateVoronoiCell():number{
    let sum=0.0;
    this.faces(f => {
      sum+=f.partialVoronoiCellArea();
    });
    return sum;
  }

  // Sum(cot(aij)+cot(bij))*(fj-fi)
  // not sure how to call that it is just a helper to make the code less complicated.
  calculateSumCotangentsMultipliedByEdgeVector():Vector{
    let sum=new Vector();
    this.halfedges(h=>{
      // if this halfedge or its twin is on a boundary we need to skip it
     if (h.onBoundary || h.twin!.onBoundary) {
       return;
     }
      const tmp=(h.cotan()+h.twin!.cotan());
      sum=sum.add(h.vector().scale(tmp));
    });
    return sum;
  }

  // Lecture: (Δ f)i= 1/(2*Ai)*Sum(cot(aij)+cot(bij))*(fj-fi)
  // cotan version of discretization of the Laplace Beltrami
  calculateLaplaceBeltrami():Vector{
   let sum=this.calculateSumCotangentsMultipliedByEdgeVector();
   const A=this.calculateVoronoiCell();
   const laplace=sum.scale(1/(2*A));
   return laplace;
  }

   // https://computergraphics.stackexchange.com/questions/1718/what-is-the-simplest-way-to-compute-principal-curvature-for-a-mesh-triangle
  // K=(2π−∑θj)/A
  // weird, in the lecture this is refered to as just the angle defect ? - yeah it is just the angle defect
  // Lecture: K = OMEGAi
  calculateGausianCurvature():number{
    return this.calculateAngleDefect();
  }

  //Lecture: H= 1/2 * || (Δ f)i ||
  // well- this turned out to be wrong. should've been |H|=...
  calculateMeanCurvature():number{
    return this.calculateLaplaceBeltrami().len()*0.5;
  }

  // Lecture: k1=H-sqrt(H^2−K) and k2=H+sqrt(H^2−K)
  calculatePrincipalCurvature(k1=true):number{
    const unknown=this.calculateLaplaceBeltrami();
    const K=this.calculateGausianCurvature();
    // for the mean curvature we want both positive and negative values
    const H=K>0 ? unknown.len() : -unknown.len();
    if(k1){
      return H-Math.sqrt(H*H-K);
    }
    return H+Math.sqrt(H*H-K);
  }

}
