// Consti10

import { Vector } from "./vec";
import * as THREE from 'three'

// a aligned cube is defined by
// 1) min: Vector3 representing the lower left (x,y,z) corner of the box
// 2) max: Vector3 representing the upper right (x,y,z) corner of the box
//
export class AlignedCube {
    lowerLeftCorner:THREE.Vector3;
    size:number;
     // testing
    min:THREE.Vector3;
    max:THREE.Vector3;
    box:THREE.Box3;
  
    constructor(x:number,y:number,z:number,size:number){
        this.lowerLeftCorner=new THREE.Vector3(x,y,z);
        this.size=size;
        this.min=this.lowerLeftCorner;
        this.max=new THREE.Vector3(this.min.x+this.size,this.min.y+this.size,this.min.z+this.size);
        this.box = new THREE.Box3(this.min,this.max);
    }

    intersect(triangle:THREE.Triangle){
        return this.box.intersectsTriangle(triangle);
    }
  
    createBox3Helper(): THREE.Box3Helper{
        return new THREE.Box3Helper(this.box);
    }

    createMesh():THREE.Mesh{
        let materialGreen=new THREE.MeshPhongMaterial({color: 'green'});
        const geometry=new THREE.BoxBufferGeometry(this.size,this.size,this.size);
        const mesh = new THREE.Mesh(geometry,materialGreen);
        const VOXEL_SIZE_HALF=this.size/2.0;
        mesh.position.set(this.min.x+VOXEL_SIZE_HALF,this.min.y+VOXEL_SIZE_HALF,this.min.z+VOXEL_SIZE_HALF);
        return mesh;
    }
   
}
