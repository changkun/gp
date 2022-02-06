/**
 * Copyright © 2021 LMU Munich Medieninformatik. All rights reserved.
 * Created by Changkun Ou <https://changkun.de>.
 *
 * Use of this source code is governed by a GNU GPLv3 license that
 * can be found in the LICENSE file.
 */

import {Vector} from '../linalg/vec';
import {Vertex} from './primitive';

/**
 * AABB represents an AABB of the given vertices.
 */
export class AABB {
  min: Vector; // minimum position of the bounding box
  max: Vector; // maximum position of the bounding box

  /**
   * constructor constructs the minimum axis-aligned bounding box of
   * the given vertices.
   */
  /*constructor(vs: Vertex[]) {
    this.min = new Vector();
    this.max = new Vector();

    for (let i = 0; i < vs.length; i++) {
      this.min.x = Math.min(this.min.x, vs[i].position.x);
      this.min.y = Math.min(this.min.y, vs[i].position.y);
      this.min.z = Math.min(this.min.z, vs[i].position.z);
      this.max.x = Math.max(this.max.x, vs[i].position.x);
      this.max.y = Math.max(this.max.y, vs[i].position.y);
      this.max.z = Math.max(this.max.z, vs[i].position.z);
    }
  }*/
  constructor(vs: Vector[]) {
    this.min = new Vector();
    this.max = new Vector();

    for (let i = 0; i < vs.length; i++) {
      this.min.x = Math.min(this.min.x, vs[i].x);
      this.min.y = Math.min(this.min.y, vs[i].y);
      this.min.z = Math.min(this.min.z, vs[i].z);
      this.max.x = Math.max(this.max.x, vs[i].x);
      this.max.y = Math.max(this.max.y, vs[i].y);
      this.max.z = Math.max(this.max.z, vs[i].z);
    }
  }

  /**
   * intersect checks if the two given AABBs share an intersection.
   * If the two AABBs only share a single vertex or a 2D plane, then
   * it is also considered as an intersection and returns true.
   *
   * @param aabb is an other given AABB.
   * @returns true if the given two aabb share an intersection, false otherwise.
   */
  intersect(aabb: AABB): boolean {
    const min = new Vector(
      Math.max(this.min.x, aabb.min.x),
      Math.max(this.min.y, aabb.min.y),
      Math.max(this.min.z, aabb.min.z),
      1
    );
    const max = new Vector(
      Math.min(this.max.x, aabb.max.x),
      Math.min(this.max.y, aabb.max.y),
      Math.min(this.max.z, aabb.max.z),
      1
    );

    if (min.x <= max.x && min.y <= max.y && min.z <= max.z) {
      return true;
    }
    return false;
  }

  center(): Vector {
    return this.min.add(this.max).scale(1 / 2);
  }
  radius(): number {
    return this.max.sub(this.min).len() / 2;
  }
}
