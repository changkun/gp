// Consti10

import { Vector } from "./vec";
import * as THREE from 'three'
import { LineSegments } from "three";

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


    static createMeshFromVertsIndices(vertices:number[],indices:number[]):THREE.Mesh{
        const vertices2 = new Float32Array(vertices);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices2, 3 ) );
        geometry.setIndex( indices );
        const material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
        const mesh = new THREE.Mesh( geometry, material );
        return mesh;
    }

    static createWireframeMeshFromVertsIndices(vertices:number[],indices:number[]): THREE.LineSegments{
        const vertices2 = new Float32Array(vertices);
        const geometry = new THREE.BufferGeometry();
        // itemSize = 3 because there are 3 values (components) per vertex
        geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices2, 3 ) );
        geometry.setIndex( indices );
        const material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
        let segments = new THREE.LineSegments(
            new THREE.WireframeGeometry(geometry),
            new THREE.LineBasicMaterial({color: 'green', linewidth: 1})
        );
        return segments;
    }

    testAddSimpleFace(scene:THREE.Scene){
        // create a simple square shape.
        const vertices = [
            -1.0, -1.0,  1.0,
            1.0, -1.0,  1.0,
            1.0,  1.0,  1.0,
           -1.0,  1.0,  1.0,
        ] ;
        const indices=[
            0,1,2,0,2,3
        ];
        scene.add(AlignedCube.createMeshFromVertsIndices(vertices,indices));
        scene.add(AlignedCube.createWireframeMeshFromVertsIndices(vertices,indices));
    }

    static convertVertices(vertices:THREE.Vector3[]):number[]{
        let ret=new Array<number>(vertices.length);
        let count=0;
        for(let i=0;i<vertices.length;i++){
            const vert=vertices[i];
            ret[count++]=vert.x;
            ret[count++]=vert.y;
            ret[count++]=vert.z;
        }
        return ret;
        /*let ret=new Array<number>();
        for(let i=0;i<vertices.length;i++){
            const vert=vertices[i];
            ret.push(vert.x);
            ret.push(vert.y);
            ret.push(vert.z);
        }
        return ret;*/
    }

    createVerticesIndices():[vertices:THREE.Vector3[],indices:number[]]{
        const l = this.size/2;
        let begin=new THREE.Vector3(this.lowerLeftCorner.x,this.lowerLeftCorner.y,this.lowerLeftCorner.z);
        begin.add(new THREE.Vector3(this.size/2,this.size/2,this.size/2));
        let verts = new Array<THREE.Vector3>(8);
        for (let i = 0; i < 8; i++) {
	        verts[i] = new THREE.Vector3(
		        (i & 4) != 0 ? l : -l,
		        (i & 2) != 0 ? l : -l,
		        (i & 1) != 0 ? l : -l).add(begin);
        }
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
        return [verts,indices];
    }

    // https://catonif.github.io/cube/
    createMesh2(scene:THREE.Scene):THREE.LineSegments{
        
        let [vertices,indices]= this.createVerticesIndices();

        //scene.add(this.createMeshFromVertsIndices(scene,vertices,indices));
        //scene.add(this.createWireframeMeshFromVertsIndices(scene,vertices,indices));
        //this.testAddSimpleFace(scene);
        return AlignedCube.createWireframeMeshFromVertsIndices(AlignedCube.convertVertices(vertices),indices);
    }
   
}