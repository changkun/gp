import Vector from './vector'

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
  // NOTE: you can add more methods if you need here
}

class Edge {
  constructor() {
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
  }
  // NOTE: you can add more methods if you need here
}

class Face {
  constructor() {
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
  }
  // NOTE: you can add more methods if you need here
}

class Vertex {
  constructor() {
    this.position = null // Vector
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
  }
  normal(method='equal-weighted') {
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
  curvature(method='Mean') {
    switch (method) {
    case 'Mean':
      // TODO: compute mean curvature
    case 'Gaussian':
      // TODO: compute Guassian curvature
    case 'Kmin':
      // TODO: compute principal curvature and return Kmin
    case 'Kmax':
      // TODO: compute principal curvature and return Kmax
    default: // undefined
      return 0
    }
  }
  // NOTE: you can add more methods if you need here
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

    // TODO: read .obj format and construct its halfedge representation
  }
}
