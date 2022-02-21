// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import * as THREE from 'three'

export function approxEqual(v1: number, v2: number, epsilon = 1e-7): boolean {
  return Math.abs(v1 - v2) <= epsilon;
}

/**
 * Vector is a homogenous representation of a
 * three dimentional point (w === 1) or three dimentional vector (w === 0).
 * If the given inputs are representing points, then some of the operations
 * will throw an error. For instance, the cross(v) method cannot be called
 * by a point or with a point parameter, both of them must be vectors:
 *
 *    const v1 = new Vector(1, 2, 3, 4);
 *    const v2 = new Vector(2, 3, 4, 5);
 *    try {
 *      console.log(v1.cross(v2)); // throw an error
 *    } catch (e) {
 *      console.log(e);
 *    }
 *
 *    const v3 = new Vector(1, 2, 3, 0);
 *    const v4 = new Vector(2, 3, 4, 0);
 *    console.log(v3.cross(v4)); // Vector(-1, 2, -1, 0)
 *
 */
export class Vector {
  x: number; // x component
  y: number; // y component
  z: number; // z component
  w: number; // w component

  /**
   * constructor constructs a Vector with given x,y,z,w components.
   *
   * @param x component
   * @param y component
   * @param z component
   * @param w component
   */
  constructor(x?: number, y?: number, z?: number, w?: number) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = w || 0;
  }
  /**
   * eq checks whether two vectors are equal.
   * @param v is a Vector
   * @returns true if two given vectors are equal, otherwise false.
   */
  eq(v: Vector): boolean {
    if (
      approxEqual(this.x, v.x) &&
      approxEqual(this.y, v.y) &&
      approxEqual(this.z, v.z) &&
      approxEqual(this.w, v.w)
    ) {
      return true;
    }
    return false;
  }
  /**
   * add adds the given two vectors and returns a new resulting Vector.
   *
   * @param v is a Vector
   * @returns the resulting Vector
   */
  add(v: Vector): Vector {
    return new Vector(this.x + v.x, this.y + v.y, this.z + v.z, this.w + v.w);
  }
  /**
   * sub subtracts the given two vectors and returns a new resulting Vector.
   * @param v is a Vector
   * @returns the resulting Vector
   */
  sub(v: Vector): Vector {
    return new Vector(this.x - v.x, this.y - v.y, this.z - v.z, this.w - v.w);
  }
  /**
   * dot computes the dot product of the given two vectors and returns
   * a new resulting number. Note that this method will throw an error
   * if the given vectors do not represent vectors (i.e. w !== 0).
   *
   * @param v is a Vector
   * @returns the resulting dot product
   */
  dot(v: Vector): number {
    if (!approxEqual(this.w, 0) || !approxEqual(v.w, 0)) {
      throw new Error('expect vector other than point');
    }

    return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
  }
  /**
   * cross computes the cross product of the given two vectors and returns
   * a new resulting Vector. Note that this method will throw an error
   * if the given vectors do not represent vectors (i.e. w !== 0).
   *
   * @param v is a Vector
   * @returns the resulting Vector
   */
  cross(v: Vector): Vector {
    if (!approxEqual(this.w, 0) || !approxEqual(v.w, 0)) {
      throw new Error('expect vector other than point');
    }

    const x = this.y * v.z - this.z * v.y;
    const y = this.z * v.x - this.x * v.z;
    const z = this.x * v.y - this.y * v.x;
    return new Vector(x, y, z, 0);
  }
  /**
   * scale scales the given Vector by a given scalar value, and returns
   * a new resulting Vector.
   *
   * @param s is a scalar value
   * @returns the resulting Vector
   */
  scale(s: number): Vector {
    return new Vector(this.x * s, this.y * s, this.z * s, this.w * s);
  }
  /**
   * len computes the length of the given Vector. Note that this method
   * will throw an error if the given vector does not represent a vector
   * (i.e. w !== 0).
   *
   * @returns the vector length
   */
  len(): number {
    return Math.sqrt(this.dot(this));
  }
  /**
   * unit computes a unit Vector along with the given vector direction.
   * Note that this method will throw an error if the given vector does
   * not represents a vector (i.e. w !== 0).
   *
   * @returns the resulting unit vector
   */
  unit(): Vector {
    if (!approxEqual(this.w, 0)) {
      throw new Error('expect vector other than point');
    }

    const l = this.len();
    const u = new Vector();
    u.x = this.x / l;
    u.y = this.y / l;
    u.z = this.z / l;
    u.w = 0;
    return u;
  }
  min():number{
    return Math.min(this.x,this.y,this.z);
  }
  max():number{
    return Math.max(this.x,this.y,this.z);
  }
  // various methods to convert from/to THREE.js
  convertT():THREE.Vector3{
    return new THREE.Vector3(this.x,this.y,this.z);
  }
  static createF(input:THREE.Vector3):Vector{
    return new Vector(input.x,input.y,input.z);
  } 
  static convArray(input:THREE.Vector3[]):Vector[]{
    let ret=new Array<Vector>();
    for(let i=0;i<input.length;i++){
      let tmp=Vector.createF(input[i]);
      ret.push(tmp);
    }
    return ret;
  }
  static convArray2(input:Vector[]):THREE.Vector3[]{
    let ret=new Array<THREE.Vector3>();
    for(let i=0;i<input.length;i++){
      let tmp=input[i].convertT();
      ret.push(tmp);
    }
    return ret;
  }
  static convArray3(input:number[]):Vector[]{
    let ret=new Array<Vector>();
    for(let i=0;i<input.length;i+=3){
      const a=input[i+0];
      const b=input[i+1];
      const c=input[i+2];
      ret.push(new Vector(a,b,c));
    }
    return ret;
  }
}


