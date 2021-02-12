/**
 * Copyright 2021 Changkun Ou <https://changkun.de>. All rights reserved.
 * Use of this source code is governed by a GNU GLPv3 license that can be
 * found in the LICENSE file.
 */

// API Usage about @penrose/linear-algebra:
//
//   - There are two types of matrices: SparseMatrix and DenseMatrix
//   - SparseMatrix.identity(n, n) gives you a identity matrix with
//     n x n dimension
//   - Triplet represents a small structure to hold non-zero entries in
//     SparseMatrix, each entry is (x, i, j). To construct a SparseMatrix,
//     here is an example:
//
//       let A = new Triplet(2, 2)          // Triplet for 2x2 SparseMatrix 
//       A.addEntry(1, 0, 0)                // A(0, 0) += 1
//       A.addEntry(2, 1, 1)                // A(1, 1) += 2
//       return SparseMatrix.fromTriplet(T) // Construct SparseMatrix
//
//   - A.lu() returns a sparse LU decomposition.
//   - A.solveSquare(b) solves linear equation Ax=b where A is a
//     LU decomposition, and b is a DenseMatrix, and x is the solution.
//   - For a DenseMatrix A, one can use A.set(x, i, j) for A(i,j)=x,
//     and A.get(i, j) returns A(i,j).
//
// Further APIs regarding @penrose/linear-algebra can be found
// in node_modules/@penrose/linear-algebra/docs/*.html, but the above
// information are all the APIs you need for this project.
import {
  SparseMatrix,
  DenseMatrix,
  Triplet,
} from '@penrose/linear-algebra'
import Vector from './vec'

class Halfedge {
  constructor() {
    this.vertex = null // Vertex
    this.edge   = null // Edge
    this.face   = null // Face

    this.prev = null   // Halfedge
    this.next = null   // Halfedge
    this.twin = null   // Halfedge
    this.idx  = -1     // Number

    this.onBoundary = false // Boolean
  }
  vector() {
    return this.next.vertex.position.sub(this.vertex.position)
  }
  cotan() {
    if (this.onBoundary) {
      return 0
    }
    const u = this.prev.vector()
    const v = this.next.vector().scale(-1)
    return u.dot(v) / u.cross(v).norm()
  }
  angle() {
    const u = this.prev.vector().unit()
    const v = this.next.vector().scale(-1).unit()
    return Math.acos(Math.max(-1, Math.min(1, u.dot(v))))
  }
}

class Edge {
  constructor() {
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
  }
}

class Face {
  constructor() {
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
  }
  // NOTE: you can add more methods if you need here
  vertices(fn) {
    let start = true
    let i = 0
    for (let h = this.halfedge; start || h != this.halfedge; h = h.next) {
      fn(h.vertex, i)
      start = false
      i++
    }
  }
  halfedges(fn) {
    let start = true
    let i = 0
    for (let h = this.halfedge; start || h != this.halfedge; h = h.next) {
      fn(h, i)
      start = false
      i++
    }
  }
  normal() {
    if (this.halfedge.onBoundary) {
      return new Vector(0, 0, 0)
    }
    const h = this.halfedge
    let a = h.vertex.position.sub(h.next.vertex.position)
    let b = h.prev.vertex.position.sub(h.vertex.position).scale(-1)
    return a.cross(b).unit()
  }
  area() {
    const h = this.halfedge
    if (h.onBoundary) {
      return 0
    }
    let a = h.vertex.position.sub(h.next.vertex.position)
    let b = h.prev.vertex.position.sub(h.vertex.position).scale(-1)
    return a.cross(b).norm() * 0.5
  }
}

class Vertex {
  constructor() {
    this.position = null // Vector
    this.uv       = null // Vector
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
  }
  normal(method='equal-weighted') {
    let n = new Vector()
    switch (method) {
    case 'equal-weighted':
      this.faces(f => { n = n.add(f.normal()) })
      return n.unit()

    case 'area-weighted':
      this.faces(f => { n = n.add(f.normal().scale(f.area())) })
      return n.unit()

    case 'angle-weighted':
      this.halfedges(h => {
        n = n.add(h.face.normal().scale(h.next.angle()))
      })
      return n.unit()

    default: // undefined
      return n
    }
  }
  faces(fn) {
    let start = true
    let i = 0
    for (let h = this.halfedge; start || h != this.halfedge; h = h.twin.next) {
      if(h.onBoundary) {
        continue
      }
      fn(h.face, i)
      start = false
      i++
    }
  }
  halfedges(fn) {
    let start = true
    let i = 0
    for (let h = this.halfedge; start || h != this.halfedge; h = h.twin.next) {
      fn(h, i)
      start = false
      i++
    }
  }
  vertices(fn) {
    this.halfedges((h, i) => {
      fn(h.next.vertex, i)
    })
  }
}

