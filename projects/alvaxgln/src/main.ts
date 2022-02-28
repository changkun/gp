// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
// Modified by Jakob Schmid <schmid.ja@campus.lmu.de>
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import Renderer from './renderer';
import {HalfedgeMesh} from './geometry/halfedge';
import {NormalMethod} from './geometry/primitive';
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
} from 'three';
import {VertexNormalsHelper} from 'three/examples/jsm/helpers/VertexNormalsHelper';
import {Vector} from './linalg/vec';
import {SimplifyModifier} from 'three/examples/jsm/modifiers/SimplifyModifier';

/**
 * Main extends the Renderer class and constructs the scene.
 */
export default class Main extends Renderer {
  gui: GUI;
  input: HTMLInputElement;
  internal: {
    raw?: string; // raw obj data
    mesh?: HalfedgeMesh; // internal mesh object
    mesh3jsLeft?: Mesh; // three.js buffer geometry for QEM simplification
    mesh3jsRightOrig?: Mesh; // three.js buffer geometry for melax simplification
    mesh3jsRightSim?: Mesh;
    meshLeftNormalHelper?: VertexNormalsHelper;
    meshRightNormalHelper?: VertexNormalsHelper;
    meshLeftWireframeHelper?: LineSegments;
    meshRightWireframeHelper?: LineSegments;
  };
  params: {
    import: () => void;
    export: () => void;
    showNormals: boolean;
    showWireframe: boolean;
    normalMethod: NormalMethod;
    flatShading: boolean;
    qSim: number;
    melaxSim: number;
    easyEdges: boolean;
    driftingEdges: boolean;
    smoothIntensity: number;
    smoothRounds: number;
    initialSmooth: boolean;
    intermediateSmooth: boolean;
    smooth: () => void;
    regularize: () => void;
    reset: () => void;
    mesh: string;
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
      r.onload = () => {
        this.params.mesh = <string>r.result;
        this.loadMesh(<string>r.result)
      };
      r.onerror = () => alert('Cannot import your obj mesh');
      r.readAsText(file);

    });
    document.body.appendChild(this.input);

    this.internal = {};
    this.params = {
      import: () => this.input.click(),
      export: () => this.exportScreenshot(),
      showNormals: false,
      showWireframe: true,
      flatShading: true,
      normalMethod: NormalMethod.EqualWeighted,
      qSim: 0.0,
      melaxSim: 0.0,
      easyEdges: true,
      driftingEdges: true,
      smoothIntensity: 1,
      smoothRounds: 1,
      initialSmooth: false,
      intermediateSmooth: true,
      //smooth: () => console.log("GUI test!")
      smooth: () => {
        //this.internal!.mesh!.smooth_intensity = this.params.smoothIntensity
        this.internal!.mesh!.angle_smooth(this.params.smoothIntensity, this.params.smoothRounds);
        this.prepareBuf();
        this.renderMeshLeft();
      },
      regularize: () => {
        this.loadMesh(this.params.mesh);
        this.internal!.mesh!.regularize(this.params.easyEdges, this.params.driftingEdges, this.params.smoothIntensity, this.params.smoothRounds, this.params.initialSmooth, this.params.intermediateSmooth);
        this.prepareBuf();
        this.renderMeshLeft();
        
      },
      reset: () => this.loadMesh(this.params.mesh),
      mesh: ""
    };

    this.bufpos = new Float32Array();
    this.bufnormals = new Float32Array();
    this.bufcolors = new Float32Array();

    this.gui = new GUI();
    const io = this.gui.addFolder('I/O');
    io.add(this.params, 'import').name('import mesh');
    io.add(this.params, 'export').name('export screenshot');
    io.open();

    const vis = this.gui.addFolder('Visualization');
    vis
      .add(this.params, 'showNormals')
      .name('show normals')
      .listen()
      .onChange(show => {
        show
          ? this.sceneLeft.add(this.internal.meshLeftNormalHelper!)
          : this.sceneRight.remove(this.internal.meshRightNormalHelper!);
      });
    vis
      .add(this.params, 'showWireframe')
      .name('show wireframe')
      .listen()
      .onChange(show => {
        if (show) {
          this.sceneLeft.add(this.internal.meshLeftWireframeHelper!);
          this.sceneRight.add(this.internal.meshRightWireframeHelper!);
        } else {
          this.sceneLeft.remove(this.internal.meshLeftWireframeHelper!);
          this.sceneRight.remove(this.internal.meshRightWireframeHelper!);
        }
      });
    vis
      .add(this.params, 'normalMethod', [
        NormalMethod.EqualWeighted,
        NormalMethod.AreaWeighted,
        NormalMethod.AngleWeighted,
      ])
      .listen()
      .onChange(() => this.updateNormals());
    vis
      .add(this.params, 'flatShading')
      .name('flat shading')
      .listen()
      .onChange((flat: boolean) => {
        (<MeshPhongMaterial>this.internal.mesh3jsLeft!.material).flatShading =
          flat;
        (<MeshPhongMaterial>(
          this.internal.mesh3jsRightSim!.material
        )).flatShading = flat;
        (<MeshPhongMaterial>this.internal.mesh3jsLeft!.material).needsUpdate =
          true;
        (<MeshPhongMaterial>(
          this.internal.mesh3jsRightSim!.material
        )).needsUpdate = true;
      });
    //vis.open();

    //add Button for regularization
    const reg = this.gui.addFolder('Regularization');
    const smooth = this.gui.addFolder('Smoothing');
    smooth
      .add(this.params, 'smoothIntensity', 0.0, 1.0, 0.001)
      .name('Intensity')
    smooth
      .add(this.params, 'smoothRounds', 0.0, 10, 1)
      .name('Rounds')
    smooth
      .add(this.params, 'initialSmooth')
      .name('Initial Smooth Step')
      .listen()
      .onChange(show => {
        console.log(this.params.initialSmooth);
      });
    smooth
      .add(this.params, 'intermediateSmooth')
      .name('Intermediate Smooth Step')
      .listen()
      .onChange(show => {
        console.log(this.params.initialSmooth);
      });
    reg
    .add(this.params, 'easyEdges')
    .name('Long/Short Edges');
    reg
    .add(this.params, 'driftingEdges')
    .name('Drifting Edges');
    smooth.add(this.params, 'smooth').name('Smooth');
    this.gui.add(this.params, 'regularize').name('Start Algorithm');
    this.gui.add(this.params, 'reset').name('Reset mesh');


    // just for the first load
    fetch('./assets/bunny.obj')
      .then(resp => resp.text())
      .then(data =>{
        this.params.mesh = data;
        this.loadMesh(data);
      });
  }
  loadMesh(data: string) {
    this.internal.raw = data;
    if (this.internal.mesh3jsLeft !== null) {
      this.sceneLeft.remove(this.internal.mesh3jsLeft!);
    }
    if (this.internal.mesh3jsRightSim !== null) {
      this.sceneRight.remove(this.internal.mesh3jsRightSim!);
    }

    this.internal.mesh = new HalfedgeMesh(data);

    this.prepareBuf();
    this.renderMeshLeft();
    this.renderMeshRight();
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
  updateNormals() {
    this.internal.mesh!.verts.forEach(v => {
      const n = v!.normal(this.params.normalMethod);
      this.bufnormals[3 * v!.idx + 0] = n.x;
      this.bufnormals[3 * v!.idx + 1] = n.y;
      this.bufnormals[3 * v!.idx + 2] = n.z;
    });
    this.internal.mesh3jsLeft!.geometry.attributes.normal.needsUpdate = true;
    this.internal.meshLeftNormalHelper!.update();
  }
  prepareBuf() {
    //debugger;
    //console.log("about to prepare buffer:")
    // prepare threejs buffer data
    const v = this.internal.mesh!.verts!.length;
    this.bufpos = new Float32Array(v * 3);
    this.bufcolors = new Float32Array(v * 3);
    this.bufnormals = new Float32Array(v * 3);

    const min = new Vector();
    const max = new Vector();
    this.internal.mesh!.verts!.forEach(v => {
      min.x = Math.min(min.x, v!.pos.x);
      min.y = Math.min(min.y, v!.pos.y);
      min.z = Math.min(min.z, v!.pos.z);
      max.x = Math.max(max.x, v!.pos.x);
      max.y = Math.max(max.y, v!.pos.y);
      max.z = Math.max(max.z, v!.pos.z);
    });

    //console.log("prepare buffer: 0")

    const center = min.add(max).scale(1 / 2);
    const radius = max.sub(min).len() / 2;
    this.internal.mesh!.verts.forEach(v => {

      const i = v!.idx;
      // use AABB and rescale to viewport center
      const p = v!.pos.sub(center).scale(1 / radius);
      this.bufpos[3 * i + 0] = p.x;
      this.bufpos[3 * i + 1] = p.y;
      this.bufpos[3 * i + 2] = p.z;

      //debug
      //console.log("prepare buffer: 2 at vert:" + i)

      // default GP blue color
      this.bufcolors[3 * i + 0] = 0;
      this.bufcolors[3 * i + 1] = 0.5;
      this.bufcolors[3 * i + 2] = 1;

      //debug
      //console.log("prepare buffer: 3 at vert:" + i)

      const n = v!.normal(this.params.normalMethod);
      //debug
      //console.log("prepare buffer: 4 at vert:" + i)

      this.bufnormals[3 * i + 0] = n.x;
      this.bufnormals[3 * i + 1] = n.y;
      this.bufnormals[3 * i + 2] = n.z;


    });
    //console.log("buffer prepared")
  }
  renderMeshLeft() {
    // clear old instances
    if (this.internal.meshLeftNormalHelper !== null) {
      this.sceneLeft.remove(this.internal.meshLeftNormalHelper!);
    }
    if (this.internal.meshLeftWireframeHelper !== null) {
      this.sceneLeft.remove(this.internal.meshLeftWireframeHelper!);
    }
    if (this.internal.mesh3jsLeft !== null) {
      this.sceneLeft.remove(this.internal.mesh3jsLeft!);
    }

    const idxs = new Uint32Array(this.internal.mesh!.faces.length * 3);
    this.internal.mesh!.faces.forEach(f => {
      f!.vertices((v, i) => {
        idxs[3 * f!.idx + i] = v.idx;
      });
    });

    // prepare new data
    const g = new BufferGeometry();
    g.setIndex(new BufferAttribute(idxs, 1));
    g.setAttribute('position', new BufferAttribute(this.bufpos, 3));
    g.setAttribute('color', new BufferAttribute(this.bufcolors, 3));
    g.setAttribute('normal', new BufferAttribute(this.bufnormals, 3));

    this.internal.mesh3jsLeft = new Mesh(
      g,
      new MeshPhongMaterial({
        vertexColors: true,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
        side: DoubleSide,
        flatShading: this.params.flatShading,
      })
    );
    this.internal.meshLeftNormalHelper = new VertexNormalsHelper(
      this.internal.mesh3jsLeft,
      0.03,
      0xaa0000
    );
    this.internal.meshLeftWireframeHelper = new LineSegments(
      new WireframeGeometry(g),
      new LineBasicMaterial({color: 0x000000, linewidth: 1})
    );

    this.sceneLeft.add(this.internal.mesh3jsLeft);
    if (this.params.showNormals) {
      this.sceneLeft.add(this.internal.meshLeftNormalHelper);
    }
    if (this.params.showWireframe) {
      this.sceneLeft.add(this.internal.meshLeftWireframeHelper);
    }
  }
  renderMeshRight() {
    // clear old instances
    if (this.internal.meshRightNormalHelper !== null) {
      this.sceneRight.remove(this.internal.meshRightNormalHelper!);
    }
    if (this.internal.meshRightWireframeHelper !== null) {
      this.sceneRight.remove(this.internal.meshRightWireframeHelper!);
    }
    if (this.internal.mesh3jsRightOrig !== null) {
      this.sceneRight.remove(this.internal.mesh3jsRightOrig!);
    }

    const idxs = new Uint32Array(this.internal.mesh!.faces.length * 3);
    this.internal.mesh!.faces.forEach(f => {
      f!.vertices((v, i) => {
        idxs[3 * f!.idx + i] = v.idx;
      });
    });

    const g = new BufferGeometry();
    g.setIndex(new BufferAttribute(idxs, 1));
    g.setAttribute('position', new BufferAttribute(this.bufpos, 3));
    g.setAttribute('color', new BufferAttribute(this.bufcolors, 3));
    g.setAttribute('normal', new BufferAttribute(this.bufnormals, 3));

    this.internal.mesh3jsRightOrig = new Mesh(
      g,
      new MeshPhongMaterial({
        vertexColors: true,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
        side: DoubleSide,
        flatShading: this.params.flatShading,
      })
    );
    this.internal.meshRightNormalHelper = new VertexNormalsHelper(
      this.internal.mesh3jsRightOrig,
      0.03,
      0xaa0000
    );
    this.internal.meshRightWireframeHelper = new LineSegments(
      new WireframeGeometry(g),
      new LineBasicMaterial({color: 0x000000, linewidth: 1})
    );
    this.internal.mesh3jsRightSim = this.internal.mesh3jsRightOrig.clone();
    this.sceneRight.add(this.internal.mesh3jsRightSim);
    if (this.params.showNormals) {
      this.sceneRight.add(this.internal.meshRightNormalHelper);
    }
    if (this.params.showWireframe) {
      this.sceneRight.add(this.internal.meshRightWireframeHelper);
    }
  }
}

new Main().render();
