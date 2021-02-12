/**
 * Copyright 2021 Changkun Ou <https://changkun.de>. All rights reserved.
 * Use of this source code is governed by a GNU GLPv3 license that can be
 * found in the LICENSE file.
 */

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
  DataTexture,
  RGBFormat,
  RepeatWrapping,
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
      mesh3js: null,  // three.js buffer geometry object for mesh
      uv3js: null,    // three.js buffer geometry object for UV map
      meshNormalHelper: null,
      meshWireframeHelper: null,
      uvWireframeHelper: null,
    }
    this.params = {
      import: () => this.input.click(),
      export: () => this.exportScreenshot(),
      showNormals: false,
      showWireframe: false,
      flatShading: false,
      showTexture: true,

      normalMethod: 'equal-weighted',
      laplaceWeight: 'uniform',
      boundaryType: 'disk',
      computeUVs: () => this.computeUVs(),
    }

    this.gui = new GUI()
    const io = this.gui.addFolder('I/O')
    io.add(this.params, 'import').name('import mesh')
    io.add(this.params, 'export').name('export screenshot')

    const vis = this.gui.addFolder('Visualization')
    vis.add(this.params, 'showNormals').name('show normals').listen()
    .onChange(show => {
      if (show) {
        this.sceneMesh.add(this.internal.meshNormalHelper)
      } else {
        this.sceneMesh.remove(this.internal.meshNormalHelper)
      }
    })
    vis.add(this.params, 'normalMethod', [
      'equal-weighted', 'area-weighted', 'angle-weighted',
    ]).onChange(() => this.updateNormals())
    vis.add(this.params, 'showWireframe').name('show wireframe').listen()
    .onChange(show => {
      if (show) {
        this.sceneMesh.add(this.internal.meshWireframeHelper)
        this.sceneUV.add(this.internal.uvWireframeHelper)
      } else {
        this.sceneMesh.remove(this.internal.meshWireframeHelper)
        this.sceneUV.remove(this.internal.uvWireframeHelper)
      }
    })
    vis.add(this.params, 'flatShading').name('flat shading').listen()
    .onChange(flat => {
      this.internal.mesh3js.material.flatShading = flat
      this.internal.uv3js.material.flatShading = flat
      this.internal.mesh3js.material.needsUpdate = true
      this.internal.uv3js.material.needsUpdate = true
    })
    vis.add(this.params, 'showTexture').name('texture').listen()
    .onChange(showTex => {
      if (showTex) {
        this.internal.mesh3js.material.map = this.checkboardTexture()
        this.internal.uv3js.material.map = this.checkboardTexture()
      } else {
        this.internal.mesh3js.material.map = null
        this.internal.uv3js.material.map = null
      }
      this.internal.mesh3js.material.needsUpdate = true
      this.internal.uv3js.material.needsUpdate = true
    })
    vis.open()

    const param = this.gui.addFolder('Parameterization')
    param.add(this.params, 'laplaceWeight', [
      'uniform', 'cotan',
    ]).name('Laplace matrix')
    param.add(this.params, 'boundaryType', [
      'disk', 'rect',
    ]).name('Boundary Type')
    param.add(this.params, 'computeUVs').name('Compute UV')
    param.open()

    // just for the first load
    fetch('./assets/bunny_tri.obj')
      .then(resp => resp.text())
      .then(data => this.loadMesh(data))
  }
  loadMesh(data) {
    if (this.internal.mesh3js !== null) {
      this.sceneMesh.remove(this.internal.mesh3js)
    }

    this.internal.mesh = new HalfedgeMesh(data)
    this.prepareBuf()
    this.renderMesh()
    this.renderUV()
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
    this.internal.meshNormalHelper.update()
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
  computeUVs() {
    console.log('want compute UVs')
    console.log(this.params.boundaryType, this.params.laplaceWeight)

    this.internal.mesh.flatten(
      this.params.boundaryType,
      this.params.laplaceWeight,
    )

    // update everything
    this.prepareBuf()
    this.renderMesh()
    this.renderUV()
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
  renderMesh() {
    // clear old instances
    if (this.internal.meshNormalHelper !== null) {
      this.sceneMesh.remove(this.internal.meshNormalHelper)
    }
    if (this.internal.meshWireframeHelper !== null) {
      this.sceneMesh.remove(this.internal.meshWireframeHelper)
    }
    if (this.internal.mesh3js !== null) {
      this.sceneMesh.remove(this.internal.mesh3js)
    }

    const idxs = new Uint32Array(this.internal.mesh.faces.length*3)
    this.internal.mesh.faces.forEach(f => {
      f.vertices((v, i) => { idxs[3 * f.idx + i] = v.idx })
    })

    const g = new BufferGeometry()
    g.setIndex(new BufferAttribute(idxs, 1))
    g.setAttribute('position', new BufferAttribute(this.bufpos, 3))
    g.setAttribute('uv', new BufferAttribute(this.bufuvs, 3))
    g.setAttribute('color', new BufferAttribute(this.bufcolors, 3))
    g.setAttribute('normal', new BufferAttribute(this.bufnormals, 3))

    this.internal.mesh3js = new Mesh(g, new MeshPhongMaterial({
      vertexColors: VertexColors,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      side: DoubleSide,
    }))
    this.internal.mesh3js.material.map = this.checkboardTexture()

    this.internal.meshNormalHelper = new VertexNormalsHelper(
      this.internal.mesh3js, 0.03, 0xaa0000,
    )
    this.internal.meshWireframeHelper = new LineSegments(
      new WireframeGeometry(g),
      new LineBasicMaterial({color: 0x000000, linewidth: 1})
    )

    this.sceneMesh.add(this.internal.mesh3js)
    if (this.params.showNormals) {
      this.sceneMesh.add(this.internal.meshNormalHelper)
    }
    if (this.params.showWireframe) {
      this.sceneMesh.add(this.internal.meshWireframeHelper)
    }
  }
  renderUV() {
    // clear old instances
    if (this.internal.uvWireframeHelper !== null) {
      this.sceneUV.remove(this.internal.uvWireframeHelper)
    }
    if (this.internal.uv3js !== null) {
      this.sceneUV.remove(this.internal.uv3js)
    }

    const idxs = new Uint32Array(this.internal.mesh.faces.length*3)
    this.internal.mesh.faces.forEach(f => {
      f.vertices((v, i) => { idxs[3 * f.idx + i] = v.idx })
    })

    const g = new BufferGeometry()
    g.setIndex(new BufferAttribute(idxs, 1))
    g.setAttribute('position', new BufferAttribute(this.bufuvs, 3)) // use uv as position
    g.setAttribute('uv', new BufferAttribute(this.bufuvs, 3))
    g.setAttribute('color', new BufferAttribute(this.bufcolors, 3))
    g.setAttribute('normal', new BufferAttribute(this.bufnormals, 3))

    this.internal.uv3js = new Mesh(g, new MeshPhongMaterial({
      vertexColors: VertexColors,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      side: DoubleSide,
    }))
    this.internal.uv3js.material.map = this.checkboardTexture()
    this.internal.uvWireframeHelper = new LineSegments(
      new WireframeGeometry(g),
      new LineBasicMaterial({color: 0x000000, linewidth: 1})
    )
    this.sceneUV.add(this.internal.uv3js)
    if (this.params.showWireframe) {
      this.sceneUV.add(this.internal.uvWireframeHelper)
    }
  }
  checkboardTexture() {
    const h = 100
    const w = 100
    let data = new Uint8Array(h * w * 3)
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        let c = (((i & 0x8) === 0) ^ ((j & 0x8) === 0)) * 255
        if (c === 0) {
          c = 155
        }
        data[3*(w*i+j)+0] = c
        data[3*(w*i+j)+1] = c
        data[3*(w*i+j)+2] = c
      }
    }
    const tex = new DataTexture(data, h, w, RGBFormat)
    tex.wrapS = RepeatWrapping
    tex.wrapT = RepeatWrapping
    tex.generateMipmaps = true
    tex.needsUpdate = true
    return tex
  }
}
new Main().render()
