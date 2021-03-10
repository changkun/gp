/**
 * Copyright © 2021 Karlheinz Reinhardt. All rights reserved.
 * Portions Copyright © 2020-2021 Changkun Ou (contact@changkun.de)
 *
 * Use of this source code is governed by a GNU GLPv3 license that can be
 * found in the LICENSE file.
 */

import Renderer from './renderer'
import {HalfedgeMesh, HalfedgeMeshStatistics} from './halfedge'
import {GUI} from 'dat.gui'
import {
    Mesh,
    LineSegments,
    WireframeGeometry,
    LineBasicMaterial,
    BufferGeometry,
    BufferAttribute,
    VertexColors,
    DoubleSide,
    MeshPhongMaterial,
    Geometry,
    BoxGeometry,
    EdgesGeometry,
    MeshBasicMaterial,
} from 'three'
import {
    VertexNormalsHelper
} from 'three/examples/jsm/helpers/VertexNormalsHelper'
import Vector from './vec'
import {StatisticsPanel} from "./StatisticsPanel";
import {LoadingOverlay} from "./LoadingOverlay";

/**
 * Main extends the Renderer class and constructs the scene.
 */
export default class Main extends Renderer {
    /**
     * constroctor creates the objects needed for rendering
     */
    constructor() {
        super()

        this.internal = {
            mesh: null,     // internal halfedge mesh object
            meshOriginal: null, // internal halfedge mesh object
            mesh3jsLeft: null,  // three.js buffer geometry object for mesh
            mesh3jsRight: null, // three.js buffer geometry object for mesh
            meshLeftNormalHelper: null,
            meshRightNormalHelper: null,
            meshLeftWireframeHelper: null,
            meshRightWireframeHelper: null,

            meshOriginalAABB: null,

            mesh_overlay_wireframe: null,
            mesh_overlay_model: null,
            raw_obj_data: "",

            statisticsPanelLeft: null,
            statisticsPanelRight: null,

            LoadingOverlay: null,
        }

        this.internal.LoadingOverlay = new LoadingOverlay(true);
        this.internal.LoadingOverlay.insertDefaultStyleToDom();
        document.body.appendChild(this.internal.LoadingOverlay.domElement);

        this.internal.statisticsPanelLeft = new StatisticsPanel('Subdivided', '0px', '0px', 'none');
        // this.internal.statisticsPanelLeft.showSubdivisionTime = true;
        this.internal.statisticsPanelLeft.subdivisionTimeFormat = "hh:mm:ss.ffffff";
        this.internal.statisticsPanelRight = new StatisticsPanel('Unaltered', '0px', '50%', 'none', true, true);
        document.body.appendChild(this.internal.statisticsPanelLeft.domElement);
        document.body.appendChild(this.internal.statisticsPanelRight.domElement);

        // a hidden input field that responsible for loading meshes
        this.input = document.createElement('input')
        this.input.setAttribute('type', 'file')

        this.input.addEventListener('change', () => {
            let file = this.input.files[0]
            if (!file.name.endsWith('.obj')) {
                alert('Only .OBJ files are supported')
            }
            const r = new FileReader()
            r.onload = () => this.loadMesh(r.result)
            r.onerror = () => alert('Cannot import your obj mesh')
            r.readAsText(file)
        })
        document.body.appendChild(this.input)


        this.params = {
            import: () => this.input.click(),
            export: () => this.exportScreenshot(),
            downloadMesh: () => this.downloadMesh(),
            subdivide: () => this.doSubdivide(),
            showNormals: false,
            showWireframe: true,
            flatShading: false,
            showTexture: true,
            normalMethod: 'equal-weighted',

            overlayOriginalOverSubdivided: false,
            statisticsPanelComparisonMethod: this.internal.statisticsPanelLeft.comparisonStyle,
            statisticsPanelShowTime: this.internal.statisticsPanelLeft.showSubdivisionTime,
            statisticsPanelSubdivisionTimeFormat: this.internal.statisticsPanelLeft.subdivisionTimeFormat,
            subdivisions_req: 0.0,
            boundaryHandling: 'smooth',
        }

        this.gui = new GUI({hideable: false})
        this.gui.width = 260; // DEFAULT_WIDTH is 245

        const io = this.gui.addFolder('I/O')
        io.add(this.params, 'import').name('import mesh')
        io.add(this.params, 'export').name('export screenshot')
        io.add(this.params, 'downloadMesh').name('[dbg] export mesh')

        const vis = this.gui.addFolder('Visualization')
        vis.add(this.params, 'statisticsPanelComparisonMethod', [
            'none', 'numbers', 'numbers_increase', 'percentage', 'percentage_increase'
        ]).name('comparison style').onChange(() => {
                // FIXME BUG Chrome 88 (when Mesh is large ~3Million faces) Even if this callback is empty "() => {}" and nothing would be done, the UI hangs/lags for 1-2 seconds
                //  in Firefox 86.0 there seems to be no UI lag to be observable. After some debugging it seems, that something in the call chain causes in chrome a garbage collection.
                console.time("comparison_style_change")
                this.internal.statisticsPanelLeft.comparisonStyle = this.params.statisticsPanelComparisonMethod;
                this.internal.statisticsPanelRight.comparisonStyle = this.params.statisticsPanelComparisonMethod;
                this.updateStatistics();
                console.timeEnd("comparison_style_change")
            }
        )
        vis.add(this.params, 'statisticsPanelShowTime').name('show subdiv. time').listen()
            .onChange(show => {
                this.internal.statisticsPanelLeft.showSubdivisionTime = show;
                this.updateStatistics();
            })
        vis.add(this.params, 'showNormals').name('show normals').listen()
            .onChange(show => {
                if (show) {
                    this.sceneLeft.add(this.internal.meshLeftNormalHelper)
                    this.sceneRight.add(this.internal.meshRightNormalHelper)
                } else {
                    this.sceneLeft.remove(this.internal.meshLeftNormalHelper)
                    this.sceneRight.remove(this.internal.meshRightNormalHelper)
                }
            })
        vis.add(this.params, 'normalMethod', [
            'equal-weighted', 'area-weighted', 'angle-weighted',
        ]).onChange(() => this.updateNormals())
        vis.add(this.params, 'showWireframe').name('show wireframe').listen()
            .onChange(show => {
                if (show) {
                    this.sceneLeft.add(this.internal.meshLeftWireframeHelper)
                    this.sceneRight.add(this.internal.meshRightWireframeHelper)
                } else {
                    this.sceneLeft.remove(this.internal.meshLeftWireframeHelper)
                    this.sceneRight.remove(this.internal.meshRightWireframeHelper)
                }
            })
        vis.add(this.params, 'flatShading').name('flat shading').listen()
            .onChange(flat => {
                this.internal.mesh3jsLeft.material.flatShading = flat
                this.internal.mesh3jsRight.material.flatShading = flat
                this.internal.mesh3jsLeft.material.needsUpdate = true
                this.internal.mesh3jsRight.material.needsUpdate = true
            })
        vis.add(this.params, 'overlayOriginalOverSubdivided').name('overlay original').listen()
            .onChange(show => {
                if (show) {
                    this.sceneLeft.add(this.internal.mesh_overlay_model)
                    this.sceneLeft.add(this.internal.mesh_overlay_wireframe)
                } else {
                    this.sceneLeft.remove(this.internal.mesh_overlay_model)
                    this.sceneLeft.remove(this.internal.mesh_overlay_wireframe)
                }
            })
        vis.open()

        const mod = this.gui.addFolder('Catmull–Clark Subdivision')
        mod.add(this.params, 'boundaryHandling', [
            'smooth', 'keep corners',
        ]).name('boundary edge');
        mod.add(this.params, 'subdivisions_req', 0.0, 6.0, 1).name('subdivisions')
            .onChange(v => {
                // do nothing
            })
        mod.add(this.params, 'subdivide').name('execute Subdivide')
        mod.open()

        // just for the first load
        // fetch('./assets/cube_quad.obj')
        // fetch('./assets/cube_tri.obj')
        fetch('./assets/bunny_tri_medium.obj')
            .then(resp => resp.text())
            .then(data => this.loadMesh(data))
    }

