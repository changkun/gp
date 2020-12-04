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
    this.scene = new Scene()
    this.scene.background = new Color(0xffffff)

    // camera
    this.camera = new PerspectiveCamera(
      45, window.innerWidth/window.innerHeight, 0.1, 1000)
    this.camera.position.z = 3.5
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.renderer.setSize(window.innerWidth, window.innerHeight)
      this.camera.updateProjectionMatrix()
    }, false)

    // basic lighting, follow with the camera
    this.camera.add(new AmbientLight(0xffffff, 0.35))
    const p = new PointLight(0xffffff)
    p.position.set(2, 20, 15)
    this.camera.add(p)
    this.scene.add(this.camera)

    // controls
    this.controls = new OrbitControls(
      this.camera,
      this.renderer.domElement
    )
    this.controls.rotateSpeed = 2.0

    // stats
    this.stats = new Stats()
    this.stats.showPanel(0)
    document.body.appendChild(this.stats.domElement)
  }

  /**
   * render is the render loop of three.js rendering engine.
   */
  render() {
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.controls.update()
    this.stats.update()
    this.renderer.render(this.scene, this.camera)
    window.requestAnimationFrame(() => this.render())
  }
}
