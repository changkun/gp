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
  // TODO: you can add more methods if you need here

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

  }
  // TODO: you can add more methods if you need here

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
      // TODO: compute euqally weighted normal of this vertex

    case 'area-weighted':
      // TODO: compute area weighted normal of this vertex

    case 'angle-weighted':
      // TODO: compute angle weighted normal of this vertex

    default: // undefined
      return new Vector()
    }
    // let n = new Vector()
    // switch (method) {
    // case 'equal-weighted':
    //   this.faces(f => { n = n.add(f.normal()) })
    //   return n.unit()
    // case 'area-weighted':
    //   this.faces(f => { n = n.add(f.normal().scale(f.area())) })
    //   return n.unit()

    // case 'angle-weighted':
    //   this.halfedges(h => {
    //     n = n.add(h.face.normal().scale(h.next.angle()))
    //   })
    //   return n.unit()

    // default: // undefined
    //   return n
    // }
  }
  // TODO: you can add more methods if you need here

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
    // TODO: implement the Tutte's barycentric embedding algorithm.
    //
    // Hint:
    // 1. check if the mesh contains a boundary
    // 2. compute boundary uv coordinates depending on the boundary type
    // 3. compute matrix depending on the laplacian weight type
    // 4. solve linear equation and assing computed uv as vertex uv
    //

  }
}
