// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import {Vector, approxEqual} from './vec';

/**
 * Matrix represents a 4x4 matrix.
 */
export class Matrix {
  x00: number; // element at row 1 column 1
  x01: number; // element at row 1 column 2
  x02: number; // element at row 1 column 3
  x03: number; // element at row 1 column 4
  x10: number; // element at row 2 column 1
  x11: number; // element at row 2 column 2
  x12: number; // element at row 2 column 3
  x13: number; // element at row 2 column 4
  x20: number; // element at row 3 column 1
  x21: number; // element at row 3 column 2
  x22: number; // element at row 3 column 3
  x23: number; // element at row 3 column 4
  x30: number; // element at row 4 column 1
  x31: number; // element at row 4 column 2
  x32: number; // element at row 4 column 3
  x33: number; // element at row 4 column 4
  constructor(
    x00?: number,
    x01?: number,
    x02?: number,
    x03?: number,
    x10?: number,
    x11?: number,
    x12?: number,
    x13?: number,
    x20?: number,
    x21?: number,
    x22?: number,
    x23?: number,
    x30?: number,
    x31?: number,
    x32?: number,
    x33?: number
  ) {
    this.x00 = x00 || 0;
    this.x01 = x01 || 0;
    this.x02 = x02 || 0;
    this.x03 = x03 || 0;
    this.x10 = x10 || 0;
    this.x11 = x11 || 0;
    this.x12 = x12 || 0;
    this.x13 = x13 || 0;
    this.x20 = x20 || 0;
    this.x21 = x21 || 0;
    this.x22 = x22 || 0;
    this.x23 = x23 || 0;
    this.x30 = x30 || 0;
    this.x31 = x31 || 0;
    this.x32 = x32 || 0;
    this.x33 = x33 || 0;
  }
  /**
   * get returns the element at row i and column j.
   * @param i row
   * @param j column
   * @returns the element
   */
  get(i: number, j: number): number {
    if (i < 0 || i > 3 || j < 0 || j > 3) {
      throw new Error('invalid index');
    }

    const values = [
      this.x00,
      this.x01,
      this.x02,
      this.x03,
      this.x10,
      this.x11,
      this.x12,
      this.x13,
      this.x20,
      this.x21,
      this.x22,
      this.x23,
      this.x30,
      this.x31,
      this.x32,
      this.x33,
    ];
    return values[i * 4 + j];
  }
  /**
   * set sets the given value at row i and column j.
   * @param i row
   * @param j column
   * @param value to be set
   */
  set(i: number, j: number, value: number): void {
    if (i < 0 || i > 3 || j < 0 || j > 3) {
      throw new Error('invalid index');
    }

    switch (i * 4 + j) {
      case 0:
        this.x00 = value;
        break;
      case 1:
        this.x01 = value;
        break;
      case 2:
        this.x02 = value;
        break;
      case 3:
        this.x03 = value;
        break;
      case 4:
        this.x10 = value;
        break;
      case 5:
        this.x11 = value;
        break;
      case 6:
        this.x12 = value;
        break;
      case 7:
        this.x13 = value;
        break;
      case 8:
        this.x20 = value;
        break;
      case 9:
        this.x21 = value;
        break;
      case 10:
        this.x22 = value;
        break;
      case 11:
        this.x23 = value;
        break;
      case 12:
        this.x30 = value;
        break;
      case 13:
        this.x31 = value;
        break;
      case 14:
        this.x32 = value;
        break;
      case 15:
        this.x33 = value;
        break;
    }
  }
  /**
   * eq checks whether the given two matrices are equal or not.
   *
   * @param m a Matrix
   * @returns true if two given matrices are element-wise equal, otherwise false.
   */
  eq(m: Matrix): boolean {
    if (
      approxEqual(this.x00, m.x00) &&
      approxEqual(this.x10, m.x10) &&
      approxEqual(this.x20, m.x20) &&
      approxEqual(this.x30, m.x30) &&
      approxEqual(this.x01, m.x01) &&
      approxEqual(this.x11, m.x11) &&
      approxEqual(this.x21, m.x21) &&
      approxEqual(this.x31, m.x31) &&
      approxEqual(this.x02, m.x02) &&
      approxEqual(this.x12, m.x12) &&
      approxEqual(this.x22, m.x22) &&
      approxEqual(this.x32, m.x32) &&
      approxEqual(this.x03, m.x03) &&
      approxEqual(this.x13, m.x13) &&
      approxEqual(this.x23, m.x23) &&
      approxEqual(this.x33, m.x33)
    ) {
      return true;
    }
    return false;
  }
  /**
   * add adds two given matrices element-wise.
   *
   * @param m is a Matrix
   * @returns the resulting Matrix
   */
  add(m: Matrix): Matrix {
    return new Matrix(
      this.x00 + m.x00,
      this.x01 + m.x01,
      this.x02 + m.x02,
      this.x03 + m.x03,
      this.x10 + m.x10,
      this.x11 + m.x11,
      this.x12 + m.x12,
      this.x13 + m.x13,
      this.x20 + m.x20,
      this.x21 + m.x21,
      this.x22 + m.x22,
      this.x23 + m.x23,
      this.x30 + m.x30,
      this.x31 + m.x31,
      this.x32 + m.x32,
      this.x33 + m.x33
    );
  }
  /**
   * sub subtracts two given matrices element-wise.
   *
   * @param m is a Matrix
   * @returns the resulting Matrix
   */
  sub(m: Matrix): Matrix {
    return new Matrix(
      this.x00 - m.x00,
      this.x01 - m.x01,
      this.x02 - m.x02,
      this.x03 - m.x03,
      this.x10 - m.x10,
      this.x11 - m.x11,
      this.x12 - m.x12,
      this.x13 - m.x13,
      this.x20 - m.x20,
      this.x21 - m.x21,
      this.x22 - m.x22,
      this.x23 - m.x23,
      this.x30 - m.x30,
      this.x31 - m.x31,
      this.x32 - m.x32,
      this.x33 - m.x33
    );
  }
  /**
   * mul computes the multiplication of a given Matrix and a given multiplier.
   * If the multiplier is a Matrix the the method results in a Matrix. Otherwise,
   * it returns a Vector.
   *
   * @param m is either a Matrix or a Vector
   * @returns a Matrix if the given multiplier is a Matrix, or a Vector
   * if the given multiplier is a Vector.
   */
  mul(m: Matrix | Vector): Matrix | Vector {
    if (m instanceof Vector) {
      return new Vector(
        this.x00 * m.x + this.x01 * m.y + this.x02 * m.z + this.x03 * m.w,
        this.x10 * m.x + this.x11 * m.y + this.x12 * m.z + this.x13 * m.w,
        this.x20 * m.x + this.x21 * m.y + this.x22 * m.z + this.x23 * m.w,
        this.x30 * m.x + this.x31 * m.y + this.x32 * m.z + this.x33 * m.w
      );
    }

    return new Matrix(
      this.x00 * m.x00 + this.x01 * m.x10 + this.x02 * m.x20 + this.x03 * m.x30,
      this.x00 * m.x01 + this.x01 * m.x11 + this.x02 * m.x21 + this.x03 * m.x31,
      this.x00 * m.x02 + this.x01 * m.x12 + this.x02 * m.x22 + this.x03 * m.x32,
      this.x00 * m.x03 + this.x01 * m.x13 + this.x02 * m.x23 + this.x03 * m.x33,

      this.x10 * m.x00 + this.x11 * m.x10 + this.x12 * m.x20 + this.x13 * m.x30,
      this.x10 * m.x01 + this.x11 * m.x11 + this.x12 * m.x21 + this.x13 * m.x31,
      this.x10 * m.x02 + this.x11 * m.x12 + this.x12 * m.x22 + this.x13 * m.x32,
      this.x10 * m.x03 + this.x11 * m.x13 + this.x12 * m.x23 + this.x13 * m.x33,

      this.x20 * m.x00 + this.x21 * m.x10 + this.x22 * m.x20 + this.x23 * m.x30,
      this.x20 * m.x01 + this.x21 * m.x11 + this.x22 * m.x21 + this.x23 * m.x31,
      this.x20 * m.x02 + this.x21 * m.x12 + this.x22 * m.x22 + this.x23 * m.x32,
      this.x20 * m.x03 + this.x21 * m.x13 + this.x22 * m.x23 + this.x23 * m.x33,

      this.x30 * m.x00 + this.x31 * m.x10 + this.x32 * m.x20 + this.x33 * m.x30,
      this.x30 * m.x01 + this.x31 * m.x11 + this.x32 * m.x21 + this.x33 * m.x31,
      this.x30 * m.x02 + this.x31 * m.x12 + this.x32 * m.x22 + this.x33 * m.x32,
      this.x30 * m.x03 + this.x31 * m.x13 + this.x32 * m.x23 + this.x33 * m.x33
    );
  }
  /**
   * T computes the transpose of the given Matrix.
   *
   * @returns the resulting tranpose Matrix
   */
  T(): Matrix {
    return new Matrix(
      this.x00,
      this.x10,
      this.x20,
      this.x30,
      this.x01,
      this.x11,
      this.x21,
      this.x31,
      this.x02,
      this.x12,
      this.x22,
      this.x32,
      this.x03,
      this.x13,
      this.x23,
      this.x33
    );
  }
  /**
   * scale scales all elements of the given matrix and returns a new Matrix.
   *
   * @param s is a scalar value
   * @returns the resulting matrix
   */
  scale(s: number): Matrix {
    return new Matrix(
      this.x00 * s,
      this.x01 * s,
      this.x02 * s,
      this.x03 * s,
      this.x10 * s,
      this.x11 * s,
      this.x12 * s,
      this.x13 * s,
      this.x20 * s,
      this.x21 * s,
      this.x22 * s,
      this.x23 * s,
      this.x30 * s,
      this.x31 * s,
      this.x32 * s,
      this.x33 * s
    );
  }
  /**
   * det computes the determinant of the given matrix
   * @return the determinant of the given Matrix
   */
  det(): number {
    return (
      this.x00 * this.x11 * this.x22 * this.x33 -
      this.x00 * this.x11 * this.x23 * this.x32 +
      this.x00 * this.x12 * this.x23 * this.x31 -
      this.x00 * this.x12 * this.x21 * this.x33 +
      this.x00 * this.x13 * this.x21 * this.x32 -
      this.x00 * this.x13 * this.x22 * this.x31 -
      this.x01 * this.x12 * this.x23 * this.x30 +
      this.x01 * this.x12 * this.x20 * this.x33 -
      this.x01 * this.x13 * this.x20 * this.x32 +
      this.x01 * this.x13 * this.x22 * this.x30 -
      this.x01 * this.x10 * this.x22 * this.x33 +
      this.x01 * this.x10 * this.x23 * this.x32 +
      this.x02 * this.x13 * this.x20 * this.x31 -
      this.x02 * this.x13 * this.x21 * this.x30 +
      this.x02 * this.x10 * this.x21 * this.x33 -
      this.x02 * this.x10 * this.x23 * this.x31 +
      this.x02 * this.x11 * this.x23 * this.x30 -
      this.x02 * this.x11 * this.x20 * this.x33 -
      this.x03 * this.x10 * this.x21 * this.x32 +
      this.x03 * this.x10 * this.x22 * this.x31 -
      this.x03 * this.x11 * this.x22 * this.x30 +
      this.x03 * this.x11 * this.x20 * this.x32 -
      this.x03 * this.x12 * this.x20 * this.x31 +
      this.x03 * this.x12 * this.x21 * this.x30
    );
  }
  /**
   * inv implements the inverse operation of a matrix
   * @return {Matrix} the inversion of the given Matrix
   */
  inv() {
    const d = 1 / this.det();
    if (d === 0) {
      throw new Error('zero determinant');
    }
    const n = new Matrix();
    n.x00 =
      (this.x12 * this.x23 * this.x31 -
        this.x13 * this.x22 * this.x31 +
        this.x13 * this.x21 * this.x32 -
        this.x11 * this.x23 * this.x32 -
        this.x12 * this.x21 * this.x33 +
        this.x11 * this.x22 * this.x33) *
      d;
    n.x01 =
      (this.x03 * this.x22 * this.x31 -
        this.x02 * this.x23 * this.x31 -
        this.x03 * this.x21 * this.x32 +
        this.x01 * this.x23 * this.x32 +
        this.x02 * this.x21 * this.x33 -
        this.x01 * this.x22 * this.x33) *
      d;
    n.x02 =
      (this.x02 * this.x13 * this.x31 -
        this.x03 * this.x12 * this.x31 +
        this.x03 * this.x11 * this.x32 -
        this.x01 * this.x13 * this.x32 -
        this.x02 * this.x11 * this.x33 +
        this.x01 * this.x12 * this.x33) *
      d;
    n.x03 =
      (this.x03 * this.x12 * this.x21 -
        this.x02 * this.x13 * this.x21 -
        this.x03 * this.x11 * this.x22 +
        this.x01 * this.x13 * this.x22 +
        this.x02 * this.x11 * this.x23 -
        this.x01 * this.x12 * this.x23) *
      d;
    n.x10 =
      (this.x13 * this.x22 * this.x30 -
        this.x12 * this.x23 * this.x30 -
        this.x13 * this.x20 * this.x32 +
        this.x10 * this.x23 * this.x32 +
        this.x12 * this.x20 * this.x33 -
        this.x10 * this.x22 * this.x33) *
      d;
    n.x11 =
      (this.x02 * this.x23 * this.x30 -
        this.x03 * this.x22 * this.x30 +
        this.x03 * this.x20 * this.x32 -
        this.x00 * this.x23 * this.x32 -
        this.x02 * this.x20 * this.x33 +
        this.x00 * this.x22 * this.x33) *
      d;
    n.x12 =
      (this.x03 * this.x12 * this.x30 -
        this.x02 * this.x13 * this.x30 -
        this.x03 * this.x10 * this.x32 +
        this.x00 * this.x13 * this.x32 +
        this.x02 * this.x10 * this.x33 -
        this.x00 * this.x12 * this.x33) *
      d;
    n.x13 =
      (this.x02 * this.x13 * this.x20 -
        this.x03 * this.x12 * this.x20 +
        this.x03 * this.x10 * this.x22 -
        this.x00 * this.x13 * this.x22 -
        this.x02 * this.x10 * this.x23 +
        this.x00 * this.x12 * this.x23) *
      d;
    n.x20 =
      (this.x11 * this.x23 * this.x30 -
        this.x13 * this.x21 * this.x30 +
        this.x13 * this.x20 * this.x31 -
        this.x10 * this.x23 * this.x31 -
        this.x11 * this.x20 * this.x33 +
        this.x10 * this.x21 * this.x33) *
      d;
    n.x21 =
      (this.x03 * this.x21 * this.x30 -
        this.x01 * this.x23 * this.x30 -
        this.x03 * this.x20 * this.x31 +
        this.x00 * this.x23 * this.x31 +
        this.x01 * this.x20 * this.x33 -
        this.x00 * this.x21 * this.x33) *
      d;
    n.x22 =
      (this.x01 * this.x13 * this.x30 -
        this.x03 * this.x11 * this.x30 +
        this.x03 * this.x10 * this.x31 -
        this.x00 * this.x13 * this.x31 -
        this.x01 * this.x10 * this.x33 +
        this.x00 * this.x11 * this.x33) *
      d;
    n.x23 =
      (this.x03 * this.x11 * this.x20 -
        this.x01 * this.x13 * this.x20 -
        this.x03 * this.x10 * this.x21 +
        this.x00 * this.x13 * this.x21 +
        this.x01 * this.x10 * this.x23 -
        this.x00 * this.x11 * this.x23) *
      d;
    n.x30 =
      (this.x12 * this.x21 * this.x30 -
        this.x11 * this.x22 * this.x30 -
        this.x12 * this.x20 * this.x31 +
        this.x10 * this.x22 * this.x31 +
        this.x11 * this.x20 * this.x32 -
        this.x10 * this.x21 * this.x32) *
      d;
    n.x31 =
      (this.x01 * this.x22 * this.x30 -
        this.x02 * this.x21 * this.x30 +
        this.x02 * this.x20 * this.x31 -
        this.x00 * this.x22 * this.x31 -
        this.x01 * this.x20 * this.x32 +
        this.x00 * this.x21 * this.x32) *
      d;
    n.x32 =
      (this.x02 * this.x11 * this.x30 -
        this.x01 * this.x12 * this.x30 -
        this.x02 * this.x10 * this.x31 +
        this.x00 * this.x12 * this.x31 +
        this.x01 * this.x10 * this.x32 -
        this.x00 * this.x11 * this.x32) *
      d;
    n.x33 =
      (this.x01 * this.x12 * this.x20 -
        this.x02 * this.x11 * this.x20 +
        this.x02 * this.x10 * this.x21 -
        this.x00 * this.x12 * this.x21 -
        this.x01 * this.x10 * this.x22 +
        this.x00 * this.x11 * this.x22) *
      d;
    return n;
  }
}
