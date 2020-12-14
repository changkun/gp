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
    return this.twin.vertex.position.sub(this.vertex.position)
  }


  cotan() {
    if (this.onBoundary) {
      return 0
    }
    const u = this.prev.getVector()
    const v = this.next.getVector().scale(-1)
    return u.dot(v) / u.cross(v).norm()
  }

  getAngle() {
    let a = this.getVector()
    let b = this.prev.twin.getVector()
    let dot = a.unit().dot(b.unit())
    return Math.acos(dot)
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

  getAreaTriangle() {
    const a = this.halfedge.vertex.position
    const b = this.halfedge.next.vertex.position
    let c = a.cross(b)
    return Math.abs(Math.pow(c.x, 2) + Math.pow(c.y, 2) + Math.pow(c.z, 2)) / 2
  }

  getNormalTriangle() {
    let x = this.halfedge.getVector()
    let y = this.halfedge.prev.twin.getVector()

    return x.cross(y)
  }

}

class Vertex {
  constructor() {
    this.position = null // Vector
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
  }
  normal(method='equal-weighted') {
    /*
    let n = new Vector()
    switch (method) {
    case 'equal-weighted':
      // TODO: compute euqally weighted normal of this vertex

    case 'area-weighted':
      // TODO: compute area weighted normal of this vertex

    case 'angle-weighted':
      // TODO: compute angle weighted normal of this vertex

    default: // undefined
      return new Vector()
    }*/
    let sum = new Vector()

    switch (method) {
      case 'equal-weighted':
        // TODO: compute euqally weighted normal of this vertex
        this.forEachHalfEdge((currentHalfEdge) => {
          sum = sum.add(currentHalfEdge.face.getNormalTriangle());
        })
        break;
      case 'area-weighted':
        // TODO: compute area weighted normal of this vertex
        this.forEachHalfEdge((currentHalfEdge) => {
          sum = sum.add(currentHalfEdge.face.getNormalTriangle().scale(currentHalfEdge.face.getAreaTriangle()));
        })

        break;
      case 'angle-weighted':
        // TODO: compute angle weighted normal of this vertex
        this.forEachHalfEdge((currentHalfEdge) => {
          sum = sum.add(currentHalfEdge.face.getNormalTriangle().scale(currentHalfEdge.getAngle()));
        })
        break;
      default: // undefined
        return new Vector()
    }

    return sum.scale(1 / sum.norm())
  }

  curvature(method = 'Mean') {
    switch (method) {
      case 'Mean':
        return this.calculateMeanCurvature()
      case 'Gaussian':
        return this.calculateGaussianCurvature()
      case 'Kmin':
        return this.calculateK(1)
      case 'Kmax':
        return this.calculateK(2)
      default: // undefined
        return 0
    }
  }

  // TODO: you can add more methods if you need here



  calculateK(num) {
    let h = this.calculateMeanCurvature()
    let k = this.calculateGaussianCurvature()

    switch (num) {
      case 1:
        return h - Math.sqrt(Math.pow(h, 2) - k)
      case 2:
        return h + Math.sqrt(Math.pow(h, 2) - k)
      default:
        return 0
    }
  }

  calculateGaussianCurvature() {
    let sum = 0
    this.forEachHalfEdge((currentHalfEdge) => {
      sum += currentHalfEdge.getAngle();
    })

    return (2 * Math.PI) - sum
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

  calculateMeanCurvature() {
    let angleDefect = this.calculateGaussianCurvature()
    let clb = this.cotanLaplaceBeltrami()

    if (angleDefect < 0) {
      return -clb
    }
    return clb
  }

  cotanLaplaceBeltrami() {
    const area = this.calculateVoronoiArea()
    let sum = new Vector()
    this.forEachHalfEdge(currentHalfEdge => {
      sum = sum.add(currentHalfEdge.getVector().scale(currentHalfEdge.cotan() + currentHalfEdge.twin.cotan()))
    })
    let cotanLaplaceBeltrami = sum.norm() * 0.5 / area

    return cotanLaplaceBeltrami
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
            this.vertsOrig.push(values)
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
    } catch (e) {
      console.error(e)
    }
  }
  /**
   * laplaceMatrix returns the Laplace matrix for a given laplaceType
   * @param {string} weightType indicates the type of the weight for
   * constructing the Laplace matrix. Possible value could be:
   * 'uniform', 'cotan'.
   */
  laplaceMatrix(weightType) {
    // TODO: construct the Laplace matrix.
    const numberOfVertices = this.vertices.length
    let weightTriplet = new Triplet(numberOfVertices, numberOfVertices)

    for (const vert of this.vertices) {
      const i = vert.idx
      let sum = 1e-8 // Tikhonov regularization to get strict positive definite

      vert.halfedges(h => {
        let w = 0

        switch (weightType) {
          case 'uniform':
            w = 1
            break
          case 'cotan':
            w = (h.cotan() + h.twin.cotan())/2
        }

        sum += w

        weightTriplet.addEntry(w, i, h.twin.vertex.idx)
      })
      weightTriplet.addEntry(-sum, i, i)
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
          massTriplet.addEntry(vert.calculateVoronoiArea(),i,i)
      }
    }

