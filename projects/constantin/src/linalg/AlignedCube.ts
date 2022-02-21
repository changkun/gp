// Consti10

import { Vector } from "./vec";
import * as THREE from 'three'
import { LineSegments } from "three";
import { assert } from "console";
import { ThreeDArray } from './3DArray';
import { Helper} from '../helper/Helper';

// a aligned cube is defined by
// 1) its lower left corner (x,y,z)
// 2) its size in both x,y, and z direction
export class AlignedCube {
    lowerLeftCorner:THREE.Vector3;
    size:number;
     // testing
    min:THREE.Vector3;
    max:THREE.Vector3;
    box:THREE.Box3;

    //construct from lower left postion and size
    constructor(x:number,y:number,z:number,size:number){
        this.lowerLeftCorner=new THREE.Vector3(x,y,z);
        this.size=size;
        this.min=this.lowerLeftCorner;
        this.max=new THREE.Vector3(this.min.x+this.size,this.min.y+this.size,this.min.z+this.size);
        this.box = new THREE.Box3(this.min,this.max);
    }

    // check if this cube intersects with the given triangle
    intersect(triangle:THREE.Triangle){
        return this.box.intersectsTriangle(triangle);
    }
  
    // Helper,for debugging
    createBox3Helper(): THREE.Box3Helper{
        return new THREE.Box3Helper(this.box);
    }
    // Helper,for debugging
    createBoxBufferGeometryMesh():THREE.Mesh{
        let materialGreen=new THREE.MeshPhongMaterial({color: 'green'});
        const geometry=new THREE.BoxBufferGeometry(this.size,this.size,this.size);
        const mesh = new THREE.Mesh(geometry,materialGreen);
        const VOXEL_SIZE_HALF=this.size/2.0;
        mesh.position.set(this.min.x+VOXEL_SIZE_HALF,this.min.y+VOXEL_SIZE_HALF,this.min.z+VOXEL_SIZE_HALF);
        return mesh;
    }

    static createCubeVertices(lowerLeftCorner:THREE.Vector3,size:number):THREE.Vector3[]{
        const l =size/2;
        let begin=new THREE.Vector3(lowerLeftCorner.x,lowerLeftCorner.y,lowerLeftCorner.z);
        begin.add(new THREE.Vector3(size/2,size/2,size/2));
        let verts = new Array<THREE.Vector3>(8);
        for (let i = 0; i < 8; i++) {
            const x=(i & 4) != 0 ? l : -l;
            const y= (i & 2) != 0 ? l : -l;
            const z=(i & 1) != 0 ? l : -l;
	        verts[i] = new THREE.Vector3(x,y,z).add(begin);
        }
        return verts;
    }

    static createCubeIndices():number[]{
        let indices=new Array<number>();
        let AddVert= (one: number, two: number,three:number) => {
            indices.push(one);
            indices.push(two);
            indices.push(three);
        }
        for (let i = 0; i < 3; i++) {
            let v1 = 1 << i;
            let v2 = v1 == 4 ? 1 : v1 << 1;
            AddVert(0, v1, v2);
            AddVert(v1 + v2, v2, v1);
            AddVert(7, 7 - v2, 7 - v1);
            AddVert(7 - (v1 + v2), 7 - v1, 7 - v2);
        }
        return indices;
    }
    static createCubeVerticesX():THREE.Vector3[]{
        const l =1;
        let verts = new Array<THREE.Vector3>();
        for (let i = 0; i < 8; i++) {
            const right=(i & 4) != 0 ? 0 : 1;
            const up= (i & 2) != 0 ? 0 : 1;
            const back=(i & 1) != 0 ? 0 : 1;
        }
        return verts;
    }

    // https://catonif.github.io/cube/
    createVerticesIndices():[vertices:THREE.Vector3[],indices:number[]]{
        return [AlignedCube.createCubeVertices(this.lowerLeftCorner,this.size),AlignedCube.createCubeIndices()];
    }

    //createIndices(idx:number){
    //    const offset=idx
    //}

