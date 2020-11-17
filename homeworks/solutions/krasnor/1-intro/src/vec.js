/**
 * CG1 Online-Hausarbeit 3: Implementing a Rasterization Pipeline
 * Copyright (C) 2020 Changkun Ou <https://changkun.de/>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// Note: you are not allowed to import any other APIs here.

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
    * add adds the given two vectors, or point and vector, or two points
    * @param {Vector} v is a point or a vector
    * @return {Vector} this
    */
  add(v) {
    // TODO: implement vector addition
    this.x += v.x
    this.y += v.y
    this.z += v.z
    this.w += v.w
    return this
  }
  /**
    * sub subtracts the given two vectors, or point and vector, or two points
    * @param {Vector} v is a point or a vector
    * @return {Vector} this
    */
  sub(v) {
    // TODO: implement vector subtraction
    this.x -= v.x
    this.y -= v.y
    this.z -= v.z
    this.w -= v.w
    return this
  }
  /**
    * multiplyScalar implements scalar vector or scalar point multiplication.
    * @param {number} scalar is a scalar number.
    * @return {Vector} this is a point or a vector
    */
  multiplyScalar(scalar) {
    // TODO: implement vector scalar multiplication
    this.x *= scalar
    this.y *= scalar
    this.z *= scalar
    this.w *= scalar
    return this
  }
  /**
    * dot implements dot product of two vectors.
    * This function will throw an error if this or v is not a vector.
    * @param {Vector} v is a vector NOT a point
    * @return {number} the result of dot product
    */
  dot(v) {
    // TODO: implement dot product
    if (v.w != 0 || this.w != 0) {
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
  crossVectors(v1, v2) {
    // TODO: implement cross product
    if (v1.w != 0 || v2.w != 0) {
      throw new Error('expect vector other than point')
    }
    this.x = v1.y*v2.z - v1.z*v2.y
    this.y = v1.z*v2.x - v1.x*v2.z
    this.z = v1.x*v2.y - v1.y*v2.x
    this.w = 0
    return this
  }
  /**
    * normalize normalizes this vector to a unit vector.
    * This function will throw an error if this is not a vector.
    *
    * @return {Vector} the result of normalization
    */
  normalize() {
    // TODO: implement vector normalization
    if (this.w != 0) {
      throw new Error('expect vector other than point')
    }
    const norm = Math.sqrt(this.dot(this))
    this.x /= norm
    this.y /= norm
    this.z /= norm
    this.w = 0
    return this
  }
  /**
    * applyMatrix applies 4x4 matrix by 4x1 vector multiplication.
    * the given matrix multiplies `this` vector from the left.
    *
    * @param {Matrix} m is a given 4x4 matrix
    * @return {Vector} the result of matrix-vector multiplication.
    */
  applyMatrix(m) {
    // TODO: implement 4x4 matrix and 4x1 vector multiplication
    const x =
      m.xs[0]*this.x + m.xs[1]*this.y + m.xs[2]*this.z + m.xs[3]*this.w
    const y =
      m.xs[4]*this.x + m.xs[5]*this.y + m.xs[6]*this.z + m.xs[7]*this.w
    const z =
      m.xs[8]*this.x + m.xs[9]*this.y + m.xs[10]*this.z + m.xs[11]*this.w
    const w =
      m.xs[12]*this.x + m.xs[13]*this.y + m.xs[14]*this.z + m.xs[15]*this.w

    this.x = x
    this.y = y
    this.z = z
    this.w = w
    return this
  }
}
