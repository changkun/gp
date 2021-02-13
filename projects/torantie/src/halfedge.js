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
//   - A.timesSparse(B) returns A*B where A and B are SparseMatrix.
//   - A.plus(B) returns A+B where A and B are SparseMatrix.
//   - A.timesReal(s) returns sA where A is SparseMatrix and s is a real number.
//   - A.chol() returns a sparse Cholesky decomposition.
//   - A.solvePositiveDefinite(b) solves linear equation Ax=b where
//     A is a Cholesky decomposition, and b is a DenseMatrix, and x is the solution.
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
  /**constructor() {
    this.vertex = null // Vertex
    this.edge   = null // Edge
    this.face   = null // Face

    this.prev = null   // Halfedge
    this.next = null   // Halfedge
    this.twin = null   // Halfedge
    this.idx  = -1     // Number

    // Hint: try use this variable to record if a halfedge is on the boundary
    this.onBoundary = false // Boolean
  }**/

  constructor(vertex = null, edge = null, face = null, idx = -1, prev = null, next = null, twin = null, onBoundary = false) {
    this.vertex = vertex // Vertex
    this.edge = edge // Edge
    this.face = face // Face

    this.prev = prev   // Halfedge
    this.next = next   // Halfedge
    this.twin = twin   // Halfedge
    this.idx = idx     // Number

    // Hint: try use this variable to record if a halfedge is on the boundary
    this.onBoundary = onBoundary // Boolean
  }

  // TODO: you can add more methods if you need here
  getVector() {
    const vector = this.twin.vertex.position.sub(this.vertex.position)
    return vector
  }


  cotan() {
    if (this.onBoundary) {
      return 0
    }
    const u = this.prev.getVector()
    const v = this.next.getVector().scale(-1)
    const c = u.dot(v) / u.cross(v).norm()

    return c
  }

  getAngle() {
    let a = this.getVector()
    let b = this.prev.twin.getVector()
    let dot = a.unit().dot(b.unit())
    let angle = Math.acos(dot)

    return angle
  }

}

class Edge {
  constructor() {
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
  }
  // TODO: you can add more methods if you need here
}

class Face {
  constructor() {
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
    this.isQuad = false
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
    try {
      const firstHalfEdge = this.halfedge
      const secondHalfEdge = firstHalfEdge.next
      let i = 0

      fn(firstHalfEdge.vertex, i)
      i++;

      for (let currentHalfEdge = secondHalfEdge; firstHalfEdge.vertex.idx !== currentHalfEdge.vertex.idx; currentHalfEdge = currentHalfEdge.next) {
        fn(currentHalfEdge.vertex, i)
        i++
      }
    } catch (e) {
      console.error(e)
    }

  }
  // TODO: you can add more methods if you need here

  getNumberOfEdges(){
    let nOfEdges = 3

    if(this.isQuad)
      nOfEdges = 4

    return nOfEdges
  }
  getAreaTriangle() {
    const a = this.halfedge.vertex.position
    const b = this.halfedge.next.vertex.position
    let c = a.cross(b)
    return Math.abs(Math.pow(c.x, 2) + Math.pow(c.y, 2) + Math.pow(c.z, 2)) / 2
  }

    getNormal(){
      if(this.isQuad){
          return this.getNormalQuad()
      }else{
          return this.getNormalTriangle()
      }
    }

    getNormalQuad(){
        let x = this.halfedge.getVector()
      //let v = this.halfedge.vertex
      //console.log("x vertex id: "+ v.idx +" x: "+ v.position.x + " y: " + v.position.y + " z: " +v.position.z)

        let y = this.halfedge.prev.twin.getVector()

      //let v2 = this.halfedge.prev.twin.vertex
      //console.log("y vertex id: "+ v2.idx +" x: "+ v2.position.x + " y: " + v2.position.y + " z: " +v2.position.z)
        let firstTriangleNormal = (x.cross(y)).unit()
        let x2 = this.halfedge.prev.prev.getVector()
        let y2 = this.halfedge.next.twin.getVector()
        let secondTriangleNormal = (x2.cross(y2)).unit()
        let quadNormal = firstTriangleNormal.add(secondTriangleNormal).scale(0.5).unit()
        /*this.vertices((v,i)=>{
          console.log("vertex id: "+ v.idx +" x: "+ v.position.x + " y: " + v.position.y + " z: " +v.position.z)
        })
        let t = this.getNormalTriangle()
*/
        return quadNormal
    }

  getNormalTriangle() {
    let x = this.halfedge.getVector()
    let y = this.halfedge.prev.twin.getVector()
    let triangleNormal = x.cross(y)

    return triangleNormal.unit()
  }

}

