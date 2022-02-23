//Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
//Created by Constantin Geier <constantin.geier@campus.lmu.de>.
//
//Use of this source code is governed by a GNU GPLv3 license that can be found
//in the LICENSE file.

import { Vertex, Edge, Face, Halfedge, NormalMethod } from '../geometry/primitive';
import { Vector } from '../linalg/vec';
import * as THREE from 'three'
import {AABB} from '../geometry/aabb';
import {VertexNormalsHelper} from 'three/examples/jsm/helpers/VertexNormalsHelper';
import {HalfedgeMesh} from '../geometry/halfedge';
import { Helper} from '../helper/Helper';

// The underlying Three.js renderer does not natively support halfedges.
// This class wraps a underlying HalfedgeMesh and provides convenient
// methods to convert a halfedge mesh into different renderable formats for THREE.js.
// Features:
// 1) Solid color mesh
// 2) Wireframe mesh
// 3) Normals (VertexNormalsHelper)
// 3) Edges debug (colored arrows)
// 4) Halfedges debug (colored arrows)
// 5) Halfedges on boundary debug (colored red arrows)
export class HalfedgeMeshRenderer {

    // The halfedge that this renderer wraps
    halfedgeMesh:HalfedgeMesh;

    // These variables are only used by the underlying Three.js renderer
    // create them after construction via the proper methods below or after updating the
    // halfedge data structure
    edgeHelpers:Array<THREE.ArrowHelper>=[]; //arrows for edges
    halfedgeHelpers:Array<THREE.ArrowHelper>=[]; // arrows for halfedges
    mesh3js?: THREE.Mesh; // three.js 3D colored mesh
    normalHelper?: VertexNormalsHelper; //normal arrows
    wireframeHelper?: THREE.LineSegments; //wireframe mesh
    halfEdgesOnBoundaryHelpers:Array<THREE.ArrowHelper>=[]; // additionally, we store the halfedges that are on boundaries in a seperate array

    /**
     * Creates the underlying halfedge mesh. Then uses the created halfedge mesh to create the renderables for THREE.js
     * Does not use the indices / vertices directly, only uses the halfedge mesh to directly show any 
     * possible bugs with the underlying halfedge mesh.
     * @param indices the indices to create the halfedge mesh from
     * @param positions the vertices to create the halfedge mesh from
     */
    constructor(halfedgeMesh:HalfedgeMesh){
        this.halfedgeMesh=halfedgeMesh;
        this.createAllRenderHelpers();
    }

    // Helper that constructs the halfedge mesh in place
    static createFromData(indices: number[],positions:Vector[]):HalfedgeMeshRenderer{
        return new HalfedgeMeshRenderer(new HalfedgeMesh(indices,positions));
    }

    static createFromData2(indices: number[],positions:THREE.Vector3[]):HalfedgeMeshRenderer{
        return new HalfedgeMeshRenderer(new HalfedgeMesh(indices,Vector.convArray(positions)));
    }

    static createFromData3(indices: number[],positions:number[]):HalfedgeMeshRenderer{
        return new HalfedgeMeshRenderer(new HalfedgeMesh(indices,Vector.convArray3((positions))));
    }

    // clears and creates all the rendering helper(s)
    // Call this once after construction or after the halfegde mesh has been updated
    createAllRenderHelpers(){
        console.log("HE createAllRenderHelpers begin");
        this.createRenderableMeshAndWireframe();
        this.createRenderableEdgeHelpers();
        this.createRenderableHalfedgeHelpers();
        console.log("HE createAllRenderHelpers end");
    }

    // creates a mesh, wireframe mesh and normal helper that can be rendered by Three.js
    createRenderableMeshAndWireframe(){
        // prepare new data
        const g = new THREE.BufferGeometry();
        const v = this.halfedgeMesh!.verts.length;
        let bufpos = new Float32Array(v * 3);
        let bufcolors = new Float32Array(v * 3);
        let bufnormals = new Float32Array(v * 3);

        this.halfedgeMesh!.verts.forEach(v => {
            const i = v.idx;
            const p=v.position;
            bufpos[3 * i + 0] = p.x;
            bufpos[3 * i + 1] = p.y;
            bufpos[3 * i + 2] = p.z;

            // default GP blue color
            bufcolors[3 * i + 0] = 0;
            bufcolors[3 * i + 1] = 0.5;
            bufcolors[3 * i + 2] = 1;

            const n = v.normal(NormalMethod.AngleWeighted);
            bufnormals[3 * i + 0] = n.x;
            bufnormals[3 * i + 1] = n.y;
            bufnormals[3 * i + 2] = n.z;
        });

        const idxs = new Uint32Array(this.halfedgeMesh!.faces.length * 3);
        this.halfedgeMesh!.faces.forEach(f => {
        f.vertices((v, i) => {
            idxs[3 * f.idx + i] = v.idx;
        });
        });

        g.setIndex(new THREE.BufferAttribute(idxs, 1));
        g.setAttribute('position', new THREE.BufferAttribute(bufpos, 3));
        g.setAttribute('color', new THREE.BufferAttribute(bufcolors, 3));
        g.setAttribute('normal', new THREE.BufferAttribute(bufnormals, 3));
        //g.computeVertexNormals();
      
        this.mesh3js = new THREE.Mesh(
        g,
        new THREE.MeshPhongMaterial({
            vertexColors: true,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
            side: THREE.DoubleSide,
        })
        );
        this.normalHelper = new VertexNormalsHelper(
        this.mesh3js!,
        0.03,
        0xaa0000
        );
        this.wireframeHelper = new THREE.LineSegments(
        new THREE.WireframeGeometry(g),
        new THREE.LineBasicMaterial({color: 0x000000, linewidth: 1})
        );
    }

