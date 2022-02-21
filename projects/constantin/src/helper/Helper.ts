
import * as THREE from 'three';
import { Vertex, Edge, Face, Halfedge } from '../geometry/primitive';
import { Vector } from '../linalg/vec';

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


}