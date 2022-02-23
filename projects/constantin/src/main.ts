// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
// Modified by Constantin Geier <constantin.geier@campus.lmu.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import Renderer from './renderer';
import {GUI} from 'dat.gui';
import { Voxelizer } from './voxelizer';
import { HalfedgeMeshRenderer} from './helper/HalfedgeMeshRenderer';
import { Helper} from './helper/Helper';

/**
 * Main extends the Renderer class and constructs the scene.
 */
export default class Main extends Renderer {
  gui: GUI;
  input: HTMLInputElement;
  internal: {
    //mesh?: HalfedgeMesh; // internal mesh object
    halfedgeRenderer?:HalfedgeMeshRenderer; // helper to render the underlying halfege mesh
    voxelizer?:Voxelizer; // Consti10 handle to voxels
  };
  params: {
    import: () => void;
    export: () => void;
    showSolid:boolean;
    showWireframe: boolean;
    showEdges:boolean;
    showHalfedges:boolean;
    showHalfedgesOnBoundaries:boolean;
    // voxelized
    debugVoxels:boolean;
    debugVoxelizedRemoved:boolean;
    //
    showVoxelizedSolid:boolean;
    showVoxelizedEdges:boolean;
    showVoxelizedHalfedges:boolean;
    showVoxelizedHalfedgesOnBoundaries:boolean;
    //
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
      showSolid:true,
      showWireframe: false,
      showEdges:false,
      showHalfedges:false,
      showHalfedgesOnBoundaries:false,
      debugVoxels:false,
      debugVoxelizedRemoved:false,
      showVoxelizedSolid:false,
      showVoxelizedEdges:false,
      showVoxelizedHalfedges:false,
      showVoxelizedHalfedgesOnBoundaries:false,
      nVoxelsPerAxis: 5,
      computationTime:0,
    };

    this.bufpos = new Float32Array();
    this.bufnormals = new Float32Array();
    this.bufcolors = new Float32Array();

