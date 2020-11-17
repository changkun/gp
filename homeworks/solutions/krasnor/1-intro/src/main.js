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

import {
  Vector3, Scene, WebGLRenderer, PerspectiveCamera, CameraHelper,
  Geometry, PlaneBufferGeometry, BufferAttribute, OrthographicCamera,
  Mesh, MeshBasicMaterial, MeshPhongMaterial, TextureLoader, DoubleSide,
  PointLight, PointLightHelper, AmbientLight, AxesHelper, BufferGeometry,
  Color, Float32BufferAttribute, LineBasicMaterial, LineSegments,
} from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
//import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader'
import {BufferGeometryUtils} from 'three/examples/jsm/utils/BufferGeometryUtils'
import {GUI} from 'dat.gui'
import Stats from 'stats.js'
import Rasterizer from './rasterizer'
import BasicOBJImporter from './BasicOBJImporter'

/**
 * Renderer is a three.js based rendering engine.
 */
class Renderer {
  /**
   * constroctor implements a three.js renderer that initializes the renderer,
   * the scene graph, dat gui, and tw cameras
   */
  constructor() {
    // renderer
    const container = document.body
    container.style.overflow = 'hidden'
    container.style.margin = 0
    const canvas = document.createElement('canvas')
    this.renderer = new WebGLRenderer({
      canvas: canvas,
      context: canvas.getContext('webgl2'),
      antialias: true,
    })
    container.appendChild(this.renderer.domElement)

    // scene graph
    this.scene = new Scene()

    this.panel = {onlyScreen: true}
    this.gui = new GUI()
    this.gui.add(this.panel, 'onlyScreen').listen()

    // user eye
    const eyeParams = {
      fov: 60,
      aspect: window.innerWidth / window.innerHeight,
      near: 0.1,
      far: 10000,
      position: new Vector3(-541, 359, 1133),
      lookAt: new Vector3(0, 0, 0),
      up: new Vector3(0, 1, 0),
    }
    this.userEye = new PerspectiveCamera(
      eyeParams.fov, eyeParams.aspect, eyeParams.near, eyeParams.far)
    this.userEye.position.copy(eyeParams.position)
    this.userEye.lookAt(eyeParams.lookAt)
    this.userEye.up.copy(eyeParams.up)

    // screen eye
    const orthoParams = {
      frustum: window.innerWidth,
      aspect: window.innerHeight/window.innerWidth,
      position: new Vector3(400, 250, 1),
      lookAt: new Vector3(400, 250, -1),
    }
    this.screenEye = new OrthographicCamera(
      -window.innerWidth/2,
      window.innerWidth/2,
      window.innerHeight/2,
      -window.innerHeight/2
    )
    this.screenEye.position.copy(orthoParams.position)
    this.screenEye.lookAt(orthoParams.lookAt)

    window.addEventListener('resize', () => {
      if (this.panel.onlyScreen) {
        this.screenEye.left = -window.innerWidth/2
        this.screenEye.right = window.innerWidth/2,
        this.screenEye.top = window.innerHeight/2,
        this.screenEye.bottom = -window.innerHeight/2
        this.screenEye.updateProjectionMatrix()
      } else {
        this.userEye.aspect = window.innerWidth / window.innerHeight
        this.userEye.updateProjectionMatrix()
      }
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    }, false)

    // controls
    this.controls = new OrbitControls(this.userEye, this.renderer.domElement)
    this.controls.target.copy(eyeParams.lookAt)
    this.controls.minDistance = 100
    this.controls.maxDistance = 10000

    // stats
    this.stats = new Stats()
    this.stats.showPanel(0)
    container.appendChild(this.stats.domElement)
  }
  /**
   * update is empty by design, this method should be implemented in a
   * sub class.
   */
  update() {
    // This method can be implemented in a subclass for animation.
  }
  /**
   * render is the render loop of this renderer.
   */
  render() {
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.stats.update()
    this.update() // from subclass
    this.controls.update()
    if (this.panel.onlyScreen) {
      this.renderer.render(this.scene, this.screenEye)
    } else {
      this.renderer.render(this.scene, this.userEye)
    }
    window.requestAnimationFrame(() => this.render())
  }
}