    let massMatrix = SparseMatrix.fromTriplet(massTriplet)

    return massMatrix
  }


  getWeightAndMassMatrix(weightType){
    switch (weightType) {
      case 'uniform':
        return this.calcUniformMatrices()
      case 'cotan':
        return this.calcCotanMatrices()
      default:
        return this.calcUniformMatrices()
    }
  }

  calcCotanMatrices(){
    const numberOfVertices = this.vertices.length
    let massTriplet = new Triplet(numberOfVertices, numberOfVertices)
    let weightTriplet = new Triplet(numberOfVertices, numberOfVertices)

    for (let i = 0; i < this.vertices.length; i++)
    {
      let vertex = this.vertices[i]
      let neighbours = 0
      let sum = 1e-8 // Tikhonov regularization to get strict positive definite


      vertex.forEachHalfEdge((currentHalfEdge) => {
        neighbours++
        let wij= (currentHalfEdge.cotan() + currentHalfEdge.twin.cotan()) / 2
        sum += wij
        weightTriplet.addEntry(wij, i,currentHalfEdge.idx)
      })

      weightTriplet.addEntry(-sum, i,i)

      massTriplet.addEntry(vertex.calculateVoronoiArea(),i,i)
    }

    let massMatrix = SparseMatrix.fromTriplet(massTriplet)
    let weightMatrix = SparseMatrix.fromTriplet(weightTriplet)

    return [massMatrix,weightMatrix]
  }

  calcLaplaceCotanMatrix(){
    let [M,W] = this.calcCotanMatrices()
    return M.timesSparse(W)
  }


  calcUniformMatrices(){
    const numberOfVertices = this.vertices.length
    let massTriplet = new Triplet(numberOfVertices, numberOfVertices)
    let weightTriplet = new Triplet(numberOfVertices, numberOfVertices)

    for (let i = 0; i < numberOfVertices; i++)
    {
      let vertex = this.vertices[i]
      let sum = new Vector()

        let neighbours = 0
        vertex.forEachHalfEdge((_,neighbourVertex) => {
          neighbours++

          weightTriplet.addEntry(1, i,neighbourVertex.idx)
        })

        weightTriplet.addEntry(-neighbours, i,i)
        massTriplet.addEntry(neighbours,i,i)


    }

    let massMatrix = SparseMatrix.fromTriplet(massTriplet)
    let weightMatrix = SparseMatrix.fromTriplet(weightTriplet)

    return [massMatrix,weightMatrix]
  }

  calcLaplaceUniformMatrix(){
    let [M,W] = this.calcUniformMatrices()
    return M.timesSparse(W)
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
    // TODO: implmeent the Laplacian smoothing algorithm.
    //
    // Hint:
    //
    //   1. Construct the Laplace matrix `L` for the given `weightType`

    let L = this.laplaceMatrix(weightType)
    let [M, W] = this.getWeightAndMassMatrix(weightType)
    //   2. Solve linear equation: (I-tλL) f' = f using a Cholesky solver.
    let f = M - W.timesReal(timeStep)
    let cholskyDecompositionMatrix = f.chol()
    let result = cholskyDecompositionMatrix.solvePositiveDefinite(smoothStep)

    //   3. Update the position of mesh vertices based on the solution f'.
    //



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
