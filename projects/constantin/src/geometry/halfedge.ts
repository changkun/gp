// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.
import { Vertex, Edge, Face, Halfedge, NormalMethod } from './primitive';
import { Vector } from '../linalg/vec';
import { smoothstep } from 'three/src/math/MathUtils';
import { assert } from 'console';
import * as THREE from 'three'
import { Vector3 } from 'three';
import {AABB} from './aabb';
import { Voxelizer } from '../voxelizer';
import {VertexNormalsHelper} from 'three/examples/jsm/helpers/VertexNormalsHelper';

export enum WeightType {
  Uniform = 'Uniform',
  Cotan = 'Cotan',
}

export class HalfedgeMesh {
  color: Vector;
  wireframe: Vector;

  // The following four fields are the key fields to represent half-edge based
  // meshes.
  verts: Vertex[]; // a list of vertices
  edges: Edge[]; // a list of edges
  faces: Face[]; // a list of faces
  halfedges: Halfedge[]; // a list of halfedges
  // These variables are only used by the underlying Three.js renderer
  // create them after construction via the proper methods below or after updating the
  // halfedge data structure
  edgeHelpers:Array<THREE.ArrowHelper>=[]; //arrows for edges
  halfedgeHelpers:Array<THREE.ArrowHelper>=[]; // arrows for halfedges
  mesh3js?: THREE.Mesh; // three.js 3D colored mesh
  normalHelper?: VertexNormalsHelper; //normal arrows
  wireframeHelper?: THREE.LineSegments; //wireframe mesh

  // parse a text string from an .obj file into arrays of indices and positions
  static loadObj(data: string):[number[],Vector[]]{
     // load .obj file
     const indices: number[] = [];
     const positions: Vector[] = [];
     const lines = data.split('\n');
     for (let line of lines) {
       line = line.trim();
       const tokens = line.split(' ');
       switch (tokens[0].trim()) {
         case 'v':
           positions.push(
             new Vector(
               parseFloat(tokens[1]),
               parseFloat(tokens[2]),
               parseFloat(tokens[3]),
               1
             )
           );
           break;
         case 'f':
           // only load indices of vertices
           for (let i = 1; i < tokens.length; i++) {
             const vv = tokens[i].split('/');
             indices.push(parseInt(vv[0]) - 1);
           }
           break;
       }
     }
     // Here we scale the vertices of the input mesh such that
    // they are inside a bounding box of fixed size
    const aabb = new AABB(positions);
    for(let i=0;i<positions.length;i++){
      positions[i]=aabb.transformToFit(positions[i]);
    }
    aabb.debug();
    aabb.checkTransformSuccessfull(positions);
     return [indices,positions];
  }

  /**
   * constructor constructs the halfedge-based mesh representation.
   * 
   */
  constructor(indices: number[],positions:Vector[]) {
    this.color = new Vector(0, 128, 255, 1);
    this.wireframe = new Vector(125, 125, 125, 1);
    this.verts = [];
    this.edges = [];
    this.faces = [];
    this.halfedges = [];
    this.buildMesh(indices, positions);
  }


