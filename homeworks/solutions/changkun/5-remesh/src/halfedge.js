/**
 * Copyright 2021 Changkun Ou <https://changkun.de>. All rights reserved.
 * Use of this source code is governed by a GNU GLPv3 license that can be
 * found in the LICENSE file.
 */

import Vector from './vec'
import Matrix from './mat'
import PriorityQueue from './pq'

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
    this.halfedge = null   // Halfedge
    this.idx      = -1     // Number
    this.errorCache = null // Number
    this.removed = false   // Boolean
  }
  /**
   * error returns the edge error of the given edge
   * @returns {Number}
   */
  error() {
    if (this.errorCache != null) {
      return this.errorCache
    }

    // We do not work on boundary edges, set their error to infinity, so
    // that the priority queue will never pop these edges.
    //
    // This is preferred. Boundary of a mesh are considered as features,
    // except the faulty noisy meshes. If that happens, we need clean up
    // the mesh first.
    if (this.halfedge.onBoundary || this.halfedge.twin.onBoundary) {
      this.errorCache = 1e9
      return this.errorCache
    }

    const q = this.quadric()
    const v = this.bestVertex()
    this.errorCache = this.quadricError(q, v)
    return this.errorCache
  }
  /**
   * bestVertex returns the optimal vertex that can replaces the connecting vertices
   * of the given edge.
   * @returns {Vector}
   */
  bestVertex() {
    const q = this.quadric()
    const dd = Math.abs(q.det())
    if (dd > 1e-3) {
      const qq = new Matrix(
        q.x00, q.x01, q.x02, q.x03,
        q.x10, q.x11, q.x12, q.x13,
        q.x20, q.x21, q.x22, q.x23,
        0, 0, 0, 1
      ).inv()
      const v = new Vector(qq.x03, qq.x13, qq.x23)
      if (v.x !== NaN && v.y !== NaN && v.z != NaN) {
        return v
      }
    }

    // Ill-posed quadric equation, just search best vertex on the edge.
    const n = 16
    const a = this.halfedge.vertex.position
    const b = this.halfedge.next.vertex.position
    const d = b.sub(a)
    let beste = -1.0
    let bestv = new Vector()
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const v = a.add(d.scale(t))
      const e = this.quadricError(q, v)
      if (beste < 0 || e < beste) {
        beste = e
        bestv = v
      }
    }
    return bestv
  }
  /**
   * quadric computes and returns the quadric matrix of the given edge
   * @returns {Matrix}
   */
  quadric() {
    const v1q = this.halfedge.vertex.quadric()
    const v2q = this.halfedge.twin.vertex.quadric()
    return v1q.add(v2q) 
  }
  /**
   * quadricError computes and returns the quadric error v^T q v.
   * @param {Matrix} q a 4x4 quadric matrix
   * @param {Vector} v the vertex for calculating quadric error
   * @returns {Number} quadric error
   */
  quadricError(q, v) {
    return (
      v.x*q.x00*v.x + v.y*q.x10*v.x + v.z*q.x20*v.x + q.x30*v.x +
      v.x*q.x01*v.y + v.y*q.x11*v.y + v.z*q.x21*v.y + q.x31*v.y +
      v.x*q.x02*v.z + v.y*q.x12*v.z + v.z*q.x22*v.z + q.x32*v.z +
      v.x*q.x03     + v.y*q.x13     + v.z*q.x23     + q.x33
    )
  }
}

class Face {
  constructor() {
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
  }
  // vertices visit all vertices of the given face, and 
  // fn is a callback that receives the visited vertices
  // and order index. For example, the usage could be:
  //
  //    f.vertices((vertex, orderIdx) => {
  //      ... // do something for the vertex
  //    })
  //
  // if one does not need to access the order index,
  // one can simply call the function as follows:
  //
  //    f.vertices(v => { ... })
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
    let a = h.vector()
    let b = h.prev.twin.vector()
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
  /**
   * quadric computes and returns the quadric matrix of the given face
   * @returns {Matrix}
   */
  quadric() {
    const n = this.normal()
    const x = this.halfedge.vertex.position.x
    const y = this.halfedge.vertex.position.y
    const z = this.halfedge.vertex.position.z
    const a = n.x
    const b = n.y
    const c = n.z
    const d = -a*x - b*y - c*z
    const m = new Matrix(
      a*a, a*b, a*c, a*d,
      a*b, b*b, b*c, b*d,
      a*c, b*c, c*c, c*d,
      a*d, b*d, c*d, d*d,
    )
    return m
  }
}

