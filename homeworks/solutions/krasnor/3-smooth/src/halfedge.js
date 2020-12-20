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
  angle() {
    const u = this.prev.vector().unit()
    const v = this.next.vector().scale(-1).unit()
    return Math.acos(Math.max(-1, Math.min(1, u.dot(v))))
  }
  cotan() {
    if (this.onBoundary) {
      return 0
    }
    const u = this.prev.vector()
    const v = this.next.vector().scale(-1)
    return u.dot(v) / u.cross(v).norm()
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
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
  }

  /**
   * Performs a copy of the vertex (non deep, except position)
   */
  copy(){
    let vertex_copy = new Vertex();
    vertex_copy.position = this.position.add(new Vector());
    vertex_copy.halfedge = this.halfedge;
    vertex_copy.idx = this.idx;
    return vertex_copy;
  }

  normal(method='equal-weighted') {
    let n = new Vector()
    switch (method) {
      case 'equal-weighted':
      // TODO: compute euqally weighted normal of this vertex
        this.faces(f => { n = n.add(f.normal()) })
        return n.unit()
    case 'area-weighted':
      // TODO: compute area weighted normal of this vertex
      this.faces(f => { n = n.add(f.normal().scale(f.area())) })
      return n.unit()
    case 'angle-weighted':
      // TODO: compute angle weighted normal of this vertex
      this.halfedges(h => {
        n = n.add(h.face.normal().scale(h.next.angle()))
      })
      return n.unit()

    default: // undefined
      return new Vector()
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
  voronoiCell() {
    let a = 0
    this.halfedges(h => {
      const u = h.prev.vector().norm()
      const v = h.vector().norm()
      a += (u*u*h.prev.cotan() + v*v*h.cotan()) / 8
    })
    return a
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

    // TODO: read .obj format and construct its halfedge representation
    console.log("## begin parsing")

    // 1. Pass - read vertices

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
    // 2. Pass - build mesh
    const edges = new Map()
    for (let i = 0; i < indices.length; i += 3) {
      for (let j = 0; j < 3; j++) { // check a face
        let a = indices[i + j]
        let b = indices[i + (j+1)%3]

        if (a > b) {
          let tmp = b
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
          let tmp = b
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


    for (let i_v = 0; i_v < this.vertices.length; i_v++){
      this.vertsOrig.push(this.vertices[i_v].copy());
    }

    console.log("done parsing!")
  }
  resetVertexArray(){
    // this.vertices = []; // bug! halfedges are not linked up correctly anymore -> smooth is wrong
    // for (let i_v = 0; i_v < this.vertsOrig.length; i_v++){
    //   this.vertices.push(this.vertsOrig[i_v].copy());
    // }
    for (let i = 0; i < this.vertsOrig.length; i++) {
      this.vertices[i].position.x = this.vertsOrig[i].position.x
      this.vertices[i].position.y = this.vertsOrig[i].position.y
      this.vertices[i].position.z = this.vertsOrig[i].position.z
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

    const n = this.vertices.length
    let T = new Triplet(n, n)

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
            w = (h.cotan() + h.twin.cotan())
        }
        sum += w
        T.addEntry(w, i, h.twin.vertex.idx)
      })
      T.addEntry(-sum, i, i)
    }
    return SparseMatrix.fromTriplet(T)
  }

  massMatrix(weightType){
    const n = this.vertices.length;
    let T = new Triplet(n, n);

    for (const vert of this.vertices) {
      const i = vert.idx;

      let w = 0;
      switch (weightType) {
        case 'uniform':
          // count neighbors
          vert.halfedges(() => {
            w++
          });
          T.addEntry(w,i,i);
          break;
        case 'cotan':
          // surrounding area
          w = vert.voronoiCell();

          T.addEntry(1+w,i,i); // only w is too small -> too big changes in mesh; 1/w too big -> no noticeable changes
          break;
      }
    }
    return SparseMatrix.fromTriplet(T);
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
    //   2. Solve linear equation: (I-tλL) f' = f using a Cholesky solver.
    //   3. Update the position of mesh vertices based on the solution f'.
    //
    this.resetVertexArray();

    console.log("smoothing: %s %f %f", weightType, timeStep, smoothStep)
    for (let s_step = 0; s_step < smoothStep; s_step++) {
      const n_verts = this.vertsOrig.length;

      // 1.
      let laplaceM = this.laplaceMatrix(weightType);
      let massM = this.massMatrix(weightType);

      // 2.
      let f = massM.minus(laplaceM.timesReal(timeStep));

      let b = DenseMatrix.zeros(n_verts, 3)
      for (const v of this.vertices) {
        b.set(v.position.x, v.idx, 0);
        b.set(v.position.y, v.idx, 1);
        b.set(v.position.z, v.idx, 2);
      }
      let result = f.chol().solvePositiveDefinite(massM.timesDense(b));
      // 3.
      for (let xsa = 0; xsa < n_verts; xsa++) {
        let currentPosition = this.vertices[xsa].position;

        currentPosition.x = result.get(xsa, 0);
        currentPosition.y = result.get(xsa, 1);
        currentPosition.z = result.get(xsa, 2);
      }

    }
  }


}
