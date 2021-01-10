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
    this.uv       = null // Vector
    this.halfedge = null // Halfedge
    this.idx      = -1   // Number
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
    this.vertices  = [] // an array of Vertex object
    this.edges     = [] // an array of Edge object
    this.faces     = [] // an array of Face object
    this.halfedges = [] // an array of Halfedge object
    this.boundaries= [] // an array of boundary loops
    let n_bcycles = 0;


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

    this.vertices   = new Array(positions.length) // for update
    this.edges      = new Array(edges.size)
    this.faces      = new Array(indices.length / 3)
    this.halfedges  = new Array(edges.size*2)

    const idx2vert = new Map()
    for (let i = 0; i < positions.length; i++) {
      const v = new Vertex()
      v.uv = new Vector(0,0,0) // TODO calc uv
      v.position = positions[i]
      this.vertices[i] = v
      idx2vert.set(i, v)
    }

    let edgeIndex = 0
    let edgeCount = new Map()
    let existedHalfedges = new Map()
    let hasTwinHalfedge = new Map()

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
        hasTwinHalfedge.set(he, false) // record if the twin of this half edge is constructed

        // point halfedge and vertex a to each other
        const v = idx2vert.get(a)
        he.vertex = v
        v.halfedge = he

        // point halfedge and face to each other
        he.face = f
        f.halfedge = he

        // swap if index a > b, for twin checking
        if (a > b) {
          let tmp = b
          b = a
          a = tmp
        }
        const edgeKey = `${a}-${b}`
        if (existedHalfedges.has(edgeKey)) {
          // if a halfedge between a and b has been created before, then
          // it is the twin halfedge of the current halfedge
          const twin = existedHalfedges.get(edgeKey)
          he.twin = twin
          twin.twin = he
          he.edge = twin.edge

          hasTwinHalfedge.set(he, true)
          hasTwinHalfedge.set(twin, true)
          edgeCount.set(edgeKey, edgeCount.get(edgeKey)+1)
        } else {
          // this is a new halfedge, create the edge
          const e = new Edge()
          this.edges[edgeIndex] = e
          edgeIndex++
          he.edge = e
          e.halfedge = he

          // record newly created edge and halfedge from a to b
          existedHalfedges.set(edgeKey, he)
          edgeCount.set(edgeKey, 1)
        }

        // error checking
        if (edgeCount.get(edgeKey) > 2) {
          throw 'the mesh contains non-manifold edges'
        }
      }
    }

    // create boundary halfedges and "fake" faces for the boundary cycles
    let halfedgeIndex = indices.length
    for (let i = 0; i < indices.length; i++) {
      // if a halfedge has no twin, create a new face and link it
      // the corresponding boundary cycle

      const he = this.halfedges[i]
      if (!hasTwinHalfedge.get(he)) {
        n_bcycles++
        // create face
        const f = new Face()

        // walk along boundary cycle
        let boundaryCycle = []
        let current = he
        do {
          const boundaryHalfedge = new Halfedge()
          this.halfedges[halfedgeIndex] = boundaryHalfedge
          halfedgeIndex++
          boundaryCycle.push(boundaryHalfedge)
          // this.boundaries.push(boundaryHalfedge)

          // grab the next halfedge along the boundary that does not
          // have a twin halfedge
          let nextHe = current.next
          while (hasTwinHalfedge.get(nextHe)) {
            nextHe = nextHe.twin.next
          }

          // set the current halfedge's attributes
          boundaryHalfedge.vertex = nextHe.vertex
          boundaryHalfedge.edge = current.edge
          boundaryHalfedge.onBoundary = true

          // point the new halfedge and face to each other
          boundaryHalfedge.face = f
          f.halfedge = boundaryHalfedge

          // point the new halfedge and twin to each other
          boundaryHalfedge.twin = current
          current.twin = boundaryHalfedge

          current = nextHe
        } while (current != he)
        this.boundaries.push(boundaryCycle)

        // link the cycle of boundary halfedges together
        const n = boundaryCycle.length
        for (let j = 0; j < n; j++) {
          boundaryCycle[j].next = boundaryCycle[(j + n - 1) % n]
          boundaryCycle[j].prev = boundaryCycle[(j + 1) % n]
          hasTwinHalfedge.set(boundaryCycle[j], true)
          hasTwinHalfedge.set(boundaryCycle[j].twin, true)
        }

        // TODO add to boundaries
        // for (let i = 0; i < this.halfedges.length; i++){
        //   if(this.halfedges[i].onBoundary) // TODO integrate into boundary linking a few steps before
        //     this.boundaries.push(this.halfedges[i])
        // }
      }
    }
    // allocate indices for all elements
    let index = 0
    this.vertices.forEach(v => {
      v.idx = index++
    })
    index = 0
    this.edges.forEach(e => {
      e.idx = index++
    })
    index = 0
    this.faces.forEach(f => {
      f.idx = index++
    })
    index = 0
    this.halfedges.forEach(he => {
      he.idx = index++
    })

    console.log("n_bcycles: " + n_bcycles)
    console.log("calc boundary")

    // calc boundary
    // for (let i = 0; i < this.halfedges.length; i++){
    //   if(this.halfedges[i].onBoundary) // TODO integrate into boundary linking a few steps before
    //     this.boundaries.push(this.halfedges[i])
    // }
    console.log("boundrary length: " + this.boundaries.length)

    console.log("finished mesh parsing")

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

    // 1.
    if(this.boundaries.length <= 0)
      return;

    // 2. compute boundary UVs
    let U = DenseMatrix.zeros(this.vertices.length,1)
    let V = DenseMatrix.zeros(this.vertices.length,1)

    // let r2 = 1
    // let utest = function(step) {
    //   return (r2*Math.cos(2*Math.PI * step/80) +1)/2
    // }
    // console.log("ustest: %f / %f / %f / %f", utest(0),utest(20),utest(40),utest(60))
    //
    // let vtest = function(step) {
    //   return (r2*Math.sin(2*Math.PI * step/80) +1)/2
    // }
    // console.log("vstest: %f / %f / %f / %f", vtest(0),vtest(20),vtest(40),vtest(60))

    let n_bound_edges = this.boundaries[0].length

    switch (boundaryType) {
      case 'disk':
        const r = 0.5
          console.log("n_bound_edges: %f",n_bound_edges);
        this.boundaries[0].forEach((hf, i) => {
          let angle = 2*Math.PI*i/n_bound_edges
          // v1
          // let u = (r*Math.cos(2*Math.PI * i/n_bound_edges)) +0.5
          // let v = (r*Math.sin(2*Math.PI * i/n_bound_edges)) +0.5
          let u = (Math.cos(2*Math.PI * i/n_bound_edges))
          let v = (Math.sin(2*Math.PI * i/n_bound_edges))
          // u= Math.min(Math.max(u, -1), 1)
          // v= Math.min(Math.max(v, -1), 1)
          u = (u+1)/2 // normalize to [0,1]
          v = (-v+1)/2
          hf.vertex.uv.x = u
          hf.vertex.uv.y = v
          U.set(u, hf.vertex.idx,0)
          V.set(v, hf.vertex.idx,0)

          // v2
          // let x = (r*Math.cos(2*Math.PI*i/n_bound_edges)) + 0.5
          // let y = (r*Math.sin(2*Math.PI*i/n_bound_edges)) + 0.5
          // hf.vertex.uv.x= x
          // hf.vertex.uv.y= y
          // U.set(x, hf.vertex.idx, 0)
          // V.set(y, hf.vertex.idx, 0)

          // console.log("i: %i uv [%f,%f] angle: %f",i,u,v,angle*(180/Math.PI))
        })
        break
      case 'rect':
        let verts_per_side = n_bound_edges / 4
        this.boundaries[0].forEach((hf, i) => {
          let deg_rad_u = (Math.cos(2*Math.PI * i/n_bound_edges))
          let deg_rad_v = (Math.sin(2*Math.PI * i/n_bound_edges))

          let u = deg_rad_u;
          let v = deg_rad_v;

          let sq = Math.sqrt(2)/2 //0.7071067812// // sqrt(2)/2M

          // works but could be nicer
          if(deg_rad_u < -sq){
            u = 0; // l
            v = (v+1)/2
          } else if (deg_rad_u > sq){
            u = 1; // r
            v = (v+1)/2
          } else if (deg_rad_v >= sq){
            u = (u+1)/2 // normalize to [0,1]
            v = 1; // t
          } else { //if (deg_rad_v <= -sq){
            u = (u+1)/2 // normalize to [0,1]
            v = 0; // b
          }
          // fixme edges are cutoff
          // TODO instead of calculating angle use an offset ( no calcs needed similar result)

          // u = (u+1)/2 // normalize to [0,1]
          // v = (v+1)/2
          hf.vertex.uv.x = u
          hf.vertex.uv.y = v
          U.set(u, hf.vertex.idx,0)
          V.set(v, hf.vertex.idx,0)
        })
        break
      default:
          break
    }

    // 3. calc laplace matrix
    let mat_L = this.laplaceMatrixAlt(laplaceWeight, U, V)
    let mat_M = this.massMatrix(laplaceWeight)

      // 4. solve equation
    let lu = mat_L.lu()
    let solved_u =  lu.solveSquare(U)
    let solved_v =  lu.solveSquare(V)

    // apply
    let min_u = 99999999999
    let max_u = -99999999999
    // this.printHalfedges()


    for (let i = 0; i < this.vertices.length; i++) {
      let current_uv = this.vertices[i].uv
      min_u = Math.min(solved_u.get(i),min_u)
      max_u = Math.max(solved_u.get(i),max_u)
      if(i == 976){
        let foo = solved_u.get(976)
        let bar = solved_v.get(976)
        console.log("976: [%f,%f]",foo,bar)
      }

      current_uv.x = solved_u.get(i)
      current_uv.y = solved_v.get(i)
    }
    console.log("min: %f max: %f", min_u, max_u)
  }

  /**
   * laplaceMatrix returns the Laplace matrix for a given laplaceType
   * @param {string} weightType indicates the type of the weight for
   * constructing the Laplace matrix. Possible value could be:
   * 'uniform', 'cotan'.
   *
   * @returns {SparseMatrix}
   */
  laplaceMatrix(weightType) {
    const n = this.vertices.length
    let T = new Triplet(n, n)
    for (const vert of this.vertices) {
      const i = vert.idx
      let sum = 1e-8
        vert.halfedges(h => {
          let w = 0
          switch (weightType) {
            case 'uniform':
              w = 1
              break
            case 'cotan':
              w = (h.cotan() + h.twin.cotan()) / 2
          }
          sum += w
          T.addEntry(-w, i, h.twin.vertex.idx)
        })
        T.addEntry(sum, i, i)

    }

    return SparseMatrix.fromTriplet(T)
  }

  laplaceMatrixAlt(weightType, U, V) {
    const n = this.vertices.length
    let T = new Triplet(n, n)
    for (const vert of this.vertices) {
      const i = vert.idx
      let sum = 1e-8

      if (U.get(i) !== 0 || V.get(i) !== 0) {
        T.addEntry(1, i, i);
      }else {
        vert.halfedges(h => {
          let w = 0
          switch (weightType) {
            case 'uniform':
              w = 1
              break
            case 'cotan':
              w = (h.cotan() + h.twin.cotan()) / 2
          }
          sum += w
          T.addEntry(-w, i, h.twin.vertex.idx)
        })
        T.addEntry(sum, i, i)
      }
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
          // if I implement it according to the slides (only Area) the result becomes too smooth
          T.addEntry(1+w,i,i); // only w is too small -> too big changes in mesh; 1/w too big -> no noticeable changes
          break;
      }
    }
    return SparseMatrix.fromTriplet(T);
  }

}
