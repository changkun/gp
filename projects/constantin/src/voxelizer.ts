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
    // the halfedge mesh we create after voxelization
    createdHalfedgeMesh?:HalfedgeMeshRenderer;
    // uses the raw voxelization output,for debugging
    testHelperBoxes: Array<THREE.Box3Helper>;
    // A mesh constructed from the vertices that were removed from the
    // inside of the voxelized surface (saved)
    meshVerticesRemovedFromInside?:any;
    // how long the voxelization step took
    lastVoxelConstructionTime:number;

    constructor(){
        this.testHelperBoxes=[];
        this.lastVoxelConstructionTime=0;
    }
    
    voxelizeHalfedgeMesh(originalMesh:HalfedgeMesh,scene:THREE.Scene,nVoxelsPerHalfAxis?:number){
        console.log("Voxelizing begin");
        this.removeAllFromScene(scene);
        this.testHelperBoxes=[];
        const start = new Date().getTime();

        const VOXELS_PER_HALF_AXIS=nVoxelsPerHalfAxis ? nVoxelsPerHalfAxis : 10;
        const VOXELS_PER_AXIS=VOXELS_PER_HALF_AXIS*2;
        const VOXEL_SIZE=1/VOXELS_PER_AXIS;
        const xOriginalTriangles=Helper.createThreeJsTriangleList(originalMesh);
    
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
        this.meshVerticesRemovedFromInside=Helper.createWireframeMeshFromVertsIndices(xBuffVertices,removed,new THREE.Color('red'));

        //this.createdHalfedgeMesh=HalfedgeMeshRenderer.createFromData3(xBuffIndices,xBuffVertices);
        //this.createdHalfedgeMesh=HalfedgeMeshRenderer.createFromData(bigBuffIndices,Vector.convArray(bigBuffVertices));
        this.createdHalfedgeMesh=HalfedgeMeshRenderer.createFromData3(remaining,xBuffVertices);
        //this.createdHalfedgeMesh=HalfedgeMeshRenderer.createFromData3(argh,xBuffVertices);
        //this.createdHalfedgeMesh=HalfedgeMeshRenderer.createFromData3(AlignedCube.createFacesIndices(0,0,0,ramba),xBuffVertices);
        this.createdHalfedgeMesh.halfedgeMesh.validate();
        this.createdHalfedgeMesh.createAllRenderHelpers();

        //this.createdHalfedgeMesh=new HalfedgeMesh(this.mappedTriangleIndices,Vector.convArray3(xBuffVertices));
        //this.createdHalfedgeMesh=new HalfedgeMesh(removed,Vector.convArray3(xBuffVertices));
        //this.createdHalfedgeMesh=new HalfedgeMesh(this.yIndices,Vector.convArray3(xBuffVertices));
        //this.createdHalfedgeMesh=new HalfedgeMesh(x1Ind,Vector.convArray(x1Vert));
        //this.createdHalfedgeMesh!.createAllRenderHelpers();
        console.log("Voxelizing end");
    }

    addMeshVerticesRemovedToScene(scene:THREE.Scene,remove:boolean){
        if(!this.meshVerticesRemovedFromInside)return;
        if(remove){
            scene.remove(this.meshVerticesRemovedFromInside);
        }else{
            scene.add(this.meshVerticesRemovedFromInside);
        }
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

    removeAllFromScene(scene:THREE.Scene){
        this.addBoxesDebugToScene(scene,true);
        this.addMeshVerticesRemovedToScene(scene,true);
        if(this.createdHalfedgeMesh){
            this.createdHalfedgeMesh!.removeAllIfAdded(scene);
        }
    }
}