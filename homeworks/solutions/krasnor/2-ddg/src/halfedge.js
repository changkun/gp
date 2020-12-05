import Vector from './vector'

class Halfedge {
    /**
     * constructor constructs a Halfedge.
     *
     * @param {Vertex}  vertex
     * @param {Edge}  edge
     * @param {Halfedge}  twin - default null
     * @param {Number}  idx - index default -1
     * @param {Face}  face - default null
     * @param {Halfedge}  prev - default null
     * @param {Halfedge}  next - default null
     * @param {Boolean}  onBoundary - default false
     */
    constructor(vertex, edge, twin = null, idx = -1, face = null, prev = null, next = null, onBoundary = false) {
        this.vertex = vertex // Vertex
        this.edge = edge // Edge
        this.twin = twin   // Halfedge
        this.idx = idx     // Number

        this.face = face // Face
        this.prev = prev   // Halfedge
        this.next = next   // Halfedge

        // Hint: try use this variable to record if a halfedge is on the boundary
        this.onBoundary = false // Boolean
    }

    // NOTE: you can add more methods if you need here
    /**
     * Checks if the Halfedge points to the given vertex,
     *
     * @param {Number} idx_vTo - index of vertex to check
     * @returns {boolean}
     */
    pointsTo(idx_vTo) {
        return this.twin.vertex == idx_vTo;
    }

    /**
     * Checks if the Halfedge points to from a given vertex to another given vertex,
     *
     * @param {Number} idx_vFrom - index of vertex of vertex that the halfedge starts
     * @param {Number} idx_vTo - index of vertex that the halfedge points to
     * @returns {boolean}
     */
    pointsFromTo(idx_vFrom, idx_vTo) {
        return this.vertex.idx == idx_vFrom && this.twin.vertex.idx == idx_vTo;
    }

    /**
     * Returns a vector in Modelspace of this halfedge
     * @returns {Vector}
     */
    getVector() {
        let v_start = this.vertex.position;
        let v_end = this.twin.vertex.position;
        return v_end.sub(v_start);
    }

    cotan() {
        //       2
        //     /   \
        //    / cot \
        //   e2     e1
        //  /        \
        // 0 --e0---> 1
        // (e0 = this hf_edge)

        // if (this.onBoundary) {
        if (this.next === null || this.next === undefined
            || this.prev === null || this.prev === undefined
        )
            return 0; // called 208 times (as much as bunny has boundraries edges)

        const u = this.prev.getVector();
        const v = this.next.getVector().scale(-1);

        return u.dot(v) / u.cross(v).norm();
    }

}

class Edge {
    /**
     * constructor constructs an Edge.
     *
     * @param {Halfedge}  halfedge - default null
     * @param {Number}  idx - default -1
     */
    constructor(halfedge = null, idx = -1) {
        this.halfedge = halfedge // Halfedge
        this.idx = idx   // Number
    }

    // NOTE: you can add more methods if you need here
    /**
     * Returns wether an Edge connects the given two vertices
     * Order of Vertices does not matter.
     *
     * @param idx_v0 index of one of the Edges endpoints
     * @param idx_v1 index of one of the other Edge endpoint
     * @returns {boolean} true: Edge connects both vertices false: otherwise
     */
    doesConnect(idx_v0, idx_v1) {
        if (this.halfedge == null)
            return false;
        if (idx_v0 == idx_v1)
            return false;
        if (this.halfedge.pointsFromTo(idx_v0, idx_v1))
            return true;
        if (this.halfedge.pointsFromTo(idx_v1, idx_v0))
            return true;

        return false;
    }

    /**
     * Returns the one Halfedge of the two Edges Halfedges that starts at the given vertex.
     *
     * @param idx_v_start
     * @returns {null|Halfedge} null: if none of the Halfedeges start at given vertex; otherwise: the corresponding Halfedge
     */
    getHalfedgeStartingByStartVertex(idx_v_start) { // TODO naming
        if (this.halfedge.vertex.idx == idx_v_start)
            return this.halfedge;
        if (this.halfedge.twin.vertex.idx == idx_v_start)
            return this.halfedge.twin;
        return null;
    }

