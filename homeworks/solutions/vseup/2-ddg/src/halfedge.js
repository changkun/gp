import Vector from './vector'

class Halfedge {
  constructor() {
    this.vertex = null // Vertex
    this.edge = null // Edge
    this.face = null // Face

    this.prev = null   // Halfedge
    this.next = null   // Halfedge
    this.twin = null   // Halfedge
    this.idx = -1     // Number

    // Hint: try use this variable to record if a halfedge is on the boundary
    this.onBoundary = false // Boolean
  }
  // NOTE: you can add more methods if you need here
}

class Edge {
  constructor() {
    this.halfedge = null // Halfedge
    this.idx = -1   // Number
  }
  // NOTE: you can add more methods if you need here
}

class Face {
  constructor() {
    this.halfedge = null // Halfedge
    this.idx = -1   // Number
  }
  // NOTE: you can add more methods if you need here
  /**
   * applies the given function to all vertices of the face
   * @param {*} fn 
   */
  vertices(fn) {
    let v1 = this.halfedge.vertex;
    let v2 = this.halfedge.next.vertex;
    let v3 = this.halfedge.prev.vertex;
    let vertices = [v1, v2, v3];
    for (let i = 0; i < vertices.length; i++) {
      fn(vertices[i], i);
    }
  }
  /**
   * returns the face normal
   */
  getNormal() {
    let v1 = this.halfedge.vertex.position;
    let v2 = this.halfedge.next.vertex.position;
    let v3 = this.halfedge.prev.vertex.position;

    let u = v2.sub(v1);
    let v = v3.sub(v2);

    let result = u.cross(v).unit();

    return result
  }
  /**
   * returns the area of a face
   */
  getArea() {
    let v1 = this.halfedge.vertex.position;
    let v2 = this.halfedge.next.vertex.position;
    let v3 = this.halfedge.prev.vertex.position;

    let u = v2.sub(v1);
    let v = v3.sub(v1);

    let result = 0.5 * u.cross(v).norm();
    return result;

  }
  /**
   * get specific angle of triangle face corners
   * @param {number} idx idx of the vertex on the corner for which the angle should be calculated
   * @returns {number} the angle inside the triangle face at the given vertex
   */
  getAngle(idx) {

    let halfedges = [this.halfedge, this.halfedge.next, this.halfedge.prev];
    let start = halfedges.find(el => el.vertex.idx === idx);

    let v1 = start.vertex.position;
    let v2 = start.next.vertex.position;
    let v3 = start.prev.vertex.position;

    let u = v2.sub(v1);
    let v = v3.sub(v1);

    var dot = u.dot(v);
    let result = Math.acos(dot / (u.norm() * v.norm()));
    return result;

  }
  /**
   * returns circumcenter of face
   */
  getCircumCenter() {
    //https://math.stackexchange.com/questions/1614680/coordinates-of-circumcentre-of-an-isosceles-triangle-in-3d

    let vertices = this.getVertices();

    let vertexA = vertices[0].position;
    let vertexB = vertices[1].position;
    let vertexC = vertices[2].position;

    let barycenter = this.getBaryCenter();
    let scale = 1 / (barycenter.x + barycenter.y + barycenter.z);

    let result = vertexA.scale(barycenter.x).add(vertexB.scale(barycenter.y).add(vertexC.scale(barycenter.z)));
    result = result.scale(scale);

    return result;

  }
  /**
   * returns barrycenter of face
   */
  getBaryCenter() {

    let vertices = this.getVertices();

    let vertexA = vertices[0].position;
    let vertexB = vertices[1].position;
    let vertexC = vertices[2].position;

    let lengthBC = vertexB.sub(vertexC).norm();
    let lengthCA = vertexC.sub(vertexA).norm();
    let lengthAB = vertexA.sub(vertexB).norm();

    let barry1 = lengthBC * lengthBC * (lengthCA * lengthCA + lengthAB * lengthAB - lengthBC * lengthBC);
    let barry2 = lengthCA * lengthCA * (lengthAB * lengthAB + lengthBC * lengthBC - lengthCA * lengthCA);
    let barry3 = lengthAB * lengthAB * (lengthBC * lengthBC + lengthCA * lengthCA - lengthAB * lengthAB);

    let barycenter = new Vector(barry1, barry2, barry3);

    return barycenter;

  }
  /**
   * returns all 3 vertices of the face
   */
  getVertices() {
    let halfedges = [this.halfedge, this.halfedge.next, this.halfedge.prev];
    let vertexA = halfedges[0].vertex;
    let vertexB = halfedges[1].vertex;
    let vertexC = halfedges[2].vertex;
    return [vertexA, vertexB, vertexC];
  }
}

