
import * as THREE from 'three';
import { Vertex, Edge, Face, Halfedge } from '../geometry/primitive';
import { Vector } from '../linalg/vec';

// contains only static methods that are usefully for debugging and conversion between types
export class Helper{

    static addCubeSizeOne(scene:THREE.Scene){
        const halfSize=0.5;
        const min=new THREE.Vector3(-halfSize,-halfSize,-halfSize);
        const max=new THREE.Vector3(halfSize,halfSize,halfSize);
        const box = new THREE.Box3(min,max);
        const helper = new THREE.Box3Helper(box);
        scene.add(helper);
    }

     // create a mesh from the given vertices and indices
     static createMeshFromVertsIndices(vertices:number[],indices:number[]):THREE.Mesh{
        const vertices2 = new Float32Array(vertices);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices2, 3 ) );
        geometry.setIndex( indices );
        const material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
        const mesh = new THREE.Mesh( geometry, material );
        return mesh;
    }

    // create a wireframe mesh from the given vertices and indices
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

    static testAddSimpleFace(scene:THREE.Scene){
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
        scene.add(Helper.createMeshFromVertsIndices(vertices,indices));
        scene.add(Helper.createWireframeMeshFromVertsIndices(vertices,indices));
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
    }

    static convertToThreeJs(vertices:Vector[]):THREE.Triangle{
        const v1=new THREE.Vector3(vertices[0].x,vertices[0].y,vertices[0].z);
        const v2=new THREE.Vector3(vertices[1].x,vertices[1].y,vertices[1].z);
        const v3=new THREE.Vector3(vertices[2].x,vertices[2].y,vertices[2].z);
        return new THREE.Triangle(v1,v2,v3);
    }

    public static debugBoundingBox(box:THREE.Box3){
        let v1=new THREE.Vector3();
        let v2=new THREE.Vector3();
        box.getSize(v1);
        box.getCenter(v2);
        console.log("Box:Center("+v2.x+","+v2.y+","+v2.z+")"+"Size("+v1.x+","+v1.y+","+v1.z+")");
    }
    static getRandomInt(max:number):number {
        return Math.floor(Math.random() * max);
    }

}