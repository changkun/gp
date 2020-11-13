/**
 * Copyright 2020 Changkun Ou <htps://changkun.de>. All rights reserved.
 * Use of this source code is governed by a GNU GLPv3 license that can be
 * found in the LICENSE file.
 */

import Vector from './vec'
import Matrix from './mat'

/**
 * Vertex represents a 3D vertex that contains coordinates regarding
 * uv, normal and position.
 */
class Vertex {
  constructor() {
    this.uv = null
    this.normal = null
    this.position = null
  }
}

/**
 * Triangle is a triangle representation that consists of an array of
 * vertices.
 */
class Triangle {
  constructor() {
    this.vertices = []
  }
}

/**
 * TriMesh represents a triangulated mesh.
 */
class TriMesh {
  constructor() {
    this.triangles = []
  }
}

/**
 * Rasterizer implements a CPU rasterization rendering pipeline.
 */
export default class Rasterizer {
  /**
   * constructor creates all properties of a Rasterizer.
   *
   * @param {Object} params contains an object with the scene parameters.
   * @return {Rasterizer} this
   */
  constructor(params) {
    this.screen = params.screen
    this.camera = {
      position: new Vector(-550, 194, 734, 1),
      fov: 45, aspect: this.screen.width/this.screen.height,
      near: 100, far: 600,
      lookAt: new Vector(-1000, 0, 0, 1),
      up: new Vector(0, 1, 1, 0),
    }
    this.light = {
      color: 0xffffff,
      Kamb: 0.5, // ambient
      Kdiff: 0.6, // diffuse
      Kspec: 1, // specular
      position: new Vector(-200, 250, 600, 1),
    }
    this.model = {
      url: params.model.geometry,
      mesh: null, // mesh is the loaded obj mesh model
      // The texture color is an array of numbers that aligned as
      // [r, g, b, a, r, g, b, a, ...] with size (width x height x 4).
      // r, g, b, a represents red, green, blue and alpha channel values.
      // You only need r, g, b values in this assignment.
      texture: {
        data: params.model.texture.data,
        width: params.model.texture.width,
        height: params.model.texture.height,
        shininess: params.model.texture.shininess,
      },
      scale: new Vector(1500, 1500, 1500, 0),
      position: new Vector(-700, -5, 350, 1),
    }

    // Buffers that is used in the rasterizer.
    //
    // The frameBuf must be an array of RGB colors, where a color is an
    // array of three numbers (r, g, b), and RGB values is from 0 to 255.
    // For instance: this.frameBuf = [[0, 0, 0], [255, 255, 255], ...]
    // where ... means unlisted elements.
    //
    // The depthBuf must be an array of numbers, which are z values.
    // For instance: this.depthBuf = [-0.6, -0.1, 0.5, ...]
    // where ... means unlisted elements.
    this.frameBuf = new Array(this.screen.width * this.screen.height)
    this.depthBuf = new Array(this.screen.width * this.screen.height)

    // transformation matrices
    //
    // Tmodel is a model transformation Matrix.
    // Tcamera is a view transformation Matrix.
    // Tpersp is a perspective transformation Matrix.
    // Tviewport is a viewport transformation Matrix.
    this.Tmodel = null
    this.Tcamera = null
    this.Tpersp = null
    this.Tviewport = null
    this.Tmvpv = null
    return this
  }
  /**
   * initBuffers initializes this.frameBuf and this.depthBuf.
   */
  initBuffers() {
    // buffer initialization
    for (let i = 0; i < this.screen.width*this.screen.height; i++) {
      this.frameBuf[i] = [0 /* r */, 0 /* g */, /* b */ 0]
      this.depthBuf[i] = -Infinity
    }
  }
  /**
   * initTransformation initializes all transformation matrices,
   * including this.Tmodel, this.Tcamera, this.Tpersp, and this.Tviewport
   */
  initTransformation() {
    // prepare transformation matrices
    const Tscale = new Matrix(
      this.model.scale.x, 0, 0, 0,
      0, this.model.scale.y, 0, 0,
      0, 0, this.model.scale.z, 0,
      0, 0, 0, 1,
    )
    const Ttrans = new Matrix(
      1, 0, 0, this.model.position.x,
      0, 1, 0, this.model.position.y,
      0, 0, 1, this.model.position.z,
      0, 0, 0, 1,
    )
    this.Tmodel = Ttrans.mul(Tscale)

    const w = this.camera.lookAt.sub(this.camera.position).unit()
    const u = w.cross(this.camera.up).unit()
    const v = u.cross(w).unit()
    const Rview = new Matrix(
      u.x, u.y, u.z, 0,
      v.x, v.y, v.z, 0,
      -w.x, -w.y, -w.z, 0,
      0, 0, 0, 1,
    )
    const Tview = new Matrix(
      1, 0, 0, -this.camera.position.x,
      0, 1, 0, -this.camera.position.y,
      0, 0, 1, -this.camera.position.z,
      0, 0, 0, 1,
    )
    this.Tcamera = Rview.mul(Tview)

    const aspect = this.camera.aspect
    const fov = this.camera.fov
    const near = this.camera.near
    const far = this.camera.far
    this.Tpersp = new Matrix(
      -1/(aspect * Math.tan(fov*Math.PI/360)), 0, 0, 0,
      0, -1/(Math.tan(fov*Math.PI/360)), 0, 0,
      0, 0, (near+far)/(near-far), 2*near*far/(near-far),
      0, 0, 1, 0,
    )

    this.Tviewport = new Matrix(
      this.screen.width/2, 0, 0, this.screen.width/2,
      0, this.screen.height/2, 0, this.screen.height/2,
      0, 0, 1, 0,
      0, 0, 0, 1,
    )

    this.Tmvpv = this.Tviewport.mul(this.Tpersp).mul(this.Tcamera).mul(this.Tmodel)

    // Normal matrix is calculated here for performance optimization.
    // Note that normal matrix can also be ((Tcamera * Tmodel)^(-1))^T
    // Here we use ((Tmodel)^(-1))^T to save some computation of camera
    // transforamtion in the shading process.
    this.normalMatrix = this.Tmodel.inv().transpose()
  }