class Vertex {
  constructor() {
    this.position = null // Vector
    this.halfedge = null // Halfedge
    this.idx = -1   // Number
  }
  normal(method = 'equal-weighted') {

    let incidentFaces = this.getIncidentFaces();
    let normalSum = new Vector();

    switch (method) {
      case 'equal-weighted':

        // TODO: compute euqally weighted normal of this vertex
        for (let face of incidentFaces) {
          normalSum = normalSum.add(face.getNormal());
        }
        return normalSum.unit();

      case 'area-weighted':

        // TODO: compute area weighted normal of this vertex

        for (let face of incidentFaces) {
          let area = face.getArea();
          normalSum = normalSum.add(face.getNormal().scale(area));
        }
        return normalSum.unit();

      case 'angle-weighted':
        // TODO: compute angle weighted normal of this vertex

        for (let face of incidentFaces) {
          let angle = face.getAngle(this.idx);
          normalSum = normalSum.add(face.getNormal().scale(angle));
        }
        return normalSum.unit();


      default: // undefined
        return new Vector()
    }
  }
  curvature(method = 'Mean') {

    let H = this.getMeanCurvature();
    let K = this.getGaussianCurvature();

    switch (method) {
      case 'Mean':
        // TODO: compute mean curvature
        return K < 0 ? -H : H

      case 'Gaussian':
        // TODO: compute Guassian curvature
        return K;

      case 'Kmin':
        // TODO: compute principal curvature and return Kmin
        return H - Math.sqrt(Math.abs(H * H - K));

      case 'Kmax':
        // TODO: compute principal curvature and return Kmax
        return H + Math.sqrt(Math.abs(H * H - K));

      default: // undefined
        return 0
    }
  }

  // NOTE: you can add more methods if you need here
  /**
   * returns all faces incident to the vertex
   */
  getIncidentFaces() {
    let incidentFaces = [];
    let start = this.halfedge;
    let current = this.halfedge;
    do {
      if (current.face !== null) {
        incidentFaces.push(current.face)
      }
      current = current.prev.twin;
    } while (current !== start)
    return incidentFaces;
  }
  /**
   * calculates the voronoi cell area around the vertex
   */
  getAreaOfVoronoiCell() {
    let faces = this.getIncidentFaces();
    let circumcenters = [];

    for (let face of faces) {
      circumcenters.push(face.getCircumCenter());
    }

    let voronoiArea = 0;

    for (let i = 0; i < circumcenters.length; i++) {

      let vertexA = this.position;
      let vertexB = circumcenters[i];
      let vertexC;

      if (i === circumcenters.length - 1) {
        vertexC = circumcenters[0];
      } else {
        vertexC = circumcenters[i + 1];
      }

      let lengthBC = vertexB.sub(vertexC).norm();
      let lengthCA = vertexC.sub(vertexA).norm();
      let lengthAB = vertexA.sub(vertexB).norm();

      let area = 0.5 * (lengthBC + lengthCA + lengthAB);

      voronoiArea += area;
    }

    return voronoiArea;

  }
  /**
   * calculates laplace beltrami operator
   */
  getLaplaceBeltrami() {

    let part1 = 1 / (2 * this.getAreaOfVoronoiCell());

    let faces = this.getIncidentFaces();

    let part2 = new Vector();

    for (let i = 0; i < faces.length; i++) {
      let halfedges = [faces[i].halfedge, faces[i].halfedge.next, faces[i].halfedge.prev];
      let start = halfedges.find(el => el.vertex.idx === this.idx);

      let vertexJ = start.prev.vertex;

      let alpha = faces[i].getAngle(start.next.vertex.idx);
      let betha;
      if (i === faces.length - 1) {
        betha = faces[0].getAngle(start.prev.twin.prev.vertex.idx);
      } else {
        betha = faces[i + 1].getAngle(start.prev.twin.prev.vertex.idx);
      }

      let cotAlpha = 1 / Math.tan(alpha);
      let cotBetha = 1 / Math.tan(betha);

      part2 = part2.add(this.position.sub(vertexJ.position).scale(cotAlpha + cotBetha));

    }

    return part2.scale(part1);

  }
  /**
   * returns mean curvature at vertex
   */
  getMeanCurvature() {
    return 0.5 * this.getLaplaceBeltrami().norm();
  }
  /**
   * returns gaussian curvature at vertex
   */
  getGaussianCurvature() {
    let incidentFaces = this.getIncidentFaces();
    let angleSum = 0;
    for (let face of incidentFaces) {
      angleSum += face.getAngle(this.idx);
    }
    return 2 * Math.PI - angleSum;
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
    this.vertices = [] // an array of Vertex object
    this.edges = [] // an array of Edge object
    this.faces = [] // an array of Face object
    this.halfedges = [] // an array of Halfedge object

    // TODO: read .obj format and construct its halfedge representation

    let lines = data.split('\n');

    console.log("started processing obj.file - this might take some time...")

    for (let line of lines) {
      line = line.trim()
      const tokens = line.split(' ');
      let identifier = tokens[0].trim();
      switch (identifier) {
        case 'v':

          let vertex = new Vertex();

          let idx = this.vertices.length;
          vertex.idx = idx;

          let position = new Vector(
            parseFloat(tokens[1]),
            parseFloat(tokens[2]),
            parseFloat(tokens[3]),
            1
          )
          vertex.position = position;

          this.vertices.push(vertex);

          continue

        case 'f':

          let verticesOfFace = [];
          for (let i = 1; i < tokens.length; i++) {

            let vidx = tokens[i].split('/')[0].trim() - 1;
            verticesOfFace.push(vidx);
          }

          this.addFace(verticesOfFace);

          continue;

      }

    }

    this.findOrCreateTwinsForExistingHalfedges();

    this.definePrevAndNextForHalfedgesAtBoundary();

    console.log("finished processing obj-file");

  }