    loadMesh(data) {
        if (this.internal.mesh3jsLeft !== null) {
            this.sceneLeft.remove(this.internal.mesh3jsLeft)
            this.sceneRight.remove(this.internal.mesh3jsRight)
        }
        this.internal.raw_obj_data = data;

        this.internal.mesh = new HalfedgeMesh(data)
        this.internal.meshOriginal = new HalfedgeMesh(data)
        this.prepareBuf()
        this.renderMeshLeft()
        this.renderMeshOriginal()
        this.updateStatistics()
    }

    exportScreenshot() {
        const url = this.renderer.domElement.toDataURL('image/png', 'export')
        const e = document.createElement('a')
        e.setAttribute('href', url)
        e.style.display = 'none'
        e.setAttribute('download', 'export.png')
        document.body.appendChild(e)
        e.click()
        document.body.removeChild(e)
    }

    updateNormals() {
        this.internal.mesh.vertices.forEach(v => {
            const n = v.normal(this.params.normalMethod)
            this.bufnormals[3 * v.idx + 0] = n.x
            this.bufnormals[3 * v.idx + 1] = n.y
            this.bufnormals[3 * v.idx + 2] = n.z
        })
        this.internal.mesh3jsLeft.geometry.attributes.normal.needsUpdate = true
        this.internal.meshLeftNormalHelper.update()

        this.internal.meshOriginal.vertices.forEach(v => {
            const n = v.normal(this.params.normalMethod)
            this.bufnormals[3 * v.idx + 0] = n.x
            this.bufnormals[3 * v.idx + 1] = n.y
            this.bufnormals[3 * v.idx + 2] = n.z
        })
        this.internal.mesh3jsRight.geometry.attributes.normal.needsUpdate = true
        this.internal.meshRightNormalHelper.update()
    }