  /**
   * loadMesh loads a mesh from an .obj file.
   * @returns {TriMesh} a triangle mesh
   */
  async loadMesh() {
    const resp = await fetch(this.model.url)
    let lines = await resp.text()
    let m = new TriMesh()

    // an obj loader
    let positions = []
    let uvs       = []
    let normals   = []
    lines = lines.split('\n')
    for (let line of lines) {
      line = line.trim()
      const tokens = line.split(' ')
      switch(tokens[0].trim()) {
      case 'v':
        positions.push(new Vector(
          parseFloat(tokens[1]),
          parseFloat(tokens[2]),
          parseFloat(tokens[3]),
          1,
        ))
        continue
      case 'vt':
        uvs.push(new Vector(
          parseFloat(tokens[1]),
          parseFloat(tokens[2]),
          0, 1,
        ))
        continue
      case 'vn':
        normals.push(new Vector(
          parseFloat(tokens[1]),
          parseFloat(tokens[2]),
          parseFloat(tokens[3]),
          0,
        ))
        continue
      case 'f':
        let tri = new Triangle()
        for (let i = 1; i < tokens.length; i++) {
          const vidx = tokens[i].split('/')[0].trim()-1
          const uvidx = tokens[i].split('/')[1].trim()-1
          const nidx = tokens[i].split('/')[2].trim()-1
          let v = new Vertex()
          v.position = positions[vidx]
          v.uv = uvs[uvidx]
          v.normal = normals[nidx]
          tri.vertices.push(v)
        }
        m.triangles.push(tri)
        continue
      }
    }

    this.model.mesh = m
  }
  /**
   * render implements a rasterization rendering pipeline.
   * Evetually, this methods stored all computed color in the frame buffer.
   */
  async render() {
    await this.loadMesh()

    // initialization, and vertex generation, etc.
    this.initBuffers()
    this.initTransformation()

    for (let i = 0; i < this.model.mesh.triangles.length; i++) {
      const tri = this.model.mesh.triangles[i]

      // vertex generation
      const a = tri.vertices[0].position
      const b = tri.vertices[1].position
      const c = tri.vertices[2].position

      // uv generation
      const UVa = tri.vertices[0].uv
      const UVb = tri.vertices[1].uv
      const UVc = tri.vertices[2].uv

      // normal generation
      const Na = tri.vertices[0].normal
      const Nb = tri.vertices[1].normal
      const Nc = tri.vertices[2].normal

      // rasterizing the triangle
      this.draw([a, b, c], [UVa, UVb, UVc], [Na, Nb, Nc])
    }
  }
  /**
  * computeBarycentric implements barycentric coordinates
  *
  * @param {number} x is the x coordinate of the fragment
  * @param {number} y is the y coordinate of the fragment
  * @param {Array.<Vector>} vs is an Array of Vector vertices.
  * @return {Vector} a Vector that represents corresponding barycentric
  * coordinates. For instance, if the computed barycentric coordinates
  * is (0.1, 0.3, 0.6) then the return value is a vector (0.1, 0.3, 0.6, 0)
  */
  computeBarycentric(x, y, vs) {
    // compute barycentric coordinates
    const ap = new Vector(x, y, 0, 1).sub(new Vector(vs[0].x, vs[0].y, 0, 1))
    const ab = new Vector(vs[1].x, vs[1].y, 0, 1).sub(new Vector(vs[0].x, vs[0].y, 0, 1))
    const ac = new Vector(vs[2].x, vs[2].y, 0, 1).sub(new Vector(vs[0].x, vs[0].y, 0, 1))
    const bc = new Vector(vs[2].x, vs[2].y, 0, 1).sub(new Vector(vs[1].x, vs[1].y, 0, 1))
    const bp = new Vector(x, y, 0, 1).sub(new Vector(vs[1].x, vs[1].y, 0, 1))
    const out = new Vector(0, 0, -1, 0)
    const Sabc = ab.cross(ac).dot(out)
    const Sabp = ab.cross(ap).dot(out)
    const Sapc = ap.cross(ac).dot(out)
    const Sbcp = bc.cross(bp).dot(out)
    return new Vector(Sbcp / Sabc, Sapc / Sabc, Sabp / Sabc, 0)
  }
  /**
   * draw implements the rendering pipeline for a triangle with
   * vertex shader and fragment shader support.
   *
   * @param {Array.<Vector>} tri is an Array of Vector vertices
   * @param {Array.<Vector>} uvs is an Array of Vector UVs
   * @param {Array.<Vector>} normals is an Array of Vector normals
   */
  draw(tri, uvs, normals) {
    // implement a rendering pipeline.

    // vertex processing: the vertex shader must return a new allocated vertex
    // processing the original triangle is wrong becuase normal interpolation
    // needs the camera space vertex coordinates.
    const t = new Array(tri.length)
    tri.forEach((v, idx) => {
      t[idx] = this.vertexShader(v)
    })

    // backface culling: no points if one implemented, this is an optimization
    // no need to compute unit and save some calculation
    const fN = t[1].sub(t[0]).cross(t[2].sub(t[0]))
    if (new Vector(0, 0, -1, 0).dot(fN) >= 0) {
      return
    }

    // view frustum culling: compute AABB based on the processed vertices
    // the view frustum culling is the only culling approach can get points
    // because part of the bunny is outside the viewfrustum.
    const xMax = Math.min(Math.max(t[0].x, t[1].x, t[2].x), this.screen.width)
    const xMin = Math.max(Math.min(t[0].x, t[1].x, t[2].x), 0)
    const yMax = Math.min(Math.max(t[0].y, t[1].y, t[2].y), this.screen.height)
    const yMin = Math.max(Math.min(t[0].y, t[1].y, t[2].y), 0)
    if (xMin > xMax && yMin > yMax) { // no extra computation is needed
      return
    }

    // compute normals and shading point in world space for fragment shading
    normals[0] = this.normalMatrix.mulvec(normals[0])
    normals[1] = this.normalMatrix.mulvec(normals[1])
    normals[2] = this.normalMatrix.mulvec(normals[2])
    const a = this.Tmodel.mulvec(tri[0])
    const b = this.Tmodel.mulvec(tri[1])
    const c = this.Tmodel.mulvec(tri[2])

    for (let i = Math.floor(xMin); i < xMax; i++) {
      for (let j = Math.floor(yMin); j < yMax; j++) {
        // barycentric interpolation
        const w = this.computeBarycentric(i, j, t)
        // inside triangle test
        if (w.x < 0 || w.y < 0 || w.z < 0) {
          continue
        }

        // depth test
        const z = w.x * t[0].z + w.y * t[1].z + w.z * t[2].z
        if (z < this.depthBuf[j * this.screen.width + i]) {
          continue
        }

        // uv interpolation
        const uvx = w.x*uvs[0].x + w.y*uvs[1].x + w.z*uvs[2].x
        const uvy = w.x*uvs[0].y + w.y*uvs[1].y + w.z*uvs[2].y
        const uv = new Vector(uvx, uvy, 0, 1)

        // fragment position interpolation
        const px = w.x*a.x + w.y*b.x + w.z*c.x
        const py = w.x*a.y + w.y*b.y + w.z*c.y
        const pz = w.x*a.z + w.y*b.z + w.z*c.z
        const p = new Vector(px, py, pz, 1)

        // normal interpolation
        const nx = w.x*normals[0].x + w.y*normals[1].x + w.z*normals[2].x
        const ny = w.x*normals[0].y + w.y*normals[1].y + w.z*normals[2].y
        const nz = w.x*normals[0].z + w.y*normals[1].z + w.z*normals[2].z
        const normal = new Vector(nx, ny, nz, 0).unit()

        // Update depth buffer and invoke fragment shader for
        // shading then update frame buffer using the processed color
        this.depthBuf[j*this.screen.width + i] = z
        this.frameBuf[j*this.screen.width + i] = this.fragmentShader(uv, normal, p)
      }
    }
  }
  /**
   * vertexShader is a shader that consumes a vertex then returns a vertex.
   *
   * @param {Vector} vertex is an input vertex to the vertexShader
   * @return {Vector} a transformed new vertex
   */
  vertexShader(vertex) {
    // transforms vertex from model space to projection space
    let p = new Vector(vertex.x, vertex.y, vertex.z, 1)
    p = this.Tmvpv.mulvec(p)
    p.x /= p.w
    p.y /= p.w
    p.z /= p.w
    p.w = 1
    return p
  }
  /**
   * fragmentShader is a shader that implements texture mapping and
   * the Blinn-Phong reflectance model.
   * @param {Vector} uv the UV values of this fragment
   * @param {Vector} normal the surface normal of this fragment
   * @param {Vector} x is the coordinates of the shading point
   * @return {Array.<number>} an array of three numbers that represents
   * rgb color, e.g. [128, 128, 128] as gray color.
   */
  fragmentShader(uv, normal, x) {
    // texture mapping and Blinn-Phong model in Phong shading frequency

    // fetch color from texture
    const width = this.model.texture.width
    const height = this.model.texture.height
    const idx = width * (height - Math.floor(uv.y * height)) +
                Math.floor(uv.x * width)
    let I = new Vector(
      this.model.texture.data[4*idx+0],
      this.model.texture.data[4*idx+1],
      this.model.texture.data[4*idx+2],
      this.model.texture.data[4*idx+3],
    )

    // compute the blinn-phong
    const L = this.light.position.sub(x).unit()
    const V = this.camera.position.sub(x).unit()
    const H = L.add(V).unit()
    const clamp = (v) => {
      const x = Math.min(Math.max(v.x, 0), 255)
      const y = Math.min(Math.max(v.y, 0), 255)
      const z = Math.min(Math.max(v.z, 0), 255)
      const w = Math.min(Math.max(v.w, 0), 255)
      return new Vector(x, y, z, w)
    }
    const p = this.model.texture.shininess
    const blinnPhong = this.light.Kamb + this.light.Kdiff*normal.dot(L)
    + this.light.Kspec*Math.pow(normal.dot(H), p)
    const color = clamp(I.mul(blinnPhong))
    return [color.x, color.y, color.z] // no blinn-phong
  }
}

