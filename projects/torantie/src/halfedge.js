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

  getVector() {
    /*const a = this.vertsOrig[this.next.vertex.idx]
    const b = this.vertsOrig[this.vertex.idx]
    return a.position.sub(b.position)*/
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

  meanValueWeight(){
    if (this.onBoundary) {
      return 0
    }

    const gamma = this.getAngle()
    const delta = this.twin.next.getAngle()
    const angles =Math.tan(gamma/2) + Math.tan(delta/2)
    //||vi - v0||
    const viMv0 = this.getVector().norm()
    const weight = angles/viMv0
    console.log("meanValueWeight " + "gamma: " + gamma + " delta: " + delta + " angles: " + angles + " viMv0: " + viMv0 + " weight: " + weight)
    return weight
  }

  getAngle() {
    let a = this.getVector()
    let b = this.prev.twin.getVector()

    /*const a = this.prev.getVector().unit()
    const b = this.next.getVector().scale(-1).unit()
    let angle = Math.acos(Math.max(-1, Math.min(1, a.dot(b))))*/
    /*console.log("angle" +
        " first vector vertex ids: " + this.vertex.idx + " to " + this.twin.vertex.idx
        + " x: " + a.x + " y: " + a.y + " z: " + a.z +
        " second vector vertex ids:" + this.prev.twin.vertex.idx + " to " + this.prev.twin.twin.vertex.idx
        + " x: " + b.x + " y: " + b.y + " z: " + b.z +
        " angle: " + angle)*/
    //console.log("angle: " + angle)
    let dot = a.unit().dot(b.unit())
    let angle = Math.acos(Math.max(-1, Math.min(1, dot)))
    return angle
  }

  getTriangleOppositeSideAngle() {
    const a = this.prev.getVector().unit()
    const b = this.next.getVector().scale(-1).unit()
    let dot = a.unit().dot(b.unit())
    let angle = Math.acos(Math.max(-1, Math.min(1, dot)))
    return angle
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
    this.isQuad = false
  }

  //Triangulation in case of QuadMesh
  getTriangulation(){
    let firstTriangle = []
    let secondTriangle = []
    if( this.isQuad)
      this.vertices((v, i) => {
        if (i == 3) {
          secondTriangle.push(firstTriangle[0])
          secondTriangle.push(firstTriangle[2])
          secondTriangle.push(v)
        } else {
          firstTriangle.push(v)
        }
      })

    return [firstTriangle,secondTriangle]
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

  getArea(){
    if(this.isQuad){
      return this.getAreaQuad()
    }else{
      return this.getAreaTriangle()
    }
  }

  getAreaQuad() {
    if(this.halfedge.onBoundary)
      return 0

    let x = this.halfedge.getVector()
    let y = this.halfedge.prev.twin.getVector()

    let firstTriangle = (x.cross(y)).norm()
    let x2 = this.halfedge.prev.prev.getVector()
    let y2 = this.halfedge.next.twin.getVector()
    let secondTriangle = (x2.cross(y2)).norm()

    return firstTriangle + secondTriangle
  }

  getAreaTriangle() {
    if(this.halfedge.onBoundary)
      return 0

    const a = this.halfedge.getVector()
    const b = this.halfedge.next.getVector()
    let c = a.cross(b).norm()
    return c / 2
  }

  getNormal(){
    if(this.isQuad){
      return this.getNormalQuad()
    }else{
      return this.getNormalTriangle()
    }
  }

  /**
   * Get the average of the two triangles making up the quad.
   */
  getNormalQuad(){
    let x = this.halfedge.getVector()
    let y = this.halfedge.prev.twin.getVector()

    let firstTriangleNormal = (x.cross(y)).unit()
    let x2 = this.halfedge.prev.prev.getVector()
    let y2 = this.halfedge.next.twin.getVector()
    let secondTriangleNormal = (x2.cross(y2)).unit()
    let quadNormal = firstTriangleNormal.add(secondTriangleNormal).scale(0.5).unit()

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
        this.faces((face) => {
          sum = sum.add(face.getNormal());
        })
        break;
      case 'area-weighted':
        this.faces((face) => {
          //TODO
          sum = sum.add(face.getNormal().scale(face.getArea()));
        })

        break;
      case 'angle-weighted':
        this.forEachHalfEdge((currentHalfEdge) => {
          //TODO
          if(currentHalfEdge.onBoundary)
            return;

          sum = sum.add(currentHalfEdge.face.getNormal().scale(currentHalfEdge.getAngle()));
        })
        break;
      default: // undefined
        return new Vector()
    }

    const normal = sum.scale(1 / sum.norm())

    return normal
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
  constructor(data) {
    // properties we plan to cache
    this.vertices  = [] // an array of Vertex object
    this.edges     = [] // an array of Edge object
    this.faces     = [] // an array of Face object
    this.halfedges = [] // an array of Halfedge object
    this.vertsOrig = []

    this.meshTypes = {
      isTriangleMesh: 'Triangle Mesh',
      isQuadMesh: 'Quad Mesh',
      isTriangleDominantMesh: 'Triangle-Dominant Mesh',
      isQuadDominantMesh: 'Quad-Dominant Mesh'
    }
    this.meshType = this.meshTypes.isTriangleMesh
    this.isQuadMesh = false

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

    let quadCount = 0
    let faceCount = 0
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
          faceCount++
          if(isQuad)
            quadCount++

          // only load indices of vertices
          for (let i = 1; i < tokens.length; i++) {
            indices.push(parseInt((tokens[i].split('/')[0]).trim()) - 1)
          }
          if(containsQuad && !isQuad)
            indices.push(-1)

          continue
      }
    }

    if(faceCount == quadCount){
      this.meshType = this.meshTypes.isQuadMesh
    }else if(quadCount == 0){
      this.meshType = this.meshTypes.isTriangleMesh
    }else if(faceCount/2<quadCount){
      this.meshType = this.meshTypes.isQuadDominantMesh
    }else if(faceCount/2>quadCount){
      this.meshType = this.meshTypes.isTriangleDominantMesh
    }

    // build the halfedge connectivity
    const edges = new Map()
    let nOfEdges = 3
    if(containsQuad){
      this.isQuadMesh = true
      nOfEdges = 4
    }


    for (let i = 0; i < indices.length; i += nOfEdges) {

      let nFaceEdges = indices[i + (nOfEdges-1)] != -1 && containsQuad  ? 4 : 3

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
    let trueIndex = 0

    // construct halfedges, edges
    for (let i = 0; i < indices.length; i += nOfEdges) {
      // construct face
      const f = new Face()
      this.faces[i / nOfEdges] = f
      // if it contains quads set default value to true else false
      let isQuad = indices[i + (nOfEdges-1)] != -1 && containsQuad
      let nFaceEdges = isQuad ? 4 : 3

      // construct halfedges of the face
      for (let j = 0; j < nFaceEdges; j++) {
        const he = new Halfedge()
        this.halfedges[trueIndex+j] = he
      }

      // construct connectivities of the new halfedges
      for (let j = 0; j < nFaceEdges; j++) {
        // halfedge from vertex a to vertex b
        let a = indices[i + j]
        let b = indices[i + (j+1)%nFaceEdges]

        // halfedge properties
        const he = this.halfedges[trueIndex + j]
        he.next = this.halfedges[trueIndex + (j+1)%nFaceEdges]
        he.prev = this.halfedges[trueIndex + (j+(nFaceEdges-1))%nFaceEdges]
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

      trueIndex += nFaceEdges
      f.isQuad = isQuad
    }

    // create boundary halfedges and hidden faces for the boundary
    let hidx = trueIndex
    for (let i = 0; i < trueIndex; i++) {
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
    /*index = 0
    this.halfedges.forEach(he => {
      // HACK: all halfedge now accessible to the original vertices
      he.vertsOrig = this.vertsOrig
      he.idx = index++
    })*/

  }


  laplaceMatrix(weightType) {
    const numberOfVertices = this.vertices.length
    let weightTriplet = new Triplet(numberOfVertices, numberOfVertices)
    let lambda = new Triplet(numberOfVertices, numberOfVertices)

    for (const vert of this.vertices) {
      const i = vert.idx
      let sum = 1e-8 // Tikhonov regularization to get strict positive definite
      let count = 0
      let neigh = ""

      vert.forEachHalfEdge(h => {
        let w = 0

        count++
        switch (weightType) {
          case 'uniform':
            w = 1
            break;
          case 'cotan':
            w = (h.cotan() + h.twin.cotan())/2
            break;
          case 'mean value':
            w = h.meanValueWeight()
            break;
        }


        sum += w
        weightTriplet.addEntry(-w, i, h.twin.vertex.idx)
        neigh += " " + h.twin.vertex.idx

      })
      weightTriplet.addEntry(sum, i, i)
      console.log("vertex " + vert.idx + " neighbours:" + neigh)
      // test
      let sum2 = 1e-8
      vert.forEachHalfEdge(h => {
        let w = 0
        switch (weightType) {
          case 'uniform':
            w = 1
            break;
          case 'cotan':
            w = (h.cotan() + h.twin.cotan())/2
            break;
          case 'mean value':
            w = h.meanValueWeight()
            break;
        }
        //weightTriplet.addEntry(-(w / sum), i, h.twin.vertex.idx)
        sum2 += (w / sum)
      })
      console.log("sum2 " + sum2)

    }

    let weightMatrix = SparseMatrix.fromTriplet(weightTriplet)

    return weightMatrix
  }

  massMatrix(massMatrixType){
    const numberOfVertices = this.vertices.length
    let massTriplet = new Triplet(numberOfVertices, numberOfVertices)

    for (const vert of this.vertices) {
      const i = vert.idx
      let neighbours = 0
      //let l = vert.halfedge.next.vertex.position.sub(vert.position).norm()

      switch (massMatrixType) {
        case 'identity':
          massTriplet.addEntry(1,i,i)
          continue;
        case 'neighbours':
          vert.forEachHalfEdge(() => { neighbours++ })
          massTriplet.addEntry(neighbours,i,i)
          continue;
        case 'voronoi area':
          let area = vert.calculateVoronoiArea()
          // area alone is very small and destroys the smoothing
          massTriplet.addEntry(100*area,i,i)
          continue;
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
  smooth(weightType, timeStep, smoothStep, massMatrixType, lambda) {
    console.log("in Smooth")
    //reset vertices


    for (let i = 0; i < this.vertsOrig.length; i++) {
      this.vertices[i].position.x = this.vertsOrig[i].position.x
      this.vertices[i].position.y = this.vertsOrig[i].position.y
      this.vertices[i].position.z = this.vertsOrig[i].position.z
    }

    if (timeStep == 0.001){
      console.log("timeStep is 0.001. Skip smooth")
      return;
    }

    for (let j = 0; j< smoothStep; j++) {
      try {
        // Hint:
        //   1. Construct the Laplace matrix `L` for the given `weightType`
        let W = this.laplaceMatrix(weightType)
        let M = this.massMatrix(massMatrixType)
        //   2. Solve linear equation: (I-tλL) f' = f using a Cholesky solver.
        let result = this.solveLinearEquation(M, W, timeStep, lambda);
        //   3. Update the position of mesh vertices based on the solution f'.
        this.updateVertexPositions(result);
      } catch (e) {
        console.error(e)
      }
    }
  }

  updateVertexPositions(result) {
    for (const v of this.vertices) {
      let resultX = result.get(v.idx, 0)
      let resultY = result.get(v.idx, 1)
      let resultZ = result.get(v.idx, 2)
      let currentPosition = v.position
      currentPosition.x = (resultX)
      currentPosition.y = (resultY)
      currentPosition.z = (resultZ)
    }
  }

  solveLinearEquation(M, W, timeStep, lambda) {
    let f = M.plus(W.timesReal(timeStep).timesReal(lambda))
    let cholskyDecompositionMatrix = f.chol()

    let b = DenseMatrix.zeros(this.vertsOrig.length, 3)

    for (const v of this.vertsOrig) {
      b.set(v.position.x, v.idx, 0)
      b.set(v.position.y, v.idx, 1)
      b.set(v.position.z, v.idx, 2)
    }

    let result = cholskyDecompositionMatrix.solvePositiveDefinite(M.timesDense(b))

    return result;
  }
}
