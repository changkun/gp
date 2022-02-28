// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
// Modified by Jakob Schmid <schmid.ja@campus.lmu.de>
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

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

  //computes the angle between two vectors
  angle(v: Vector) :number{


    //TODO: find solution without Math.abs
    let cos = this.dot(v)/(this.len() *v.len());

    //necessary because of some Numbers going beyond 1/-1
    cos = Math.round((cos + Number.EPSILON) * 1000) / 1000

    return Math.acos(cos);

  }
}