    getEdgeCacheId() {
        let id_1 = this.halfedge.vertex.idx;
        let id_2 = this.halfedge.twin.vertex.idx;
        return Edge.generateEdgeCacheId(id_1, id_2);
    }

    /**
     *
     * @param {number} id_1 vertexId of one edge vertex
     * @param {number} id_2 vertexId of one the other vertex id
     * @returns {string} edgeCacheId key format: "v0|v1" (where v0 is min of "id_1 and id_2" and v1 is MAX of
     */
    static generateEdgeCacheId(id_1, id_2) {
        return Math.min(id_1, id_2) + "|" + Math.max(id_1, id_2);
    }
}

class Face {
    /**
     * constructor constructs a Face.
     *
     * @param {Halfedge}  halfedge - default null
     * @param {Number}  idx - default -1
     */
    constructor(halfedge = null, idx = -1) {
        this.halfedge = halfedge // Halfedge
        this.idx = idx   // Number
    }

    // NOTE: you can add more methods if you need here

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
    //
    vertices(fn) {
        // should call fn(v, i) for all vertices of the face, where v is a vertex and i is its order index.

        let v0 = this.halfedge.vertex;
        let v1 = this.halfedge.next.vertex;
        let v2 = this.halfedge.next.next.vertex;

        // console.log("vertex order: %s -> %s -> %s", v0.idx, v1.idx, v2.idx);
        fn(v0, 0);
        fn(v1, 1);
        fn(v2, 2);
    }

    calculateFaceNormal() {
        //      2
        //    /   \
        //   e2   e1
        //  /       \
        // 0 --e0--> 1

        let e0 = this.halfedge;
        let e1 = this.halfedge.next;

        let vec_e0 = e0.twin.vertex.position.sub(e0.vertex.position);
        let vec_e1 = e1.twin.vertex.position.sub(e1.vertex.position);

        let cross = vec_e0.cross(vec_e1);
        let normal = cross.unit();

        return normal;
    }

    getArea() {
        let v_a = this.halfedge.vertex.position;
        let v_b = this.halfedge.next.vertex.position;
        let v_c = this.halfedge.next.next.vertex.position;

        let v0 = v_c.sub(v_b);
        let v1 = v_a.sub(v_b);
        let area = v0.cross(v1).norm() / 2;

        return area;
    }
}

class Vertex {
    /**
     * constructor constructs the vertex.
     *
     * @param {Vector}  position - default null
     * @param {Number}  idx - default -1
     * @param {Halfedge}  halfedge - default null
     */
    constructor(position = null, idx = -1, halfedge = null) {
        this.position = position // Vector
        this.halfedge = halfedge // Halfedge
        this.idx = idx      // Number
    }

    normal(method = 'equal-weighted') {
        switch (method) {
            case 'equal-weighted':
                // TODO: compute euqally weighted normal of this vertex
                let eqal_weighted_sum = new Vector();

                for (let f of this.getAdjacentFaces()) {
                    let normal = f.calculateFaceNormal();
                    eqal_weighted_sum = eqal_weighted_sum.add(normal);
                }
                return eqal_weighted_sum.unit();
            case 'area-weighted':
                // TODO: compute area weighted normal of this vertex
                let area_weighted_sum = new Vector();
                for (let f of this.getAdjacentFaces()) {
                    let normal = f.calculateFaceNormal();
                    let area = f.getArea();
                    area_weighted_sum = area_weighted_sum.add(normal.scale(area));
                }
                return area_weighted_sum.unit();
            case 'angle-weighted':
                // TODO: compute angle weighted normal of this vertex
                let angle_weighted_sum = new Vector();
                let outgoingHfEdges = this.getAllOutgoingHalfedges();
                for (let f of this.getAdjacentFaces()) {
                    //      v2
                    //    /   \
                    //  prv    e1
                    //  /       \
                    // v0--out-->v1
                    let normal = f.calculateFaceNormal();
                    let v0 = outgoingHfEdges.get(f.idx);
                    let v2 = v0.prev.twin;
                    let angle_dot = (v0.getVector().unit().dot(v2.getVector().unit()) + 1) / 2;

                    // negative values?: in a tri mesh the angle can only vary between 0 and 180 degrees
                    if (angle_dot < 0) {
                        let a_deg = Math.acos((angle_dot) / (v0.getVector().unit().norm() * v2.getVector().unit().norm())) * (180 / Math.PI);
                        throw "Angle greater than 180° in Tri-Mesh: " + angle_dot + "|" + a_deg + "° Face index: " + f.idx;
                    }
                    angle_weighted_sum = angle_weighted_sum.add(normal.scale(angle_dot));
                }
                return angle_weighted_sum.unit();
            default: // undefined
                return new Vector()
        }
    }

