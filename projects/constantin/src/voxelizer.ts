import { SparseMatrix, DenseMatrix, Triplet } from '@penrose/linear-algebra';
import { Vertex, Edge, Face, Halfedge } from './geometry/primitive';
import { Vector } from './linalg/vec';
import { smoothstep } from 'three/src/math/MathUtils';
import { assert } from 'console';
import { AlignedCube } from './linalg/AlignedCube';
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

    constructor(){
        this.helperBoxes=[];
        this.testMeshes=[];
        this.testMeshes2=[];
        this.lastVoxelConstructionTime=0;
        this.verticesBuff=[];
        this.indicesBuff=[];
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

    
    createVoxels(originalMesh:HalfedgeMesh,scene:THREE.Scene,nVoxelsPerHalfAxis?:number){
        this.removeFromScene(scene);
        this.helperBoxes=[];
        this.testMeshes=[];
        this.testMeshes2=[];
        this.verticesBuff=[];
        this.indicesBuff=[];
        const start = new Date().getTime();

        let materialGreen=new THREE.MeshPhongMaterial({color: 'green'});
        let materialRed=new THREE.MeshPhongMaterial({color: 'red'});
        let materialBlue=new THREE.MeshPhongMaterial({color: 'blue'});

        var singleGeometry = new THREE.BufferGeometry();
        const tmpCube=new THREE.BoxBufferGeometry(1,1,1);
        //THREE.GeometryUtils.merge(singleGeometry,tmpCube);
    
        const VOXELS_PER_HALF_AXIS=nVoxelsPerHalfAxis ? nVoxelsPerHalfAxis : 10;
        const VOXELS_PER_AXIS=VOXELS_PER_HALF_AXIS*2;
        const VOXEL_SIZE=1/VOXELS_PER_AXIS;
        let ret=new Array<THREE.Mesh>(VOXELS_PER_AXIS*VOXELS_PER_AXIS*VOXELS_PER_AXIS);
        let idx=0;
        for(let x=-VOXELS_PER_HALF_AXIS;x<VOXELS_PER_HALF_AXIS;x++){
            for(let y=-VOXELS_PER_HALF_AXIS;y<VOXELS_PER_HALF_AXIS;y++){
            for(let z=-VOXELS_PER_HALF_AXIS;z<VOXELS_PER_HALF_AXIS;z++){
                //console.log("Voxelizing:" + x +","+y+","+z);
    
                const x1=x*VOXEL_SIZE;
                const y1=y*VOXEL_SIZE;
                const z1=z*VOXEL_SIZE;
                const alignedCube=new AlignedCube(x1,y1,z1,VOXEL_SIZE);
    
                let intersectsAny=false;
                for(let f of originalMesh.faces){
                    const triangleData=f.asTriangle();
                    const triangle=this.convertToThreeJs(triangleData);
                    if(alignedCube.intersect(triangle)){
                        intersectsAny=true;
                        break;
                    }
                }
    
                if(intersectsAny){
                    //scene.add(helper);
                    this.helperBoxes.push(alignedCube.createBox3Helper());
                    this.testMeshes.push(alignedCube.createMesh());

                    this.testMeshes2.push(alignedCube.createMesh2(scene));

                    /*let [vertices,indices]= alignedCube.createVerticesIndices();
                    for(let i=0;i<vertices.length;i++){
                        this.verticesBuff.push(vertices[i]);
                    }
                    const idxOffset=this.indicesBuff.length;
                    for(let i=0;i<indices.length;i++){
                        this.indicesBuff.push(idxOffset+indices[i]);
                    }*/

                    //scene.add(mesh);

                    //mesh.updateMatrix();
                    //singleGeometry.merge(mesh.geometry);
                    //THREE.GeometryUtils.merge(singleGeometry,mesh);
                }
                //ret[idx]=helper;
                idx++;
            }
            }
        }
        var singleGeometryMesh = new THREE.Mesh(singleGeometry, materialRed);
        //scene.add(singleGeometryMesh);

        var elapsed = new Date().getTime() - start;
        this.lastVoxelConstructionTime=elapsed;
        console.log("Voxelizing took: "+this.lastVoxelConstructionTime+" ms");
    
        //let tmp=new Array<THREE.Mesh>(1);
        //const mesh = new THREE.Mesh(new THREE.BoxBufferGeometry(1, 1, 1),materialGreen);
        //tmp[0]=mesh;
        //return tmp;
        //return ret;
        //this.bigTestMesh=AlignedCube.createWireframeMeshFromVertsIndices(AlignedCube.convertVertices(this.verticesBuff),this.indicesBuff);
    }

    addToScene(scene:THREE.Scene){
        for(let i=0;i<this.helperBoxes.length;i++){
            scene.add(this.helperBoxes[i]);
        }
        for(let i=0;i<this.testMeshes.length;i++){
            //scene.add(this.testMeshes[i]);
        }
        for(let i=0;i<this.testMeshes2.length;i++){
            scene.add(this.testMeshes2[i]);
        }
        if(this.bigTestMesh){
            scene.add(this.bigTestMesh!);
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
    }

    public static addCubeSizeOne(scene:THREE.Scene){
        const halfSize=0.5;
        const min=new THREE.Vector3(-halfSize,-halfSize,-halfSize);
        const max=new THREE.Vector3(halfSize,halfSize,halfSize);
        const box = new THREE.Box3(min,max);
        const helper = new THREE.Box3Helper(box);
        scene.add(helper);
    }


    appendNewCubeTohalfedgeMesh(){
        // if mesh empty, add cube and return
        // else
        // find any already added cubes that "touch" the new cube
        // add new vertices (if needed), update connectvities
    }

}