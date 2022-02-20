// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import Renderer from './renderer';
import {HalfedgeMesh, WeightType} from './geometry/halfedge';
import {NormalMethod, CurvatureMethod} from './geometry/primitive';
import {GUI} from 'dat.gui';
import {
  Mesh,
  LineSegments,
  WireframeGeometry,
  LineBasicMaterial,
  BufferGeometry,
  BufferAttribute,
  DoubleSide,
  MeshPhongMaterial,
  MeshBasicMaterial,
  BoxBufferGeometry,
  Box3,
  Box3Helper,
  ArrowHelper
} from 'three';
import {VertexNormalsHelper} from 'three/examples/jsm/helpers/VertexNormalsHelper';
import {Vector} from './linalg/vec';
import {colormap} from './colors';
import {AABB} from './geometry/aabb';
import { Voxelizer } from './voxelizer';

/**
 * Main extends the Renderer class and constructs the scene.
 */
export default class Main extends Renderer {
  gui: GUI;
  input: HTMLInputElement;
  internal: {
    mesh?: HalfedgeMesh; // internal mesh object
    voxelizer?:Voxelizer; // Consti10 handle to voxels
  };
  params: {
    import: () => void;
    export: () => void;
    showNormals: boolean;
    showWireframe: boolean;
    showHalfedges:boolean;
    showVoxels:boolean;
    normalMethod: NormalMethod;
    nVoxelsPerAxis: number;
    computationTime:number;
  };
  bufpos: Float32Array;
  bufnormals: Float32Array;
  bufcolors: Float32Array;
  /**
   * constroctor creates the objects needed for rendering
   */
  constructor() {
    super();

    // a hidden input field that responsible for loading meshes
    this.input = document.createElement('input');
    this.input.setAttribute('type', 'file');
    this.input.addEventListener('change', () => {
      const file = this.input.files![0];
      if (!file.name.endsWith('.obj')) {
        alert('Only .OBJ files are supported');
      }
      const r = new FileReader();
      r.onload = () => this.loadMesh(<string>r.result);
      r.onerror = () => alert('Cannot import your obj mesh');
      r.readAsText(file);
    });
    document.body.appendChild(this.input);

    this.internal = {};
    this.params = {
      import: () => this.input.click(),
      export: () => this.exportScreenshot(),
      showNormals: false,
      showWireframe: false,
      showHalfedges:false,
      showVoxels:false,
      normalMethod: NormalMethod.EqualWeighted,
      nVoxelsPerAxis: 5,
      computationTime:0,
    };

    this.bufpos = new Float32Array();
    this.bufnormals = new Float32Array();
    this.bufcolors = new Float32Array();

    this.gui = new GUI();
    this.gui.add(this.params, 'import').name('import mesh');
    this.gui.add(this.params, 'export').name('export screenshot');
    this.gui
      .add(this.params, 'showNormals')
      .name('show normals')
      .listen()
      .onChange(show => {
        show
          ? this.internal.mesh!.addNormalHelperToScene(this.scene,false)
          : this.internal.mesh!.addNormalHelperToScene(this.scene,true);
      });
    this.gui
      .add(this.params, 'showWireframe')
      .name('show wireframe')
      .listen()
      .onChange(show => {
        show
          ? this.internal.mesh!.addWireframeHelperToScene(this.scene,false)
          : this.internal.mesh!.addWireframeHelperToScene(this.scene,true);
      });
    this.gui
      .add(this.params, 'showHalfedges')
      .name('show halfedges')
      .listen()
      .onChange(show => {
        show
          ? this.internal.mesh!.addHalfedgeHelpersToScene(this.scene,false)
          : this.internal.mesh!.addHalfedgeHelpersToScene(this.scene,true);
      });  
    this.gui
      .add(this.params, 'showVoxels')
      .name('show voxels')
      .listen()
      .onChange(show => {
        show
          ? this.internal.voxelizer!.addToScene(this.scene)
          :  this.internal.voxelizer!.removeFromScene(this.scene);
      });
    const folder1 = this.gui.addFolder('Voxelizer');
    folder1
      .add(this.params, 'nVoxelsPerAxis', 1, 20, 1)
      .name('n half vox per axis')
      .onChange(() => this.updateVoxelizer());
    folder1
      .add(this.params,'computationTime')
      .name("computation time_ms")
      .listen();
    folder1.open();

    // just for the first load
    fetch('./assets/bunny.obj')
      .then(resp => resp.text())
      .then(data => this.loadMesh(data));
  }
  loadMesh(data: string) {
    if(this.internal.mesh){
      this.internal.mesh!.removeAllIfAdded(this.scene);
    }
    let [indices,positions]=HalfedgeMesh.loadObj(data);
    this.internal.mesh = new HalfedgeMesh(indices,positions);
    this.internal.voxelizer = new Voxelizer();
    this.renderMesh();
  }
  exportScreenshot() {
    const url = this.renderer.domElement.toDataURL('image/png', 'export');
    const e = document.createElement('a');
    e.setAttribute('href', url);
    e.style.display = 'none';
    e.setAttribute('download', 'export.png');
    document.body.appendChild(e);
    e.click();
    document.body.removeChild(e);
  }

  updateVoxelizer(){
    this.internal.voxelizer!.removeFromScene(this.scene);
    this.internal.voxelizer!.createVoxels(this.internal.mesh!,this.scene,this.params.nVoxelsPerAxis);
    this.params.computationTime=this.internal!.voxelizer!.lastVoxelConstructionTime;
    if(this.params.showVoxels){
      this.internal.voxelizer!.addToScene(this.scene);
    }
  }

  renderMesh() {
    // clear old instances
    this.internal.mesh!.removeAllIfAdded(this.scene);

    // update the instances if data has changed
    this.internal.mesh!.createRenderableMeshAndWireframe();
    this.internal.mesh!.createRenderableHalfedgeHelpers();

    this.internal.mesh!.addMeshHelperToScene(this.scene,false);
    if (this.params.showNormals) {
      this.internal.mesh!.addNormalHelperToScene(this.scene,false);
    }
    if (this.params.showWireframe) {
      this.internal.mesh!.addWireframeHelperToScene(this.scene,false);
    }
    if(this.params.showHalfedges){
      this.internal.mesh!.addHalfedgeHelpersToScene(this.scene,false);
    }

    //this.internal.mesh3js!.geometry.computeBoundingBox();
    //let box = new Box3();
    //box.copy(this.internal.mesh3js!.geometry.boundingBox!);
    let box = new Box3()
    const helper = new Box3Helper(box);
    //this.scene.add(helper);
    AABB.debugBoundingBox(box);
    //Voxelizer.addCubeSizeOne(this.scene);

    this.internal.voxelizer!.createVoxels(this.internal.mesh!,this.scene,this.params.nVoxelsPerAxis);
    this.params.computationTime=this.internal!.voxelizer!.lastVoxelConstructionTime;

    if(this.params.showVoxels){
      this.internal.voxelizer!.addToScene(this.scene);
    }
  }
}

new Main().render();