    curvature(method = 'Mean') {
        let def = this.calcMeanCurvatureNormal();
        let angle_defect = def.dot(this.normal('equal-weighted'));

        let H = 0.5 * def.norm(); // calculate the actual Mean Curvature value
        let K = this.calcGaussianCurvature();

        H = angle_defect > 0 ? H : -H; // adjust color;
        // I use the MeanCurvatureNormal rather than the GaussianCurvature as it produces a much better result
        // (no red spots where it should be blue and matches the reference picture more closely)

        let k1 = H - Math.sqrt(H * H - K);
        let k2 = H + Math.sqrt(H * H - K);

        let ret = 0.0;
        switch (method) {
            case 'Mean':
                return H;
            case 'Gaussian':
                return K; // lighter in color than the reference, but the colors itself match
            case 'Kmin':
                return k1;
            case 'Kmax':
                return k2;
            default: // undefined
                return 0;
        }
    }

    // NOTE: you can add more methods if you need here

    /**
     * Computes the Discrete Mean Curvature Normal approximation for this vertex.
     * The mean curvature value can be calculated by calcMeanCurvatureNormal().norm()*0.5
     *
     * @returns {Vector}
     */
    calcMeanCurvatureNormal() {
        let outHfEdges = this.getAllOutgoingHalfedges();

        let area = 0; // calc area sum in separate loop
        for (let h of outHfEdges.values()) {
            // area += h.face.getArea()/3; // area approximation

            // voronoi vertex area
            const u = h.prev.getVector().norm();
            const v = h.getVector().norm();
            area += (u * u * h.prev.cotan() + v * v * h.cotan()) / 8
        }

        let c_sum = new Vector();
        for (let hfe of outHfEdges.values()) {
            //     O--------i
            //      \ A   /  \
            //       \   hfe  \
            //        \ /     B\
            //         J--------O

            let fac = hfe.cotan() + hfe.twin.cotan();

            c_sum = c_sum.sub(  hfe.getVector().scale(fac)  );
        }

        return c_sum.scale( 1/(2*area)); // return normal
    }

    /**
     * Calculates the Discrete Gaussian Curvature Value
     *
     * @returns {number} Curvature value between 0 and 1 (360°-0°)
     */
    calcGaussianCurvature() {
        let outgoingHfEdges = this.getAllOutgoingHalfedges();
        let gauss_curv_sum = 0.0;

        for (let hfe of outgoingHfEdges.values()) {
            let hf0 = hfe;
            let hf2 = hfe.prev.twin;

            let angle_dot = (hf0.getVector().unit().dot(hf2.getVector().unit()));
            let theta_i = Math.acos(angle_dot);
            // let theta_deg = theta_i * (180 / Math.PI);

            gauss_curv_sum += theta_i;
        }

        return (2 * Math.PI) - gauss_curv_sum;
    }

    /**
     * numAdjacentEdges returns the number of adjacency edges of the given vertex
     * @param vertex is an vertex from a halfedge-based mesh
     * @returns {Number}
     */
    numAdjacentEdges() {
        const e0 = this.halfedge
        let edge_indices = [e0.idx]
        for (let e = e0.twin.next; e != e0; e = e.twin.next) { // FIXME works not for boundraries
            if (e == null || e == undefined) // boundary reached
                return edge_indices.length;
            edge_indices.push(e.idx)
        }
        return edge_indices.length
    }

    /**
     * Returns all adjacent Faces to this vertex
     * @returns {IterableIterator<any>}
     */
    getAdjacentFaces() {
        const e0 = this.halfedge;
        let faces = new Map();
        faces.set(this.halfedge.face.idx, this.halfedge.face);
        for (let e = e0.twin.next; e != e0; e = e.twin.next) {
            if (e == null || e == undefined || e.face == null || e.face == undefined) {
                break;
            }
            if (!faces.has(e.face.idx))
                faces.set(e.face.idx, e.face);
        }
        return faces.values();
    }

