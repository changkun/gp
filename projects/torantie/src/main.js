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
  MeshPhongMaterial, Vector3,
} from 'three'
import {
  VertexNormalsHelper
} from 'three/examples/jsm/helpers/VertexNormalsHelper'
import Vector from './vec'

/**
 * Main extends the Renderer class and constructs the scene.
 */
export default class Main extends Renderer {
  /**
   * constroctor creates the objects needed for rendering
   */
  constructor() {
    super()

    this.meshType = ""
    // a hidden input field that responsible for loading meshes
    this.input = document.createElement('input')
    this.input.setAttribute('type', 'file')
    this.input.addEventListener('change', () => {
      let file = this.input.files[0]
      if (!file.name.endsWith('.obj')) {
        alert('Only .OBJ files are supported')
      }
      const r = new FileReader()
      r.onload = () => {
        this.loadMesh(r.result)
        this.params["showWireframe"] = true
        if(this.internal.mesh.isQuadMesh)
          this.params["meshType"] = "Quadrilateral Mesh"

        else
          this.params["meshType"]  = "Triangle Mesh"
      }
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
      laplacian: 'uniform',
      massMatrixType: 'identity',
      timeStep: 0.001,
      smoothStep: 1,
      meshType: "None"
    }

    this.gui = new GUI()
    const io = this.gui.addFolder('I/O')
    io.add(this.params, 'import').name('import mesh')
    io.add(this.params, 'export').name('export screenshot')
    io.add(this.params, 'meshType')

    const vis = this.gui.addFolder('Visualization')
    vis.add(this.params, 'showNormals').name('show normals').listen()
        .onChange(show => {
          if (show) {
            this.scene.add(this.internal.normalHelper)
          } else {
            this.scene.remove(this.internal.normalHelper)
          }
        })
    vis.add(this.params, 'showWireframe').name('show wireframe').listen()
        .onChange(show => {
          if (show) {
            this.scene.add(this.internal.wireframeHelper)
          } else {
            this.scene.remove(this.internal.wireframeHelper)
          }
        })
    vis.open()

    const methods = this.gui.addFolder('Methods')
    methods.add(this.params, 'normalMethod', [
      'equal-weighted', 'area-weighted', 'angle-weighted',
    ]).listen().onChange(() => this.updateNormals())
    methods.add(this.params, 'laplacian', [
      'uniform', 'cotan', 'mean value'
    ]).listen().onChange(() => this.updateSmoothing())
    methods.add(this.params, 'massMatrixType', [
      'identity', 'neighbours', 'voronoi area'
    ]).listen().onChange(() => this.updateSmoothing())
    methods.open()

    const smoothing = this.gui.addFolder('Laplacian Smoothing')
    smoothing.add(this.params, 'timeStep', 0.001, 10, 0.001).name('time step').listen()
        .onChange(() => this.updateSmoothing())
    smoothing.add(this.params, 'smoothStep', 1, 3, 1).name('smooth step').listen()
        .onChange(() => this.updateSmoothing())
    smoothing.open()

    // just for the first load
    fetch('./assets/deformed sphere triangulated.obj')
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
  updateSmoothing() {
    this.internal.mesh.smooth(this.params.laplacian, this.params.timeStep, this.params.smoothStep, this.params.massMatrixType)
    this.renderMesh()
  }
  computeAABB() {
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
    return [center, radius]
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

    const [center, radius] = this.computeAABB()
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

    let n = this.internal.mesh.isQuadMesh ? 6 : 3
    let idxs = new Uint32Array(this.internal.mesh.faces.length*n)
    this.internal.mesh.faces.forEach(f => {

      if(f.isQuad){
        let i = 0
        f.getTriangulation().forEach((triangle)=>{
          triangle.forEach((vertex)=>{
            idxs[n * f.idx + i] = vertex.idx
            i++
          })
        })
      }else{
        f.vertices((v, i) => { idxs[n * f.idx + i] = v.idx})
        }

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
/*
    let positions = []
    this.internal.mesh.faces.forEach(f => {
      let tmp = []
        f.vertices((v, i) => {
          tmp.push(v.position)
        })
      tmp.forEach((pos, i) => {
        positions.push(pos)
        if(i != tmp.length-1){
          positions.push(tmp[i+1])
        }else{
          positions.push(tmp[0])
        }

      })
      console.log(tmp)
    })
    const g2 = new BufferGeometry()
    g2.setAttribute('position', new BufferAttribute(this.bufpos, 3))
    g2.setAttribute('color', new BufferAttribute(this.bufcolors, 3))
    g2.setAttribute('normal', new BufferAttribute(this.bufnormals, 3))
    g2.setFromPoints(positions)
        */
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
