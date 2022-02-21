import { SparseMatrix, DenseMatrix, Triplet } from '@penrose/linear-algebra';
import { Vertex, Edge, Face, Halfedge } from './geometry/primitive';
import { Vector } from './linalg/vec';
import { smoothstep } from 'three/src/math/MathUtils';
import { assert } from 'console';
import { AlignedCube } from './linalg/AlignedCube';
import { ThreeDArray } from './linalg/3DArray';
import * as THREE from 'three'
import { HalfedgeMesh } from './geometry/halfedge';


export class Voxelizer {

    helperBoxes: Array<THREE.Box3Helper>;

    testMeshes: Array<THREE.Mesh>;

    lastVoxelConstructionTime:number;

    testMeshes2: Array<THREE.LineSegments>;
    //
    verticesBuff:THREE.Vector3[];
    indicesBuff:number[];
    bigTestMesh?:THREE.LineSegments;

    createdHalfedgeMesh?:HalfedgeMesh;
    triangleIndicesMap=new Map();

    mappedTriangleIndices:number[];
    completelyDiscardedTriangleIndices=new Map();

    constructor(){
        this.helperBoxes=[];
        this.testMeshes=[];
        this.testMeshes2=[];
        this.lastVoxelConstructionTime=0;
        this.verticesBuff=[];
        this.indicesBuff=[];
        this.mappedTriangleIndices=[];
    }

    getRandomInt(max:number):number {
        return Math.floor(Math.random() * max);
    }
    
    convertToThreeJs(vertices:Vector[]):THREE.Triangle{
        const v1=new THREE.Vector3(vertices[0].x,vertices[0].y,vertices[0].z);
        const v2=new THREE.Vector3(vertices[1].x,vertices[1].y,vertices[1].z);
        const v3=new THREE.Vector3(vertices[2].x,vertices[2].y,vertices[2].z);
        return new THREE.Triangle(v1,v2,v3);
    }

    testIndices(scene:THREE.Scene){
        let xBuffVertices=new Array<number>();
        let xBuffIndices=new Array<number>();
        const xSize=10;
        const xSizePlus1=xSize+1;
        let ramba=ThreeDArray.create3DArray(xSizePlus1);
        let countLol=0;
        for(let x=0;x<xSizePlus1;x++){
            for(let y=0;y<xSizePlus1;y++){
                for(let z=0;z<xSizePlus1;z++){
                    const x1=x*0.1;
                    const y1=y*0.1;
                    const z1=z*0.1;
                    xBuffVertices.push(x1);
                    xBuffVertices.push(y1);
                    xBuffVertices.push(z1);
                    ramba[x][y][z]=countLol;
                    countLol++;
                }
            }
        }
        for(let x=0;x<xSize;x++){
            for(let y=0;y<xSize;y++){
                for(let z=0;z<xSize;z++){
                    //xBuffIndices=xBuffIndices.concat(AlignedCube.createFacesIndices(x,y,z,ramba));
                }
            }
        }
        xBuffIndices=xBuffIndices.concat(AlignedCube.createFacesIndices(xSize-1,xSize-1,xSize-1,ramba));
        scene.add(AlignedCube.createWireframeMeshFromVertsIndices(xBuffVertices,xBuffIndices));
    }
    
