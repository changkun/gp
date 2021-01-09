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

  }
  // TODO: you can add more methods if you need here

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
      // TODO: compute euqally weighted normal of this vertex

    case 'area-weighted':
      // TODO: compute area weighted normal of this vertex

    case 'angle-weighted':
      // TODO: compute angle weighted normal of this vertex

    default: // undefined
      return new Vector()
    }
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

    // TODO: build halfedge mesh structure
  }
  /**
   * simplify implements the QEM simplification algorithm.
   * @param {number} reduceRatio reduceRatio indicates how much faces
   * should be removed.
   */
  simplify(reduceRatio) {
    // TODO: implement the QEM simplification
  }
}