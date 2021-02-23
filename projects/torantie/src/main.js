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
    this.modelTypeTextLeft = document.createElement('div');
    this.modelTypeTextLeft.style.position = 'absolute';
    this.modelTypeTextLeft.innerHTML = "Mesh type is unknown.";
    this.modelTypeTextLeft.style.top = 0 + 'px';
    this.modelTypeTextLeft.style.left = window.innerWidth*0.2 + 'px';
    this.modelTypeTextRight = document.createElement('div');
    this.modelTypeTextRight.style.position = 'absolute';
    this.modelTypeTextRight.innerHTML = "Mesh type is unknown.";
    this.modelTypeTextRight.style.top = 0 + 'px';
    this.modelTypeTextRight.style.left = window.innerWidth*0.7 + 'px';
    document.body.appendChild(this.modelTypeTextLeft);
    document.body.appendChild(this.modelTypeTextRight);
    window.onresize = (() => {
      this.modelTypeTextRight.style.left = window.innerWidth*0.7 + 'px';
      this.modelTypeTextLeft.style.left = window.innerWidth*0.2 + 'px';
    })
    // a hidden input field that responsible for loading meshes
    this.input = document.createElement('input')
    this.input.setAttribute('type', 'file')
    this.input.addEventListener('change', () => {
      let file = this.input.files[0]
      if (!file.name.endsWith('.obj')) {
        alert('Only .OBJ files are supported')
      }
      const r = new FileReader()
      r.onload = () => this.loadMesh(r.result, false)
      r.onerror = () => alert('Cannot import your obj mesh')
      r.readAsText(file)
    })
    document.body.appendChild(this.input)

    this.internal = {
      meshLeft: null,     // internal left mesh object
      meshRight: null,     // internal right mesh object
      mesh3jsLeft: null,
      mesh3jsRight: null,
      meshLeftNormalHelper: null,
      meshRightNormalHelper: null,
      meshLeftWireframeHelper: null,
      meshRightWireframeHelper: null,
    }
    let smoothParams = {
      laplacian: 'uniform',
      massMatrixType: 'neighbours',
      lambda: 1,
      timeStep: 0.001,
      smoothStep: 1,
    }

    this.params = {
      import: () => this.input.click(),
      loadLeft: false,
      export: () => this.exportScreenshot(),
      showNormals: false,
      showWireframe: false,
      normalMethod: 'equal-weighted',
      smoothLeft: smoothParams,
      smoothRight: Object.assign({}, smoothParams),
    }

    this.createGUIFolders();

    // just for the first load
    fetch('./assets/deformed sphere triangulated.obj')
      .then(resp => resp.text())
      .then(data => this.loadMesh(data,true))
  }

  createGUIFolders() {
    this.createIOFolder();

    this.createVisualizationFolder();

    this.createNormalMethodsFolder();

    this.createSmoothingFolder('Laplacian Smoothing Left',this.params.smoothLeft, true);
    this.createSmoothingFolder('Laplacian Smoothing Right',this.params.smoothRight, false);
  }

  createIOFolder() {
    this.gui = new GUI()
    const io = this.gui.addFolder('I/O')
    io.add(this.params, 'import').name('import mesh')
    io.add(this.params, 'loadLeft').name('load left mesh')
    io.add(this.params, 'export').name('export screenshot')
  }

  createVisualizationFolder() {
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
  }

  createNormalMethodsFolder() {
    const methods = this.gui.addFolder('Normal Methods')
    methods.add(this.params, 'normalMethod', [
      'equal-weighted', 'area-weighted', 'angle-weighted',
    ]).listen().onChange(() => this.updateNormals())

    methods.open()
  }

  createSmoothingFolder(name ,smoothingParameter, isLeft) {
    const smoothing = this.gui.addFolder(name)
    smoothing.add(smoothingParameter, 'laplacian', ['uniform', 'cotan', 'mean value']).listen()
        .onChange(() => {
      this.setMassMatrixType(smoothingParameter);
      this.updateSmoothing(smoothingParameter, isLeft)
    })
    smoothing.add(smoothingParameter, 'massMatrixType', ['identity', 'neighbours', 'voronoi area']).listen()
        .onChange(() => this.updateSmoothing(smoothingParameter, isLeft))
    smoothing.add(smoothingParameter, 'timeStep', 0.001, 10, 0.001).name('time step').listen()
        .onChange(() => this.updateSmoothing(smoothingParameter, isLeft))
    smoothing.add(smoothingParameter, 'smoothStep', 1, 3, 1).name('smooth step').listen()
        .onChange(() => this.updateSmoothing(smoothingParameter, isLeft))
    smoothing.add(smoothingParameter, 'lambda', 0.001, 1, 0.001).name('lambda').listen()
        .onChange(() => this.updateSmoothing(smoothingParameter, isLeft))

    smoothing.open()
  }

  setMassMatrixType(smoothingParameter) {
    switch (smoothingParameter.laplacian) {
      case 'uniform':
        smoothingParameter.massMatrixType = 'neighbours'
        break;
      case 'cotan':
        smoothingParameter.massMatrixType = 'voronoi area'
        break;
      case 'mean value':
        smoothingParameter.massMatrixType = 'identity'
        break;
    }
  }

  loadMesh(data, loadBothSides) {

    if(loadBothSides){
      if (this.internal.mesh3jsLeft !== null) {
        this.sceneLeft.remove(this.internal.mesh3jsLeft)
      }
      if (this.internal.mesh3jsRight !== null) {
        this.sceneLeft.remove(this.internal.mesh3jsRight)
      }
      this.internal.meshLeft = new HalfedgeMesh(data)
      this.internal.meshRight = new HalfedgeMesh(data)
      this.renderMeshes()
    }
    else{
      if(this.params.loadLeft){
        if (this.internal.mesh3jsLeft !== null) {
          this.sceneLeft.remove(this.internal.mesh3jsLeft)
        }
        this.internal.meshLeft = new HalfedgeMesh(data)
        this.renderMeshLeft()
      }else{
        if (this.internal.mesh3jsRight !== null) {
          this.sceneLeft.remove(this.internal.mesh3jsRight)
        }
        this.internal.meshRight = new HalfedgeMesh(data)
        this.renderMeshRight()
      }
    }

    this.modelTypeTextLeft.innerHTML = this.internal.meshLeft.meshType;
    this.modelTypeTextRight.innerHTML = this.internal.meshRight.meshType;
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
    this.internal.meshLeft.vertices.forEach(v => {
      const n = v.normal(this.params.normalMethod)

      this.bufnormalsLeft[3*v.idx+0] = n.x
      this.bufnormalsLeft[3*v.idx+1] = n.y
      this.bufnormalsLeft[3*v.idx+2] = n.z
    })

    this.internal.meshRight.vertices.forEach(v => {
      const n = v.normal(this.params.normalMethod)

      this.bufnormalsRight[3*v.idx+0] = n.x
      this.bufnormalsRight[3*v.idx+1] = n.y
      this.bufnormalsRight[3*v.idx+2] = n.z
    })

    this.internal.mesh3jsLeft.geometry.attributes.normal.needsUpdate = true
    this.internal.meshLeftNormalHelper.update()
    this.internal.mesh3jsRight.geometry.attributes.normal.needsUpdate = true
    this.internal.meshRightNormalHelper.update()
  }
  updateSmoothing(smoothingParameter, isLeft) {
    if(isLeft){
      this.internal.meshLeft.smooth(smoothingParameter.laplacian,
          smoothingParameter.timeStep,
          smoothingParameter.smoothStep,
          smoothingParameter.massMatrixType,
          smoothingParameter.lambda)
      this.renderMeshLeft()
    }else{
      this.internal.meshRight.smooth(smoothingParameter.laplacian,
          smoothingParameter.timeStep,
          smoothingParameter.smoothStep,
          smoothingParameter.massMatrixType,
          smoothingParameter.lambda)
      this.renderMeshRight()
    }
  }
  computeAABB(vertices) {
    let min = new Vector(), max = new Vector()
    vertices.forEach(v => {
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
    this.renderMeshLeft()
    this.renderMeshRight()
  }

  prepareBuf(vertices, isLeft) {
    // prepare threejs buffer data
    const v = vertices.length
    const bufpos     = new Float32Array(v*3)
    const bufcolors  = new Float32Array(v*3)
    const bufnormals = new Float32Array(v*3)

    const [center, radius] = this.computeAABB(vertices)
    vertices.forEach(v => {
      const i = v.idx
      // use AABB and rescale to viewport center
      const p = v.position.sub(center).scale(1/radius)
      bufpos[3*i+0] = p.x
      bufpos[3*i+1] = p.y
      bufpos[3*i+2] = p.z

      // default GP blue color
      bufcolors[3*i+0] = 0
      bufcolors[3*i+1] = 0.5
      bufcolors[3*i+2] = 1

      const n = v.normal(this.params.normalMethod)
      bufnormals[3*i+0] = n.x
      bufnormals[3*i+1] = n.y
      bufnormals[3*i+2] = n.z
    })

    if(isLeft){
      this.bufposLeft     = bufpos
      this.bufcolorsLeft  = bufcolors
      this.bufnormalsLeft = bufnormals
    }else{
      this.bufposRight     = bufpos
      this.bufcolorsRight  = bufcolors
      this.bufnormalsRight = bufnormals
    }
  }

  renderMeshLeft() {
    this.prepareBuf(this.internal.meshLeft.vertices, true)

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

    let n = this.internal.meshLeft.isQuadMesh ? 6 : 3

    const idxs = new Uint32Array(this.internal.meshLeft.faces.length*n)
    this.internal.meshLeft.faces.forEach(f => { this.prepareIndexes(n, idxs, f)})
    const wireframe_idxs = new Uint32Array(this.internal.meshLeft.edges.length*2)
    this.internal.meshLeft.edges.forEach(e => {
      wireframe_idxs[2 * e.idx] = e.halfedge.vertex.idx
      wireframe_idxs[2 * e.idx + 1] = e.halfedge.twin.vertex.idx
    })

    const g = new BufferGeometry()
    g.setIndex(new BufferAttribute(idxs, 1))
    g.setAttribute('position', new BufferAttribute(this.bufposLeft, 3))
    g.setAttribute('color', new BufferAttribute(this.bufcolorsLeft, 3))
    g.setAttribute('normal', new BufferAttribute(this.bufnormalsLeft, 3))

    const g_wireframe = new BufferGeometry()
    g_wireframe.setIndex(new BufferAttribute(wireframe_idxs, 1))
    g_wireframe.setAttribute('position', new BufferAttribute(this.bufposLeft, 3))

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
        g_wireframe,
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
    this.prepareBuf(this.internal.meshRight.vertices, false)

    // clear old instances
    if (this.internal.meshRightNormalHelper !== null) {
      this.sceneRight.remove(this.internal.meshRightNormalHelper)
    }
    if (this.internal.meshRightWireframeHelper !== null) {
      this.sceneRight.remove(this.internal.meshRightWireframeHelper)
    }
    if (this.internal.mesh3jsRight !== null) {
      this.sceneRight.remove(this.internal.mesh3jsRight)
    }

    let n = this.internal.meshRight.isQuadMesh ? 6 : 3

    const idxs = new Uint32Array(this.internal.meshRight.faces.length*n)
    this.internal.meshRight.faces.forEach(f => {this.prepareIndexes(n, idxs, f) })
    const wireframe_idxs = new Uint32Array(this.internal.meshRight.edges.length*2)
    this.internal.meshRight.edges.forEach(e => {
      wireframe_idxs[2 * e.idx] = e.halfedge.vertex.idx
      wireframe_idxs[2 * e.idx + 1] = e.halfedge.twin.vertex.idx
    })

    const g_wireframe = new BufferGeometry()
    g_wireframe.setIndex(new BufferAttribute(wireframe_idxs, 1))
    g_wireframe.setAttribute('position', new BufferAttribute(this.bufposRight, 3))

    const g = new BufferGeometry()
    g.setIndex(new BufferAttribute(idxs, 1))
    g.setAttribute('position', new BufferAttribute(this.bufposRight, 3)) // use uv as position
    g.setAttribute('color', new BufferAttribute(this.bufcolorsRight, 3))
    g.setAttribute('normal', new BufferAttribute(this.bufnormalsRight, 3))

    this.internal.mesh3jsRight = new Mesh(g, new MeshPhongMaterial({
      vertexColors: VertexColors,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      side: DoubleSide,
    }))
    this.internal.meshRightNormalHelper = new VertexNormalsHelper(
        this.internal.mesh3jsRight, 0.03, 0xaa0000,
    )
    this.internal.meshRightWireframeHelper = new LineSegments(
        g_wireframe,
        new LineBasicMaterial({color: 0x000000, linewidth: 1})
    )

    this.sceneRight.add(this.internal.mesh3jsRight)
    if (this.params.showNormals) {
      this.sceneRight.add(this.internal.meshRightNormalHelper)
    }
    if (this.params.showWireframe) {
      this.sceneRight.add(this.internal.meshRightWireframeHelper)
    }
  }
}
new Main().render()
