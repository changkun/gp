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
  Geometry,
  BoxGeometry,
  EdgesGeometry,
} from 'three'
import {
  VertexNormalsHelper
} from 'three/examples/jsm/helpers/VertexNormalsHelper'
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier'
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
      export: () => this.exportScreenshot(),
      showNormals: false,
      showWireframe: false,
      flatShading: false,
      showTexture: true,
      normalMethod: 'equal-weighted',

      qSim: 0.0,
      melaxSim: 0.0,
    }

    this.gui = new GUI()
    const io = this.gui.addFolder('I/O')
    io.add(this.params, 'import').name('import mesh')
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
    vis.add(this.params, 'normalMethod', [
      'equal-weighted', 'area-weighted', 'angle-weighted',
    ]).onChange(() => this.updateNormals())
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
    vis.add(this.params, 'flatShading').name('flat shading').listen()
    .onChange(flat => {
      this.internal.mesh3jsLeft.material.flatShading = flat
      this.internal.mesh3jsRightSim.material.flatShading = flat
      this.internal.mesh3jsLeft.material.needsUpdate = true
      this.internal.mesh3jsRightSim.material.needsUpdate = true
    })
    vis.add(this.params, 'showTexture').name('texture').listen()
    .onChange(showTex => {
      if (showTex) {
        this.internal.mesh3jsLeft.material.map = this.checkboardTexture()
        this.internal.mesh3jsRightSim.material.map = this.checkboardTexture()
      } else {
        this.internal.mesh3jsLeft.material.map = null
        this.internal.mesh3jsRight.material.map = null
      }
      this.internal.mesh3jsLeft.material.needsUpdate = true
      this.internal.mesh3jsRightSim.material.needsUpdate = true
    })
    vis.open()

    const mod = this.gui.addFolder('Reduce Ratio')
    mod.add(this.params, 'qSim', 0.0, 1.0, 0.001).name('Left (QEM)')
    .onChange(v => {
      // this.internal.mesh.simplify(v)
      this.internal.mesh.subdivide_catmull_clark();
      this.prepareBuf()
      this.renderMeshLeft()
    })

    const simplifier = new SimplifyModifier()
    mod.add(this.params, 'melaxSim', 0.0, 1.0, 0.001).name('Right (three.js)')
    .onChange(v => {
      let g = new Geometry().fromBufferGeometry(
        this.internal.mesh3jsRightOrig.geometry
      )
      const prevc = g.vertices.length
      const count = Math.floor(g.vertices.length*v)
      g = simplifier.modify(g, count)
      g.computeVertexNormals()
      const nv = g.getAttribute('position').array.length
      console.log(`melaxSim: reduced from ${prevc} to ${nv/3}.`)

      // The following is ugly, and this is unfortunate. Because
      // the three.js's simplify modifier does not preserve color, tex info.
      const bufcolors = new Float32Array(nv)
      for (let i = 0; i < bufcolors.length; i += 3) {
        bufcolors[i+0] = 0
        bufcolors[i+1] = 0.5
        bufcolors[i+2] = 1
      }
      g.setAttribute('color', new BufferAttribute(bufcolors, 3))
      this.sceneRight.remove(this.internal.mesh3jsRightSim)
      this.internal.mesh3jsRightSim = new Mesh(g, new MeshPhongMaterial({
        vertexColors: VertexColors,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
        side: DoubleSide,
        flatShading: this.params.flatShading,
      }))
      this.sceneRight.remove(this.internal.meshRightWireframeHelper)
      this.sceneRight.remove(this.internal.meshRightNormalHelper)
      this.internal.meshRightWireframeHelper = new LineSegments(
        new WireframeGeometry(g),
        new LineBasicMaterial({color: 0x000000, linewidth: 1})
      )
      this.internal.meshRightNormalHelper = new VertexNormalsHelper(
        this.internal.mesh3jsRightSim, 0.03, 0xaa0000,
      )
      if (this.params.showWireframe) {
        this.sceneRight.add(this.internal.meshRightWireframeHelper)
      }
      if (this.params.showNormals) {
        this.sceneRight.add(this.internal.meshRightNormalHelper)
      }
      this.sceneRight.add(this.internal.mesh3jsRightSim)
    })
    mod.open()

    // just for the first load
    // fetch('./assets/cube_closed.obj')
    fetch('./assets/cube4.obj')
    // fetch('./assets/Face4.obj')
      .then(resp => resp.text())
      .then(data => this.loadMesh(data))
  }
  loadMesh(data) {
    if (this.internal.mesh3jsLeft !== null) {
      this.sceneLeft.remove(this.internal.mesh3jsLeft)
    }

    this.internal.mesh = new HalfedgeMesh(data)
    this.prepareBuf()
    this.renderMeshLeft()
    this.renderMeshRight()
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
    const radius = max.sub(min).norm()/2
    return [center, radius]
  }
  prepareBuf() {
    // prepare threejs buffer data
    const v = this.internal.mesh.vertices.length
    this.bufpos     = new Float32Array(v*3)
    this.bufuvs     = new Float32Array(v*3)
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

      // use vertex uv
      this.bufuvs[3*i+0] = v.uv.x
      this.bufuvs[3*i+1] = v.uv.y
      this.bufuvs[3*i+2] = 0

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

    let face_vert_offset = 3
    if(this.internal.mesh.isQuadMesh){
      face_vert_offset = 6 // 3x2 as two faces will be rendered
    }
    const idxs = new Uint32Array(this.internal.mesh.faces.length*face_vert_offset)
    this.internal.mesh.faces.forEach(f => {
      f.vertices((v, i) => {
        if(this.internal.mesh.isQuadMesh && i == 3){
          // this is a Face4 (i == 3 is fourth face vertex) - triangulate

          //0
          idxs[face_vert_offset * f.idx + i] = idxs[face_vert_offset * f.idx]
          //prev vertex (3rd) 2
          idxs[face_vert_offset * f.idx + (i+1)] = idxs[face_vert_offset * f.idx + (i-1)]
          //last vertex (4th) 3
          idxs[face_vert_offset * f.idx + (i+2)] = v.idx

        }else{
          // Face3
          idxs[face_vert_offset * f.idx + i] = v.idx
        }
      })
    })

    const idxs_lines = new Uint32Array(this.internal.mesh.edges.length*2)
    this.internal.mesh.edges.forEach(edge => {
      idxs_lines[2*edge.idx] = edge.getP1().idx;
      idxs_lines[2*edge.idx +1] = edge.getP2().idx;
    })

    const g_lines = new BufferGeometry()
    g_lines.setIndex(new BufferAttribute(idxs_lines, 1))
    g_lines.setAttribute('position', new BufferAttribute(this.bufpos, 3))

    const g = new BufferGeometry()
    g.setIndex(new BufferAttribute(idxs, 1))
    g.setAttribute('position', new BufferAttribute(this.bufpos, 3))
    g.setAttribute('uv', new BufferAttribute(this.bufuvs, 3))
    g.setAttribute('color', new BufferAttribute(this.bufcolors, 3))
    g.setAttribute('normal', new BufferAttribute(this.bufnormals, 3))

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
      // new WireframeGeometry(new BoxGeometry( 1.3, 1.3, 2 )),
      g_lines,
      // new WireframeGeometry(g),
      new LineBasicMaterial({color: 0xFF0000, linewidth: 9})
    )

    this.sceneLeft.add(this.internal.mesh3jsLeft)
    if (this.params.showNormals) {
      this.sceneLeft.add(this.internal.meshLeftNormalHelper)
    }
    if (this.params.showWireframe) {
      this.sceneLeft.add(this.internal.meshLeftWireframeHelper)
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

    const idxs = new Uint32Array(this.internal.mesh.faces.length*3)
    this.internal.mesh.faces.forEach(f => {
      f.vertices((v, i) => { idxs[3 * f.idx + i] = v.idx })
    })

    const g = new BufferGeometry()
    g.setIndex(new BufferAttribute(idxs, 1))
    g.setAttribute('position', new BufferAttribute(this.bufpos, 3)) // use uv as position
    g.setAttribute('uv', new BufferAttribute(this.bufuvs, 3))
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
    this.internal.mesh3jsRightSim = this.internal.mesh3jsRightOrig.clone()
    this.sceneRight.add(this.internal.mesh3jsRightSim)
    if (this.params.showNormals) {
      this.sceneRight.add(this.internal.meshRightNormalHelper)
    }
    if (this.params.showWireframe) {
      this.sceneRight.add(this.internal.meshRightWireframeHelper)
    }
  }
}
new Main().render()