    this.gui = new GUI();
    this.gui.add(this.params, 'import').name('import mesh');
    this.gui.add(this.params, 'export').name('export screenshot');
    const folderSource = this.gui.addFolder('SourceMesh');
    folderSource
      .add(this.params, 'showSolid')
      .name('show solid')
      .listen()
      .onChange(show => {
        show
          ? this.internal.halfedgeRenderer!.addMeshHelperToScene(this.scene,false)
          : this.internal.halfedgeRenderer!.addMeshHelperToScene(this.scene,true);
      });
    folderSource
      .add(this.params, 'showWireframe')
      .name('show wireframe')
      .listen()
      .onChange(show => {
        show
          ? this.internal.halfedgeRenderer!.addWireframeHelperToScene(this.scene,false)
          : this.internal.halfedgeRenderer!.addWireframeHelperToScene(this.scene,true);
      });
    folderSource
      .add(this.params, 'showEdges')
      .name('show edges')
      .listen()
      .onChange(show => {
        show
          ? this.internal.halfedgeRenderer!.addEdgeHelpersToScene(this.scene,false)
          : this.internal.halfedgeRenderer!.addEdgeHelpersToScene(this.scene,true);
      });  
    folderSource
    .add(this.params, 'showHalfedges')
    .name('show halfedges')
    .listen()
    .onChange(show => {
      show
        ? this.internal.halfedgeRenderer!.addHalfedgeHelpersToScene(this.scene,false)
        : this.internal.halfedgeRenderer!.addHalfedgeHelpersToScene(this.scene,true);
    });
    folderSource
    .add(this.params, 'showHalfedgesOnBoundaries')
    .name('show boundary h.e')
    .listen()
    .onChange(show => {
      show
        ? this.internal.halfedgeRenderer!.addHalfEdgesOnBoundaryHelpersToScene(this.scene,false)
        : this.internal.halfedgeRenderer!.addHalfEdgesOnBoundaryHelpersToScene(this.scene,true);
    });
    folderSource.open();
    const folderVoxelized = this.gui.addFolder('Voxelized Mesh');
    folderVoxelized
    .add(this.params, 'debugVoxels')
    .name('show voxels')
    .listen()
    .onChange(show => {
      show
        ? this.internal.voxelizer!.addBoxesDebugToScene(this.scene,false)
        : this.internal.voxelizer!.addBoxesDebugToScene(this.scene,true);
    });
    folderVoxelized
    .add(this.params, 'debugVoxelizedRemoved')
    .name('show removed')
    .listen()
    .onChange(show => {
      show
        ? this.internal.voxelizer!.addMeshVerticesRemovedToScene(this.scene,false)
        : this.internal.voxelizer!.addMeshVerticesRemovedToScene(this.scene,true);
    });
    folderVoxelized
    .add(this.params, 'showVoxelizedSolid')
    .name('show solid')
    .listen()
    .onChange(show => {
      show
        ? this.internal.voxelizer!.createdHalfedgeMesh!.addMeshHelperToScene(this.scene,false)
        : this.internal.voxelizer!.createdHalfedgeMesh!.addMeshHelperToScene(this.scene,true);
    });
    folderVoxelized
      .add(this.params, 'showVoxelizedEdges')
      .name('show edges')
      .listen()
      .onChange(show => {
        show
          ? this.internal.voxelizer!.createdHalfedgeMesh!.addEdgeHelpersToScene(this.scene,false)
          : this.internal.voxelizer!.createdHalfedgeMesh!.addEdgeHelpersToScene(this.scene,true);
      });
    folderVoxelized
      .add(this.params, 'showVoxelizedHalfedges')
      .name('show halfedges')
      .listen()
      .onChange(show => {
        show
          ? this.internal.voxelizer!.createdHalfedgeMesh!.addHalfedgeHelpersToScene(this.scene,false)
          : this.internal.voxelizer!.createdHalfedgeMesh!.addHalfedgeHelpersToScene(this.scene,true);
    });
    folderVoxelized
      .add(this.params, 'showVoxelizedHalfedgesOnBoundaries')
      .name('show boundary h.e.')
      .listen()
      .onChange(show => {
        show
          ? this.internal.voxelizer!.createdHalfedgeMesh!.addHalfEdgesOnBoundaryHelpersToScene(this.scene,false)
          : this.internal.voxelizer!.createdHalfedgeMesh!.addHalfEdgesOnBoundaryHelpersToScene(this.scene,true);
    });    
    folderVoxelized.open();
    const folder1 = this.gui.addFolder('Voxelizer');
    folder1
      .add(this.params, 'nVoxelsPerAxis', 1, 20, 1)
      .name('Num Voxels/2')
      .onChange(() => this.updateVoxelizer());
    folder1
      .add(this.params,'computationTime')
      .name("computation_ms")
      .listen();
    folder1.open();
    // just for the first load
    //fetch('./assets/bunny.obj')
    //fetch('./assets/cube.obj')
    fetch('./assets/sphere.obj')
      .then(resp => resp.text())
      .then(data => this.loadMesh(data));
  }
  loadMesh(data: string) {
    if(this.internal.halfedgeRenderer){
      this.internal.halfedgeRenderer!.removeAllIfAdded(this.scene);
    }
    if(this.internal.voxelizer){
      this.internal.voxelizer!.removeAllFromScene(this.scene);
    }
    const [indices,positions]=Helper.loadObjAndScaleTransform(data);
    this.internal.halfedgeRenderer = HalfedgeMeshRenderer.createFromData(indices,positions);
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

  // voxelize the mesh if needed (new mesh / n voxels changed)
  updateVoxelizer(){
    // clear up the scene
    this.internal.voxelizer!.removeAllFromScene(this.scene);
    this.internal.voxelizer!.voxelizeHalfedgeMesh(this.internal.halfedgeRenderer!.halfedgeMesh!,this.scene,this.params.nVoxelsPerAxis);
    this.params.computationTime=this.internal!.voxelizer!.lastVoxelConstructionTimeMs;
    if(this.params.debugVoxels){
      this.internal.voxelizer!.addBoxesDebugToScene(this.scene,false);
    }
    if(this.params.debugVoxelizedRemoved){
      this.internal.voxelizer!.addMeshVerticesRemovedToScene(this.scene,false);
    }
    if(this.params.showEdges){
      this.internal.voxelizer!.createdHalfedgeMesh!.addEdgeHelpersToScene(this.scene,false);
    }
    if(this.params.showHalfedges){
      this.internal.voxelizer!.createdHalfedgeMesh!.addHalfedgeHelpersToScene(this.scene,false);
    }
    if(this.params.showHalfedgesOnBoundaries){
      this.internal.voxelizer!.createdHalfedgeMesh!.addHalfEdgesOnBoundaryHelpersToScene(this.scene,false);
    }
  }

  renderMesh() {
    // clear old instances
    this.internal.halfedgeRenderer!.removeAllIfAdded(this.scene);

    // update the instances if data has changed
    this.internal.halfedgeRenderer!.createAllRenderHelpers();

    //if (this.params.showNormals) {
    //  this.internal.mesh!.addNormalHelperToScene(this.scene,false);
    //}
    if (this.params.showSolid) {
      this.internal.halfedgeRenderer!.addMeshHelperToScene(this.scene,false);
    }
    if (this.params.showWireframe) {
      this.internal.halfedgeRenderer!.addWireframeHelperToScene(this.scene,false);
    }
    if(this.params.showEdges){
      this.internal.halfedgeRenderer!.addEdgeHelpersToScene(this.scene,false);
    }
    if(this.params.showHalfedges){
      this.internal.halfedgeRenderer!.addHalfedgeHelpersToScene(this.scene,false);
    }
    this.updateVoxelizer();
  }
}

new Main().render();
