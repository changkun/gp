/**
 * Copyright 2021 Changkun Ou <https://changkun.de>. All rights reserved.
 * Use of this source code is governed by a GNU GLPv3 license that can be
 * found in the LICENSE file.
 */

/**
 * Vector is a 3D vector.
 */
export default class Vector {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x
    this.y = y
    this.z = z
  }
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z
  }
  cross(v) {
    return new Vector(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x)
  }
  norm() {
    return Math.sqrt(this.dot(this))
  }
  unit() {
    const n = this.norm()
    const x = this.x / n
    const y = this.y / n
    const z = this.z / n
    return new Vector(x, y, z)
  }
  add(v) {
    return new Vector(this.x + v.x, this.y + v.y, this.z + v.z)
  }
  sub(v) {
    return new Vector(this.x - v.x, this.y - v.y, this.z - v.z)
  }
  scale(s) {
    return new Vector(this.x * s, this.y * s, this.z * s)
  }
}