/**
 * Monitor mocks a display hardware that renders its frame buffer to the
 * world.
 */
class Monitor extends Renderer {
  /**
   * constructor initializes the whole display
   */
  constructor() {
    super()

    // this.params contains all parameters for the rasterizer, including
    // screen size, camera settings, light params, and the bunny model.
    this.params = {
      screen: {width: 800, height: 500},
      camera: {
        position: new Vector3(-550, 194, 734),
        fov: 45, aspect: 1.6, near: 100, far: 600,
        lookAt: new Vector3(-1000, 0, 0),
        up: new Vector3(0, 1, 1),
      },
      light: {
        color: 0xffffff,
        Kamb: 0.5, // ambient
        Kdiff: 0.6, // diffuse
        Kspec: 1, // specular
        position: new Vector3(-200, 250, 600),
      },
      model: {
        // Replaced by OBJ model object when asset is loaded
        geometry: './assets/bunny.obj',
        texture: {
          // Replaced by texture color array when asset is loaded
          data: './assets/texture.jpg',
          width: 0,
          height: 0,
          shininess: 150,
        },
        scale: new Vector3(1500, 1500, 1500),
        position: new Vector3(-700, -5, 350),
      },
    }

    // Create a camera and a camera helper to visualize the viewfrustum.
    this.camera = new PerspectiveCamera(
      this.params.camera.fov,
      this.params.camera.aspect,
      this.params.camera.near,
      this.params.camera.far
    )
    this.camera.position.copy(this.params.camera.position)
    this.camera.up.copy(this.params.camera.up)
    this.camera.lookAt(this.params.camera.lookAt)
    this.scene.add(new CameraHelper(this.camera))

    // Create a axes helper to visualize the axes.
    this.scene.add(new AxesHelper(1000))
    this.setup()
  }
  /**
   * update camera lookAt position to makesure the camera helper is
   * visualized correctly.
   *
   * This function is called in the render method of the Renderer class.
   */
  update() {
    this.camera.lookAt(this.params.camera.lookAt)
  }
  /**
   * loadAssets loads the needed assets, including the bunny and its texture.
   */
  async loadAssets() {
    // Load model assets
    const load = (Loader, url) => {
      return new Promise((resolve) => new Loader().load(url, resolve))
    }

    // let path = './assets/test_cube.obj'
    let path = './assets/test_ico.obj';
    path = this.params.model.geometry;
    const myObjLoader = new BasicOBJImporter();
    const g = await myObjLoader.importObj(path); // <- new loader

    //const g = await load(OBJLoader, this.params.model.geometry) // <- old loader
    const t = await load(TextureLoader, this.params.model.texture.data)

    // Read texture color as an array for texture queries,
    // see src/rasterizer.js.
    const canvas = document.createElement('canvas')
    canvas.width = t.image.width
    canvas.height = t.image.height
    canvas.getContext('2d').drawImage(
      t.image, 0, 0, canvas.width, canvas.height
    )
    this.params.model.geometry =
      new Geometry().fromBufferGeometry(g.children[0].geometry)
    this.params.model.texture = {
      data: canvas.getContext('2d')
        .getImageData(0, 0, canvas.width, canvas.height).data,
      width: canvas.width, height: canvas.height,
      shininess: this.params.model.texture.shininess,
    }

    // Create the bunny
    const bunny = new Mesh(
      g.children[0].geometry, new MeshPhongMaterial({map: t}))
    bunny.scale.copy(this.params.model.scale)
    bunny.position.copy(this.params.model.position)
    bunny.material.shininess = this.params.model.texture.shininess
    this.scene.add(bunny.clone())

    // Create the light
    const l = new PointLight(
      this.params.light.color,
      this.params.light.Kdiff,
    )
    l.position.copy(this.params.light.position)
    this.scene.add(l)
    this.scene.add(new PointLightHelper(l))
    this.scene.add(new AmbientLight(0xffffff, this.params.light.Kamb))
  }
  /**
   * setup loads assets regarding the bunny, including model and its
   * texture. When the assets are loaded, it calls raster method to
   * rasterizing everything defined in the Scene.
   */
  async setup() {
    await this.loadAssets()
    this.raster()
  }
  /**
   * raster creates a Rasterizer then renders the defined Scene on
   * a mock screen.
   */
  raster() {
    this.initScreen(this.params.screen.width, this.params.screen.height)
    const r = new Rasterizer(this.params)

    // measuring rendering performance
    const t0 = performance.now()
    r.render()
    const t1 = performance.now()

    this.flushFrameBuffer(r)
    console.log(`CPU rasterizer perf: ${1000/(t1-t0)} fps`)
  }
  /**
   * initScreen creates a plane to simulate a pixel based screen.
   * It works with the `flushFrameBuffer` in a Rasterizer.
   * @param {number} width is the width of the monitor
   * @param {number} height is the height of the monitor
   */
  initScreen(width, height) {
    const color = new Color(0x444444)
    const vs = []; const cs = []
    for (let i = 0, j = 0, k = 0; i<=height; i++, k += 1) {
      vs.push(0, k, 0, width, k, 0)
      color.toArray(cs, j); j += 3
      color.toArray(cs, j); j += 3
      color.toArray(cs, j); j += 3
      color.toArray(cs, j); j += 3
    }
    for (let i = 0, j = 0, k = 0; i<=width; i++, k += 1) {
      vs.push(k, 0, 0, k, height, 0)
      color.toArray(cs, j); j += 3
      color.toArray(cs, j); j += 3
      color.toArray(cs, j); j += 3
      color.toArray(cs, j); j += 3
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(vs, 3))
    geometry.setAttribute('color', new Float32BufferAttribute(cs, 3))
    const material = new LineBasicMaterial({vertexColors: true})
    material.opacity = 0.05
    material.transparent = true
    const screen = new LineSegments(geometry, material)
    this.scene.add(screen)
  }
  /**
   * flushFrameBuffer flushes the stored colors in `r.frameBuf` to
   * the created screen in `this.initScreen`.
   *
   * This function contains performance optimization for rendering
   * massive number of objects.
   *
   * You don't need read how it works, and do NOT touch anything from here.
   * @param {Rasterizer} r is a rasterizer
   */
  flushFrameBuffer(r) {
    // early error checking
    const nPixels = this.params.screen.height*this.params.screen.width
    if (r.frameBuf.length !== nPixels) {
      throw new Error('flushFrameBuffer: incorrect size of frame buffer,'+
      ` expect: ${nPixels}, got: ${r.frameBuf.length}.`)
    }
    r.frameBuf.forEach((v, idx) => {
      if (Array.isArray(v) && v.length === 3 && !v.some(isNaN)) return
      throw new Error('flushFrameBuffer: incorrect color value stored in frame'+
      ` buffer, index: ${idx}, value: ${v}`)
    })

    // render
    const geometries = []
    for (let i = 0; i < this.params.screen.width; i++) {
      for (let j = 0; j < this.params.screen.height; j++) {
        const g = new PlaneBufferGeometry(1, 1, 1, 1)
        g.translate(i+0.5, j+0.5, 0)
        const color = new Uint8Array(3 * 4) // 3 rgb * 4 vertices
        color.forEach((_, idx) => {
          color[idx] = r.frameBuf[j*this.params.screen.width + i][idx%3]
        })
        g.setAttribute('color', new BufferAttribute(color, 3, true))
        geometries.push(g)
      }
    }
    this.scene.add(new Mesh(
      BufferGeometryUtils.mergeBufferGeometries(geometries),
      new MeshBasicMaterial({vertexColors: true, side: DoubleSide})
    ))
  }
}

new Monitor().render()
