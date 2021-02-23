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
    this.modelTypeText = document.createElement('div');
    this.modelTypeText.style.position = 'absolute';
    this.modelTypeText.innerHTML = "Mesh type is";
    this.modelTypeText.style.top = 0 + 'px';
    this.modelTypeText.style.left = window.innerWidth/2 + 'px';
    document.body.appendChild(this.modelTypeText);
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
      mesh3jsLeft: null,  // three.js buffer geometry object for mesh
      mesh3jsRightOrig: null,    // three.js buffer geometry object for UV map
      mesh3jsRightSim: null,
      meshLeftNormalHelper: null,
      meshRightNormalHelper: null,
      meshLeftWireframeHelper: null,
      meshRightWireframeHelper: null,
    }
    this.params = {
      import: () => this.input.click(),
      loadLeft: false,
      export: () => this.exportScreenshot(),
      showNormals: false,
      showWireframe: false,
      normalMethod: 'equal-weighted',
      laplacian: 'uniform',
      massMatrixType: 'neighbours',
      lambda: 1,
      timeStep: 0.001,
      smoothStep: 1,
    }

    this.gui = new GUI()
    const io = this.gui.addFolder('I/O')
    io.add(this.params, 'import').name('import mesh')
    io.add(this.params, 'loadLeft').name('load left mesh')
    io.add(this.params, 'export').name('export screenshot')

    const vis = this.gui.addFolder('Visualization')
    vis.add(this.params, 'showNormals').name('show normals').listen()
        .onChange(show => {
          if (show) {
            this.sceneLeft.add(this.internal.meshLeftNormalHelper)
            this.sceneRight.add(this.internal.meshRightNormalHelper)
          } else {
            this.sceneLeft.remove(this.internal.meshLeftNormalHelper)
            this.sceneRight.remove(this.internal.meshRightNormalHelper)
          }
        })
    vis.add(this.params, 'showWireframe').name('show wireframe').listen()
        .onChange(show => {
          if (show) {
            this.sceneLeft.add(this.internal.meshLeftWireframeHelper)
            this.sceneRight.add(this.internal.meshRightWireframeHelper)
          } else {
            this.sceneLeft.remove(this.internal.meshLeftWireframeHelper)
            this.sceneRight.remove(this.internal.meshRightWireframeHelper)
          }
        })

    vis.open()

    const methods = this.gui.addFolder('Methods')
    methods.add(this.params, 'normalMethod', [
      'equal-weighted', 'area-weighted', 'angle-weighted',
    ]).listen().onChange(() => this.updateNormals())
    methods.add(this.params, 'laplacian', [
      'uniform', 'cotan', 'mean value'
    ]).listen().onChange(() => {
      switch(this.params.laplacian){
        case 'uniform':
          this.params.massMatrixType = 'neighbours'
          break;
        case 'cotan':
          this.params.massMatrixType = 'voronoi area'
          break;
        case 'mean value':
          this.params.massMatrixType = 'identity'
          break;
      }
      this.updateSmoothing()
    })
    methods.add(this.params, 'massMatrixType', [
      'identity', 'neighbours', 'voronoi area'
    ]).listen().onChange(() => this.updateSmoothing())

    methods.open()
    
    const smoothing = this.gui.addFolder('Laplacian Smoothing')
    smoothing.add(this.params, 'timeStep', 0.001, 10, 0.001).name('time step').listen()
        .onChange(() => this.updateSmoothing())
    smoothing.add(this.params, 'smoothStep', 1, 3, 1).name('smooth step').listen()
        .onChange(() => this.updateSmoothing())
    smoothing.add(this.params, 'lambda', 0.001, 1, 0.001).name('lambda').listen()
        .onChange(() => this.updateSmoothing())
    smoothing.open()

    // just for the first load
    fetch('./assets/deformed sphere triangulated.obj')
      .then(resp => resp.text())
      .then(data => this.loadMesh(data))
  }
  loadMesh(data) {

    if (this.internal.mesh3jsLeft !== null) {
      this.sceneLeft.remove(this.internal.mesh3jsLeft)
    }
    //this.internal.loadLeft
    this.internal.mesh = new HalfedgeMesh(data)
    this.renderMeshes()
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
    this.internal.mesh3jsLeft.geometry.attributes.normal.needsUpdate = true
    this.internal.meshLeftNormalHelper.update()
    this.internal.mesh3jsRightOrig.geometry.attributes.normal.needsUpdate = true
    this.internal.meshRightNormalHelper.update()
  }
  updateSmoothing() {

    this.internal.mesh.smooth(this.params.laplacian,
        this.params.timeStep,
        this.params.smoothStep,
        this.params.massMatrixType,
        this.params.lambda)
    this.renderMeshes()
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
  renderMeshes() {
    this.prepareBuf()
    this.renderMeshLeft()
    this.renderMeshRight()
  }

  prepareBuf() {
    // prepare threejs buffer data
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
  }

  renderMeshLeft() {
    // clear old instances
    if (this.internal.meshLeftNormalHelper !== null) {
      this.sceneLeft.remove(this.internal.meshLeftNormalHelper)
    }
    if (this.internal.meshLeftWireframeHelper !== null) {
      this.sceneLeft.remove(this.internal.meshLeftWireframeHelper)
    }
    if (this.internal.mesh3jsLeft !== null) {
      this.sceneLeft.remove(this.internal.mesh3jsLeft)
    }

    let n = this.internal.mesh.isQuadMesh ? 6 : 3

    const idxs = new Uint32Array(this.internal.mesh.faces.length*n)
    this.internal.mesh.faces.forEach(f => { this.prepareIndexes(n, idxs, f)})
    const wireframe_idxs = new Uint32Array(this.internal.mesh.edges.length*2)
    this.internal.mesh.edges.forEach(e => {

      wireframe_idxs[2 * e.idx] = e.halfedge.vertex.idx
      wireframe_idxs[2 * e.idx + 1] = e.halfedge.twin.vertex.idx

      //wireframe_idxs[2 * e.idx] =   e.halfedge.next.vertex.idx
      //       wireframe_idxs[2 * e.idx + 1] = e.halfedge.vertex.idx
    })

    const g = new BufferGeometry()
    g.setIndex(new BufferAttribute(idxs, 1))
    g.setAttribute('position', new BufferAttribute(this.bufpos, 3))
    g.setAttribute('color', new BufferAttribute(this.bufcolors, 3))
    g.setAttribute('normal', new BufferAttribute(this.bufnormals, 3))

    const g_wireframe = new BufferGeometry()
    g_wireframe.setIndex(new BufferAttribute(wireframe_idxs, 1))
    g_wireframe.setAttribute('position', new BufferAttribute(this.bufpos, 3))

    this.internal.mesh3jsLeft = new Mesh(g, new MeshPhongMaterial({
      vertexColors: VertexColors,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      side: DoubleSide,
    }))

    this.internal.meshLeftNormalHelper = new VertexNormalsHelper(
        this.internal.mesh3jsLeft, 0.03, 0xaa0000,
    )
    this.internal.meshLeftWireframeHelper = new LineSegments(
        new WireframeGeometry(g_wireframe),
        new LineBasicMaterial({color: 0x000000, linewidth: 1})
    )

    this.sceneLeft.add(this.internal.mesh3jsLeft)
    if (this.params.showNormals) {
      this.sceneLeft.add(this.internal.meshLeftNormalHelper)
    }
    if (this.params.showWireframe) {
      this.sceneLeft.add(this.internal.meshLeftWireframeHelper)
    }
  }

  prepareIndexes(n, idxs, f) {
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
  }

  renderMeshRight() {
    // clear old instances
    if (this.internal.meshRightNormalHelper !== null) {
      this.sceneRight.remove(this.internal.meshRightNormalHelper)
    }
    if (this.internal.meshRightWireframeHelper !== null) {
      this.sceneRight.remove(this.internal.meshRightWireframeHelper)
    }
    if (this.internal.mesh3jsRightOrig !== null) {
      this.sceneRight.remove(this.internal.mesh3jsRightOrig)
    }

    let n = this.internal.mesh.isQuadMesh ? 6 : 3

    const idxs = new Uint32Array(this.internal.mesh.faces.length*n)
    this.internal.mesh.faces.forEach(f => {this.prepareIndexes(n, idxs, f) })

    const g = new BufferGeometry()
    g.setIndex(new BufferAttribute(idxs, 1))
    g.setAttribute('position', new BufferAttribute(this.bufpos, 3)) // use uv as position
    g.setAttribute('color', new BufferAttribute(this.bufcolors, 3))
    g.setAttribute('normal', new BufferAttribute(this.bufnormals, 3))

    this.internal.mesh3jsRightOrig = new Mesh(g, new MeshPhongMaterial({
      vertexColors: VertexColors,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      side: DoubleSide,
    }))
    this.internal.meshRightNormalHelper = new VertexNormalsHelper(
        this.internal.mesh3jsRightOrig, 0.03, 0xaa0000,
    )
    this.internal.meshRightWireframeHelper = new LineSegments(
        new WireframeGeometry(g),
        new LineBasicMaterial({color: 0x000000, linewidth: 1})
    )
    //this.internal.mesh3jsRightSim = this.internal.mesh3jsRightOrig.clone()
    this.sceneRight.add(this.internal.mesh3jsRightOrig)
    if (this.params.showNormals) {
      this.sceneRight.add(this.internal.meshRightNormalHelper)
    }
    if (this.params.showWireframe) {
      this.sceneRight.add(this.internal.meshRightWireframeHelper)
    }
  }
}
new Main().render()