    static createFacesIndices(x:number,y:number,z:number,map:number[][][]):number[]{
        //let indices=this.createCubeIndices();
        let ret=new Array<number>();
        /*let ret=new Array<number>();
        for (let i = 0; i <8; i++) {
            const x1=(i & 4) != 0 ? 1 : 0;
            const y1= (i & 1) != 0 ? 1 : 0;
            const z1=(i & 9) != 0 ? 1 : 0;
            ret.push(map[x+x1][y+y1][z+z1]);
        }*/
        /*for (let i = 0; i < 8; i++) {
            const right=(i & 4) != 0 ? 0 : 1;
            const up= (i & 2) != 0 ? 0 : 1;
            const back=(i & 1) != 0 ? 0 : 1;

        }

        let indices=AlignedCube.createCubeIndices();
        let vertices=AlignedCube.createCubeVerticesX();
        for(let i=0;i<indices.length;i++){
            const vert=vertices[indices[i]];
            ret.push(map[vert.x][vert.y][vert.z]);
        }*/
        /*let indices2= [
            //Top
            1, 6, 7,
            1, 3, 7,
            //Bottom
            0, 4, 5,
            0, 1, 5,
            //Left
            0, 2, 6,
            0, 4, 6,
            //Right
            1, 3, 7,
            1, 5, 7,
            //Front
            0, 2, 3,
            0, 1, 3,
            //Back
            4, 6, 7,
            4, 5, 7
        ];*/
        /*for (let i = 0; i <8; i++) {
            const x1=(i & 4) != 0 ? 1 : 0;
            const y1= (i & 1) != 0 ? 1 : 0;
            const z1=(i & 9) != 0 ? 1 : 0;
            ret.push(map[x+x1][y+y1][z+z1]);
        }*/
        let faceIndices=[
            // front
            [x,y,z],
            [x+1,y,z],
            [x+1,y+1,z],
            [x,y,z],
            [x+1,y+1,z],
            [x,y+1,z],
            // back
            [x,y,z+1],
            [x+1,y,z+1],
            [x+1,y+1,z+1],
            [x,y,z+1],
            [x+1,y+1,z+1],
            [x,y+1,z+1],
            // top
            [x+0,y+1,z+0],
            [x+1,y+1,z+0],
            [x+1,y+1,z+1],
            [x+0,y+1,z+0],
            [x+1,y+1,z+1],
            [x+0,y+1,z+1],
            // bottom
            [x+0,y,z+0],
            [x+1,y,z+0],
            [x+1,y,z+1],
            [x+0,y,z+0],
            [x+1,y,z+1],
            [x+0,y,z+1],
            // left
            [x,y+0,z+0],
            [x,y+1,z+0],
            [x,y+1,z+1],
            [x,y+0,z+0],
            [x,y+1,z+1],
            [x,y+0,z+1],
            // right
            [x+1,y+0,z+0],
            [x+1,y+1,z+0],
            [x+1,y+1,z+1],
            [x+1,y+0,z+0],
            [x+1,y+1,z+1],
            [x+1,y+0,z+1],
        ];

        for(let i=0;i<faceIndices.length;i++){
            const m=faceIndices[i];
            ret.push(map[m[0]][m[1]][m[2]]);
        }
    
        /*ret.push(map[x][y][z]);
        ret.push(map[x][y+1][z]);
        ret.push(map[x][y+1][z+1]);

        ret.push(map[x][y][z]);
        ret.push(map[x][y+1][z]);
        ret.push(map[x][y+1][z+1]);


        ret.push(map[x][y][z]);
        ret.push(map[x][y+1][z]);
        ret.push(map[x][y+1][z+1]);*/

        return ret;
    }

    createMesh2(scene:THREE.Scene):THREE.LineSegments{
        
        let [vertices,indices]= this.createVerticesIndices();

        //scene.add(this.createMeshFromVertsIndices(scene,vertices,indices));
        //scene.add(this.createWireframeMeshFromVertsIndices(scene,vertices,indices));
        //this.testAddSimpleFace(scene);
        return Helper.createWireframeMeshFromVertsIndices(Helper.convertVertices(vertices),indices);
    }
   
}