    /**
     * Returns a Map of all Halfedges that point away from this vertex. Key is the corresponding face index
     *
     * @returns {Map<Number, Halfedge>}
     */
    getAllOutgoingHalfedges() {
        const e0 = this.halfedge;
        let hfedges = new Map();
        if (e0.vertex.idx == this.idx)
            hfedges.set(e0.face.idx, e0);

        for (let e = e0.twin.next; e != e0; e = e.twin.next) {
            if (e == null || e == undefined) {
                break;
            }
            if (e.vertex.idx == this.idx)
                hfedges.set(e.face.idx, e);
        }
        return hfedges;
    }

    /**
     * another way of halfedge traversal. used for cross checking code
     * @param fn
     */
    halfedges(fn) { // given vertex
        let start = true
        let i = 0
        for (let h = this.halfedge; start || h != this.halfedge; h = h.twin.next) {
            if (h == null || h == undefined) // not part of an face -> boundary
                break;

            fn(h, i)
            start = false
            i++
        }
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

        this.edgeIdCache = new Map(); // Map<string, edgeId> key: "v0|v1"

        console.log('Start creating half edge - ' + new Date().toTimeString());
        console.log("This may take about 2-5 seconds"); // next performance gain would be avoiding regex

        let start = new Date().getTime();
        let lines = data.split('\n');

        // 1. pass parse verts and faces
        for (let line of lines) {
            line = line.trim();
            const tokens = line.split(' ');
            switch (tokens[0].trim()) {
                case 'v':
                    let vPos = new Vector(
                        parseFloat(tokens[1]),
                        parseFloat(tokens[2]),
                        parseFloat(tokens[3]),
                        1,
                    );
                    this.vertices.push(new Vertex(vPos, this.vertices.length));
                    // halfedge will be set when creating faces
                    continue
                case 'vt':
                    // uvs not needed in this implementation task
                    continue
                case 'vn':
                    // normals not needed in this implementation task
                    continue
                case 'f':
                    //console.log("# current line: %s",line)
                    // parse relevant info
                    // assuming face format: "f <integer A_V> / <integer A_VT> / <integer A_VN> <integer B_V> / ..."
                    // let splitted_by_space = currentLine.split(/\s+/);
                    let splitted_by_space = tokens;
                    let v0_splitted = splitted_by_space[1].split(/\//);
                    let v1_splitted = splitted_by_space[2].split(/\//);
                    let v2_splitted = splitted_by_space[3].split(/\//);

                    // load vertices
                    //     2
                    //   /   \
                    //  0 --> 1
                    let v0 = this.vertices[v0_splitted[0] - 1];
                    let v1 = this.vertices[v1_splitted[0] - 1];
                    let v2 = this.vertices[v2_splitted[0] - 1];

                    let face = new Face();
                    let face_vertices = [v0, v1, v2];
                    let face_edges = [null, null, null];
                    let face_halfEdges = [null, null, null];
                    let face_halfEdgesTwins = [null, null, null];

                    // create Edges + Halfedges
                    for (let face_edg_i = 0; face_edg_i < 3; face_edg_i++) { // v0v1,v1v2,v2v0
                        let edgeTo = (face_edg_i + 1) % 3;

                        //  vx(v0) -----hf-----> vy(v1)
                        //         <---twin-----
                        let vx = face_vertices[face_edg_i];
                        let vy = face_vertices[edgeTo];
                        let tmp_edge = this.findEdge(vx.idx, vy.idx);
                        let tmp_hf = null;
                        let tmp_hf_twin = null;

                        //console.log("handling Edge: v%sv%s     %s%s" , face_edg_i, edgeTo,vx.idx, vy.idx);

                        if (tmp_edge == null) {
                            tmp_edge = new Edge();
                            tmp_hf = new Halfedge(vx, tmp_edge);
                            tmp_hf_twin = new Halfedge(vy, tmp_edge);

                            tmp_edge.halfedge = tmp_hf;
                            tmp_hf.twin = tmp_hf_twin;
                            tmp_hf_twin.twin = tmp_hf;
                        } else {
                            tmp_hf = tmp_edge.getHalfedgeStartingByStartVertex(vx.idx);
                            if (tmp_hf == null || tmp_hf == undefined)
                                throw "Tried to access an malformed edge (no halfedge information)";
                            tmp_hf_twin = tmp_hf.twin;
                            if (tmp_hf_twin == null || tmp_hf_twin == undefined)
                                throw "Tried to access an malformed edge (no twin information)";
                        }

                        face_edges[face_edg_i] = tmp_edge;
                        face_halfEdges[face_edg_i] = tmp_hf;
                        face_halfEdgesTwins[face_edg_i] = tmp_hf_twin;
                    }
                    // linkup halfedges
                    for (let i_face_linkup = 0; i_face_linkup < 3; i_face_linkup++) { // v0v1,v1v2,v2v0 => e0,e1,e2 => 2->0->1, 0->1->2, 1->2->0
                        let currEdgeIndex = i_face_linkup;
                        let nextEdgeIndex = (i_face_linkup + 1) % 3;
                        let previousEdgeIndex = (i_face_linkup + 2) % 3;
                        //console.log("handling Edge: %i->%i->%i",previousEdgeIndex,currEdgeIndex,nextEdgeIndex);

                        let curr_v = face_vertices[currEdgeIndex];
                        let curr_hf = face_halfEdges[currEdgeIndex];

                        if (curr_v.halfedge == null)
                            curr_v.halfedge = curr_hf;

                        curr_hf.next = face_halfEdges[nextEdgeIndex];
                        curr_hf.prev = face_halfEdges[previousEdgeIndex];
                        curr_hf.face = face;
                    }
                    // linkup Face
                    face.halfedge = face_halfEdges[0];

                    // set indices and push to arrays
                    face.idx = this.faces.length;
                    this.faces.push(face);

                    for (let i_indices = 0; i_indices < 3; i_indices++) {
                        let curr_e = face_edges[i_indices];
                        let curr_hf = face_halfEdges[i_indices]
                        let curr_hf_twin = face_halfEdgesTwins[i_indices]
                        // TODO shorten index set
                        if (curr_e.idx == -1) {
                            curr_e.idx = this.edges.length;
                            this.edgeIdCache.set(curr_e.getEdgeCacheId(), curr_e.idx);
                            this.edges.push(curr_e);
                        }
                        if (curr_hf.idx == -1) {
                            curr_hf.idx = this.halfedges.length;
                            this.halfedges.push(curr_hf);
                        }
                        if (curr_hf_twin.idx == -1) {
                            curr_hf_twin.idx = this.halfedges.length;
                            this.halfedges.push(curr_hf_twin);
                        }
                    }
                    continue;
            }
        }
        let elapsed = new Date().getTime() - start;

        console.log("####### finished parsing #########")
        console.log("Parsing took %fs (or %sms)", elapsed / 1000, elapsed)
        console.log("Vertices: %i", this.vertices.length);
        console.log("Edges: %i", this.edges.length);
        console.log("Halfgedges: %i", this.halfedges.length);
        console.log("Faces: %i", this.faces.length);
        // debug print halfedges
        // console.log(this.halfedges);
        // this.printHalfedgeList()
    }

    /**
     * Find the edge (if there is any) that connects the two given vertices.
     * No edge will be created by this operation.
     *
     * @param idx_v0 index of one of the Edges endpoints
     * @param idx_v1 index of one of the other Edge endpoint
     * @returns {Edge} null or the found Edge
     */
    findEdge(idx_v0, idx_v1) {
        if (this.edges == null)
            return null;

        // find edge over cache - bunny now does only take 2-3 seconds to load
        let edgeId = this.edgeIdCache.get(Edge.generateEdgeCacheId(idx_v0, idx_v1));
        if (edgeId == undefined || edgeId == null)
            return null;

        try {
            return this.edges[edgeId];
        } catch (e) {
            throw "An error occured while accessing an edge over the cache. EdgeCache may be corrupted! Message: " + e;
        }

        // version without cache - bunny does take about 2 minutes to load
        // let found = this.edges.find(element => element.doesConnect(idx_v0, idx_v1) == true); // TODO use some sort of index caching to avoid O(n) search
        // if (found == undefined)
        //     return null;
        // return found;
    }
}
