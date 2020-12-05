import Renderer from './renderer'
import { HalfedgeMesh } from './halfedge'
import { GUI } from 'dat.gui'
import {
  Mesh,
  LineSegments,
  WireframeGeometry,
  LineBasicMaterial,
  BufferGeometry,
  BufferAttribute,
  VertexColors,
  DoubleSide,
  MeshPhongMaterial,
  MeshBasicMaterial,
} from 'three'
import {
  VertexNormalsHelper
} from 'three/examples/jsm/helpers/VertexNormalsHelper'
import Vector from './vector'
import colormap from './colors'

/**
 * Main extends the Renderer class and constructs the scene.
 */
export default class Main extends Renderer {
  /**
   * constroctor creates the objects needed for rendering
   */
  constructor() {
    super()

    // a hidden input field that responsible for loading meshes
    this.input = document.createElement('input')
    this.input.setAttribute('type', 'file')
    this.input.addEventListener('change', () => {
      let file = this.input.files[0]
      if (!file.name.endsWith('.obj')) {
        alert('Only .OBJ files are supported')
      }
      const r = new FileReader()
      r.onload = () => this.loadMesh(r.result)
      r.onerror = () => alert('Cannot import your obj mesh')
      r.readAsText(file)
    })
    document.body.appendChild(this.input)

    this.internal = {
      mesh: null,     // internal mesh object
      mesh3js: null,  // three.js buffer geometry object
      normalHelper: null,
      wireframeHelper: null,
    }
    this.params = {
      import: () => this.input.click(),
      export: () => this.exportScreenshot(),
      showNormals: false,
      showWireframe: false,
      normalMethod: 'equal-weighted',
      curvatureMethod: 'none'
    }

    this.gui = new GUI()
    this.gui.add(this.params, 'import').name('import mesh')
    this.gui.add(this.params, 'export').name('export screenshot')
    this.gui.add(this.params, 'showNormals').name('show normals').listen()
    .onChange(show => {
      if (show) {
        this.scene.add(this.internal.normalHelper)
      } else {
        this.scene.remove(this.internal.normalHelper)
      }
    })
    this.gui.add(this.params, 'showWireframe').name('show wireframe').listen()
    .onChange(show => {
      if (show) {
        this.scene.add(this.internal.wireframeHelper)
      } else {
        this.scene.remove(this.internal.wireframeHelper)
      }
    })
    this.gui.add(this.params, 'normalMethod', [
      'equal-weighted', 'area-weighted', 'angle-weighted',
    ]).listen().onChange(() => this.updateNormals())
    this.gui.add(this.params, 'curvatureMethod', [
      'none', 'Mean', 'Gaussian', 'Kmax', 'Kmin'
    ]).listen().onChange(() => this.updateCurvature())

    // just for the first load
    fetch('./assets/bunny_tri.obj')
      .then(resp => resp.text())
      .then(data => this.loadMesh(data))
  }
  loadMesh(data) {
    if (this.internal.mesh3js !== null) {
      this.scene.remove(this.internal.mesh3js)
    }
    this.internal.mesh = new HalfedgeMesh(data)
    this.renderMesh()
  }
  exportScreenshot() {
    const url = this.renderer.domElement.toDataURL('image/png', 'export')
    const e = document.createElement('a')
    e.setAttribute('href', url)
    e.style.display = 'none'
    e.setAttribute('download', 'export.png')
    document.body.appendChild(e)
    e.click()
    document.body.removeChild(e)
  }
  updateNormals() {
    this.internal.mesh.vertices.forEach(v => {
      const n = v.normal(this.params.normalMethod)
      this.bufnormals[3*v.idx+0] = n.x
      this.bufnormals[3*v.idx+1] = n.y
      this.bufnormals[3*v.idx+2] = n.z
    })
    this.internal.mesh3js.geometry.attributes.normal.needsUpdate = true
    this.internal.normalHelper.update()
  }
  updateCurvature() {
    const msettings = {
      vertexColors: VertexColors,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      side: DoubleSide,
    }

    let min = Number.POSITIVE_INFINITY, max = Number.NEGATIVE_INFINITY
    let curvatures = new Array(this.internal.mesh.vertices.length)
    this.internal.mesh.vertices.forEach(v => {
      const c = v.curvature(this.params.curvatureMethod)
      max = Math.max(c, max)
      min = Math.min(c, min)
      curvatures[v.idx] = c
    })
    max = Math.max(Math.abs(min), Math.abs(max))
    this.internal.mesh.vertices.forEach(v => {
      let color = new Vector()
      if (this.params.curvatureMethod === 'none') {
        this.internal.mesh3js.material = new MeshPhongMaterial(msettings)
        color = new Vector(0, 0.5, 1)
      } else {
        this.internal.mesh3js.material = new MeshBasicMaterial(msettings)
        color = colormap(curvatures[v.idx], -max, max)
      }
      this.bufcolors[3*v.idx+0] = color.x
      this.bufcolors[3*v.idx+1] = color.y
      this.bufcolors[3*v.idx+2] = color.z
    })
    this.internal.mesh3js.geometry.attributes.color.needsUpdate = true
  }
  renderMesh() {
    // clear old instances
    if (this.internal.normalHelper !== null) {
      this.scene.remove(this.internal.normalHelper)
    }
    if (this.internal.wireframeHelper !== null) {
      this.scene.remove(this.internal.wireframeHelper)
    }
    if (this.internal.mesh3js !== null) {
      this.scene.remove(this.internal.mesh3js)
    }

    // prepare new data
    const g = new BufferGeometry()
    const v = this.internal.mesh.vertices.length
    this.bufpos     = new Float32Array(v*3)
    this.bufcolors  = new Float32Array(v*3)
    this.bufnormals = new Float32Array(v*3)

    // compute AABB
    let min = new Vector(), max = new Vector()
    this.internal.mesh.vertices.forEach(v => {
      min.x = Math.min(min.x, v.position.x)
      min.y = Math.min(min.y, v.position.y)
      min.z = Math.min(min.z, v.position.z)
      max.x = Math.max(max.x, v.position.x)
      max.y = Math.max(max.y, v.position.y)
      max.z = Math.max(max.z, v.position.z)
    })
    const center = min.add(max).scale(1/2)
    const radius = max.sub(min).norm() / 2

    this.internal.mesh.vertices.forEach(v => {
      const i = v.idx
      // use AABB and rescale to viewport center
      const p = v.position.sub(center).scale(1/radius)
      this.bufpos[3*i+0] = p.x
      this.bufpos[3*i+1] = p.y
      this.bufpos[3*i+2] = p.z

      // default GP blue color
      this.bufcolors[3*i+0] = 0
      this.bufcolors[3*i+1] = 0.5
      this.bufcolors[3*i+2] = 1

      const n = v.normal(this.params.normalMethod)
      this.bufnormals[3*i+0] = n.x
      this.bufnormals[3*i+1] = n.y
      this.bufnormals[3*i+2] = n.z
    })

    const idxs = new Uint32Array(this.internal.mesh.faces.length*3)
    this.internal.mesh.faces.forEach(f => {
      f.vertices((v, i) => { idxs[3 * f.idx + i] = v.idx })
    })

    g.setIndex(new BufferAttribute(idxs, 1));
    g.setAttribute('position', new BufferAttribute(this.bufpos, 3))
    g.setAttribute('color', new BufferAttribute(this.bufcolors, 3))
    g.setAttribute('normal', new BufferAttribute(this.bufnormals, 3))

    this.internal.mesh3js = new Mesh(g, new MeshPhongMaterial({
      vertexColors: VertexColors,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      side: DoubleSide,
    }))
    this.internal.normalHelper = new VertexNormalsHelper(
      this.internal.mesh3js, 0.03, 0xaa0000,
    )
    this.internal.wireframeHelper = new LineSegments(
      new WireframeGeometry(g),
      new LineBasicMaterial({color: 0x000000, linewidth: 1})
    )

    this.scene.add(this.internal.mesh3js)
    if (this.params.showNormals) {
      this.scene.add(this.internal.normalHelper)
    }
    if (this.params.showWireframe) {
      this.scene.add(this.internal.wireframeHelper)
    }
  }
}

new Main().render()
