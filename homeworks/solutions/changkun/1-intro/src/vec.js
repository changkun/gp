/**
 * Copyright 2020 Changkun Ou <https://changkun.de>. All rights reserved.
 * Use of this source code is governed by a GNU GLPv3 license that can be
 * found in the LICENSE file.
 */

/**
* Vector uses homogeneous coordinates (x, y, z, w) that represents
* either a point or a vector.
*/
export default class Vector {
  /**
    * constructs a point or a vector with given parameters.
    * @param {number} x is x value of a vector, default: 0
    * @param {number} y is y value of a vector, default: 0
    * @param {number} z is z value of a vector, default: 0
    * @param {number} w is w value of a vector, default: 0
    */
  constructor(x, y, z, w) {
    this.x = x || 0
    this.y = y || 0
    this.z = z || 0
    this.w = w || 0
  }
  /**
    * add performs vector addition for vectors or points.
    * @param {Vector} v is a point or a vector
    * @return {Vector} the sum of the given two Vector objects
    */
  add(v) {
    return new Vector(this.x+v.x, this.y+v.y, this.z+v.z, this.w+v.w)
  }
  /**
    * sub performsn vector subtraction for given vectors, or point and vector, or two points
    * @param {Vector} v is a point or a vector
    * @return {Vector} the subtraction of the given two Vector objects
    */
  sub(v) {
    return new Vector(this.x - v.x, this.y - v.y, this.z - v.z, this.w - v.w)
  }
  /**
    * multiplyScalar implements scalar vector or scalar point multiplication.
    * @param {number} scalar is a scalar number.
    * @return {Vector} this is a point or a vector
    */
  mul(scalar) {
    return new Vector(this.x * scalar, this.y * scalar, this.z*scalar, this.w*scalar)
  }
  /**
    * dot implements dot product of two vectors.
    * This function will throw an error if this or v is not a vector.
    * @param {Vector} v is a vector NOT a point
    * @return {number} the result of dot product
    */
  dot(v) {
    if (this.w != 0 || v.w != 0) {
      throw new Error('expect vector other than point')
    }
    return this.x * v.x + this.y * v.y + this.z * v.z
  }
  /**
    * crossVectors implements cross product for two given vectors
    * and assign the result to this and returns it.
    * This function will throw an error if this or v is not a vector.
    * @param {Vector} v1 is a given vector NOT a point
    * @param {Vector} v2 is a given vector NOT a point
    * @return {Vector} the result of cross product
    */
  cross(v) {
    if (this.w != 0 || this.w != 0) {
      throw new Error('expect vector other than point')
    }
    return new Vector(
      this.y*v.z - this.z*v.y,
      this.z*v.x - this.x*v.z,
      this.x*v.y - this.y*v.x,
      0,
    )
  }
  /**
    * unit normalizes this vector and returns a unit vector.
    * This function will throw an error if this is not a vector.
    *
    * @return {Vector} a new unit vector
    */
  unit() {
    if (this.w != 0) {
      throw new Error('expect vector other than point')
    }
    const n = 1/Math.sqrt(this.dot(this))
    return new Vector(this.x*n, this.y*n, this.z*n, 0)
  }
}