export class HalfedgeMesh {
  /**
   * constructor constructs the halfedge-based mesh representation.
   *
   * @param {string} data is a text string from an .obj file
   */
  constructor(data) {
    // properties we plan to cache
    this.vertices  = [] // an array of Vertex object
    this.edges     = [] // an array of Edge object
    this.faces     = [] // an array of Face object
    this.halfedges = [] // an array of Halfedge object
    this.boundaries= [] // an array of boundary loops

    // read .obj format and construct its halfedge representation

    // load .obj file
    let indices   = []
    let positions = []
    let uvindices = []
    let uvs = []
    let lines = data.split('\n')
    for (let line of lines) {
      line = line.trim()
      const tokens = line.split(' ')
      switch(tokens[0].trim()) {
      case 'v':
        positions.push(new Vector(
          parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]),
        ))
        continue
      case 'vt':
        uvs.push(new Vector(
          parseFloat(tokens[1]), parseFloat(tokens[2]), 0,
        ))
        continue
      case 'f':
        // only load indices of vertices
        for (let i = 1; i < tokens.length; i++) {
          indices.push(parseInt((tokens[i].split('/')[0]).trim()) - 1)
          uvindices.push(parseInt((tokens[i].split('/')[1]).trim()) - 1)
        }
        continue
      }
    }

    // build the halfedge connectivity
    const edges = new Map()
    for (let i = 0; i < indices.length; i += 3) {
      for (let j = 0; j < 3; j++) { // check a face
        const a = indices[i + j]
        const b = indices[i + (j+1)%3]

        if (a > b) {
          const tmp = b
          b = a
          a = tmp
        }

        // store the edge if not exists
        const e = `${a}-${b}`
        if (!edges.has(e)) {
          edges.set(e, [a, b])
        }
      }
    }

    this.vertices   = new Array(positions.length)
    this.edges      = new Array(edges.size)
    this.faces      = new Array(indices.length / 3)
    this.halfedges  = new Array(edges.size*2)

    const idx2vert = new Map()
    for (let i = 0; i < positions.length; i++) {
      const v = new Vertex()
      v.position = positions[i]
      this.vertices[i] = v
      idx2vert.set(i, v)
    }

    let eidx = 0
    let existedHe = new Map()
    let hasTwin = new Map()

    // construct halfedges, edges
    for (let i = 0; i < indices.length; i += 3) {
      // construct face
      const f = new Face()
      this.faces[i / 3] = f

      // construct halfedges of the face
      for (let j = 0; j < 3; j++) {
        const he = new Halfedge()
        this.halfedges[i+j] = he
      }

      // construct connectivities of the new halfedges
      for (let j = 0; j < 3; j++) {

        // halfedge from vertex a to vertex b
        const a = indices[i + j]
        const b = indices[i + (j+1)%3]

        // halfedge properties
        const he = this.halfedges[i + j]
        he.next = this.halfedges[i + (j+1)%3]
        he.prev = this.halfedges[i + (j+2)%3]
        he.onBoundary = false
        hasTwin.set(he, false)

        const v = idx2vert.get(a)
        v.uv = uvs[uvindices[i+j]] // assign uv

        he.vertex = v
        v.halfedge = he

        he.face = f
        f.halfedge = he

        // swap if index a > b, for twin checking
        if (a > b) {
          const tmp = b
          b = a
          a = tmp
        }
        const ek = `${a}-${b}`
        if (existedHe.has(ek)) {
          // if a halfedge has been created before, then
          // it is the twin halfedge of the current halfedge
          const twin = existedHe.get(ek)
          he.twin = twin
          twin.twin = he
          he.edge = twin.edge

          hasTwin.set(he, true)
          hasTwin.set(twin, true)
        } else {
          // new halfedge
          const e = new Edge()
          this.edges[eidx] = e
          eidx++
          he.edge = e
          e.halfedge = he

          existedHe.set(ek, he)
        }

        // FIXME: non-manifold edge count checking
      }
    }

    // create boundary halfedges and hidden faces for the boundary
    let hidx = indices.length
    for (let i = 0; i < indices.length; i++) {
      const he = this.halfedges[i]
      if (hasTwin.get(he)) {
        continue
      }

      // handle halfedge that has no twin
      const f = new Face() // hidden face
      this.boundaries.push(f)

      let bcycle = []      // boundary cycle
      let current = he
      do {
        const bhe = new Halfedge() // boundary halfedge
        this.halfedges[hidx] = bhe
        hidx++
        bcycle.push(bhe)

        // grab the next halfedge along the boundary that does not
        // have a twin halfedge
        let next = current.next
        while (hasTwin.get(next)) {
          next = next.twin.next
        }

        // set the current halfedge's attributes
        bhe.vertex = next.vertex
        bhe.edge = current.edge
        bhe.onBoundary = true

        // point the new halfedge and face to each other
        bhe.face = f
        f.halfedge = bhe

        // point the new halfedge and twin to each other
        bhe.twin = current
        current.twin = bhe

        current = next
      } while(current != he)

      // link the cycle of boundary halfedges together
      const n = bcycle.length
      for (let j = 0; j < n; j++) {
        bcycle[j].next = bcycle[(j+n-1)%n]
        bcycle[j].prev = bcycle[(j+1)%n]
        hasTwin.set(bcycle[j], true)
        hasTwin.set(bcycle[j].twin, true)
      }
    }

    // reset indices
    let index = 0
    this.vertices.forEach(v => { v.idx = index++ })
    index = 0
    this.edges.forEach(e => { e.idx = index++ })
    index = 0
    this.faces.forEach(f => { f.idx = index++ })
    index = 0
    this.halfedges.forEach(h => { h.idx = index++ })
    index = 0
    this.boundaries.forEach(b => { b.idx = index++ })
  }
  laplaceMatrix() {
    const n = this.vertices.length
    let T = new Triplet(n, n)
    for (const vert of this.vertices) {
      const i = vert.idx
      let sum = 1e-8
      vert.halfedges(h => {
        sum += 1 // uniform laplace
        T.addEntry(-w, i, h.twin.vertex.idx)
      })
      T.addEntry(sum, i, i)
    }
    return SparseMatrix.fromTriplet(T)
  }
  /**
   * flatten computes the UV coordinates of the given triangle mesh.
   *
   * This implementation reuiqres the mesh contains at least one
   * boundary loop.
   *
   * @param {string} boundaryType 'disk', or 'rect'
   * @param {string} laplaceWeight 'uniform', or 'cotan'
   */
  flatten(boundaryType, laplaceWeight) {
    // 1. check if the mesh contains a boundary
    if (this.boundaries.length === 0) {
      const msg = "failed: imported mesh has no boundary"
      alert(msg)
      return
    }

    // 2. compute boundary uv coordinates depending on the boundary type
    let U = DenseMatrix.zeros(this.vertices.length)
    let V = DenseMatrix.zeros(this.vertices.length)
    const r = 0.5                // disk radius
    const l = 1                  // rect edge length
    let N = 0                    // number of boundary edges
    const f = this.boundaries[0] // use the first boundary face
    f.halfedges(() => N++)
    switch (boundaryType) {
    case 'disk':
      f.halfedges((h, i) => {
        U.set(r*Math.cos(2*Math.PI*i/N), h.vertex.idx)
        V.set(r*Math.sin(2*Math.PI*i/N), h.vertex.idx)
      })
      break
    case 'rect':
      let totalL = 0
      let boundaryIdx = 0
      let k = 0
      f.halfedges(h => {
        let x = 0
        let y = 0
        const elen = 4*l*k/N
        const sign = Math.pow(-1, Math.floor(boundaryIdx/2))
        if (totalL < l) {
          if (boundaryIdx % 2 === 0) {
            x = sign*(l/2-elen)
            y = sign*(l/2)
          } else {
            x = sign*(-l/2)
            y = sign*(l/2-elen)
          }
          totalL += 4*l/N
          k++
        } else {
          if (boundaryIdx % 2 === 0) {
            x = sign*-l/2
            y = sign*l/2
          } else {
            x = sign*-l/2
            y = sign*-l/2
          }
          totalL -= l
          k = 0
          boundaryIdx++
        }
        U.set(x, h.vertex.idx)
        V.set(y, h.vertex.idx)
      })
      break
    default: // undefined
      throw new Error('unsupported boundary type')
    }

    // 3. compute matrix depending on the laplacian weight type
    let T = new Triplet(this.vertices.length, this.vertices.length)
    switch (laplaceWeight) {
    case 'uniform':
      for (const v of this.vertices) {
        const i = v.idx
        if (U.get(i) != 0 || V.get(i) != 0) {
          T.addEntry(1, i, i)
        } else {
          let n = 0
          v.vertices(neighbor => {
            const j = neighbor.idx
            T.addEntry(1, i, j)
            n += 1
          })
          T.addEntry(-n, i, i)
        }
      }
      break
    case 'cotan':
      for (const v of this.vertices) {
        const i = v.idx
        if (U.get(i) != 0 || V.get(i) != 0) {
          T.addEntry(1, i, i)
        } else {
          let area = 0
          v.halfedges(h => {
            const a = h.prev.vector().norm()
            const b = h.vector().norm()
            area += (a*a*h.prev.cotan() + b*b*h.cotan()) / 8
          })

          let sum = 0
          v.halfedges(h => {
            const j = h.next.vertex.idx
            const w = (h.cotan() + h.twin.cotan())/(2*area)
            T.addEntry(w, i, j)
            sum += w
          })
          T.addEntry(-sum, i, i)
        }
      }
      break
    default:
      throw new Error('unsupported laplace weight type')
    }

    // 4. solve linear equation and assing computed uv as vertex uv
    const lu = SparseMatrix.fromTriplet(T).lu()
    const uu = lu.solveSquare(U)
    const vv = lu.solveSquare(V)
    for (let v of this.vertices) {
      v.uv = new Vector((uu.get(v.idx) + 0.5), (0.5+vv.get(v.idx)), 0)
    }
  }
}