class Vertex {
  constructor() {
    this.position = null // Vector
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
  }
  normal(method='equal-weighted') {
    let sum = new Vector()

    switch (method) {
      case 'equal-weighted':
        // TODO: compute euqally weighted normal of this vertex
        this.forEachHalfEdge((currentHalfEdge) => {
          sum = sum.add(currentHalfEdge.face.getNormal());
        })
        break;
      case 'area-weighted':
        // TODO: compute area weighted normal of this vertex
        this.forEachHalfEdge((currentHalfEdge) => {
          sum = sum.add(currentHalfEdge.face.getNormal().scale(currentHalfEdge.face.getAreaTriangle()));
        })

        break;
      case 'angle-weighted':
        // TODO: compute angle weighted normal of this vertex
        this.forEachHalfEdge((currentHalfEdge) => {
          sum = sum.add(currentHalfEdge.face.getNormal().scale(currentHalfEdge.getAngle()));
        })
        break;
      default: // undefined
        return new Vector()
    }

    const normal = sum.scale(1 / sum.norm())

    return normal
  }

  // TODO: you can add more methods if you need here


  calculateVoronoiArea() {
    let area = 0

    this.forEachHalfEdge((currentHalfEdge) => {
      let u = currentHalfEdge.prev.getVector().norm()
      let v = currentHalfEdge.getVector().norm()
      area += (Math.pow(u, 2) * currentHalfEdge.prev.cotan() + Math.pow(v, 2) * currentHalfEdge.cotan()) / 8
    })

    return area
  }

  forEachHalfEdge(fn) {
    let start = true
    let i = 0

    for (let currentHalfEdge = this.halfedge; start || currentHalfEdge != this.halfedge; currentHalfEdge = currentHalfEdge.twin.next) {
      if (currentHalfEdge === null || currentHalfEdge === undefined)
        return;
      fn(currentHalfEdge, i)
      start = false
      i++
    }
  }
}

export class HalfedgeMesh {
  /**
   * constructor constructs the halfedge-based mesh representation.
   *
   * @param {string} data is a text string from an .obj file
   */
  /*constructor(data) {
    // properties we plan to cache
    this.vertsOrig = [] // an array of original vertex information
    this.vertices  = [] // an array of Vertex object
    this.edges     = [] // an array of Edge object
    this.faces     = [] // an array of Face object
    this.halfedges = [] // an array of Halfedge object
    this.halfedgesDict = {}

    // TODO: read .obj format and construct its halfedge representation
    let lines = data.split("\n")

    try {
      for (let i = 0; i < lines.length; i++) {
        let {values, command} = this.getValuesAndCommand(lines[i]);

        switch (command) {
          case "v":
            let vertex = new Vertex()
            vertex.position = new Vector(parseFloat(values[0]), parseFloat(values[1]), parseFloat(values[2]))
            vertex.idx = this.vertices.length
            this.vertices.push(vertex)
            break;

          case "vt":
            break;

          case "vn":
            break;

          case "f":
            let face = new Face()
            face.idx = this.faces.length

            let createdHalfEdges = this.createHalfEdges(values, face)

            this.linkCreatedHalfEdges(createdHalfEdges);

            face.halfedge = createdHalfEdges[0]

            this.faces.push(face)



            break;

          case "s":
            break;
        }
      }

      for (const vertex of this.vertices) {
        let vertexCopy = new Vertex()
        vertexCopy.idx = vertex.idx
        vertexCopy.halfedge = vertex.halfedge
        vertexCopy.position = new Vector(vertex.position.x,vertex.position.y,vertex.position.z)
        this.vertsOrig.push(vertexCopy)
      }

    } catch (e) {
      console.error(e)
    }
  }
*/


