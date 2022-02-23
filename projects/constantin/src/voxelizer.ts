//Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
//Created by Constantin Geier <constantin.geier@campus.lmu.de>.
//Modified by Constantin Geier <constantin.geier@campus.lmu.de>.
//
//Use of this source code is governed by a GNU GPLv3 license that can be found
//in the LICENSE file.

import { AlignedCube } from './geometry/AlignedCube';
import { ThreeDArray } from './helper/3DArray';
import * as THREE from 'three'
import { HalfedgeMesh } from './geometry/halfedge';
import { Helper} from './helper/Helper';
import { HalfedgeMeshRenderer} from './helper/HalfedgeMeshRenderer';
import { Vector } from './linalg/vec';

export class Voxelizer {
    // the halfedge mesh we create after voxelization
    createdHalfedgeMesh?:HalfedgeMeshRenderer;
    // uses the raw voxelization output,for debugging
    testHelperBoxes: Array<THREE.Box3Helper>=[];
    // A mesh constructed from the vertices that were removed from the
    // inside of the voxelized surface (saved)
    meshVerticesRemovedFromInside?:any;
    // how long the voxelization step took
    lastVoxelConstructionTimeMs:number=0;

    /**
     * Voxelize the given halfedge mesh and store the voxelized mesh in a new halfedge mesh.
     * Renderables for (debugging) output are also created after the Voxelization process.
     * This method performs the following steps:
     * 1) Create a 3D grid of all the (shared) voxels vertices
     * 2) Perform an intersection test against all faces of the source mesh for all voxels
     *  -> No intersection = continue
     *  -> Any intersection = create indices for this voxel (shared vertices), append those indices to the indices list
     * 3) Cleanup the created mesh (indices) such that it can be efficiently represented by the h.e.d.s
     * 
     * @param originalMesh The source mesh to voxelize
     * @param scene The scene, used to remove any already created renderable helpers
     * @param nVoxelsPerHalfAxis How many voxels both in - and + direction. The max number of voxels created in both X,Y and Z direction is 2*nVoxelsPerHalfAxis
     */
    voxelizeHalfedgeMesh(originalMesh:HalfedgeMesh,scene:THREE.Scene,nVoxelsPerHalfAxis?:number){
        this.removeAllFromScene(scene);
        console.log("Voxelizing begin");
        this.testHelperBoxes=[];
        const start = new Date().getTime();

        const VOXELS_PER_HALF_AXIS=nVoxelsPerHalfAxis ? nVoxelsPerHalfAxis : 10;
        const VOXELS_PER_AXIS=VOXELS_PER_HALF_AXIS*2;
        const VOXEL_SIZE=1/VOXELS_PER_AXIS;
        const xOriginalTriangles=Helper.createThreeJsTriangleList(originalMesh);
        // create a 3D grid of vertices, as well as a table to
        // find the idx of the vertex at a given x,y,z position
        let allVoxelGridVertices=new Array<number>((VOXELS_PER_AXIS+1)*(VOXELS_PER_AXIS+1)*(VOXELS_PER_AXIS+1)*3);
        let tableVertexIdx=ThreeDArray.create3DArray(VOXELS_PER_AXIS+1);
        let idx=0;
        for(let x=0;x<VOXELS_PER_AXIS+1;x++){
            for(let y=0;y<VOXELS_PER_AXIS+1;y++){
                for(let z=0;z<VOXELS_PER_AXIS+1;z++){
                    const x1=x*VOXEL_SIZE-VOXELS_PER_HALF_AXIS*VOXEL_SIZE;
                    const y1=y*VOXEL_SIZE-VOXELS_PER_HALF_AXIS*VOXEL_SIZE;
                    const z1=z*VOXEL_SIZE-VOXELS_PER_HALF_AXIS*VOXEL_SIZE;
                    allVoxelGridVertices[idx*3+0]=x1;
                    allVoxelGridVertices[idx*3+1]=y1;
                    allVoxelGridVertices[idx*3+2]=z1;
                    tableVertexIdx[x][y][z]=idx;
                    idx++;
                }
            }
        }
        // The indices of the Voxels that intersect will be added to this array
        let xBuffIndices=new Array<number>();
        idx=0;
        for(let x=0;x<VOXELS_PER_AXIS;x++){
            for(let y=0;y<VOXELS_PER_AXIS;y++){
                for(let z=0;z<VOXELS_PER_AXIS;z++){
                    //console.log("Voxelizing:" + x +","+y+","+z);
                    const x1=x*VOXEL_SIZE-VOXELS_PER_HALF_AXIS*VOXEL_SIZE;
                    const y1=y*VOXEL_SIZE-VOXELS_PER_HALF_AXIS*VOXEL_SIZE;
                    const z1=z*VOXEL_SIZE-VOXELS_PER_HALF_AXIS*VOXEL_SIZE;
                    const alignedCube=new AlignedCube(x1,y1,z1,VOXEL_SIZE);
                    // check if the voxel intersects with any triangle of the source mesh
                    let intersectsAny=false;
                    for(let tri of xOriginalTriangles){
                        if(alignedCube.intersect(tri)){
                            intersectsAny=true;
                            break;
                        }
                    }
                    // add the voxel if it intersects any
                    if(intersectsAny){
                        // store for optional debugging
                        this.testHelperBoxes.push(alignedCube.createBox3Helper());
                        // create the indices for this cube, where each index references a Vertex in the VoxelGridVertices array
                        // (All neighbour cubes share the same vertices for performance)
                        const indicesForThisCube=AlignedCube.createCubeIndicesFromTable(x,y,z,tableVertexIdx);
                        xBuffIndices=xBuffIndices.concat(indicesForThisCube);
                    }
                    idx++;
                }
            }
        }
        // Here the "inner vertices" - aka vertices that are not needed for rendering / h.e.d.s are removed
        const [remaining,removed]=Helper.removeTwinTriangles(xBuffIndices);
        // create the halfedge mesh
        const newHalfedgeMesh=new HalfedgeMesh(remaining,Helper.convArray3((allVoxelGridVertices)));
        newHalfedgeMesh.validate();
        // Measure how long the actual voxelization and h.e. construction took (does not include the creation of rendering helpers)
        const elapsedMs = new Date().getTime() - start;
        this.lastVoxelConstructionTimeMs=elapsedMs;
        console.log("Voxelizing took: "+this.lastVoxelConstructionTimeMs+" ms");
        console.log("Voxelizer building Renderables -start");
        this.meshVerticesRemovedFromInside=Helper.createWireframeMeshFromVertsIndices(allVoxelGridVertices,removed,new THREE.Color('red'));
        this.createdHalfedgeMesh=new HalfedgeMeshRenderer(newHalfedgeMesh);
        console.log("Voxelizer building Renderables -stop");
    }

    // Debug the removed vertices after the voxelization step
    addMeshVerticesRemovedToScene(scene:THREE.Scene,remove:boolean){
        if(!this.meshVerticesRemovedFromInside)return;
        if(remove){
            scene.remove(this.meshVerticesRemovedFromInside);
        }else{
            scene.add(this.meshVerticesRemovedFromInside);
        }
    }

    // Debug the raw created voxels using THREE.js
    addBoxesDebugToScene(scene:THREE.Scene,remove:boolean){
        for(let i=0;i<this.testHelperBoxes.length;i++){
            if(remove){
                scene.remove(this.testHelperBoxes[i]);
            }else{
                scene.add(this.testHelperBoxes[i]);
            }
        }
    }

    // Remove all debuggables from the scene if added
    removeAllFromScene(scene:THREE.Scene){
        this.addBoxesDebugToScene(scene,true);
        this.addMeshVerticesRemovedToScene(scene,true);
        if(this.createdHalfedgeMesh){
            this.createdHalfedgeMesh!.removeAllIfAdded(scene);
        }
    }
}