  /**
   * buildMesh builds half-edge based connectivity for the given vertex index buffer
   * and vertex position buffer.
   *
   * @param indices is the vertex index buffer that contains all vertex indices.
   * @param positions is the vertex buffer that contains all vertex positions.
   */
  buildMesh(indices: number[], positions: Vector[]) {
    // TODO: use the halfedge structrue implementation from Homework 1.
    // We assume the input mesh is a manifold mesh.
    // build the halfedge connectivity
    const edges = new Map()
    for (let i = 0; i < indices.length; i += 3) {
      for (let j = 0; j < 3; j++) { // check a face
        var a = indices[i + j]
        var b = indices[i + (j + 1) % 3]

        if (a > b) {
          const tmp = b
          b = a
          a = tmp
        }

        // store the edge if not exists
        const e = `${a}-${b}`
        if (!edges.has(e)) {
          edges.set(e, [a, b])
        }
      }
    }

    this.verts = new Array(positions.length)
    this.edges = new Array(edges.size)
    this.faces = new Array(indices.length / 3)
    this.halfedges = new Array(edges.size * 2)

    const idx2vert = new Map()
    for (let i = 0; i < positions.length; i++) {
      const v = new Vertex(positions[i])
      this.verts[i] = v
      idx2vert.set(i, v)
    }

    let eidx = 0
    let existedHe = new Map()
    let hasTwin = new Map()

    // construct halfedges, edges
    for (let i = 0; i < indices.length; i += 3) {
      // construct face
      const f = new Face()
      this.faces[i / 3] = f

      // construct halfedges of the face
      for (let j = 0; j < 3; j++) {
        const he = new Halfedge()
        this.halfedges[i + j] = he
      }

      // construct connectivities of the new halfedges
      for (let j = 0; j < 3; j++) {
        // halfedge from vertex a to vertex b
        var a = indices[i + j]
        var b = indices[i + (j + 1) % 3]

        // halfedge properties
        const he = this.halfedges[i + j]
        he.next = this.halfedges[i + (j + 1) % 3]
        he.prev = this.halfedges[i + (j + 2) % 3]
        he.onBoundary = false
        hasTwin.set(he, false)

        const v = idx2vert.get(a)
        he.vert = v
        v.halfedge = he

        he.face = f
        f.halfedge = he

        // swap if index a > b, for twin checking
        if (a > b) {
          const tmp = b
          b = a
          a = tmp
        }
        const ek = `${a}-${b}`
        if (existedHe.has(ek)) {
          // if a halfedge has been created before, then
          // it is the twin halfedge of the current halfedge
          const twin = existedHe.get(ek)
          he.twin = twin
          twin.twin = he
          he.edge = twin.edge

          hasTwin.set(he, true)
          hasTwin.set(twin, true)
        } else {
          // new halfedge
          const e = new Edge()
          this.edges[eidx] = e
          eidx++
          he.edge = e
          e.halfedge = he

          existedHe.set(ek, he)
        }

        // FIXME: non-manifold edge count checking
      }
    }

    // create boundary halfedges and hidden faces for the boundary
    let hidx = indices.length
    for (let i = 0; i < indices.length; i++) {
      const he = this.halfedges[i]
      if (hasTwin.get(he)) {
        continue
      }

      // handle halfedge that has no twin
      const f = new Face() // hidden face
      let bcycle = []      // boundary cycle
      let current = he
      do {
        const bhe = new Halfedge() // boundary halfedge
        this.halfedges[hidx] = bhe
        hidx++
        bcycle.push(bhe)

        // grab the next halfedge along the boundary that does not
        // have a twin halfedge
        var next = current.next;

        while (hasTwin.get(next)) {
          next = next?.twin?.next;
        }

        // set the current halfedge's attributes
        bhe.vert = next?.vert;
        bhe.edge = current.edge
        bhe.onBoundary = true

        // point the new halfedge and face to each other
        bhe.face = f
        f.halfedge = bhe

        // point the new halfedge and twin to each other
        bhe.twin = current
        current.twin = bhe

        current = next!;
      } while (current != he)

      // link the cycle of boundary halfedges together
      const n = bcycle.length
      for (let j = 0; j < n; j++) {
        bcycle[j].next = bcycle[(j + n - 1) % n]
        bcycle[j].prev = bcycle[(j + 1) % n]
        hasTwin.set(bcycle[j], true)
        hasTwin.set(bcycle[j].twin, true)
      }
    }

    // reset indices
    let index = 0
    this.verts.forEach(v => { v.idx = index++ })
    index = 0
    this.edges.forEach(e => { e.idx = index++ })
    index = 0
    this.faces.forEach(f => { f.idx = index++ })
    index = 0
    this.halfedges.forEach(h => { h.idx = index++ })
  }

  // The underlying Three.js renderer does not natively support halfedges.
  // these hlper methods fix this issue by converting the data structure into (Helper)
  // that can be rendered by Three.js

 // clears and creates all the rendering helper(s)
  //Call this once after construction or after the halfegde mesh has been updated
  createAllRenderHelpers(){
    this.createRenderableMeshAndWireframe();
    this.createRenderableEdgeHelpers();
    this.createRenderableHalfedgeHelpers();
  }