    //Create an Array of Three.ArrowHelper to draw the halfedges using Three.js
    // the halfedges are represented by Arrows, yellow if not on a boundary, red otherwise
    createRenderableHalfedgeHelpers(){
        // clear, don't forget to remove from scene before recalculation
        this.halfedgeHelpers=[];
        // create Arrows for all the halfedges
        for(let i=0;i<this.halfedgeMesh!.halfedges!.length;i++){
            const edgeHe=this.halfedgeMesh!.halfedges![i];  
            const origin = edgeHe.vert!.position.convertT();
            const dir=edgeHe.vector().convertT().normalize();
            const len=edgeHe.vector().convertT().length();
            const color = edgeHe.onBoundary ? 0xFF0000 : 0xffff00;
            const headLength=0.01;
            const headWidth=headLength*0.5;
            const arrowHelper = new THREE.ArrowHelper( dir, origin, len,color,headLength,headWidth);
            this.halfedgeHelpers.push(arrowHelper);
            if(edgeHe.onBoundary){
                this.halfEdgesOnBoundaryHelpers.push(arrowHelper);
            }
        }
    }
    // similar to above, for edges
    createRenderableEdgeHelpers(){
        // clear, don't forget to remove from scene before recalculation
        this.edgeHelpers=[];
        // create Arrows for all the edges
        for(let i=0;i<this.halfedgeMesh!.edges.length;i++){
            const edge=this.halfedgeMesh!.edges[i];
            if(!edge.halfedge){
                break;
            }
            const edgeHe=edge.halfedge!;
            const origin = edgeHe.vert!.position.convertT();
            const dir=edgeHe.vector().convertT().normalize();
            const len=edgeHe.vector().convertT().length();
            const color = 0x00FF00;
            //const color = edgeHe.onBoundary ? 0xFF0000 : 0x00FF00;
            const headLength=0.01;
            const headWidth=headLength*0.5;
            const arrowHelper = new THREE.ArrowHelper( dir, origin, len,color,headLength,headWidth);
            this.edgeHelpers.push(arrowHelper);
        }
    }

    // These methods add / remove the THREE.js renderables to/from the scene
    addMeshHelperToScene(scene:THREE.Scene,remove:boolean){
        if(!this.mesh3js)return;
            if(remove){
                scene.remove(this.mesh3js!);
            }else{
                scene.add(this.mesh3js!);
        }
    }
    
    addWireframeHelperToScene(scene:THREE.Scene,remove:boolean){
        if(!this.wireframeHelper)return;
            if(remove){
                scene.remove(this.wireframeHelper!);
            }else{
                scene.add(this.wireframeHelper!);
        }
    }
    addNormalHelperToScene(scene:THREE.Scene,remove:boolean){
        if(!this.normalHelper)return;
            if(remove){
                scene.remove(this.normalHelper!);
            }else{
                scene.add(this.normalHelper!);
        }
    }
    addHalfedgeHelpersToScene(scene:THREE.Scene,remove:boolean){
        for(let i=0;i<this.halfedgeHelpers.length;i++){
            if(remove){
                scene.remove(this.halfedgeHelpers![i]);
            }else{
                scene.add(this.halfedgeHelpers![i]);
            }
        }
    }
    addEdgeHelpersToScene(scene:THREE.Scene,remove:boolean){
        for(let i=0;i<this.edgeHelpers.length;i++){
            if(remove){
                scene.remove(this.edgeHelpers![i]);
            }else{
                scene.add(this.edgeHelpers![i]);
            }
        }
    }
    addHalfEdgesOnBoundaryHelpersToScene(scene:THREE.Scene,remove:boolean){
        for(let i=0;i<this.halfEdgesOnBoundaryHelpers.length;i++){
            if(remove){
                scene.remove(this.halfEdgesOnBoundaryHelpers[i]);
            }else{
                scene.add(this.halfEdgesOnBoundaryHelpers[i]);
            }
        }
    }

    // remve all three.js helper renderables if they are added to the scene
    removeAllIfAdded(scene:THREE.Scene){
        this.addMeshHelperToScene(scene,true);
        this.addWireframeHelperToScene(scene,true);
        this.addNormalHelperToScene(scene,true);
        this.addHalfedgeHelpersToScene(scene,true);
        this.addEdgeHelpersToScene(scene,true);
        this.addHalfEdgesOnBoundaryHelpersToScene(scene,true);
    }
}