    computeAABB(mesh) {
        let min = new Vector(), max = new Vector()
        mesh.vertices.forEach(v => {
            min.x = Math.min(min.x, v.position.x)
            min.y = Math.min(min.y, v.position.y)
            min.z = Math.min(min.z, v.position.z)
            max.x = Math.max(max.x, v.position.x)
            max.y = Math.max(max.y, v.position.y)
            max.z = Math.max(max.z, v.position.z)
        })
        const center = min.add(max).scale(1 / 2)
        const radius = max.sub(min).norm() / 2
        return [center, radius]
    }

    _recomputeGlobalAABB() {
        this.internal.meshOriginalAABB = this.computeAABB(this.internal.meshOriginal);
    }

    prepareBuf() {
        // prepare threejs buffer data
        const v = this.internal.mesh.vertices.length
        this.bufpos = new Float32Array(v * 3)
        this.bufuvs = new Float32Array(v * 3)
        this.bufcolors = new Float32Array(v * 3)
        this.bufnormals = new Float32Array(v * 3)

        this._recomputeGlobalAABB();
        const [center, radius] = this.internal.meshOriginalAABB
        this.internal.mesh.vertices.forEach(v => {
            const i = v.idx
            // use AABB and rescale to viewport center
            const p = v.position.sub(center).scale(1 / radius)
            this.bufpos[3 * i + 0] = p.x
            this.bufpos[3 * i + 1] = p.y
            this.bufpos[3 * i + 2] = p.z

            // use vertex uv
            this.bufuvs[3 * i + 0] = v.uv.x
            this.bufuvs[3 * i + 1] = v.uv.y
            this.bufuvs[3 * i + 2] = 0

            // default GP blue color
            this.bufcolors[3 * i + 0] = 0
            this.bufcolors[3 * i + 1] = 0.5
            this.bufcolors[3 * i + 2] = 1

            const n = v.normal(this.params.normalMethod)
            this.bufnormals[3 * i + 0] = n.x
            this.bufnormals[3 * i + 1] = n.y
            this.bufnormals[3 * i + 2] = n.z
        })
    }