  // creates a mesh, wireframe mesh and normal helper that can be rendered by Three.js
  createRenderableMeshAndWireframe(){
    // prepare new data
    const g = new THREE.BufferGeometry();
    const v = this.verts.length;
    let bufpos = new Float32Array(v * 3);
    let bufcolors = new Float32Array(v * 3);
    let bufnormals = new Float32Array(v * 3);

    this.verts.forEach(v => {
      const i = v.idx;
      const p=v.position;
      bufpos[3 * i + 0] = p.x;
      bufpos[3 * i + 1] = p.y;
      bufpos[3 * i + 2] = p.z;

      // default GP blue color
      bufcolors[3 * i + 0] = 0;
      bufcolors[3 * i + 1] = 0.5;
      bufcolors[3 * i + 2] = 1;

      const n = v.normal(NormalMethod.EqualWeighted);
      bufnormals[3 * i + 0] = n.x;
      bufnormals[3 * i + 1] = n.y;
      bufnormals[3 * i + 2] = n.z;
    });

    const idxs = new Uint32Array(this.faces.length * 3);
    this.faces.forEach(f => {
      f.vertices((v, i) => {
        idxs[3 * f.idx + i] = v.idx;
      });
    });

    g.setIndex(new THREE.BufferAttribute(idxs, 1));
    g.setAttribute('position', new THREE.BufferAttribute(bufpos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(bufcolors, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(bufnormals, 3));

    this.mesh3js = new THREE.Mesh(
      g,
      new THREE.MeshPhongMaterial({
        vertexColors: true,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
        side: THREE.DoubleSide,
      })
    );
    this.normalHelper = new VertexNormalsHelper(
      this.mesh3js!,
      0.03,
      0xaa0000
    );
    this.wireframeHelper = new THREE.LineSegments(
      new THREE.WireframeGeometry(g),
      new THREE.LineBasicMaterial({color: 0x000000, linewidth: 1})
    );
  }

  //Create an Array of Three.ArrowHelper to draw the halfedges using Three.js
  // the halfedges are represented by Arrows, yellow if not on a boundary, red otherwise
  createRenderableHalfedgeHelpers(){
    // clear, don't forget to remove from scene before recalculation
    this.halfedgeHelpers=[];
    // create Arrows for all the halfedges
    for(let i=0;i<this.halfedges!.length;i++){
      const edgeHe=this.halfedges![i];  
      const origin = edgeHe.vert!.position.convertT();
      const dir=edgeHe.vector().convertT().normalize();
      const len=edgeHe.vector().convertT().length();
      const color = edgeHe.onBoundary ? 0xFF0000 : 0xffff00;
      const headLength=0.01;
      const headWidth=headLength*0.5;
      const arrowHelper = new THREE.ArrowHelper( dir, origin, len,color,headLength,headWidth);
      this.halfedgeHelpers.push(arrowHelper);
    }
  }
  // 
  createRenderableEdgeHelpers(){
    // clear, don't forget to remove from scene before recalculation
    this.edgeHelpers=[];
    // create Arrows for all the edges
    for(let i=0;i<this.edges.length;i++){
      const edge=this.edges[i];
      if(!edge.halfedge){
        break;
      }
      const edgeHe=edge.halfedge!;
      const origin = edgeHe.vert!.position.convertT();
      const dir=edgeHe.vector().convertT().normalize();
      const len=edgeHe.vector().convertT().length();
      const color = 0x00FF00;
      const headLength=0.01;
      const headWidth=headLength*0.5;
      const arrowHelper = new THREE.ArrowHelper( dir, origin, len,color,headLength,headWidth);
      this.edgeHelpers.push(arrowHelper);
    }
  }

  // These methods add / remove the THREE.js renderables to/from the scene
  addMeshHelperToScene(scene:THREE.Scene,remove:boolean){
    if(!this.mesh3js)return;
    if(remove){
      scene.remove(this.mesh3js!);
    }else{
      scene.add(this.mesh3js!);
    }
  }
  addWireframeHelperToScene(scene:THREE.Scene,remove:boolean){
    if(!this.wireframeHelper)return;
    if(remove){
      scene.remove(this.wireframeHelper!);
    }else{
      scene.add(this.wireframeHelper!);
    }
  }
  addNormalHelperToScene(scene:THREE.Scene,remove:boolean){
    if(!this.normalHelper)return;
    if(remove){
      scene.remove(this.normalHelper!);
    }else{
      scene.add(this.normalHelper!);
    }
  }
  addHalfedgeHelpersToScene(scene:THREE.Scene,remove:boolean){
    for(let i=0;i<this.halfedgeHelpers.length;i++){
      if(remove){
        scene.remove(this.halfedgeHelpers![i]);
      }else{
        scene.add(this.halfedgeHelpers![i]);
      }
    }
  }
  addEdgeHelpersToScene(scene:THREE.Scene,remove:boolean){
    for(let i=0;i<this.edgeHelpers.length;i++){
      if(remove){
        scene.remove(this.edgeHelpers![i]);
      }else{
        scene.add(this.edgeHelpers![i]);
      }
    }
  }

  // remve all three.js helper renderables if they are added to the scene
  removeAllIfAdded(scene:THREE.Scene){
    this.addMeshHelperToScene(scene,true);
    this.addWireframeHelperToScene(scene,true);
    this.addNormalHelperToScene(scene,true);
    this.addHalfedgeHelpersToScene(scene,true);
  }
}
