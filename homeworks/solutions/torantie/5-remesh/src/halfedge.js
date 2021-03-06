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

    // Hint: try use this variable to record if a halfedge is on the boundary
    this.onBoundary = false // Boolean
  }
  // TODO: you can add more methods if you need here
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

    this.targetVertexPosition = new Vector()
    this.quadricError = 0
    this.edgeQuadric = new Matrix()
    this.isDeleted = false
  }
  // TODO: you can add more methods if you need here

  getTargetVertex() {
    this.setEdgeQuadric()
    const edgeQuadric = this.edgeQuadric

    // is invertible
    if (this.isQuadricInvertible(edgeQuadric)) {
      edgeQuadric.x30 = 0
      edgeQuadric.x31 = 0
      edgeQuadric.x32 = 0
      edgeQuadric.x33 = 1
      const targetVertexPosition= edgeQuadric.inv().mulpos(new Vector())


      if (targetVertexPosition.x !== NaN && targetVertexPosition.y !== NaN && targetVertexPosition.z != NaN) {
        return targetVertexPosition
      }
    }

    const n = 4
    const vertexPosition = this.halfedge.vertex.position
    const nextVertexPosition = this.halfedge.next.vertex.position
    const vector = nextVertexPosition.sub(vertexPosition)
    let lowerBound = 0
    let upperBound = 1
    let center = (upperBound - lowerBound) / 2
    let bestVertexPosition = vertexPosition.add(vector.scale(center))
    let bestQuadricError = this.getQuadricError(edgeQuadric, bestVertexPosition)

    for (let i = 0; i <= n; i++) {

      if(bestQuadricError == 0){
        break;
      }

      let newCenter = center / 2

      const vertexPositionLeft = vertexPosition.add(vector.scale(lowerBound + newCenter))
      const quadricErrorLeft = this.getQuadricError(edgeQuadric, vertexPositionLeft)
      const vertexPositionRight = vertexPosition.add(vector.scale(upperBound - newCenter))
      const quadricErrorRight = this.getQuadricError(edgeQuadric, vertexPositionRight)

      if (quadricErrorLeft < quadricErrorRight) {
        if(quadricErrorLeft < bestQuadricError){
          bestQuadricError = quadricErrorLeft
          bestVertexPosition = vertexPositionLeft
        }
        upperBound = center
      }
      else if(quadricErrorRight <= quadricErrorLeft){
        if(quadricErrorRight < bestQuadricError){
          bestQuadricError = quadricErrorRight
          bestVertexPosition = vertexPositionRight
        }
        lowerBound = center
      }

      center = newCenter

    }

    return bestVertexPosition
  }

  isQuadricInvertible(edgeQuadric) {
    return Math.abs(edgeQuadric.det()) > 1e-3;
  }

  setEdgeQuadric(){
    //compute edge quadric
    let vertexQuadric = this.halfedge.vertex.getVertexQuadric()
    let nextVertexQuadric = this.halfedge.next.vertex.getVertexQuadric()
    this.edgeQuadric = vertexQuadric.add(nextVertexQuadric)

  }


  getQuadricError(edgeQuadric, targetVertexPosition){
    //(Q1+Q2) * x
    let v = edgeQuadric.mulpos(targetVertexPosition)
    let h = edgeQuadric.x30 * targetVertexPosition.x
        + edgeQuadric.x31 * targetVertexPosition.y
        + edgeQuadric.x32 * targetVertexPosition.z
        + edgeQuadric.x33

    let edgeError = v.x * targetVertexPosition.x
        + v.y * targetVertexPosition.y
        + v.z * targetVertexPosition.z
        + h

    return edgeError
  }

  collapse(){
    let vertexToDelete = this.halfedge.twin.vertex

    let halfedgesToDelete = []

    halfedgesToDelete.push(this.halfedge)
    halfedgesToDelete.push(this.halfedge.next)
    halfedgesToDelete.push(this.halfedge.next.next)
    halfedgesToDelete.push(this.halfedge.twin)
    halfedgesToDelete.push(this.halfedge.twin.next)
    halfedgesToDelete.push(this.halfedge.twin.next.next)

    let edgesToDelete = []

    edgesToDelete.push(this)
    edgesToDelete.push(this.halfedge.next.edge)
    edgesToDelete.push(this.halfedge.twin.prev.edge)

    edgesToDelete.forEach((e) =>{
      e.isDeleted = true
    })

    let facesToDelete = []
    facesToDelete.push(this.halfedge.face)
    facesToDelete.push(this.halfedge.twin.face)
    facesToDelete.forEach((f) =>{
      f.isDeleted = true
    })

    //change vertex position
    let vertex = this.halfedge.vertex
    vertex.position = this.targetVertexPosition
    vertex.halfedge = this.halfedge.next.twin.next

    // set the vertex with the new vertex position as vertex of all halfedges attached to the vertex that will be deleted
    vertexToDelete.halfedges((halfedge)=>{
      halfedge.vertex = vertex
    })

    vertexToDelete.isDeleted = true

    //set edge references: right halfedges edge reference should be the left edges, since we delete the edges on the right
    this.halfedge.next.twin.edge = this.halfedge.prev.edge
    this.halfedge.twin.prev.twin.edge = this.halfedge.twin.next.edge

    //change vertex references
    this.halfedge.prev.vertex.halfedge = this.halfedge.next.twin
    this.halfedge.twin.prev.vertex.halfedge = this.halfedge.twin.next.twin

    //edge merge: merge the 4 edges by setting their twins
    this.halfedge.next.twin.twin = this.halfedge.prev.twin
    this.halfedge.prev.twin.twin = this.halfedge.next.twin
    //left up edge needs new halfedge as reference
    if(this.halfedge.prev.idx == this.halfedge.prev.edge.halfedge.idx)
      this.halfedge.prev.edge.halfedge = this.halfedge.next.twin

    this.halfedge.twin.next.twin.twin = this.halfedge.twin.prev.twin
    //left down edge needs new halfedge as reference
    if(this.halfedge.twin.next.idx == this.halfedge.twin.next.edge.halfedge.idx)
      this.halfedge.twin.next.edge.halfedge = this.halfedge.twin.prev.twin

    this.halfedge.twin.prev.twin.twin = this.halfedge.twin.next.twin


    return [vertexToDelete, edgesToDelete, halfedgesToDelete, facesToDelete]
  }


}