    renderMeshLeft() {
        // clear old instances
        if (this.internal.meshLeftNormalHelper !== null) {
            this.sceneLeft.remove(this.internal.meshLeftNormalHelper)
        }
        if (this.internal.meshLeftWireframeHelper !== null) {
            this.sceneLeft.remove(this.internal.meshLeftWireframeHelper)
        }
        if (this.internal.mesh3jsLeft !== null) {
            this.sceneLeft.remove(this.internal.mesh3jsLeft)
        }

        let faceVertsCountAfterTriangulation = this.internal.mesh.getFaceVertexCountAfterTriangulation();
        let idxs_current_face_index = 0;
        const idxs = new Uint32Array(faceVertsCountAfterTriangulation);
        this.internal.mesh.faces.forEach(f => {
            f.vertices((v, i) => {
                //     1           1
                //   /  \        /  \
                //  2    0  =>  2----0
                //   \  /        \  /
                //     3           3
                //   quad      triangulated
                // render 0,1,2 & 0,2,3

                if (f.isQuad && i == 3) {
                    // this is a Face4 (i == 3 is fourth face vertex) -> triangulate
                    idxs_current_face_index++;
                    idxs[3 * idxs_current_face_index] = idxs[3 * (idxs_current_face_index - 1)]         // 0
                    idxs[3 * idxs_current_face_index + 1] = idxs[3 * (idxs_current_face_index - 1) + 2]  // 2
                    idxs[3 * idxs_current_face_index + 2] = v.idx                                    // 3
                } else {
                    // Face3
                    idxs[3 * idxs_current_face_index + i] = v.idx;
                }
            })
            idxs_current_face_index++;
        });

        const idxs_lines = new Uint32Array(this.internal.mesh.edges.length * 2)
        this.internal.mesh.edges.forEach(edge => {
            idxs_lines[2 * edge.idx] = edge.getP1().idx;
            idxs_lines[2 * edge.idx + 1] = edge.getP2().idx;
        })

        const g_lines = new BufferGeometry()
        g_lines.setIndex(new BufferAttribute(idxs_lines, 1))
        g_lines.setAttribute('position', new BufferAttribute(this.bufpos, 3))

        const g = new BufferGeometry()
        g.setIndex(new BufferAttribute(idxs, 1))
        g.setAttribute('position', new BufferAttribute(this.bufpos, 3))
        g.setAttribute('uv', new BufferAttribute(this.bufuvs, 3))
        g.setAttribute('color', new BufferAttribute(this.bufcolors, 3))
        g.setAttribute('normal', new BufferAttribute(this.bufnormals, 3))

        this.internal.mesh3jsLeft = new Mesh(g, new MeshPhongMaterial({
            vertexColors: VertexColors,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
            side: DoubleSide,
            flatShading: this.params.flatShading,
        }))

        this.internal.meshLeftNormalHelper = new VertexNormalsHelper(
            this.internal.mesh3jsLeft, 0.03, 0xaa0000,
        )
        this.internal.meshLeftWireframeHelper = new LineSegments(
            g_lines,
            new LineBasicMaterial({color: 0x000000, linewidth: 1})
        )

        this.sceneLeft.add(this.internal.mesh3jsLeft)
        if (this.params.showNormals) {
            this.sceneLeft.add(this.internal.meshLeftNormalHelper)
        }
        if (this.params.showWireframe) {
            this.sceneLeft.add(this.internal.meshLeftWireframeHelper)
        }
    }

    renderMeshOriginal() {
        // clear old instances
        if (this.internal.meshRightNormalHelper !== null) {
            this.sceneRight.remove(this.internal.meshRightNormalHelper)
        }
        if (this.internal.meshRightWireframeHelper !== null) {
            this.sceneRight.remove(this.internal.meshRightWireframeHelper)
        }
        if (this.internal.mesh3jsRight !== null) {
            this.sceneLeft.remove(this.internal.mesh3jsRight)
        }

        if (this.internal.mesh_overlay_wireframe !== null) {
            this.sceneLeft.remove(this.internal.mesh_overlay_wireframe)
        }
        if (this.internal.mesh_overlay_model !== null) {
            this.sceneLeft.remove(this.internal.mesh_overlay_model)
        }

        let faceVertsCountAfterTriangulation = this.internal.meshOriginal.getFaceVertexCountAfterTriangulation();
        let idxs_current_face_index = 0;
        // const idxs = new Uint32Array(this.internal.mesh.faces.length*face_vert_offset)
        const idxs = new Uint32Array(faceVertsCountAfterTriangulation);
        this.internal.mesh.faces.forEach(f => {
            f.vertices((v, i) => {
                //     1           1
                //   /  \        /  \
                //  2    0  =>  2----0
                //   \  /        \  /
                //     3           3
                //   quad      triangulated
                // render 0,1,2 & 0,2,3

                if (f.isQuad && i == 3) {
                    // this is a Face4 (i == 3 is fourth face vertex) -> triangulate
                    idxs_current_face_index++;
                    idxs[3 * idxs_current_face_index] = idxs[3 * (idxs_current_face_index - 1)]         // 0
                    idxs[3 * idxs_current_face_index + 1] = idxs[3 * (idxs_current_face_index - 1) + 2]  // 2
                    idxs[3 * idxs_current_face_index + 2] = v.idx                                    // 3
                } else {
                    // Face3
                    idxs[3 * idxs_current_face_index + i] = v.idx;
                }
            })
            idxs_current_face_index++;
        });

        const idxs_lines = new Uint32Array(this.internal.meshOriginal.edges.length * 2)
        this.internal.meshOriginal.edges.forEach(edge => {
            idxs_lines[2 * edge.idx] = edge.getP1().idx;
            idxs_lines[2 * edge.idx + 1] = edge.getP2().idx;
        })

        const g_lines_r = new BufferGeometry()
        g_lines_r.setIndex(new BufferAttribute(idxs_lines, 1))
        g_lines_r.setAttribute('position', new BufferAttribute(this.bufpos, 3))

        const g = new BufferGeometry()
        g.setIndex(new BufferAttribute(idxs, 1))
        g.setAttribute('position', new BufferAttribute(this.bufpos, 3))
        g.setAttribute('uv', new BufferAttribute(this.bufuvs, 3))
        g.setAttribute('color', new BufferAttribute(this.bufcolors, 3))
        g.setAttribute('normal', new BufferAttribute(this.bufnormals, 3))

        this.internal.mesh3jsRight = new Mesh(g, new MeshPhongMaterial({
            vertexColors: VertexColors,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
            side: DoubleSide,
            flatShading: this.params.flatShading,
        }))

        this.internal.meshRightNormalHelper = new VertexNormalsHelper(
            this.internal.mesh3jsRight, 0.03, 0xaa0000,
        )
        this.internal.meshRightWireframeHelper = new LineSegments(
            g_lines_r,
            new LineBasicMaterial({color: 0x000000, linewidth: 1})
        )
        // overlays
        this.internal.mesh_overlay_wireframe = new LineSegments(
            g_lines_r,
            new LineBasicMaterial({color: 0xFF0000, linewidth: 1})
        )
        this.internal.mesh_overlay_model = new Mesh(g, new MeshBasicMaterial({
            color: 0xFF0000,
            opacity: 0.25,
            transparent: true,
            side: DoubleSide,
        }))

        // scene handling
        this.sceneRight.add(this.internal.mesh3jsRight)
        if (this.params.showNormals) {
            this.sceneRight.add(this.internal.meshRightNormalHelper)
        }
        if (this.params.showWireframe) {
            this.sceneRight.add(this.internal.meshRightWireframeHelper)
        }
        if (this.params.overlayOriginalOverSubdivided) {
            this.sceneLeft.add(this.internal.mesh_overlay_wireframe)
        }
        if (this.params.overlayOriginalOverSubdivided) {
            this.sceneLeft.add(this.internal.mesh_overlay_model)
        }

    }

