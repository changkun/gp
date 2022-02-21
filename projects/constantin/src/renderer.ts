// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Color,
  AmbientLight,
  PointLight,
} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';

/**
 * Renderer is a three.js renderer.
 */
export default class Renderer {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;

  /**
   * constructor initializes the rendering scene, including rendering
   * engine, scene graph instance, camera and controls, etc.
   */
  constructor() {
    // renderer
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    this.renderer = new WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: false,
    });
    document.body.appendChild(this.renderer.domElement);

    // scene
    this.scene = new Scene();
    this.scene.background = new Color(0x0);

    // camera
    this.camera = new PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    this.camera.position.z = 2.5;
    window.addEventListener(
      'resize',
      () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.updateProjectionMatrix();
      },
      false
    );

    // basic lighting, follow with the camera
    this.camera.add(new AmbientLight(0xffffff, 0.35));
    const p = new PointLight(0xffffff);
    p.position.set(2, 20, 15);
    this.camera.add(p);
    this.scene.add(this.camera);

    // controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.rotateSpeed = 2.0;
    //this.controls.minDistance=1;
    //this.controls.maxDistance=100;
  }

  /**
   * render is the render loop of three.js rendering engine.
   */
  render() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    window.requestAnimationFrame(() => this.render());
  }
}
