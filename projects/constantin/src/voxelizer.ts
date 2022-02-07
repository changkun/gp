import { SparseMatrix, DenseMatrix, Triplet } from '@penrose/linear-algebra';
import { Vertex, Edge, Face, Halfedge } from './geometry/primitive';
import { Vector } from './linalg/vec';
import { smoothstep } from 'three/src/math/MathUtils';
import { assert } from 'console';
import { Cube } from './linalg/cube';
import * as THREE from 'three'
import { HalfedgeMesh } from './geometry/halfedge';


export class Voxelizer {

    helperBoxes: Array<THREE.Box3Helper>;

    constructor(){
        this.helperBoxes=[];
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

        let materialGreen=new THREE.MeshPhongMaterial({color: 'green'});
        let materialRed=new THREE.MeshPhongMaterial({color: 'red'});
        let materialBlue=new THREE.MeshPhongMaterial({color: 'blue'});
    
        const VOXELS_PER_HALF_AXIS=nVoxelsPerHalfAxis ? nVoxelsPerHalfAxis : 10;
        const VOXELS_PER_AXIS=VOXELS_PER_HALF_AXIS*2;
        const VOXEL_SIZE=1/VOXELS_PER_AXIS;
        let ret=new Array<THREE.Mesh>(VOXELS_PER_AXIS*VOXELS_PER_AXIS*VOXELS_PER_AXIS);
        let idx=0;
        for(let x=-VOXELS_PER_HALF_AXIS;x<VOXELS_PER_HALF_AXIS;x++){
            for(let y=-VOXELS_PER_HALF_AXIS;y<VOXELS_PER_HALF_AXIS;y++){
            for(let z=-VOXELS_PER_HALF_AXIS;z<VOXELS_PER_HALF_AXIS;z++){
                console.log("Voxelizing:" + x +","+y+","+z);
    
                const x1=x*VOXEL_SIZE;
                const y1=y*VOXEL_SIZE;
                const z1=z*VOXEL_SIZE;
    
                const min=new THREE.Vector3(x1,y1,z1);
                const max=new THREE.Vector3(x1+VOXEL_SIZE,y1+VOXEL_SIZE,z1+VOXEL_SIZE);
    
                const box = new THREE.Box3(min,max);
                let intersectsAny=false;
                for(let f of originalMesh.faces){
                const triangleData=f.asTriangle();
                const triangle=this.convertToThreeJs(triangleData);
                if(box.intersectsTriangle(triangle)){
                    intersectsAny=true;
                    break;
                }
                }
                //const geometry=new THREE.BoxBufferGeometry()
                const geometry=new THREE.BoxBufferGeometry(VOXEL_SIZE,VOXEL_SIZE,VOXEL_SIZE);
                const mesh = new THREE.Mesh(geometry,this.getRandomInt(2) % 2 ? materialGreen : materialRed);
                mesh.position.set(x1,y1,z1);

                const helper = new THREE.Box3Helper(box);
    
                if(intersectsAny){
                    //scene.add(helper);
                    this.helperBoxes.push(helper);
                }
                //ret[idx]=helper;
                idx++;
            }
            }
        }
    
        let tmp=new Array<THREE.Mesh>(1);
        const mesh = new THREE.Mesh(new THREE.BoxBufferGeometry(1, 1, 1),materialGreen);
        tmp[0]=mesh;
        //return tmp;
        //return ret;
    }

    addToScene(scene:THREE.Scene){
        for(let i=0;i<this.helperBoxes.length;i++){
            scene.add(this.helperBoxes[i]);
        }
    }

    removeFromScene(scene:THREE.Scene){
        for(let i=0;i<this.helperBoxes.length;i++){
            scene.remove(this.helperBoxes[i]);
        }
    }

}