// https://fileadmin.cs.lth.se/cs/Personal/Tomas_Akenine-Moller/code/tribox.txt

export class XVector3 {
  numbers: number[];
 
  constructor(x?: number, y?: number, z?: number) {
    this.numbers =new Array<number>(3);
    this.numbers[0] = x || 0;
    this.numbers[1] = y || 0;
    this.numbers[2] = z || 0;
  }

  public static CROSS(v1:number[],v2:number[]):number[]{
    let dest=new Array<number>(3);
    dest[0]=v1[1]*v2[2]-v1[2]*v2[1];
    dest[1]=v1[2]*v2[0]-v1[0]*v2[2];
    dest[2]=v1[0]*v2[1]-v1[1]*v2[0];
    return dest;
  }

  public static DOT(v1:number[],v2:number[]):number{
    return (v1[0]*v2[0]+v1[1]*v2[1]+v1[2]*v2[2]);
  }

  public static SUB(v1:number[],v2:number[]):number[]{
    let dest=new Array<number>(3);
    dest[0]=v1[0]-v2[0];
    dest[1]=v1[1]-v2[1];
    dest[2]=v1[2]-v2[2];
    return dest;
  }
  public static FINDMINMAX(x0:number,x1:number,x2:number,min:number,max:number){
    min = max = x0;
    if(x1<min) min=x1;
    if(x1>max) max=x1;
    if(x2<min) min=x2;
    if(x2>max) max=x2;
  }

  /*======================== X-tests ========================*/
/*  public static  AXISTEST_X01(a:any, b:any, fa:any, fb:any){			  
p0 = a*v0[Y] - b*v0[Z];			       	   
p2 = a*v2[Y] - b*v2[Z];			       	   \
      if(p0<p2) {min=p0; max=p2;} else {min=p2; max=p0;} 
rad = fa * boxhalfsize[Y] + fb * boxhalfsize[Z];   
if(min>rad || max<-rad) return 0;
  }*/

  public static planeBoxOverlap(normal:number[],d:number,maxbox:number[]):number{
    let vmin=new Array<number>(3);
    let vmax=new Array<number>(3);
    for(let q=0;q<=2;q++){
      if(normal[q]>0.0) {
        vmin[q]=-maxbox[q];
        vmax[q]=maxbox[q];
      }else{
        vmin[q]=maxbox[q];
        vmax[q]=-maxbox[q];
      }
    }
    if(XVector3.DOT(normal,vmin)+d>0.0) return 0;
    if(XVector3.DOT(normal,vmax)+d>=0.0) return 1;
    return 0;
  }

  

  public static checkTriangleCube():boolean{
    let triangle=new THREE.Triangle();
    let cube = new THREE.Box3;
    return cube.intersectsTriangle(triangle);
  }


}