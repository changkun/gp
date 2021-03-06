/**
 * Copyright 2021 Changkun Ou <https://changkun.de>. All rights reserved.
 * Use of this source code is governed by a GNU GLPv3 license that can be
 * found in the LICENSE file.
 */

import Vector from './vec'

/**
 * Matrix represents a 4x4 matrix.
 */
export default class Matrix {
  /**
   * constructor initializes the matrix as indentity matrix.
   */
  constructor(
    x00, x01, x02, x03,
    x10, x11, x12, x13,
    x20, x21, x22, x23,
    x30, x31, x32, x33
  ) {
    this.x00 = x00 || 0
    this.x01 = x01 || 0
    this.x02 = x02 || 0
    this.x03 = x03 || 0
    this.x10 = x10 || 0 
    this.x11 = x11 || 0 
    this.x12 = x12 || 0 
    this.x13 = x13 || 0
    this.x20 = x20 || 0 
    this.x21 = x21 || 0 
    this.x22 = x22 || 0 
    this.x23 = x23 || 0
    this.x30 = x30 || 0 
    this.x31 = x31 || 0 
    this.x32 = x32 || 0 
    this.x33 = x33 || 0
  }
  add(m) {
    let mm = new Matrix()
    mm.x00 = this.x00 + m.x00
    mm.x10 = this.x10 + m.x10
    mm.x20 = this.x20 + m.x20
    mm.x30 = this.x30 + m.x30
    mm.x01 = this.x01 + m.x01
    mm.x11 = this.x11 + m.x11
    mm.x21 = this.x21 + m.x21
    mm.x31 = this.x31 + m.x31
    mm.x02 = this.x02 + m.x02
    mm.x12 = this.x12 + m.x12
    mm.x22 = this.x22 + m.x22
    mm.x32 = this.x32 + m.x32
    mm.x03 = this.x03 + m.x03
    mm.x13 = this.x13 + m.x13
    mm.x23 = this.x23 + m.x23
    mm.x33 = this.x33 + m.x33
    return mm
  }
  /**
   * multiplyMatrices implements matrix multiplication for two
   * 4x4 matrices and assigns the result to this.
   * @param {Matrix} m is a given 4x4 matrix
   * @return {Matrix} the result of matrix multiplication
   */
  mul(m) {
    let mm = new Matrix()
    mm.x00 = this.x00*m.x00 + this.x01*m.x10 + this.x02*m.x20 + this.x03*m.x30
    mm.x10 = this.x10*m.x00 + this.x11*m.x10 + this.x12*m.x20 + this.x13*m.x30
    mm.x20 = this.x20*m.x00 + this.x21*m.x10 + this.x22*m.x20 + this.x23*m.x30
    mm.x30 = this.x30*m.x00 + this.x31*m.x10 + this.x32*m.x20 + this.x33*m.x30
    mm.x01 = this.x00*m.x01 + this.x01*m.x11 + this.x02*m.x21 + this.x03*m.x31
    mm.x11 = this.x10*m.x01 + this.x11*m.x11 + this.x12*m.x21 + this.x13*m.x31
    mm.x21 = this.x20*m.x01 + this.x21*m.x11 + this.x22*m.x21 + this.x23*m.x31
    mm.x31 = this.x30*m.x01 + this.x31*m.x11 + this.x32*m.x21 + this.x33*m.x31
    mm.x02 = this.x00*m.x02 + this.x01*m.x12 + this.x02*m.x22 + this.x03*m.x32
    mm.x12 = this.x10*m.x02 + this.x11*m.x12 + this.x12*m.x22 + this.x13*m.x32
    mm.x22 = this.x20*m.x02 + this.x21*m.x12 + this.x22*m.x22 + this.x23*m.x32
    mm.x32 = this.x30*m.x02 + this.x31*m.x12 + this.x32*m.x22 + this.x33*m.x32
    mm.x03 = this.x00*m.x03 + this.x01*m.x13 + this.x02*m.x23 + this.x03*m.x33
    mm.x13 = this.x10*m.x03 + this.x11*m.x13 + this.x12*m.x23 + this.x13*m.x33
    mm.x23 = this.x20*m.x03 + this.x21*m.x13 + this.x22*m.x23 + this.x23*m.x33
    mm.x33 = this.x30*m.x03 + this.x31*m.x13 + this.x32*m.x23 + this.x33*m.x33
    return mm
  }
  /**
   * inv implements the inverse operation of a matrix
   * @return {Matrix} the inversion of the given Matrix
   */
  inv() {
    const d = 1 / this.det()
    if (d == 0) {
      throw new Error('zero determinant')
    }
    let n = new Matrix()
    n.x00 = (this.x12*this.x23*this.x31 - this.x13*this.x22*this.x31 + this.x13*this.x21*this.x32 - this.x11*this.x23*this.x32 - this.x12*this.x21*this.x33 + this.x11*this.x22*this.x33) * d
    n.x01 = (this.x03*this.x22*this.x31 - this.x02*this.x23*this.x31 - this.x03*this.x21*this.x32 + this.x01*this.x23*this.x32 + this.x02*this.x21*this.x33 - this.x01*this.x22*this.x33) * d
    n.x02 = (this.x02*this.x13*this.x31 - this.x03*this.x12*this.x31 + this.x03*this.x11*this.x32 - this.x01*this.x13*this.x32 - this.x02*this.x11*this.x33 + this.x01*this.x12*this.x33) * d
    n.x03 = (this.x03*this.x12*this.x21 - this.x02*this.x13*this.x21 - this.x03*this.x11*this.x22 + this.x01*this.x13*this.x22 + this.x02*this.x11*this.x23 - this.x01*this.x12*this.x23) * d
    n.x10 = (this.x13*this.x22*this.x30 - this.x12*this.x23*this.x30 - this.x13*this.x20*this.x32 + this.x10*this.x23*this.x32 + this.x12*this.x20*this.x33 - this.x10*this.x22*this.x33) * d
    n.x11 = (this.x02*this.x23*this.x30 - this.x03*this.x22*this.x30 + this.x03*this.x20*this.x32 - this.x00*this.x23*this.x32 - this.x02*this.x20*this.x33 + this.x00*this.x22*this.x33) * d
    n.x12 = (this.x03*this.x12*this.x30 - this.x02*this.x13*this.x30 - this.x03*this.x10*this.x32 + this.x00*this.x13*this.x32 + this.x02*this.x10*this.x33 - this.x00*this.x12*this.x33) * d
    n.x13 = (this.x02*this.x13*this.x20 - this.x03*this.x12*this.x20 + this.x03*this.x10*this.x22 - this.x00*this.x13*this.x22 - this.x02*this.x10*this.x23 + this.x00*this.x12*this.x23) * d
    n.x20 = (this.x11*this.x23*this.x30 - this.x13*this.x21*this.x30 + this.x13*this.x20*this.x31 - this.x10*this.x23*this.x31 - this.x11*this.x20*this.x33 + this.x10*this.x21*this.x33) * d
    n.x21 = (this.x03*this.x21*this.x30 - this.x01*this.x23*this.x30 - this.x03*this.x20*this.x31 + this.x00*this.x23*this.x31 + this.x01*this.x20*this.x33 - this.x00*this.x21*this.x33) * d
    n.x22 = (this.x01*this.x13*this.x30 - this.x03*this.x11*this.x30 + this.x03*this.x10*this.x31 - this.x00*this.x13*this.x31 - this.x01*this.x10*this.x33 + this.x00*this.x11*this.x33) * d
    n.x23 = (this.x03*this.x11*this.x20 - this.x01*this.x13*this.x20 - this.x03*this.x10*this.x21 + this.x00*this.x13*this.x21 + this.x01*this.x10*this.x23 - this.x00*this.x11*this.x23) * d
    n.x30 = (this.x12*this.x21*this.x30 - this.x11*this.x22*this.x30 - this.x12*this.x20*this.x31 + this.x10*this.x22*this.x31 + this.x11*this.x20*this.x32 - this.x10*this.x21*this.x32) * d
    n.x31 = (this.x01*this.x22*this.x30 - this.x02*this.x21*this.x30 + this.x02*this.x20*this.x31 - this.x00*this.x22*this.x31 - this.x01*this.x20*this.x32 + this.x00*this.x21*this.x32) * d
    n.x32 = (this.x02*this.x11*this.x30 - this.x01*this.x12*this.x30 - this.x02*this.x10*this.x31 + this.x00*this.x12*this.x31 + this.x01*this.x10*this.x32 - this.x00*this.x11*this.x32) * d
    n.x33 = (this.x01*this.x12*this.x20 - this.x02*this.x11*this.x20 + this.x02*this.x10*this.x21 - this.x00*this.x12*this.x21 - this.x01*this.x10*this.x22 + this.x00*this.x11*this.x22) * d
    return n
  }
  /**
   * det computes the determinant of the given matrix
   * @return {Matrix} the determinant of the given Matrix
   */
  det() {
    return this.x00*this.x11*this.x22*this.x33 - this.x00*this.x11*this.x23*this.x32 +
		this.x00*this.x12*this.x23*this.x31 - this.x00*this.x12*this.x21*this.x33 +
		this.x00*this.x13*this.x21*this.x32 - this.x00*this.x13*this.x22*this.x31 -
		this.x01*this.x12*this.x23*this.x30 + this.x01*this.x12*this.x20*this.x33 -
		this.x01*this.x13*this.x20*this.x32 + this.x01*this.x13*this.x22*this.x30 -
		this.x01*this.x10*this.x22*this.x33 + this.x01*this.x10*this.x23*this.x32 +
		this.x02*this.x13*this.x20*this.x31 - this.x02*this.x13*this.x21*this.x30 +
		this.x02*this.x10*this.x21*this.x33 - this.x02*this.x10*this.x23*this.x31 +
		this.x02*this.x11*this.x23*this.x30 - this.x02*this.x11*this.x20*this.x33 -
		this.x03*this.x10*this.x21*this.x32 + this.x03*this.x10*this.x22*this.x31 -
		this.x03*this.x11*this.x22*this.x30 + this.x03*this.x11*this.x20*this.x32 -
		this.x03*this.x12*this.x20*this.x31 + this.x03*this.x12*this.x21*this.x30
  }
  /**
   * transpose transposes the given Matrix
   * @return {Matrix} the transposed matrix
   */
  transpose() {
    return new Matrix(
      this.x00, this.x10, this.x20, this.x30,
      this.x01, this.x11, this.x21, this.x31,
      this.x02, this.x12, this.x22, this.x32,
      this.x03, this.x13, this.x23, this.x33,
    )
  }
}