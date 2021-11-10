// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import {PerspectiveCamera} from '../camera/camera';
import {HalfedgeMesh} from '../geometry/halfedge';

/**
 * Scene is a basic scene graph.
 */
export class Scene {
  meshes: HalfedgeMesh[];
  camera: PerspectiveCamera;

  /**
   * constructor constructs a very basic scene graph which only allows
   * containing a group of triangle mesh and a camera.
   *
   * @param meshes is a group of triangle mesh
   * @param light is a point light
   * @param camera is a camera either is perspective or orthographic
   */
  constructor(meshes: HalfedgeMesh[], camera: PerspectiveCamera) {
    this.meshes = meshes;
    this.camera = camera;
  }
}