    updateStatistics() {
        let statsMesh_left = this.internal.mesh.getStatistics();
        let statsMesh_right = this.internal.meshOriginal.getStatistics();

        this.internal.statisticsPanelLeft.updateStatistics(statsMesh_left, statsMesh_right);
        this.internal.statisticsPanelRight.updateStatistics(statsMesh_right);
    }

    doSubdivide() {
        // before next repaint set loading overlay visible
        requestAnimationFrame(() => {
            this.internal.LoadingOverlay.setVisible(true, "Subdividing...");

            let context = this;

            // doing subdivide now would block repaint, but overlay cannot be rendered visible until repaint is done
            // -> execute the subdivision some time after the repaint
            // => do subdivision in (macro)-task
            window.setTimeout(
                function () {
                    context.resetLeft(true);

                    context.internal.mesh.subdivide_catmull_clark(context.params.subdivisions_req, context.params.boundaryHandling);

                    context.prepareBuf()
                    context.renderMeshLeft()
                    context.updateStatistics()

                    context.internal.LoadingOverlay.setVisible(false);
                }, 0);
        })
    }

    resetLeft(skipRender = false) {
        // TODO implement full deep copy in HalfedgeMesh, then reparsing would not be needed anymore or maybe a format that can be easily exchanged with Web Workers
        if (this.internal.mesh3jsLeft !== null) {
            this.sceneLeft.remove(this.internal.mesh3jsLeft)
            this.internal.mesh3jsLeft = null;
        }
        if (this.internal.meshLeftNormalHelper !== null) {
            this.sceneLeft.remove(this.internal.meshLeftNormalHelper)
            this.internal.meshLeftNormalHelper = null;
        }
        if (this.internal.meshLeftWireframeHelper !== null) {
            this.sceneLeft.remove(this.internal.meshLeftWireframeHelper)
            this.internal.meshLeftWireframeHelper = null;
        }

        this.internal.mesh = new HalfedgeMesh(this.internal.raw_obj_data)
        if (!skipRender) {
            this.renderMeshLeft()
            this.updateStatistics()
        }
    }

    downloadMesh() {
        this.exportObj(this.internal.mesh.parseToObj(), "mesh_subdivision_js.obj");
    }

    /**
     * @param {Blob} file_blob file to save
     * @param {string} filename filename
     */
    exportObj(file_blob, filename) {
        // start the download
        let file = file_blob;
        if (window.navigator.msSaveOrOpenBlob) // IE10+
            window.navigator.msSaveOrOpenBlob(file, filename);
        else { // Others
            let a = document.createElement("a"),
                url = URL.createObjectURL(file);
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
    }

}
new Main().render()