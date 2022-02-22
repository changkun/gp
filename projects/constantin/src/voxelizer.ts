//Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
//Created by Constantin Geier <constantin.geier@campus.lmu.de>.
//Modified by Constantin Geier <constantin.geier@campus.lmu.de>.
//
//Use of this source code is governed by a GNU GPLv3 license that can be found
//in the LICENSE file.

import { SparseMatrix, DenseMatrix, Triplet } from '@penrose/linear-algebra';
import { Vertex, Edge, Face, Halfedge } from './geometry/primitive';
import { Vector } from './linalg/vec';
import { smoothstep } from 'three/src/math/MathUtils';
import { assert } from 'console';
import { AlignedCube } from './linalg/AlignedCube';
import { ThreeDArray } from './helper/3DArray';
import * as THREE from 'three'
import { HalfedgeMesh } from './geometry/halfedge';
import { Helper} from './helper/Helper';
import { HalfedgeMeshRenderer} from './helper/HalfedgeMeshRenderer';

export class Voxelizer {
    // uses the raw voxelization output 
    testHelperBoxes: Array<THREE.Box3Helper>;
    testHelperMeshes: Array<THREE.Mesh>;
    // how long the voxelization step took
    lastVoxelConstructionTime:number;
    //
    testMeshes2: Array<THREE.LineSegments>;
    //
    bigTestMesh?:any;

    createdHalfedgeMesh?:HalfedgeMeshRenderer;
    //


    constructor(){
        this.testHelperBoxes=[];
        this.testHelperMeshes=[];
        this.testMeshes2=[];
        this.lastVoxelConstructionTime=0;
    }
    
    voxelizeHalfedgeMesh(originalMesh:HalfedgeMesh,scene:THREE.Scene,nVoxelsPerHalfAxis?:number){
        console.log("Voxelizing begin");
        this.removeAllFromScene(scene);
        this.testHelperBoxes=[];
        this.testHelperMeshes=[];
        this.testMeshes2=[];
        const start = new Date().getTime();

        const VOXELS_PER_HALF_AXIS=nVoxelsPerHalfAxis ? nVoxelsPerHalfAxis : 10;
        const VOXELS_PER_AXIS=VOXELS_PER_HALF_AXIS*2;
        const VOXEL_SIZE=1/VOXELS_PER_AXIS;
        const xOriginalTriangles=Helper.createThreeJsTriangleList(originalMesh);

        //Voxelizer.testIndices(scene);
    
        let xBuffVertices=new Array<number>();
        let xBuffIndices=new Array<number>();
        let ramba=ThreeDArray.create3DArray(VOXELS_PER_AXIS+1);
        let countLol=0;
        for(let x=0;x<VOXELS_PER_AXIS+1;x++){
            for(let y=0;y<VOXELS_PER_AXIS+1;y++){
                for(let z=0;z<VOXELS_PER_AXIS+1;z++){
                    const x1=x*VOXEL_SIZE-VOXELS_PER_HALF_AXIS*VOXEL_SIZE;
                    const y1=y*VOXEL_SIZE-VOXELS_PER_HALF_AXIS*VOXEL_SIZE;
                    const z1=z*VOXEL_SIZE-VOXELS_PER_HALF_AXIS*VOXEL_SIZE;
                    xBuffVertices.push(x1);
                    xBuffVertices.push(y1);
                    xBuffVertices.push(z1);
                    ramba[x][y][z]=countLol;
                    countLol++;
                }
            }
        }
        let bigBuffVertices=new Array<THREE.Vector3>();
        let bigBuffIndices=new Array<number>();
        let idx=0;
        for(let x=0;x<VOXELS_PER_AXIS;x++){
            for(let y=0;y<VOXELS_PER_AXIS;y++){
                for(let z=0;z<VOXELS_PER_AXIS;z++){
                    //console.log("Voxelizing:" + x +","+y+","+z);
                    const x1=x*VOXEL_SIZE-VOXELS_PER_HALF_AXIS*VOXEL_SIZE;
                    const y1=y*VOXEL_SIZE-VOXELS_PER_HALF_AXIS*VOXEL_SIZE;
                    const z1=z*VOXEL_SIZE-VOXELS_PER_HALF_AXIS*VOXEL_SIZE;
                    const alignedCube=new AlignedCube(x1,y1,z1,VOXEL_SIZE);
                    //
                    let intersectsAny=false;
                    for(let tri of xOriginalTriangles){
                        if(alignedCube.intersect(tri)){
                            intersectsAny=true;
                            break;
                        }
                    }
                    //
                    if(intersectsAny){
                        this.testHelperBoxes.push(alignedCube.createBox3Helper());
                        this.testHelperMeshes.push(alignedCube.createBoxBufferGeometryMesh());

                        const [vertices,indices]= alignedCube.createVerticesIndices();
                        const idxOffset=bigBuffVertices.length;
                        bigBuffVertices=bigBuffVertices.concat(vertices);
                        bigBuffIndices=bigBuffIndices.concat(Helper.addOffsetToIndices(idxOffset,indices));
                        //console.log("IndicesX");

                        this.testMeshes2.push(Helper.createWireframeMeshFromVertsIndices(Helper.convertVertices(vertices),indices));
                        const argh=AlignedCube.createFacesIndices(x,y,z,ramba);
                        xBuffIndices=xBuffIndices.concat(argh);
                    }
                    idx++;
                }
            }
        }
        const [remaining,removed]=Helper.removeTwinTriangles(xBuffIndices);

        var elapsed = new Date().getTime() - start;
        this.lastVoxelConstructionTime=elapsed;
        console.log("Voxelizing took: "+this.lastVoxelConstructionTime+" ms");

        //let [x1Vert,x1Ind]=Helper.removeIsolatedVertices(Helper.convertToThreJs2(xBuffVertices),this.yIndices);
        //this.bigTestMesh=Helper.createWireframeMeshFromVertsIndices(Helper.convertVertices(x1Vert),x1Ind,new THREE.Color('red'));

        //this.bigTestMesh=Helper.createMeshFromVertsIndices(Helper.convertVertices(bigBuffVertices),bigBuffIndices,new THREE.Color('red'));
        this.bigTestMesh=Helper.createMeshFromVertsIndices(xBuffVertices,remaining,new THREE.Color('orange'));

        //let [x1Vert,x1Ind]=Helper.removeIsolatedVertices(Helper.convertToThreJs2(xBuffVertices),this.yIndices);

        //this.bigTestMesh=AlignedCube.createWireframeMeshFromVertsIndices(AlignedCube.convertVertices(this.verticesBuff),this.indicesBuff);
        //this.bigTestMesh=Helper.createWireframeMeshFromVertsIndices(xBuffVertices,this.yIndices,new THREE.Color('red'));
        //scene.add(Helper.createWireframeMeshFromVertsIndices(xBuffVertices,this.yIndices,new THREE.Color('green')));
        //scene.add(Helper.createWireframeMeshFromVertsIndices(this.yVertices,this.yIndices,new THREE.Color('green'),3));
        //this.bigTestMesh=AlignedCube.createWireframeMeshFromVertsIndices(xBuffVertices,this.indicesBuff);
        //scene.add(this.bigTestMesh!);

        //this.createdHalfedgeMesh=new HalfedgeMesh(remaining,Vector.convArray3(xBuffVertices));
        //this.createdHalfedgeMesh=new HalfedgeMesh(xBuffIndices,Vector.convArray3(xBuffVertices));
        //this.createdHalfedgeMesh=new HalfedgeMesh(bigBuffIndices,Vector.convArray(bigBuffVertices));

        //remaining=AlignedCube.fixOrder(remaining);

        let argh=new Array<number>();
        let takeSome=3*500;
        takeSome = takeSome <= remaining.length ? takeSome : remaining.length;
        for(let i=0;i<takeSome;i++){
            argh.push(remaining[i]);
        }

        //this.createdHalfedgeMesh=HalfedgeMeshRenderer.createFromData3(xBuffIndices,xBuffVertices);
        //this.createdHalfedgeMesh=HalfedgeMeshRenderer.createFromData(bigBuffIndices,Vector.convArray(bigBuffVertices));
        this.createdHalfedgeMesh=HalfedgeMeshRenderer.createFromData3(remaining,xBuffVertices);
        //this.createdHalfedgeMesh=HalfedgeMeshRenderer.createFromData3(argh,xBuffVertices);
        //this.createdHalfedgeMesh=HalfedgeMeshRenderer.createFromData3(AlignedCube.createFacesIndices(0,0,0,ramba),xBuffVertices);
        this.createdHalfedgeMesh.halfedgeMesh.validate();

        //this.createdHalfedgeMesh=new HalfedgeMesh(this.mappedTriangleIndices,Vector.convArray3(xBuffVertices));
        //this.createdHalfedgeMesh=new HalfedgeMesh(removed,Vector.convArray3(xBuffVertices));
        //this.createdHalfedgeMesh=new HalfedgeMesh(this.yIndices,Vector.convArray3(xBuffVertices));
        //this.createdHalfedgeMesh=new HalfedgeMesh(x1Ind,Vector.convArray(x1Vert));
        //this.createdHalfedgeMesh!.createAllRenderHelpers();
        console.log("Voxelizing end");

    }