class Face {
  constructor() {
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
    this.isDeleted = false
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
    // TODO: iterate all vertices.
    let start = true
    let i = 0
    for (let h = this.halfedge; start || h != this.halfedge; h = h.next) {
      fn(h.vertex, i)
      start = false
      i++
    }
  }
  // TODO: you can add more methods if you need here

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
    this.uv       = new Vector() // Vector
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
    this.isDeleted = false
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
  // TODO: you can add more methods if you need here

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

  getVertexQuadric(){
    //calculate the sum of all neighbouring faces
    let QSum = new Matrix()
    this.faces((face) => {
      let Qi = this.calculateQi(this, face)
      QSum = QSum.add(Qi)
    })

    return QSum
  }

  calculateQi(vertex, face) {
    //unit face normal
    let uFN = face.normal()
    let negatedUnitFaceNormal = uFN.scale(-1)

    //h = -ni^T * xi. Last Dimension for the homogeneous normal vector (x,y,z,h)
    let h = negatedUnitFaceNormal.dot(vertex.position)
    //Qi=ni*ni^T vertex Quadrics
    let Qi = new Matrix(
        uFN.x * uFN.x, uFN.x * uFN.y, uFN.x * uFN.z, uFN.x * h,
        uFN.y * uFN.x, uFN.y * uFN.y, uFN.y * uFN.z, uFN.y * h,
        uFN.z * uFN.x, uFN.z * uFN.y, uFN.z * uFN.z, uFN.z * h,
        h * uFN.x, h * uFN.y, h * uFN.z, h * h)
    return Qi;
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

    // TODO: read .obj format and construct its halfedge representation

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
        let a = indices[i + j]
        let b = indices[i + (j+1)%3]

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
        let a = indices[i + j]
        let b = indices[i + (j+1)%3]

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

        this.boundaries.push(f)

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

  }


  /**
   * simplify implements the QEM simplification algorithm.
   * @param {number} reduceRatio reduceRatio indicates how much faces
   * should be removed.
   */
  simplify(reduceRatio) {
    // TODO: implement the QEM simplification

    if (reduceRatio === 0)
      return

    let pq = new PriorityQueue( (a, b) => a.quadricError < b.quadricError)



    this.edges.forEach(e => {
      e.targetVertexPosition = e.getTargetVertex()
      e.quadricError = e.getQuadricError(e.edgeQuadric ,e.targetVertexPosition)
      pq.push(e)
    })


    let targetFaces = this.faces.length - Math.round(this.faces.length * reduceRatio)

    let allVerticesToDelete = []
    let allEdgesToDelete = []
    let allHalfedgesToDelete = []
    let allFacesToDelete = []
    let deletedFaces = 0

    for(let k = this.faces.length-deletedFaces; k > targetFaces; k=this.faces.length-deletedFaces) {
      const edge = pq.pop()

      if(edge.isDeleted || edge.halfedge.onBoundary) {
        continue;
      }

      let [vertexToDelete, edgesToDelete, halfedgesToDelete, facesToDelete] = edge.collapse()
      allVerticesToDelete.push(vertexToDelete)
      allEdgesToDelete = allEdgesToDelete.concat(edgesToDelete)
      allHalfedgesToDelete = allHalfedgesToDelete.concat(halfedgesToDelete)
      allFacesToDelete = allFacesToDelete.concat(facesToDelete)

      deletedFaces = allFacesToDelete.length

      //recalculate quadric errors
      pq = new PriorityQueue( (a, b) => a.quadricError < b.quadricError)
      this.edges.forEach(e => {

        if(e.isDeleted) {
          return;
        }
        e.targetVertexPosition = e.getTargetVertex()
        e.quadricError = e.getQuadricError(e.edgeQuadric ,e.targetVertexPosition)
        pq.push(e)
      })

    }

    this.vertices = this.vertices.filter((vertex) =>{
      return allVerticesToDelete.find((vertexToDelete) => vertex.idx === vertexToDelete.idx) == undefined
    })
    this.edges = this.edges.filter((edge) =>{
      return allEdgesToDelete.find((edgeToDelete) => edge.idx === edgeToDelete.idx) == undefined
    })
    this.faces = this.faces.filter((face) =>{
      return allFacesToDelete.find((facesToDelete) => face.idx === facesToDelete.idx) == undefined
    })
    this.halfedges = this.halfedges.filter((halfedge) =>{
      return allHalfedgesToDelete.find((halfEdgeToDelete) => halfedge.idx === halfEdgeToDelete.idx) == undefined
    })

    let index = 0
    this.vertices.forEach(v => { v.idx = index++ })
    index = 0
    this.edges.forEach(e => { e.idx = index++ })
    index = 0
    this.faces.forEach(f => { f.idx = index++ })
    index = 0
    this.halfedges.forEach(h => { h.idx = index++ })

  }



}