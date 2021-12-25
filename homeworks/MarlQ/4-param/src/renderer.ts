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
  GridHelper,
} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';

/**
 * Renderer is a three.js renderer.
 */
export default class Renderer {
  renderer: WebGLRenderer;
  sceneMesh: Scene;
  sceneUV: Scene;
  cameraMesh: PerspectiveCamera;
  cameraUV: PerspectiveCamera;
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
      preserveDrawingBuffer: true,
    });
    document.body.appendChild(this.renderer.domElement);

    // scene
    this.sceneMesh = new Scene()
    this.sceneMesh.background = new Color(0x0)
    this.sceneUV = new Scene()
    this.sceneUV.background = this.sceneMesh.background

    // camera
    this.cameraMesh = new PerspectiveCamera(
      45, 0.5 * window.innerWidth/window.innerHeight, 0.1, 1000)
    this.cameraMesh.position.x = 0.5
    this.cameraMesh.position.y = 1.5
    this.cameraMesh.position.z = 2.5
    this.cameraUV = new PerspectiveCamera(
      45, 0.5 * window.innerWidth/window.innerHeight, 0.1, 1000)
    this.cameraUV.position.x = 0.5
    this.cameraUV.position.y = 0.5
    this.cameraUV.position.z = 2.5

    window.addEventListener('resize', () => {
      this.cameraMesh.aspect = 0.5 * window.innerWidth / window.innerHeight
      this.cameraMesh.updateProjectionMatrix()

      this.cameraUV.aspect = 0.5 * window.innerWidth / window.innerHeight
      this.cameraUV.updateProjectionMatrix()

      this.renderer.setSize(window.innerWidth, window.innerHeight)
    }, false)

    // basic lighting, follow with the camera
    const a1 = new AmbientLight(0xffffff, 0.35)
    const p1 = new PointLight(0xffffff)
    p1.position.set(2, 20, 15)
    this.cameraMesh.add(a1)
    this.cameraMesh.add(p1)
    this.sceneMesh.add(this.cameraMesh)

    const a2 = new AmbientLight(0xffffff, 0.35)
    const p2 = new PointLight(0xffffff)
    p2.position.set(2, 20, 15)
    this.cameraUV.add(a2)
    this.cameraUV.add(p2)
    this.sceneUV.add(this.cameraUV)

    // controls
    this.controls = new OrbitControls(
      this.cameraMesh,
      this.renderer.domElement
    )
    this.controls.rotateSpeed = 2.0

    // UV grid
    const grid = new GridHelper(1, 1)
    grid.rotateX(Math.PI/2)
    grid.translateX(0.5)
    grid.translateZ(-0.5)
    this.sceneUV.add(grid)
  }

  /**
   * render is the render loop of three.js rendering engine.
   */
  render() {
    const w = 0.5*window.innerWidth
    this.renderer.setViewport(0, 0, w, window.innerHeight)
    this.renderer.setScissor(0, 0, w, window.innerHeight)
    this.renderer.setScissorTest(true)
    this.renderer.render(this.sceneMesh, this.cameraMesh)

    this.renderer.setViewport(w, 0, w, window.innerHeight)
    this.renderer.setScissor(w, 0, w, window.innerHeight)
    this.renderer.setScissorTest(true)
    this.renderer.render(this.sceneUV, this.cameraUV)

    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.controls.update()
    window.requestAnimationFrame(() => this.render())
  }
}