    addBoxesDebugToScene(scene:THREE.Scene,remove:boolean){
        for(let i=0;i<this.testHelperBoxes.length;i++){
            if(remove){
                scene.remove(this.testHelperBoxes[i]);
            }else{
                scene.add(this.testHelperBoxes[i]);
            }
        }
    }

    addDebug2ToScene(scene:THREE.Scene,remove:boolean){
        if(this.createdHalfedgeMesh){
            if(remove){
                this.createdHalfedgeMesh!.removeAllIfAdded(scene);
            }else{
                this.createdHalfedgeMesh!.removeAllIfAdded(scene);
                this.createdHalfedgeMesh!.createAllRenderHelpers();
                this.createdHalfedgeMesh!.addHalfedgeHelpersToScene(scene,false);
                //this.createdHalfedgeMesh!.addWireframeHelperToScene(scene,false);
                //this.createdHalfedgeMesh!.addMeshHelperToScene(scene,false);
                //this.createdHalfedgeMesh!.addEdgeHelpersToScene(scene,false);
                this.createdHalfedgeMesh!.addNormalHelperToScene(scene,false);
            }
        }
    }

    addOtherDebugToScene(scene:THREE.Scene,remove:boolean){
        for(let i=0;i<this.testHelperMeshes.length;i++){
            if(remove){
                scene.remove(this.testHelperMeshes[i]);
            }else{
                //scene.add(this.testHelperMeshes[i]);
            }
        }
        for(let i=0;i<this.testMeshes2.length;i++){
            if(remove){
                scene.remove(this.testMeshes2[i]);
            }else{
                //scene.add(this.testMeshes2[i]);
            }
        }
        if(this.bigTestMesh){
            if(remove){
                scene.remove(this.bigTestMesh!);
            }else{
                scene.add(this.bigTestMesh!);
            }
        }
    }

    removeAllFromScene(scene:THREE.Scene){
        this.addBoxesDebugToScene(scene,true);
        this.addOtherDebugToScene(scene,true);
        this.addDebug2ToScene(scene,true);
    }
}