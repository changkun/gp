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

    vertices(fn){
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
    // NOTE: you can add more methods if you need here
}

class Vertex {
    constructor() {
        this.position = null // Vector
        this.halfedge = null // Halfedge
        this.idx = -1   // Number
    }

    normal(method = 'equal-weighted') {
        switch (method) {
            case 'equal-weighted':
                // TODO: compute euqally weighted normal of this vertex
                return this.position.scale(new Vector(1, 1, 1))
            case 'area-weighted':
            // TODO: compute area weighted normal of this vertex
            case 'angle-weighted':
            // TODO: compute angle weighted normal of this vertex
            default: // undefined
                return new Vector()
        }
    }

    curvature(method = 'Mean') {
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
        this.vertices = [] // an array of Vertex object
        this.edges = [] // an array of Edge object
        this.faces = [] // an array of Face object
        this.halfedges = [] // an array of Halfedge object

        let tmpArray = data.split("\n")
        this.vertexCounter = 0
        this.faceCounter = 0
        this.edgeCounter = 0

        try {
            for (let j = 0; j < tmpArray.length; j++) {
                let line = tmpArray[j];
                //clean up
                line = line.replace("\r", "")
                let values = line.split(" ")
                let command = values[0]
                //remove command string from values
                values.shift()

                switch (command) {
                    case "v":
                        let vertex = new Vertex()
                        vertex.position = new Vector(parseFloat(values[0]), parseFloat(values[1]), parseFloat(values[2]))
                        vertex.idx = this.vertexCounter
                        this.vertexCounter++
                        this.vertices.push(vertex)
                        break;

                    case "vt":
                        break;

                    case "vn":
                        break;

                    case "f":
                        let face = new Face()
                        face.idx = this.faceCounter
                        this.faceCounter++

                        let faceVertexIds = []
                        let faceVertices = []
                        //v: 0 vt: 1 vn: 2
                        values.forEach((value) => {
                            faceVertexIds.push(value.split("/"))
                        })
                        faceVertexIds.forEach((vertexId) => {
                            faceVertices.push(this.vertices[vertexId[0] - 1])
                        })

                        let tmpHalfEdges = []
                        let tmpTwinHalfEdges = []

                        for (let i = 0; i < faceVertices.length; i++) {
                            let edge = new Edge()
                            edge.idx = this.edgeCounter
                            this.edgeCounter++
                            this.edges.push(edge)

                            let halfEdge = new Halfedge(faceVertices[i], edge, face, edge.idx)
                            edge.halfedge = halfEdge
                            face.halfedge = halfEdge
                            faceVertices[i].halfedge = halfEdge

                            if (i + 1 !== faceVertices.length)
                                halfEdge.twin = new Halfedge(faceVertices[i + 1], edge, face, edge.idx)
                            else
                                halfEdge.twin = new Halfedge(faceVertices[0], edge, face, edge.idx)

                            halfEdge.twin.edge.halfedge = halfEdge.twin

                            tmpTwinHalfEdges.push(halfEdge.twin)
                            tmpHalfEdges.push(halfEdge)

                            /*this.halfedges.forEach((cachedHalfEdge) =>{
                                cachedHalfEdge.halfEdge
                            })*/
                            this.halfedges.push(halfEdge,halfEdge.twin)
                        }

                        for (let i = 0; i < tmpHalfEdges.length; i++) {
                            if (i + 1 !== tmpHalfEdges.length) {
                                tmpHalfEdges[i].next = tmpHalfEdges[i + 1]
                            } else {
                                tmpHalfEdges[i].next = tmpHalfEdges[0]
                            }
                            tmpHalfEdges[i].next.edge.halfedge = tmpHalfEdges[i].next

                            if (i - 1 >= 0) {
                                tmpHalfEdges[i].prev = tmpHalfEdges[i - 1]
                            } else {
                                tmpHalfEdges[i].prev = tmpHalfEdges[faceVertices.length - 1]
                            }
                            tmpHalfEdges[i].prev.edge.halfedge = tmpHalfEdges[i].prev
                        }

                        for (let i = tmpTwinHalfEdges.length - 1; i !== 0; i--) {
                            if (i - 1 !== 0) {
                                tmpTwinHalfEdges[i].next = tmpTwinHalfEdges[i - 1]
                            } else {
                                tmpTwinHalfEdges[i].next = tmpTwinHalfEdges[0]
                            }
                            tmpTwinHalfEdges[i].next.edge.halfedge = tmpTwinHalfEdges[i].next

                            if (i - 1 >= 0) {
                                tmpTwinHalfEdges[i].prev = tmpTwinHalfEdges[i - 1]
                            } else {
                                tmpTwinHalfEdges[i].prev = tmpTwinHalfEdges[faceVertices.length - 1]
                            }
                            tmpTwinHalfEdges[i].prev.edge.halfedge = tmpTwinHalfEdges[i].prev
                        }

                        this.faces.push(face)
                        break;

                    case "s":
                        break;
                }

            }


        } catch (e) {
            console.error(e)
        }
        console.log(tmpArray)
        // TODO: read .obj format and construct its halfedge representation
    }


}