    createVoxels(originalMesh:HalfedgeMesh,scene:THREE.Scene,nVoxelsPerHalfAxis?:number){
        this.removeFromScene(scene);
        this.helperBoxes=[];
        this.testMeshes=[];
        this.testMeshes2=[];
        this.verticesBuff=[];
        this.indicesBuff=[];
        this.mappedTriangleIndices=[];
        this.triangleIndicesMap.clear();
        const start = new Date().getTime();

        const VOXELS_PER_HALF_AXIS=nVoxelsPerHalfAxis ? nVoxelsPerHalfAxis : 10;
        const VOXELS_PER_AXIS=VOXELS_PER_HALF_AXIS*2;
        const VOXEL_SIZE=1/VOXELS_PER_AXIS;
        let xOriginalTriangles=new Array<THREE.Triangle>();
        for(let f of originalMesh.faces){
            const triangleData=f.asTriangle();
            const triangle=this.convertToThreeJs(triangleData);
            xOriginalTriangles.push(triangle);
        }

        //this.testIndices(scene);
    
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
                        //scene.add(helper);
                        this.helperBoxes.push(alignedCube.createBox3Helper());
                        this.testMeshes.push(alignedCube.createBoxBufferGeometryMesh());

                        let [vertices,indices]= alignedCube.createVerticesIndices();
                        const idxOffset=this.verticesBuff.length;
                        //const idxOffset=ramba[idxX][idxY][idxZ];
                        for(let i=0;i<vertices.length;i++){
                            this.verticesBuff.push(vertices[i]);
                        }
                        for(let i=0;i<indices.length;i++){
                            this.indicesBuff.push(idxOffset+indices[i]);
                        }
                        this.testMeshes2.push(AlignedCube.createWireframeMeshFromVertsIndices(AlignedCube.convertVertices(vertices),indices));
                        const argh=AlignedCube.createFacesIndices(x,y,z,ramba);
                        xBuffIndices=xBuffIndices.concat(argh);
                        this.appendNewCubeTohalfedgeMesh(argh);
                    }
                    idx++;
                }
            }
        }
        // remove all unneeded vertices


        scene.add(AlignedCube.createWireframeMeshFromVertsIndices(xBuffVertices,this.mappedTriangleIndices));

        var elapsed = new Date().getTime() - start;
        this.lastVoxelConstructionTime=elapsed;
        console.log("Voxelizing took: "+this.lastVoxelConstructionTime+" ms");

        this.bigTestMesh=AlignedCube.createWireframeMeshFromVertsIndices(AlignedCube.convertVertices(this.verticesBuff),this.indicesBuff);
        //this.bigTestMesh=AlignedCube.createWireframeMeshFromVertsIndices(xBuffVertices,this.indicesBuff);
        //scene.add(this.bigTestMesh!);

        //this.createdHalfedgeMesh=new HalfedgeMesh(this.indicesBuff,Vector.convArray(this.verticesBuff));
        this.createdHalfedgeMesh=new HalfedgeMesh(this.mappedTriangleIndices,Vector.convArray3(xBuffVertices));
    }

    addToScene(scene:THREE.Scene){
        for(let i=0;i<this.helperBoxes.length;i++){
            //scene.add(this.helperBoxes[i]);
        }
        for(let i=0;i<this.testMeshes.length;i++){
            //scene.add(this.testMeshes[i]);
        }
        for(let i=0;i<this.testMeshes2.length;i++){
            //scene.add(this.testMeshes2[i]);
        }
        if(this.bigTestMesh){
            //scene.add(this.bigTestMesh!);
        }
        if(this.createdHalfedgeMesh){
            this.createdHalfedgeMesh!.createRenderableHalfedgeHelpers();
            this.createdHalfedgeMesh!.addEdgeHelpersToScene(scene,false);
        }
    }

    removeFromScene(scene:THREE.Scene){
        for(let i=0;i<this.helperBoxes.length;i++){
            scene.remove(this.helperBoxes[i]);
        }
        for(let i=0;i<this.testMeshes.length;i++){
            scene.remove(this.testMeshes[i]);
        }
        for(let i=0;i<this.testMeshes2.length;i++){
            scene.remove(this.testMeshes2[i]);
        }
        if(this.bigTestMesh){
            scene.remove(this.bigTestMesh!);
        }
        if(this.createdHalfedgeMesh){
            this.createdHalfedgeMesh!.addHalfedgeHelpersToScene(scene,true);
        }
    }

    public static addCubeSizeOne(scene:THREE.Scene){
        const halfSize=0.5;
        const min=new THREE.Vector3(-halfSize,-halfSize,-halfSize);
        const max=new THREE.Vector3(halfSize,halfSize,halfSize);
        const box = new THREE.Box3(min,max);
        const helper = new THREE.Box3Helper(box);
        scene.add(helper);
    }


    appendNewCubeTohalfedgeMesh(cubeIndices:number[]){
        for(let i=0;i<cubeIndices.length;i+=3){
            const a=cubeIndices[i+0];
            const b=cubeIndices[i+1];
            const c=cubeIndices[i+2];
            const e = `${a}-${b}-${c}`
            if (!this.triangleIndicesMap.has(e)) {
                this.triangleIndicesMap.set(e, [a, b,c])
                this.mappedTriangleIndices.push(a);
                this.mappedTriangleIndices.push(b);
                this.mappedTriangleIndices.push(c);
            }else{
                //console.log("Removed unndeeded\n");
            }
        }
    }

}