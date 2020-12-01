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


    getVector(){
        return this.twin.vertex.position.sub(this.vertex.position)
    }


    cotan(){
        if (this.onBoundary) {
            return 0
        }
        const u = this.prev.getVector()
        const v = this.next.getVector().scale(-1)
        return u.dot(v) / u.cross(v).norm()
    }
    // NOTE: you can add more methods if you need here
    getAngle(){
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

    getAreaTriangle()
    {
        const a = this.halfedge.vertex.position
        const b = this.halfedge.next.vertex.position
        let c = a.cross(b)
        return Math.abs(Math.pow(c.x,2)+Math.pow(c.y,2)+Math.pow(c.z,2)) / 2
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

    getNormalTriangle(){
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
        switch (method) {
            case 'equal-weighted':
                // TODO: compute euqally weighted normal of this vertex
                var sum = null
                this.forEachHalfedge((currentHalfEdge,i) =>{
                    var addition = currentHalfEdge.face.getNormalTriangle()
                    if(sum!==null){
                        sum = sum.add(addition)
                    }else{
                        sum = addition
                    }
                })
                return sum.scale(1/sum.norm())
            case 'area-weighted':
            // TODO: compute area weighted normal of this vertex
                var sum = null
                this.forEachHalfedge((currentHalfEdge,i) =>{
                    var addition = currentHalfEdge.face.getNormalTriangle().scale(currentHalfEdge.face.getAreaTriangle())
                    if(sum!==null){
                        sum = sum.add(addition)
                    }else{
                        sum = addition
                    }
                })

                return sum.scale(1/sum.norm())
            case 'angle-weighted':
            // TODO: compute angle weighted normal of this vertex
                var sum = null
                this.forEachHalfedge((currentHalfEdge,i) =>{
                    var addition = currentHalfEdge.face.getNormalTriangle().scale(currentHalfEdge.vertex.getAngle())
                    if(sum!==null){
                        sum = sum.add(addition)
                    }else{
                        sum = addition
                    }
                })
                return sum.scale(1/sum.norm())
            default: // undefined
                return new Vector()
        }
    }

    curvature(method = 'Mean') {
        switch (method) {
            case 'Mean':
            // TODO: compute mean curvature
                return this.cotanLaplaceBeltrami()
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

    calculateK(num){
        let h = this.cotanLaplaceBeltrami()
        let k = this.calculateGaussianCurvature()

        switch (num) {
            case 1:
                return h - Math.sqrt(Math.pow(h,2)-k)
            case 2:
                return h + Math.sqrt(Math.pow(h,2)-k)
            default:
                return 0
        }
    }

    calculateGaussianCurvature(){
        let start = true
        var sum = 0
        for (let currentHalfEdge = this.halfedge; start || currentHalfEdge != this.halfedge; currentHalfEdge = currentHalfEdge.twin.next) {
            if(currentHalfEdge === null || currentHalfEdge === undefined)
                break;

            sum += currentHalfEdge.getAngle()
            start = false

        }
        return (2 * Math.PI) - sum
    }

    calculateVoronoiArea(){
        let area = 0

        this.forEachHalfedge((currentHalfEdge,i) =>{
            let u = currentHalfEdge.prev.getVector().norm()
            let v = currentHalfEdge.next.getVector().norm()
            area += (Math.pow(u,2)*currentHalfEdge.prev.cotan() + Math.pow(v,2)*currentHalfEdge.cotan()) / 8
        })

        return area
    }

    forEachHalfedge(fn){
        let start = true
        let i = 0

        for (let currentHalfedge = this.halfedge; start || currentHalfedge != this.halfedge; currentHalfedge = currentHalfedge.twin.next) {
            if(currentHalfedge === null || currentHalfedge === undefined)
                return;
            fn(currentHalfedge, i)
            start = false
            i++
        }
    }

    cotanLaplaceBeltrami() {
        const area = this.calculateVoronoiArea()
        let sum = new Vector()
        this.forEachHalfedge(currentHalfedge => { sum = sum.add(currentHalfedge.getVector().scale(currentHalfedge.cotan() + currentHalfedge.twin.cotan())) })
        return sum.norm()*0.5/area
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

        let tmpArray = data.split("\n")

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
                        //let tmpTwinHalfEdges = []

                        for (var i = 0; i < faceVertices.length; i++) {

                            let currentVertex = faceVertices[i]
                            let nextVertex = null
                            if (i + 1 !== faceVertices.length){
                                nextVertex = faceVertices[i + 1]
                            }else{
                                nextVertex = faceVertices[0]
                            }

                            let existingHalfedge = null

                            /*this.halfedges.forEach((cachedHalfEdge) =>{

                                if(cachedHalfEdge.vertex.idx === currentVertex.idx && cachedHalfEdge.twin.vertex.idx === nextVertex.idx)
                                {
                                    existingHalfedge = cachedHalfEdge
                                }
                            })*/

                            existingHalfedge = this.halfedgesDict[currentVertex.idx + ":" + nextVertex.idx]
                            if(existingHalfedge === null || existingHalfedge === undefined){
                                existingHalfedge = this.halfedgesDict[nextVertex.idx + ":" + currentVertex.idx]
                            }

                            if(existingHalfedge !== null && existingHalfedge !== undefined){
                                existingHalfedge.face = face
                                existingHalfedge.onBoundary = false
                                tmpHalfEdges.push(existingHalfedge)
                                continue;
                            }

                            let edge = new Edge()
                            edge.idx = this.edges.length
                            this.edges.push(edge)

                            let halfEdge = new Halfedge(currentVertex, edge, face, this.halfedges.length)
                            edge.halfedge = halfEdge

                            if(currentVertex.halfedge === null)
                                currentVertex.halfedge = halfEdge

                            halfEdge.twin = new Halfedge(nextVertex, edge, null, this.halfedges.length + 1, null, null, null,true)
                            halfEdge.twin.twin = halfEdge

                            tmpHalfEdges.push(halfEdge)
                            this.halfedgesDict[halfEdge.vertex.idx + ":" + halfEdge.twin.vertex.idx] = halfEdge
                            this.halfedgesDict[halfEdge.twin.vertex.idx + ":" + halfEdge.vertex.idx] = halfEdge.twin
                            this.halfedges.push(halfEdge)
                            this.halfedges.push(halfEdge.twin)
                        }

                        for (var i = 0; i < tmpHalfEdges.length; i++) {
                            let nextHalfEdge = null;
                            let prevHalfEdge = null;

                            if (i + 1 < tmpHalfEdges.length) {
                                nextHalfEdge = tmpHalfEdges[i + 1]
                            } else {
                                nextHalfEdge = tmpHalfEdges[0]
                            }
                            if (i - 1 >= 0) {
                                prevHalfEdge = tmpHalfEdges[i - 1]
                            } else {
                                prevHalfEdge = tmpHalfEdges[tmpHalfEdges.length - 1]
                            }

                            tmpHalfEdges[i].next = nextHalfEdge
                            tmpHalfEdges[i].prev = prevHalfEdge
                        }

                        face.halfedge = tmpHalfEdges[0]
                        /*
                        for (var i = tmpTwinHalfEdges.length - 1; i >= 0; i--) {
                            if (i - 1 >= 0) {
                                tmpTwinHalfEdges[i].next = tmpTwinHalfEdges[i - 1]
                            } else {
                                tmpTwinHalfEdges[i].next = tmpTwinHalfEdges[tmpTwinHalfEdges.length - 1]
                            }
                            tmpTwinHalfEdges[i].next.edge.halfedge = tmpTwinHalfEdges[i].next

                            if (i + 1 < tmpTwinHalfEdges.length) {
                                tmpTwinHalfEdges[i].prev = tmpTwinHalfEdges[i + 1]
                            } else {
                                tmpTwinHalfEdges[i].prev = tmpTwinHalfEdges[0]
                            }
                            tmpTwinHalfEdges[i].prev.edge.halfedge = tmpTwinHalfEdges[i].prev
                        }*/

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
