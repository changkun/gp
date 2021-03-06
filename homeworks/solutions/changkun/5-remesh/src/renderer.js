/**
 * Copyright 2021 Changkun Ou <https://changkun.de>. All rights reserved.
 * Use of this source code is governed by a GNU GLPv3 license that can be
 * found in the LICENSE file.
 */

 import {
  WebGLRenderer, Scene, PerspectiveCamera, Color,
  AmbientLight,
  PointLight,
} from 'three'
import {
  OrbitControls,
} from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'stats.js'

/**
 * Renderer is a three.js renderer.
 */
export default class Renderer {
  /**
   * constructor initializes the rendering scene, including rendering
   * engine, scene graph instance, camera and controls, etc.
   */
  constructor() {
    // renderer
    document.body.style.overflow = 'hidden'
    document.body.style.margin = 0
    this.renderer = new WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    })
    document.body.appendChild(this.renderer.domElement)

    // scene
    this.sceneLeft = new Scene()
    this.sceneLeft.background = new Color(0xffffff)
    this.sceneRight = new Scene()
    this.sceneRight.background = this.sceneLeft.background

    // camera
    this.cameraMeshLeft = new PerspectiveCamera(
      45, 0.5 * window.innerWidth/window.innerHeight, 0.1, 1000)
    this.cameraMeshLeft.position.x = 0.5
    this.cameraMeshLeft.position.y = 1.5
    this.cameraMeshLeft.position.z = 2.5
    this.cameraMeshRight = new PerspectiveCamera(
      45, 0.5 * window.innerWidth/window.innerHeight, 0.1, 1000)
    this.cameraMeshRight.position.x = 0.5
    this.cameraMeshRight.position.y = 1.5
    this.cameraMeshRight.position.z = 2.5

    window.addEventListener('resize', () => {
      this.cameraMeshLeft.aspect = 0.5 * window.innerWidth / window.innerHeight
      this.cameraMeshLeft.updateProjectionMatrix()
      
      this.cameraMeshRight.aspect = 0.5 * window.innerWidth / window.innerHeight
      this.cameraMeshRight.updateProjectionMatrix()

      this.renderer.setSize(window.innerWidth, window.innerHeight)
    }, false)

    // basic lighting, follow with the camera
    const a1 = new AmbientLight(0xffffff, 0.35)
    const p1 = new PointLight(0xffffff)
    p1.position.set(2, 20, 15)
    this.cameraMeshLeft.add(a1)
    this.cameraMeshLeft.add(p1)
    this.sceneLeft.add(this.cameraMeshLeft)

    const a2 = new AmbientLight(0xffffff, 0.35)
    const p2 = new PointLight(0xffffff)
    p2.position.set(2, 20, 15)
    this.cameraMeshRight.add(a2)
    this.cameraMeshRight.add(p2)
    this.sceneRight.add(this.cameraMeshRight)

    // controls
    this.controlsLeft = new OrbitControls(
      this.cameraMeshLeft,
      this.renderer.domElement
    )
    this.controlsLeft.rotateSpeed = 2.0
    this.controlsRight = new OrbitControls(
      this.cameraMeshRight,
      this.renderer.domElement
    )
    this.controlsRight.rotateSpeed = 2.0

    // stats
    this.stats = new Stats()
    this.stats.showPanel(0)
    document.body.appendChild(this.stats.domElement)
  }

  /**
   * render is the render loop of three.js rendering engine.
   */
  render() {
    const w = 0.5*window.innerWidth
    this.renderer.setViewport(0, 0, w, window.innerHeight)
    this.renderer.setScissor(0, 0, w, window.innerHeight)
    this.renderer.setScissorTest(true)
    this.renderer.render(this.sceneLeft, this.cameraMeshLeft)

    this.renderer.setViewport(w, 0, w, window.innerHeight)
    this.renderer.setScissor(w, 0, w, window.innerHeight)
    this.renderer.setScissorTest(true)
    this.renderer.render(this.sceneRight, this.cameraMeshRight)

    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.controlsLeft.update()
    this.controlsRight.update()
    this.stats.update()
    window.requestAnimationFrame(() => this.render())
  }
}
