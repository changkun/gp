// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
} from 'three';

import {Vector} from './linalg/vec';
import {Rasterizer} from './renderer/raster';
import {Scene} from './renderer/scene';
import {PerspectiveCamera} from './camera/camera';
import {GLRenderer} from './gl';
import {HalfedgeMesh} from './geometry/halfedge';

async function loadModel(name: string): Promise<string> {
  const resp = await fetch(`./assets/${name}.obj`);
  const data = await resp.text();
  return data;
}

function loadCamera(): PerspectiveCamera {
  const params = {
    pos: new Vector(-0.5, 0.5, 0.5, 1),
    lookAt: new Vector(0, 0, -0.5, 1),
    up: new Vector(0, 1, 0, 0),
  };
  const perspParam = {
    fov: 45,
    aspect: window.innerWidth / window.innerHeight,
    near: -0.1,
    far: -3,
  };
  return new PerspectiveCamera(
    params.pos,
    params.lookAt,
    params.up,
    perspParam.fov,
    perspParam.aspect,
    perspParam.near,
    perspParam.far
  );
}

/**
 * Monitor simulates a pixel-based display.
 */
class Monitor extends GLRenderer {
  screen?: Mesh;
  params: {
    assets?: {
      models: HalfedgeMesh[];
      camera: PerspectiveCamera;
    };
    screen: {
      width: number;
      height: number;
    };
  };

  constructor() {
    super();
    this.params = {
      screen: {
        width: Math.round(500 * (window.innerWidth / window.innerHeight)),
        height: 500,
      },
    };
    this.initScreen(this.params.screen.width, this.params.screen.height);
    this.setup();
  }
  async setup() {
    // Load the bunny mesh
    const getModel = async (name: string) => {
      const model = new HalfedgeMesh(await loadModel(name));
      model.rotate(new Vector(0, 1, 0, 0), -Math.PI / 6);
      model.scale(3, 3, 3);
      model.translate(0, -0.2, -0.4);
      return model;
    };
    const camera = loadCamera();
    const bunny = await getModel('bunny');

    // Initializes assets.
    this.params.assets = {
      models: [bunny],
      camera: camera,
    };

    // Default render pass.
    this.renderPrepare();
  }
  renderPrepare() {
    if (!this.params.assets) {
      throw new Error('assets are not loaded for rendering.');
    }

    this.params.assets.camera = loadCamera();

    // Render it!
    this.renderPass();
  }
  renderPass() {
    if (!this.params.assets) {
      throw new Error('assets are not loaded for rendering.');
    }

    // Creates a rasterizer and adding the loaded bunny and the created
    // camera to the scene.
    const r = new Rasterizer(
      this.params.screen.width,
      this.params.screen.height
    );
    const s = new Scene(this.params.assets.models, this.params.assets.camera);

    // Rasterizes the scene using the created rasterizer.
    const t0 = performance.now();
    const buf = r.render(s);
    const t1 = performance.now();

    // Early error checking.
    const nPixels = this.params.screen.width * this.params.screen.height;
    if (buf.length !== nPixels) {
      throw new Error(
        'flushFrameBuffer: incorrect size of frame buffer,' +
          ` expect: ${nPixels}, got: ${buf.length}.`
      );
    }

    // Flush the returned frame buffer from the rasterizer to "screen".
    this.flush(buf, this.params.screen.width, this.params.screen.height);
    console.log(`CPU rasterizer perf: ${1000 / (t1 - t0)} fps`);
  }
  /**
   * initScreen creates a plane to simulate a pixel based screen.
   * This function contains performance optimization for rendering.
   * Do NOT touch anything from here unless you know what you are doing.
   */
  initScreen(width: number, height: number) {
    // screen grids
    const c = new Color(0xffffff);
    const vs = new Array<number>();
    const cs = new Array<number>();
    for (let i = 0, j = 0, k = 0; i <= height; i++, k++) {
      vs.push(0, k, 0, width, k, 0);
      for (let l = 0; l < 4; l++) {
        c.toArray(cs, j);
        j += 3;
      }
    }
    for (let i = 0, j = 0, k = 0; i <= width; i++, k++) {
      vs.push(k, 0, 0, k, height, 0);
      for (let l = 0; l < 4; l++) {
        c.toArray(cs, j);
        j += 3;
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vs, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(cs, 3));
    const material = new LineBasicMaterial({vertexColors: true});
    material.opacity = 0.15;
    material.transparent = true;
    this.scene.add(new LineSegments(geometry, material));

    // screen pixels
    const idxs: Uint32Array = new Uint32Array(width * height * 2 * 3);
    const bufPos: Float32Array = new Float32Array(width * height * 4 * 3);
    const bufColor: Uint8Array = new Uint8Array(width * height * 4 * 3);

    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        const idx = i + j * width;

        idxs[6 * idx + 0] = 0 + 4 * idx;
        idxs[6 * idx + 1] = 2 + 4 * idx;
        idxs[6 * idx + 2] = 1 + 4 * idx;
        idxs[6 * idx + 3] = 2 + 4 * idx;
        idxs[6 * idx + 4] = 3 + 4 * idx;
        idxs[6 * idx + 5] = 1 + 4 * idx;

        bufPos[12 * idx + 0] = i;
        bufPos[12 * idx + 1] = j + 1;
        bufPos[12 * idx + 2] = 0;
        bufPos[12 * idx + 3] = i + 1;
        bufPos[12 * idx + 4] = j + 1;
        bufPos[12 * idx + 5] = 0;
        bufPos[12 * idx + 6] = i;
        bufPos[12 * idx + 7] = j;
        bufPos[12 * idx + 8] = 0;
        bufPos[12 * idx + 9] = i + 1;
        bufPos[12 * idx + 10] = j;
        bufPos[12 * idx + 11] = 0;

        for (let k = 0; k < 12; k++) {
          bufColor[12 * idx + k] = 0;
        }
      }
    }
    const g = new BufferGeometry();
    g.setIndex(new BufferAttribute(idxs, 1));
    g.setAttribute('position', new BufferAttribute(bufPos, 3));
    g.setAttribute('color', new BufferAttribute(bufColor, 3, true));
    const screen = new Mesh(
      g,
      new MeshBasicMaterial({vertexColors: true, side: DoubleSide})
    );
    screen.name = 'screen';
    this.scene.add(screen);
  }
  /**
   * flush flushes the stored colors in buf to a created screen.
   * This function contains performance optimization for rendering.
   * Do NOT touch anything from here unless you know what you are doing.
   */
  flush(buf: Vector[], width: number, height: number) {
    const screen = <Mesh>this.scene.getObjectByName('screen');
    const color = <Array<number>>screen.geometry.attributes.color.array;
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        const idx = i + j * width;
        for (let k = 0; k < 4; k++) {
          color[12 * idx + 0 + 3 * k] = buf[idx].x;
          color[12 * idx + 1 + 3 * k] = buf[idx].y;
          color[12 * idx + 2 + 3 * k] = buf[idx].z;
        }
      }
    }
    screen.geometry.attributes.color.needsUpdate = true;
  }
}

new Monitor().render();
