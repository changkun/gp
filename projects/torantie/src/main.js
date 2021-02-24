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

    this.createMeshDescriptionText();

    this.createFileLoadInputField();

    this.createGUIFolders();

    // just for the first load
    fetch('./assets/deformed sphere triangulated.obj')
      .then(resp => resp.text())
      .then(data => this.loadMesh(data,true))
  }

  createMeshDescriptionText() {
    this.modelTypeTextLeft = document.createElement('div');
    this.modelTypeTextLeft.style.position = 'absolute';
    this.modelTypeTextLeft.innerHTML = "Mesh type is unknown.";
    this.modelTypeTextLeft.style.top = 0 + 'px';
    this.modelTypeTextLeft.style.left = window.innerWidth * 0.2 + 'px';
    this.modelTypeTextRight = document.createElement('div');
    this.modelTypeTextRight.style.position = 'absolute';
    this.modelTypeTextRight.innerHTML = "Mesh type is unknown.";
    this.modelTypeTextRight.style.top = 0 + 'px';
    this.modelTypeTextRight.style.left = window.innerWidth * 0.7 + 'px';
    document.body.appendChild(this.modelTypeTextLeft);
    document.body.appendChild(this.modelTypeTextRight);
    window.onresize = (() => {
      this.modelTypeTextRight.style.left = window.innerWidth * 0.7 + 'px';
      this.modelTypeTextLeft.style.left = window.innerWidth * 0.2 + 'px';
    })
  }

  /**
   * Creates a hidden input field that responsible for loading meshes.
   */
  createFileLoadInputField() {
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
  }

  createGUIFolders() {
    this.initGUIParameters();

    this.createIOFolder();

    this.createVisualizationFolder();

    this.createNormalMethodsFolder();

    this.createSmoothingFolder('Laplacian Smoothing Left',this.params.smoothLeft, true);
    this.createSmoothingFolder('Laplacian Smoothing Right',this.params.smoothRight, false);
  }

  initGUIParameters() {
    let smoothParams = {
      laplacian: 'uniform',
      massMatrixType: 'neighbours',
      lambda: 1,
      timeStep: 0.001,
      smoothStep: 1,
    }

    this.params = {
      importLeft: () => this.input.click(),
      importRight: () => this.input.click(),
      loadLeft: false,
      export: () => this.exportScreenshot(),
      showNormals: false,
      showWireframe: false,
      normalMethod: 'equal-weighted',
      smoothLeft: smoothParams,
      smoothRight: Object.assign({}, smoothParams),
    }
  }

  createIOFolder() {
    this.gui = new GUI()
    const io = this.gui.addFolder('I/O')
    io.add(this.params, 'importLeft').name('import left mesh')
    io.add(this.params, 'importRight').name('import right mesh')
    io.add(this.params, 'export').name('export screenshot')
  }

  createVisualizationFolder() {
    const vis = this.gui.addFolder('Visualization')
    vis.add(this.params, 'showNormals').name('show normals').listen()
        .onChange(show => {
          if (show) {
            this.internal.leftSide.scene.add(this.internal.leftSide.meshNormalHelper)
            this.internal.rightSide.scene.add(this.internal.rightSide.meshNormalHelper)
          } else {
            this.internal.leftSide.scene.remove(this.internal.leftSide.meshNormalHelper)
            this.internal.rightSide.scene.remove(this.internal.rightSide.meshNormalHelper)
          }
        })
    vis.add(this.params, 'showWireframe').name('show wireframe').listen()
        .onChange(show => {
          if (show) {
            this.internal.leftSide.scene.add(this.internal.leftSide.meshWireframeHelper)
            this.internal.rightSide.scene.add(this.internal.rightSide.meshWireframeHelper)
          } else {
            this.internal.leftSide.scene.remove(this.internal.leftSide.meshWireframeHelper)
            this.internal.rightSide.scene.remove(this.internal.rightSide.meshWireframeHelper)
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
      if (this.internal.leftSide.mesh3js !== null) {
        this.internal.leftSide.scene.remove(this.internal.leftSide.mesh3js)
      }
      if (this.internal.rightSide.mesh3js !== null) {
        this.internal.rightSide.scene.remove(this.internal.rightSide.mesh3js)
      }
      this.internal.leftSide.mesh = new HalfedgeMesh(data)
      this.internal.rightSide.mesh = new HalfedgeMesh(data)
      this.renderMeshes()
    }
    else{
      if(this.params.loadLeft){
        if (this.internal.leftSide.mesh3js !== null) {
          this.internal.leftSide.scene.remove(this.internal.leftSide.mesh3js)
        }
        this.internal.leftSide.mesh = new HalfedgeMesh(data)
        this.renderMesh(this.internal.leftSide)
      }else{
        if (this.internal.rightSide.mesh3js !== null) {
          this.internal.rightSide.scene.remove(this.internal.rightSide.mesh3js)
        }
        this.internal.rightSide.mesh = new HalfedgeMesh(data)
        this.renderMesh(this.internal.rightSide)
      }
    }

    this.modelTypeTextLeft.innerHTML = this.internal.leftSide.mesh.meshType;
    this.modelTypeTextRight.innerHTML = this.internal.rightSide.mesh.meshType;
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
    this.internal.leftSide.mesh.vertices.forEach(v => {
      const n = v.normal(this.params.normalMethod)

      this.internal.leftSide.buffer.normals[3*v.idx+0] = n.x
      this.internal.leftSide.buffer.normals[3*v.idx+1] = n.y
      this.internal.leftSide.buffer.normals[3*v.idx+2] = n.z
    })

    this.internal.rightSide.mesh.vertices.forEach(v => {
      const n = v.normal(this.params.normalMethod)

      this.internal.rightSide.buffer.normals[3*v.idx+0] = n.x
      this.internal.rightSide.buffer.normals[3*v.idx+1] = n.y
      this.internal.rightSide.buffer.normals[3*v.idx+2] = n.z
    })

    this.internal.leftSide.mesh3js.geometry.attributes.normal.needsUpdate = true
    this.internal.leftSide.meshNormalHelper.update()
    this.internal.rightSide.mesh3js.geometry.attributes.normal.needsUpdate = true
    this.internal.rightSide.meshNormalHelper.update()
  }

  updateSmoothing(smoothingParameter, isLeft) {
    if(isLeft){
      this.internal.leftSide.mesh.smooth(smoothingParameter.laplacian,
          smoothingParameter.timeStep,
          smoothingParameter.smoothStep,
          smoothingParameter.massMatrixType,
          smoothingParameter.lambda)
      this.renderMesh(this.internal.leftSide)
    }else{
      this.internal.rightSide.mesh.smooth(smoothingParameter.laplacian,
          smoothingParameter.timeStep,
          smoothingParameter.smoothStep,
          smoothingParameter.massMatrixType,
          smoothingParameter.lambda)
      this.renderMesh(this.internal.rightSide)
    }
  }

  renderMeshes() {
    this.renderMesh(this.internal.leftSide)
    this.renderMesh(this.internal.rightSide)
  }

  renderMesh(side){
    this.prepareBuf(side)

    this.clearSide(side);

    const {idxs, wireframe_idxs} = this.fillIndexArrays(side);

    const {g_wireframe, g} = this.initBufferGeometry(side, wireframe_idxs, idxs);

    this.initMeshComponents(side, g, g_wireframe);

    this.fillSide(side);
  }

  prepareBuf(side) {
    // prepare threejs buffer data
    const vertices = side.mesh.vertices
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

    side.buffer.positions     = bufpos
    side.buffer.colors  = bufcolors
    side.buffer.normals = bufnormals
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

  /**
   * Clear old instances of mesh, normals and wireframe on the specified sides scene.
   * @param side
   */
  clearSide(side) {
    if (side.meshNormalHelper !== null) {
      side.scene.remove(side.meshNormalHelper)
    }
    if (side.meshWireframeHelper !== null) {
      side.scene.remove(side.meshWireframeHelper)
    }
    if (side.mesh3js !== null) {
      side.scene.remove(side.mesh3js)
    }
  }

  /**
   * Fill arrays for the 3js mesh and wireframe with indices of the mesh datastructures vertices.
   * @param side
   * @returns {{idxs: Uint32Array, wireframe_idxs: Uint32Array}}
   */
  fillIndexArrays(side) {
    let n = side.mesh.isQuadMesh ? 6 : 3
    const idxs = new Uint32Array(side.mesh.faces.length * n)
    side.mesh.faces.forEach(this.fillMeshIndexArray(idxs, n))

    const wireframe_idxs = new Uint32Array(side.mesh.edges.length * 2)
    side.mesh.edges.forEach(this.fillWireframeIndexArray(wireframe_idxs))
    return {idxs, wireframe_idxs};
  }

  /**
   * Fill array for the 3js mesh with indices of the mesh datastructures vertices.
   * @param idxs
   * @param n
   * @returns {function(*=): void}
   */
  fillMeshIndexArray(idxs, n) {
    return face => {
      if (face.isQuad) {
        let i = 0
        face.getTriangulation().forEach((triangle) => {
          triangle.forEach((vertex) => {
            idxs[n * face.idx + i] = vertex.idx
            i++
          })
        })
      } else {
        face.vertices((v, i) => {
          idxs[n * face.idx + i] = v.idx
        })
      }
    };
  }

  /**
   * Fill array for the 3js wireframe with indices of the mesh datastructures vertices.
   * @param wireframe_idxs
   * @returns {function(*): void}
   */
  fillWireframeIndexArray(wireframe_idxs) {
    return edge => {
      wireframe_idxs[2 * edge.idx] = edge.halfedge.vertex.idx
      wireframe_idxs[2 * edge.idx + 1] = edge.halfedge.twin.vertex.idx
    };
  }

  /**
   * Initialize BufferGeometry for mesh and wireframe with the prepared indices.
   * @param wireframe_idxs
   * @param side
   * @param idxs
   * @returns {{g_wireframe: BufferGeometry, g: BufferGeometry}}
   */
  initBufferGeometry(side, wireframe_idxs, idxs) {
    const g_wireframe = new BufferGeometry()
    g_wireframe.setIndex(new BufferAttribute(wireframe_idxs, 1))
    g_wireframe.setAttribute('position', new BufferAttribute(side.buffer.positions, 3))

    const g = new BufferGeometry()
    g.setIndex(new BufferAttribute(idxs, 1))
    g.setAttribute('position', new BufferAttribute(side.buffer.positions, 3)) // use uv as position
    g.setAttribute('color', new BufferAttribute(side.buffer.colors, 3))
    g.setAttribute('normal', new BufferAttribute(side.buffer.normals, 3))
    return {g_wireframe, g};
  }

  /**
   * Initialize mesh, normals and wireframe.
   * @param side
   * @param g
   * @param g_wireframe
   */
  initMeshComponents(side, g, g_wireframe) {
    side.mesh3js = new Mesh(g, new MeshPhongMaterial({
      vertexColors: VertexColors,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      side: DoubleSide,
    }))
    side.meshNormalHelper = new VertexNormalsHelper(
        side.mesh3js, 0.03, 0xaa0000,
    )
    side.meshWireframeHelper = new LineSegments(
        g_wireframe,
        new LineBasicMaterial({color: 0x000000, linewidth: 1})
    )
  }

  /**
   * Fill specified sides scene with mesh, normals and wireframe.
   * @param side
   */
  fillSide(side) {
    side.scene.add(side.mesh3js)
    if (this.params.showNormals) {
      side.scene.add(side.meshNormalHelper)
    }
    if (this.params.showWireframe) {
      side.scene.add(side.meshWireframeHelper)
    }
  }

}
new Main().render()