  /**
   * laplaceMatrix returns the Laplace matrix for a given laplaceType
   * @param {string} weightType indicates the type of the weight for
   * constructing the Laplace matrix. Possible value could be:
   * 'uniform', 'cotan'.
   */
  constructor(data) {
    // properties we plan to cache
    this.vertices  = [] // an array of Vertex object
    this.edges     = [] // an array of Edge object
    this.faces     = [] // an array of Face object
    this.halfedges = [] // an array of Halfedge object
    this.vertsOrig = []
    this.isQuadMesh = false

    // TODO: read .obj format and construct its halfedge representation

    // load .obj file
    let indices   = []
    let positions = []
    let lines = data.split('\n')
    let containsQuad = false
      // search for the a quad in the object file
      for (let line of lines) {
          line = line.trim()
          const tokens = line.split(' ')
          switch(tokens[0].trim()) {
              case 'f':
                  const isQuad = tokens.length == 5
                  containsQuad = containsQuad || isQuad
                  break;

          }

          if(containsQuad)
              break;
      }

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
          const isQuad = tokens.length == 5

          // only load indices of vertices
          for (let i = 1; i < tokens.length; i++) {
            indices.push(parseInt((tokens[i].split('/')[0]).trim()) - 1)
          }
          if(containsQuad && !isQuad)
              indices.push(-1)

          continue
      }
    }

    // build the halfedge connectivity
    const edges = new Map()
    let nOfEdges = 3
    if(containsQuad){
      this.isQuadMesh = true
      nOfEdges = 4
    }


      for (let i = 0; i < indices.length; i += nOfEdges) {

        let nFaceEdges = indices[i + nOfEdges] != -1 ? 4 : 3

          for (let j = 0; j < nFaceEdges; j++) { // check a face
              let a = indices[i + j]
              let b = indices[i + (j+1)%nFaceEdges]

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
    this.faces      = new Array(indices.length / nOfEdges)
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
    for (let i = 0; i < indices.length; i += nOfEdges) {
      // construct face
      const f = new Face()
      this.faces[i / nOfEdges] = f
      // if it contains quads set default value to true else false
      let isQuad = containsQuad
      let nFaceEdges = indices[i + nOfEdges] != -1 ? 4 : 3

      // construct halfedges of the face
      for (let j = 0; j < nFaceEdges; j++) {
        const he = new Halfedge()
        this.halfedges[i+j] = he
      }


      // construct connectivities of the new halfedges
      for (let j = 0; j < nFaceEdges; j++) {
        // halfedge from vertex a to vertex b
        let a = indices[i + j]
        let b = indices[i + (j+1)%nFaceEdges]

        // halfedge properties
        const he = this.halfedges[i + j]
        he.next = this.halfedges[i + (j+1)%nFaceEdges]
        he.prev = this.halfedges[i + (j+2)%nFaceEdges]
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


      f.isQuad = isQuad
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

    //Create Copy
    for (const vertex of this.vertices) {
      let vertexCopy = new Vertex()
      vertexCopy.idx = vertex.idx
      vertexCopy.halfedge = vertex.halfedge
      vertexCopy.position = new Vector(vertex.position.x,vertex.position.y,vertex.position.z)
      this.vertsOrig.push(vertexCopy)
    }
  }


  laplaceMatrix(weightType) {
    // TODO: construct the Laplace matrix.
    const numberOfVertices = this.vertices.length
    let weightTriplet = new Triplet(numberOfVertices, numberOfVertices)

    for (const vert of this.vertices) {
      const i = vert.idx
      let sum = 1e-8 // Tikhonov regularization to get strict positive definite

      vert.forEachHalfEdge(h => {
        let w = 0

        switch (weightType) {
          case 'uniform':
            w = 1
            break
          case 'cotan':
            w = (h.cotan() + h.twin.cotan())/2
        }

        sum += w
        //console.log("Value: "+w+" Position: ("+ i+","+h.twin.vertex.idx +")")
        weightTriplet.addEntry(w, i, h.twin.vertex.idx)
      })
      weightTriplet.addEntry(-sum, i, i)
      //console.log("Value: "+-sum+" Position: ("+ i+","+i +")")
    }

    let weightMatrix = SparseMatrix.fromTriplet(weightTriplet)

    return weightMatrix
  }

  massMatrix(weightType){
    const numberOfVertices = this.vertices.length
    let massTriplet = new Triplet(numberOfVertices, numberOfVertices)

    for (const vert of this.vertices) {
      const i = vert.idx

      switch (weightType) {
        case 'uniform':
          let neighbours = 0
          vert.forEachHalfEdge(() => {
            neighbours++
          })

          massTriplet.addEntry(neighbours,i,i)
          break
        case 'cotan':

          let area = vert.calculateVoronoiArea()
          // area alone is very small and destroys the smoothing
          massTriplet.addEntry(1+area,i,i)
          break
      }
    }

    let massMatrix = SparseMatrix.fromTriplet(massTriplet)

    return massMatrix
  }


  /**
   * smooth performs the Laplacian smoothing algorithm.
   * @param {string} weightType indicates the type of the weight for
   * constructing the Laplace matrix. Possible value could be: 'uniform',
   * 'cotan'.
   * @param {Number} timeStep the time step in Laplacian Smoothing algorithm
   * @param {Number} smoothStep the smooth step in Laplacian Smoothing algorithm
   */
  smooth(weightType, timeStep, smoothStep) {
    //reset vertices
    for (let i = 0; i < this.vertsOrig.length; i++) {
      this.vertices[i].position.x = this.vertsOrig[i].position.x
      this.vertices[i].position.y = this.vertsOrig[i].position.y
      this.vertices[i].position.z = this.vertsOrig[i].position.z
    }

    for (let j = 0; j< smoothStep; j++) {
      // TODO: implmeent the Laplacian smoothing algorithm.
      //
      try {
        // Hint:
        //
        //   1. Construct the Laplace matrix `L` for the given `weightType`
        let W = this.laplaceMatrix(weightType)
        let M = this.massMatrix(weightType)
        //   2. Solve linear equation: (I-tλL) f' = f using a Cholesky solver.
        let f = M.minus(W.timesReal(timeStep))
        let cholskyDecompositionMatrix = f.chol()
        const numberOfVertices = this.vertices.length
        let b = DenseMatrix.zeros(numberOfVertices, 3)

        for (const v of this.vertices) {
          b.set(v.position.x, v.idx, 0)
          b.set(v.position.y, v.idx, 1)
          b.set(v.position.z, v.idx, 2)
        }


        b = M.timesDense(b)

        let result = cholskyDecompositionMatrix.solvePositiveDefinite(b)

        //   3. Update the position of mesh vertices based on the solution f'.
        //
        for (let i = 0; i < numberOfVertices; i++) {
          let resultX = result.get(i, 0)
          let resultY = result.get(i, 1)
          let resultZ = result.get(i, 2)
          let currentPosition = this.vertices[i].position
          currentPosition.x = (resultX)
          currentPosition.y = (resultY)
          currentPosition.z = (resultZ)
        }
      } catch (e) {
        console.error(e)
      }
    }
  }


  getValuesAndCommand(line) {
    //clean up
    line = line.replace("\r", "")
    let values = line.split(" ")
    let command = values[0]
    //remove command string from values
    values.shift()
    return {values, command};
  }

  createHalfEdges(faceValues, face) {
    let faceVertices = []
    this.extractVertices(faceValues, faceVertices);

    let createdHalfEdges = []

    for (let i = 0; i < faceVertices.length; i++) {

      let currentVertex = faceVertices[i]
      let nextVertex = null
      if (i + 1 !== faceVertices.length) {
        nextVertex = faceVertices[i + 1]
      } else {
        nextVertex = faceVertices[0]
      }

      let existingHalfedge = null

      existingHalfedge = this.halfedgesDict[currentVertex.idx + ":" + nextVertex.idx]
      if (existingHalfedge === null || existingHalfedge === undefined) {
        existingHalfedge = this.halfedgesDict[nextVertex.idx + ":" + currentVertex.idx]
      }

      if (existingHalfedge !== null && existingHalfedge !== undefined) {
        existingHalfedge.face = face
        existingHalfedge.onBoundary = false
        createdHalfEdges.push(existingHalfedge)
        continue;
      }

      let edge = new Edge()
      edge.idx = this.edges.length
      this.edges.push(edge)

      let halfEdge = new Halfedge(currentVertex, edge, face, this.halfedges.length)
      edge.halfedge = halfEdge

      if (currentVertex.halfedge === null)
        currentVertex.halfedge = halfEdge

      halfEdge.twin = new Halfedge(nextVertex, edge, null, this.halfedges.length + 1, null, null, null, true)
      halfEdge.twin.twin = halfEdge

      createdHalfEdges.push(halfEdge)
      this.halfedgesDict[halfEdge.vertex.idx + ":" + halfEdge.twin.vertex.idx] = halfEdge
      this.halfedgesDict[halfEdge.twin.vertex.idx + ":" + halfEdge.vertex.idx] = halfEdge.twin
      this.halfedges.push(halfEdge)
      this.halfedges.push(halfEdge.twin)
    }

    return createdHalfEdges
  }

  extractVertices(faceValues, faceVertices) {
    let faceVertexIds = []

    //v: 0 vt: 1 vn: 2
    faceValues.forEach((value) => {
      faceVertexIds.push(value.split("/"))
    })

    faceVertexIds.forEach((vertexId) => {
      faceVertices.push(this.vertices[vertexId[0] - 1])
    })
  }

  linkCreatedHalfEdges(createdHalfEdges) {
    for (let i = 0; i < createdHalfEdges.length; i++) {
      let nextHalfEdge = null;
      let prevHalfEdge = null;

      if (i + 1 < createdHalfEdges.length) {
        nextHalfEdge = createdHalfEdges[i + 1]
      } else {
        nextHalfEdge = createdHalfEdges[0]
      }
      if (i - 1 >= 0) {
        prevHalfEdge = createdHalfEdges[i - 1]
      } else {
        prevHalfEdge = createdHalfEdges[createdHalfEdges.length - 1]
      }

      createdHalfEdges[i].next = nextHalfEdge
      createdHalfEdges[i].prev = prevHalfEdge
    }
  }


}
