import Vector from './vector'

class Halfedge {
    /**constructor() {
        this.vertex = null // Vertex
        this.edge = null // Edge
        this.face = null // Face
        this.prev = null   // Halfedge
        this.next = null   // Halfedge
        this.twin = null   // Halfedge
        this.idx = -1     // Number
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

    // NOTE: you can add more methods if you need here

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

    getAreaTriangle() {
        const a = this.halfedge.vertex.position
        const b = this.halfedge.next.vertex.position
        let c = a.cross(b)
        return Math.abs(Math.pow(c.x, 2) + Math.pow(c.y, 2) + Math.pow(c.z, 2)) / 2
    }

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
        this.idx = -1   // Number
    }

    normal(method = 'equal-weighted') {
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
                // TODO: compute mean curvature
                return this.calculateMeanCurvature()
            case 'Gaussian':
                // TODO: compute Guassian curvature
                return this.calculateGaussianCurvature()
            case 'Kmin':
                // TODO: compute principal curvature and return Kmin
                return this.calculateK(1)
            case 'Kmax':
                // TODO: compute principal curvature and return Kmax
                return this.calculateK(2)
            default: // undefined
                return 0
        }
    }

    // NOTE: you can add more methods if you need here

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
        this.vertices = [] // an array of Vertex object
        this.edges = [] // an array of Edge object
        this.faces = [] // an array of Face object
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
        } catch (e) {
            console.error(e)
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