  /**
   * adds a Face to the mesh's face list
   * @param {number[]} vidxs idxs of the face's vertices
   */
  addFace(vidxs) {

    let face = new Face();
    face.idx = this.faces.length;

    this.addInnerHalfedgesOfFace(face, vidxs);

    this.faces.push(face);

  }

  /** adds inner halfedges of a face to mesh's halfedge list
   *  halfedge already has 
   *  - idx
   *  - vertex
   *  - face
   *  - next 
   *  - prev
   * while
   *  - twin
   *  - edge
   *  - onBoundry are still missing
   * 
   * @param {Face} face face
   * @param {number[]} vidxs idxs of the face's vertices
   */
  addInnerHalfedgesOfFace(face, vidxs) {

    let lastHalfedge = null;

    for (let i = 0; i < vidxs.length; i++) {
      let halfedge = new Halfedge();
      halfedge.idx = this.halfedges.length;
      halfedge.vertex = this.vertices[vidxs[i]];
      this.vertices[vidxs[i]].halfedge = halfedge;
      halfedge.face = face;

      if (i !== 0) {
        lastHalfedge.next = halfedge;
        halfedge.prev = lastHalfedge;
      } else {
        face.halfedge = halfedge;
      }

      lastHalfedge = halfedge;
      this.halfedges.push(halfedge);
    }
    lastHalfedge.next = face.halfedge;
    face.halfedge.prev = lastHalfedge;
  }

  /**
   * if twin already exists in halfeedge list connect both twins
   * if twin doesnt exists, create a new halfedge
   * in both cases create new edge
   */
  findOrCreateTwinsForExistingHalfedges() {

    let stopAt = this.halfedges.length;

    for (let i = 0; i < stopAt; i++) {

      let source = this.halfedges[i].vertex.idx;
      let target = this.halfedges[i].next.vertex.idx;

      let twin = this.halfedges.find(el => el.vertex.idx === target && el.next.vertex.idx === source)

      if (twin !== undefined) {
        twin.twin = this.halfedges[i];
        this.halfedges[i].twin = twin;
        this.halfedges[i].onBoundary = false;
        twin.onBoundary = false;

        let edge = new Edge();
        edge.idx = this.edges.length;
        edge.halfedge = this.halfedges[i];

        twin.edge = edge;
        this.halfedges[i].edge = edge;

        this.edges.push(edge);
      } else {

        twin = new Halfedge();
        twin.idx = this.halfedges.length;
        twin.vertex = this.vertices[target];
        twin.twin = this.halfedges[i];
        this.halfedges[i].twin = twin;
        twin.onBoundary = true;
        this.halfedges[i].onBoundary = true;

        let edge = new Edge();
        edge.idx = this.edges.length;
        edge.halfedge = this.halfedges[i];

        twin.edge = edge;
        this.halfedges[i].edge = edge;

        this.halfedges.push(twin);
        this.edges.push(edge);

      }

    }

  }

  /**
   * defines prev and next property of halfedges at boundry
   * CAUTION: this only works for meshes with only one hole!
   */
  definePrevAndNextForHalfedgesAtBoundary() {

    let halfedgesWithoutFace = this.halfedges.filter(el => el.face === null)

    for (let halfedge of halfedgesWithoutFace) {
      let next = halfedgesWithoutFace.find(el => el.vertex === halfedge.twin.vertex);
      let prev = halfedgesWithoutFace.find(el => el.twin.vertex === halfedge.vertex);
      this.halfedges[halfedge.idx].next = this.halfedges[next.idx];
      this.halfedges[halfedge.idx].prev = this.halfedges[prev.idx];
    }

  }
}