class Vertex {
  constructor() {
    this.position = null // Vector
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
  /**
   * quadric computes and returns the quadric matrix of the given vertex
   * @returns {Matrix}
   */
  quadric() {
    let q = new Matrix()
    this.faces(f => {
      q = q.add(f.quadric())
    })
    return q
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
      case 'f':
        // only load indices of vertices
        for (let i = 1; i < tokens.length; i++) {
          indices.push(parseInt((tokens[i].split('/')[0]).trim()) - 1)
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
    this.resetIndices()
  }
  /**
   * resetIndices clears all invalid (null) elements and reset
   * the indices.
   */
  resetIndices() {
    // clear null elements
    const notnull = e => e == null ? false : true
    this.vertices = this.vertices.filter(notnull)
    this.edges = this.edges.filter(notnull)
    this.faces = this.faces.filter(notnull)
    this.halfedges = this.halfedges.filter(notnull)
    this.boundaries = this.boundaries.filter(notnull)

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
  /**
   * simplify implements the QEM simplification algorithm.
   * @param {number} reduceRatio reduceRatio indicates how much faces
   * should be removed.
   */
  simplify(reduceRatio) {
    if (this.boundaries.length != 0) {
      // KNOWN ISSUES: this implementation does not fully work with
      // meshes that may contain boundaries, or have too few faces.
      // This is caused because of the following reasons:
      // 1. edge collapse is implemented via reconstructing everything
      // around that edge, it can miss invalid edge collapse operation
      // (see slides).
      // 2. if the mesh contains too few faces, the process of finding
      // opposite neighbor edges of the connecting vertices of the edge
      // can be problematic.
      // To fix this issue, we need to implement edge collapse in a
      // different way (and possibly more efficient):
      // 1. move a vertex, say v1, to the target position
      // 2. detect if edge collapse from v2 to v1 is still valid
      //    (detect flip faces). If not, skip this edge collapse
      //    operation and restore the position of v1.
      // 3. conduct edge collapse from v2 to v1.
      throw 'do not work on mesh with boundaries'
    }

    // build edge error priority queue
    const pq = new PriorityQueue((e1, e2) => e1.error() < e2.error())
    pq.push(...this.edges)
    
    let reducedFaces = Math.floor(this.faces.length * reduceRatio)
    for (; reducedFaces > 0; ) {
      const e = pq.pop()
      if (e.removed) { continue }

      // Two vertex for edge collapse
      const v1 = e.halfedge.vertex
      const v2 = e.halfedge.twin.vertex

      // Clear them from the vertex indices
      this.vertices[v1.idx] = null
      this.vertices[v2.idx] = null

      // Clear everything connected with v1 and v2
      v1.halfedges(h => {
        h.edge.removed = true
        this.edges[h.edge.idx] = null
        this.faces[h.face.idx] = null
        this.halfedges[h.idx] = null
        this.halfedges[h.twin.idx] = null
      })
      v2.halfedges(h => {
        h.edge.removed = true
        this.edges[h.edge.idx] = null
        this.faces[h.face.idx] = null
        this.halfedges[h.idx] = null
        this.halfedges[h.twin.idx] = null
      })

      // Construct new vertex based on the best vertex calculation.
      const v = new Vertex()
      v.position = e.bestVertex()
      v.idx = this.vertices.length
      this.vertices.push(v)

      // Find the 1-ring of v1-v2, in counterclock-wise order.
      let startHalfedge = null
      if (v1.halfedge.twin.vertex != v2) {
        startHalfedge = v1.halfedge
      } else {
        startHalfedge = v1.halfedge.twin.next
      }
      let start = null
      if (startHalfedge.next.twin.vertex != v2) {
        start = startHalfedge.next
      } else {
        start = startHalfedge.next.twin.next
      }
      let oppositeEdges = [start]
      for (let current = start;;) {
        if (current.next.twin.next.twin.vertex == v2 ||
            current.next.twin.next.twin.vertex == v1) {
          current = current.next.twin.next.twin.next
        } else {
          current = current.next.twin.next
        }
        if (current == start) {
          break
        }
        oppositeEdges.push(current)
      }

      // It is important to maintain the order of the new
      // edges. The implementation below depends on the order
      // to be conterclock-wise.
      let newEdges = []
      let oppositeHalfdges = []
      oppositeEdges.forEach(h => {
        this.faces[h.face.idx] = null

        const e = new Edge()
        e.idx = this.edges.length
        this.edges.push(e)

        e.halfedge = new Halfedge()
        e.halfedge.idx = this.halfedges.length
        e.halfedge.edge = e
        this.halfedges.push(e.halfedge)

        e.halfedge.twin = new Halfedge()
        e.halfedge.twin.idx = this.halfedges.length
        e.halfedge.twin.edge = e
        e.halfedge.twin.twin = e.halfedge
        this.halfedges.push(e.halfedge.twin)

        newEdges.push(e)
        oppositeHalfdges.push(h)
      })

      for (let i = 0; i < oppositeHalfdges.length; i++) {

        // build new connectivity between e1, e2, and h.
        const e1 = newEdges[i]
        const e2 = newEdges[(i+1)%oppositeHalfdges.length]
        const h = oppositeHalfdges[i]

        // 1. connect opposite halfedge to new edges
        v.halfedge = e1.halfedge
        e1.halfedge.next = h
        e1.halfedge.prev = e2.halfedge.twin
        e2.halfedge.twin.next = e1.halfedge
        e2.halfedge.twin.prev = h
        h.prev = e1.halfedge
        h.next = e2.halfedge.twin

        // 2. constrct new face
        const f = new Face()
        f.halfedge = e1.halfedge
        f.idx = this.faces.length
        this.faces.push(f)

        // 3. associate all edges to the new face
        e1.halfedge.face = f
        h.face = f
        e2.halfedge.twin.face = f

        // 4. associate vertex to new half
        e1.halfedge.vertex = v
        e1.halfedge.twin.vertex = h.vertex
        e2.halfedge.vertex = v
        e2.halfedge.twin.vertex = h.twin.vertex

        // 5. this is necessary to prevent a vertex
        // reference to a removed halfedge 
        h.vertex.halfedge = h
      }

      // push new edges into priority queue, the push
      // will automatically adjust the order of elements.
      pq.push(...newEdges)
      reducedFaces -= 2

      this.resetIndices()
    }
  }
}