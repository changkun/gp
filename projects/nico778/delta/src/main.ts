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
} from 'three';
import {VertexNormalsHelper} from 'three/examples/jsm/helpers/VertexNormalsHelper';
import {Vector} from './linalg/vec';
import {colormap} from './colors';
import {AABB} from './geometry/aabb';

/**
 * Main extends the Renderer class and constructs the scene.
 */
export default class Main extends Renderer {
  gui: GUI;
  input: HTMLInputElement;
  internal: {
    mesh?: HalfedgeMesh; // internal mesh object
    mesh3js?: Mesh; // three.js buffer geometry object
    normalHelper?: VertexNormalsHelper;
    wireframeHelper?: LineSegments;
  };
  params: {
    import: () => void;
    export: () => void;
    showNormals: boolean;
    showWireframe: boolean;
    normalMethod: NormalMethod;
    curvatureMethod: CurvatureMethod;
    laplacian: WeightType;
    timeStep: number;
    smoothStep: number;
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
      normalMethod: NormalMethod.EqualWeighted,
      curvatureMethod: CurvatureMethod.None,
      laplacian: WeightType.Uniform,
      timeStep: 0.001,
      smoothStep: 1,
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
          ? this.scene.add(this.internal.normalHelper!)
          : this.scene.remove(this.internal.normalHelper!);
      });
    this.gui
      .add(this.params, 'showWireframe')
      .name('show wireframe')
      .listen()
      .onChange(show => {
        show
          ? this.scene.add(this.internal.wireframeHelper!)
          : this.scene.remove(this.internal.wireframeHelper!);
      });

    const methods = this.gui.addFolder('Methods');

    methods
      .add(this.params, 'normalMethod', [
        NormalMethod.EqualWeighted,
        NormalMethod.AreaWeighted,
        NormalMethod.AngleWeighted,
      ])
      .listen()
      .onChange(() => this.updateNormals());
    methods
      .add(this.params, 'curvatureMethod', [
        CurvatureMethod.None,
        CurvatureMethod.Mean,
        CurvatureMethod.Gaussian,
        CurvatureMethod.Kmin,
        CurvatureMethod.Kmax,
      ])
      .listen()
      .onChange(() => this.updateCurvature());

    methods
      .add(this.params, 'laplacian', [WeightType.Uniform, WeightType.Cotan])
      .onChange(() => this.updateSmoothing());
    methods.open();

    const smoothing = this.gui.addFolder('Laplacian Smoothing');
    smoothing
      .add(this.params, 'timeStep', 0.001, 10, 0.001)
      .name('time step')
      .onChange(() => this.updateSmoothing());
    smoothing
      .add(this.params, 'smoothStep', 1, 3, 1)
      .name('smooth step')
      .onChange(() => this.updateSmoothing());
    smoothing.open();


    // just for the first load
    fetch('./assets/tube.obj')
      .then(resp => resp.text())
      .then(data => this.loadMesh(data));
  }
  loadMesh(data: string) {
    if (this.internal.mesh3js !== null) {
      this.scene.remove(this.internal.mesh3js!);
    }
    this.internal.mesh = new HalfedgeMesh(data);
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
  updateNormals() {
    this.internal.mesh!.verts.forEach(v => {
      const n = v.normal(this.params.normalMethod);
      this.bufnormals[3 * v.idx + 0] = n.x;
      this.bufnormals[3 * v.idx + 1] = n.y;
      this.bufnormals[3 * v.idx + 2] = n.z;
    });
    this.internal.mesh3js!.geometry.attributes.normal.needsUpdate = true;
    this.internal.normalHelper!.update();
  }
  updateCurvature() {
    const msettings = {
      vertexColors: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      side: DoubleSide,
    };

    const curvatures = new Array<number>(this.internal.mesh!.verts.length);
    this.internal.mesh!.verts.forEach(v => {
      const c = v.curvature(this.params.curvatureMethod);
      curvatures[v.idx] = c;
    });

    const quartiles = (v: number[], fac = 1.5): [number, number] => {
      const values = v.slice().sort((a: number, b: number) => a - b); //copy array fast and sort
      let q1 = 0;
      let q3 = 0;
      if ((values.length / 4) % 1 === 0) {
        //find quartiles
        q1 = 0.5 * (values[values.length / 4] + values[values.length / 4 + 1]);
        q3 =
          0.5 *
          (values[values.length * 0.75] + values[values.length * 0.75 + 1]);
      } else {
        q1 = values[Math.floor(values.length / 4 + 1)];
        q3 = values[Math.ceil(values.length * (3 / 4) + 1)];
      }
      const iqr = q3 - q1;
      const maxValue = q3 + iqr * fac;
      const minValue = q1 - iqr * fac;
      return [minValue, maxValue];
    };

    // Eliminate outliers.
    const [min, max] = quartiles(curvatures, 15);

    this.internal.mesh!.verts.forEach(v => {
      let color = new Vector();
      if (this.params.curvatureMethod === CurvatureMethod.None) {
        this.internal.mesh3js!.material = new MeshPhongMaterial(msettings);
        color = new Vector(0, 0.5, 1);
      } else {
        this.internal.mesh3js!.material = new MeshBasicMaterial(msettings);
        color = colormap(curvatures[v.idx], min, max);
      }
      this.bufcolors[3 * v.idx + 0] = color.x;
      this.bufcolors[3 * v.idx + 1] = color.y;
      this.bufcolors[3 * v.idx + 2] = color.z;
    });
    this.internal.mesh3js!.geometry.attributes.color.needsUpdate = true;
  }
  updateSmoothing() {
    this.internal.mesh!.smooth(
      this.params.laplacian,
      this.params.timeStep,
      this.params.smoothStep
    );
    this.renderMesh();
  }
  
  renderMesh() {
    // clear old instances
    if (this.internal.normalHelper !== null) {
      this.scene.remove(this.internal.normalHelper!);
    }
    if (this.internal.wireframeHelper !== null) {
      this.scene.remove(this.internal.wireframeHelper!);
    }
    if (this.internal.mesh3js !== null) {
      this.scene.remove(this.internal.mesh3js!);
    }
    
    // prepare new data
    //geometry
    const g = new BufferGeometry();
    const v = this.internal.mesh!.verts.length;

    //position
    this.bufpos = new Float32Array(v * 3);
    this.bufcolors = new Float32Array(v * 3);
    this.bufnormals = new Float32Array(v * 3);

    const aabb = new AABB(this.internal.mesh!.verts!);

    this.internal.mesh!.verts.forEach(v => {
      const i = v.idx;
      // use AABB and rescale to viewport center
      const p = v.position.sub(aabb.center()).scale(1 / aabb.radius());
      this.bufpos[3 * i + 0] = p.x;
      this.bufpos[3 * i + 1] = p.y;
      this.bufpos[3 * i + 2] = p.z;

      // default GP blue color
      this.bufcolors[3 * i + 0] = 0;
      this.bufcolors[3 * i + 1] = 0.5;
      this.bufcolors[3 * i + 2] = 1;

      const n = v.normal(this.params.normalMethod);
      this.bufnormals[3 * i + 0] = n.x;
      this.bufnormals[3 * i + 1] = n.y;
      this.bufnormals[3 * i + 2] = n.z;  
    });

    const idxs = new Uint32Array(this.internal.mesh!.faces.length * 3);
    this.internal.mesh!.faces.forEach(f => {
      f.vertices((v, i) => {
        idxs[3 * f.idx + i] = v.idx;
      });
    });

    g.setIndex(new BufferAttribute(idxs, 1));
    g.setAttribute('position', new BufferAttribute(this.bufpos, 3));
    g.setAttribute('color', new BufferAttribute(this.bufcolors, 3));
    g.setAttribute('normal', new BufferAttribute(this.bufnormals, 3));

    this.internal.mesh3js = new Mesh(
      g,
      new MeshPhongMaterial({
        vertexColors: true,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
        side: DoubleSide,
      })
    );
    this.internal.normalHelper = new VertexNormalsHelper(
      this.internal.mesh3js,
      0.03,
      0xaa0000
    );
    this.internal.wireframeHelper = new LineSegments(
      new WireframeGeometry(g),
      new LineBasicMaterial({color: 0x000000, linewidth: 1})
    );

    this.scene.add(this.internal.mesh3js);
    if (this.params.showNormals) {
      this.scene.add(this.internal.normalHelper);
    }
    if (this.params.showWireframe) {
      this.scene.add(this.internal.wireframeHelper);
    }
  }
}

new Main().render();