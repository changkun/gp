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

export class Voxelizer {
    // uses the raw voxelization output 
    testHelperBoxes: Array<THREE.Box3Helper>;
    testHelperMeshes: Array<THREE.Mesh>;
    // how long the voxelization step took
    lastVoxelConstructionTime:number;
    //
    testMeshes2: Array<THREE.LineSegments>;
    //
    verticesBuff:THREE.Vector3[];
    indicesBuff:number[];
    bigTestMesh?:THREE.LineSegments;

    createdHalfedgeMesh?:HalfedgeMesh;
    triangleIndicesMap=new Map();

    mappedTriangleIndices:number[];
    completelyDiscardedTriangleIndices=new Map();
    completelyRemovedIndices:number[];
    //allIndicesMap=new Map();
    allIndicesArray:number[];
    //
    yIndices=new Array<number>();
    yVertices=new Array<number>();


    constructor(){
        this.testHelperBoxes=[];
        this.testHelperMeshes=[];
        this.testMeshes2=[];
        this.lastVoxelConstructionTime=0;
        this.verticesBuff=[];
        this.indicesBuff=[];
        this.mappedTriangleIndices=[];
        this.completelyRemovedIndices=[];
        this.allIndicesArray=[];
    }
    
    voxelizeHalfedgeMesh(originalMesh:HalfedgeMesh,scene:THREE.Scene,nVoxelsPerHalfAxis?:number){
        this.removeAllFromScene(scene);
        this.testHelperBoxes=[];
        this.testHelperMeshes=[];
        this.testMeshes2=[];
        this.verticesBuff=[];
        this.indicesBuff=[];
        this.mappedTriangleIndices=[];
        this.triangleIndicesMap.clear();
        this.completelyDiscardedTriangleIndices.clear();
        this.completelyRemovedIndices=[];
        this.allIndicesArray=[];
        this.yIndices=[];
        this.yVertices=[];
        const start = new Date().getTime();

        const VOXELS_PER_HALF_AXIS=nVoxelsPerHalfAxis ? nVoxelsPerHalfAxis : 10;
        const VOXELS_PER_AXIS=VOXELS_PER_HALF_AXIS*2;
        const VOXEL_SIZE=1/VOXELS_PER_AXIS;
        let xOriginalTriangles=new Array<THREE.Triangle>();
        for(let f of originalMesh.faces){
            const triangleData=f.asTriangle();
            const triangle=Helper.convertToThreeJs(triangleData);
            xOriginalTriangles.push(triangle);
        }

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

                        let [vertices,indices]= alignedCube.createVerticesIndices();
                        const idxOffset=this.verticesBuff.length;
                        //const idxOffset=ramba[idxX][idxY][idxZ];
                        for(let i=0;i<vertices.length;i++){
                            this.verticesBuff.push(vertices[i]);
                        }
                        //console.log("IndicesX");
                        for(let i=0;i<indices.length;i++){
                            //console.log("Indices:"+indices[i]);
                            this.indicesBuff.push(idxOffset+indices[i]);
                        }
                        this.testMeshes2.push(Helper.createWireframeMeshFromVertsIndices(Helper.convertVertices(vertices),indices));
                        const argh=AlignedCube.createFacesIndices(x,y,z,ramba);
                        xBuffIndices=xBuffIndices.concat(argh);
                        this.appendNewCubeTohalfedgeMesh(argh);
                    }
                    idx++;
                }
            }
        }
        //Helper.testIndices(scene);
        //scene.add(AlignedCube.createWireframeMeshFromVertsIndices(xBuffVertices,this.mappedTriangleIndices));
        /*let allIndicesMap=new Map();
        for(let i=0;i<this.mappedTriangleIndices.length;i++){
            const idx=this.mappedTriangleIndices[i];
            removeMap.set(idx,idx);
        }*/
        this.removeTwins();

        var elapsed = new Date().getTime() - start;
        this.lastVoxelConstructionTime=elapsed;
        console.log("Voxelizing took: "+this.lastVoxelConstructionTime+" ms");

        let [x1Vert,x1Ind]=Helper.removeIsolatedVertices(Helper.convertToThreJs2(xBuffVertices),this.yIndices);
        this.bigTestMesh=Helper.createWireframeMeshFromVertsIndices(Helper.convertVertices(x1Vert),x1Ind,new THREE.Color('red'));

        //this.bigTestMesh=Helper.createWireframeMeshFromVertsIndices(xBuffVertices,this.completelyRemovedIndices,new THREE.Color('red'));

        //this.bigTestMesh=AlignedCube.createWireframeMeshFromVertsIndices(AlignedCube.convertVertices(this.verticesBuff),this.indicesBuff);
        //this.bigTestMesh=Helper.createWireframeMeshFromVertsIndices(xBuffVertices,this.yIndices,new THREE.Color('red'));
        //scene.add(Helper.createWireframeMeshFromVertsIndices(xBuffVertices,this.yIndices,new THREE.Color('green')));
        //scene.add(Helper.createWireframeMeshFromVertsIndices(this.yVertices,this.yIndices,new THREE.Color('green'),3));
        //this.bigTestMesh=AlignedCube.createWireframeMeshFromVertsIndices(xBuffVertices,this.indicesBuff);
        //scene.add(this.bigTestMesh!);

        //this.createdHalfedgeMesh=new HalfedgeMesh(this.indicesBuff,Vector.convArray(this.verticesBuff));
        //this.createdHalfedgeMesh=new HalfedgeMesh(this.mappedTriangleIndices,Vector.convArray3(xBuffVertices));
        //this.createdHalfedgeMesh=new HalfedgeMesh(xBuffIndices,Vector.convArray3(xBuffVertices));
        //this.createdHalfedgeMesh=new HalfedgeMesh(this.yIndices,Vector.convArray3(xBuffVertices));
        //this.createdHalfedgeMesh=new HalfedgeMesh(x1Ind,Vector.convArray(x1Vert));
        //this.createdHalfedgeMesh!.createAllRenderHelpers();

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
        if(this.createdHalfedgeMesh){
            if(remove){
                this.createdHalfedgeMesh!.removeAllIfAdded(scene);
            }else{
                this.createdHalfedgeMesh!.addHalfedgeHelpersToScene(scene,false);
            }
        }
    }

    removeAllFromScene(scene:THREE.Scene){
        this.addBoxesDebugToScene(scene,true);
        this.addOtherDebugToScene(scene,true);
    }


    // If a face (or rather a triangle) is duplicated in the voxelized mesh, we can
    // savely remove it
    removeTwins(){
       let [remaining,removed]=Helper.removeTwinTriangles(this.allIndicesArray);
       this.yIndices=remaining;
       this.completelyRemovedIndices=removed;
    }


    appendNewCubeTohalfedgeMesh(cubeIndices:number[]){
        /*for(let i=0;i<cubeIndices.length;i+=3){
            const a=cubeIndices[i+0];
            const b=cubeIndices[i+1];
            const c=cubeIndices[i+2];
            const e = `${a}-${b}-${c}`;
            if(!this.completelyDiscardedTriangleIndices.has(e)){
                // we have not yet removed this triangle
                if (!this.triangleIndicesMap.has(e)) {
                    this.triangleIndicesMap.set(e, [a, b,c])
                    this.completelyDiscardedTriangleIndices.set(e,[a,b,c]);
                    this.mappedTriangleIndices.push(a);
                    this.mappedTriangleIndices.push(b);
                    this.mappedTriangleIndices.push(c);
                }else{
                    console.log("Duplicate removed\n");
                }
            }else{
                console.log("Completely removed\n");
            }
        }*/
        /*for(let i=0;i<cubeIndices.length;i++){
            this.mappedTriangleIndices.push(cubeIndices[i]);
        }*/
        for(let i=0;i<cubeIndices.length;i++){
            this.allIndicesArray.push(cubeIndices[i]);
        }
    
        for(let i=0;i<cubeIndices.length;i+=6){
            // These vertices form a face
            const a1=cubeIndices[i+0];
            const b1=cubeIndices[i+1];
            const c1=cubeIndices[i+2];

            const a2=cubeIndices[i+3];
            const b2=cubeIndices[i+4];
            const c2=cubeIndices[i+5];

            //if(a1!=a2){
            //    console.log("Argh");
            //}
            //if(c1!=c2){
                //console.log("Argh2:"+a1+","+b1+","+c1+" |"+a2+","+b2+","+c2+" |");
            //}

            const e = `${a1}-${b1}-${c1}-${a2}-${b2}-${c2}`;
            //console.log("Hash:"+e);

            if(!this.completelyDiscardedTriangleIndices.has(e)){
                // we have not yet removed this triangle
                if (!this.triangleIndicesMap.has(e)) {
                    this.triangleIndicesMap.set(e, [a1, b1,c1])
                    this.completelyDiscardedTriangleIndices.set(e,[a1,b1,c1]);
                    this.mappedTriangleIndices.push(a1);
                    this.mappedTriangleIndices.push(b1);
                    this.mappedTriangleIndices.push(c1);
                    //
                    this.mappedTriangleIndices.push(a2);
                    this.mappedTriangleIndices.push(b2);
                    this.mappedTriangleIndices.push(c2);
                }else{
                    console.log("Duplicate removed\n");
                }
            }else{
                //console.log("Completely removed\n");
                this.completelyRemovedIndices.push(a1);
                this.completelyRemovedIndices.push(b1);
                this.completelyRemovedIndices.push(c1);
                //
                this.completelyRemovedIndices.push(a2);
                this.completelyRemovedIndices.push(b2);
                this.completelyRemovedIndices.push(c2);
            }
        }
    }

}