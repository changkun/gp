// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import Renderer from './renderer';
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
  RepeatWrapping,
  DataTexture,
  RGBFormat,
} from 'three';
import {VertexNormalsHelper} from 'three/examples/jsm/helpers/VertexNormalsHelper';
import {AABB} from './geometry/aabb';
import {
  BoundaryType,
  WeightType,
  ParameterizedMesh,
} from './geometry/mesh_param';

/**
 * Main extends the Renderer class and constructs the scene.
 */
export default class Main extends Renderer {
  gui: GUI;
  input: HTMLInputElement;
  internal: {
    mesh?: ParameterizedMesh; // internal mesh object
    mesh3js?: Mesh; // three.js buffer geometry object
    uv3js?: Mesh; // three.js buffer geometry object
    meshNormalHelper?: VertexNormalsHelper;
    meshWireframeHelper?: LineSegments;
    uvNormalHelper?: VertexNormalsHelper;
    uvWireframeHelper?: LineSegments;
  };
  params: {
    import: () => void;
    export: () => void;
    showNormals: boolean;
    showWireframe: boolean;
    flatShading: boolean;
    showTexture: boolean;

    normalMethod: NormalMethod;
    laplaceWeight: WeightType;
    boundaryType: BoundaryType;
    computeUV: () => void;
  };
  bufpos: Float32Array;
  bufuvs: Float32Array;
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
      showWireframe: true,
      flatShading: true,
      showTexture: true,

      normalMethod: NormalMethod.EqualWeighted,
      laplaceWeight: WeightType.Uniform,
      boundaryType: BoundaryType.Disk,
      computeUV: () => this.computeUV(),
    };

    this.bufpos = new Float32Array();
    this.bufuvs = new Float32Array();
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
        if (show) {
          this.sceneMesh.add(this.internal.meshNormalHelper!);
        } else {
          this.sceneMesh.remove(this.internal.meshNormalHelper!);
        }
      });
    this.gui
      .add(this.params, 'showWireframe')
      .name('show wireframe')
      .listen()
      .onChange(show => {
        if (show) {
          this.sceneMesh.add(this.internal.meshWireframeHelper!);
          this.sceneUV.add(this.internal.uvWireframeHelper!);
        } else {
          this.sceneMesh.remove(this.internal.meshWireframeHelper!);
          this.sceneUV.remove(this.internal.uvWireframeHelper!);
        }
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
      .add(this.params, 'flatShading')
      .name('flat shading')
      .listen()
      .onChange(flat => {
        (<MeshPhongMaterial>this.internal.mesh3js!.material).flatShading = flat;
        (<MeshPhongMaterial>this.internal.uv3js!.material).flatShading = flat;
        (<MeshPhongMaterial>this.internal.mesh3js!.material).needsUpdate = true;
        (<MeshPhongMaterial>this.internal.uv3js!.material).needsUpdate = true;
      });

    methods
      .add(this.params, 'showTexture')
      .name('texture')
      .listen()
      .onChange(showTex => {
        if (showTex) {
          (<MeshPhongMaterial>this.internal.mesh3js!.material).map =
            this.checkboardTexture();
          (<MeshPhongMaterial>this.internal.uv3js!.material).map =
            this.checkboardTexture();
        } else {
          (<MeshPhongMaterial>this.internal.mesh3js!.material).map = null;
          (<MeshPhongMaterial>this.internal.uv3js!.material).map = null;
        }
        (<MeshPhongMaterial>this.internal.mesh3js!.material).needsUpdate = true;
        (<MeshPhongMaterial>this.internal.uv3js!.material).needsUpdate = true;
      });
    methods.open();

    const param = this.gui.addFolder('Parameterization');
    param.add(this.params, 'laplaceWeight', [
      WeightType.Uniform,
      WeightType.Cotan,
    ]);
    param.add(this.params, 'boundaryType', [
      BoundaryType.Disk,
      BoundaryType.Rectangle,
    ]);
    param.add(this.params, 'computeUV').name('Compute UV');
    param.open();

    // just for the first load
    fetch('./assets/bunny.obj')
      .then(resp => resp.text())
      .then(data => this.loadMesh(data));
  }
  loadMesh(data: string) {
    if (this.internal.mesh3js !== null) {
      this.sceneMesh.remove(this.internal.mesh3js!);
    }

    this.internal.mesh = new ParameterizedMesh(data);
    this.prepareBuf();
    this.renderMesh();
    this.renderUV();
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
    this.internal.meshNormalHelper!.update();
  }
  computeUV(): void {
    console.log(this.params.boundaryType, this.params.laplaceWeight);
    this.internal.mesh!.flatten(
      this.params.boundaryType,
      this.params.laplaceWeight
    );

    // update everything
    this.prepareBuf();
    this.renderMesh();
    this.renderUV();
  }
  prepareBuf() {
    // prepare threejs buffer data
    const v = this.internal.mesh!.verts.length;
    this.bufpos = new Float32Array(v * 3);
    this.bufuvs = new Float32Array(v * 3);
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

      // use vertex uv
      this.bufuvs[3 * i + 0] = v!.uv!.x;
      this.bufuvs[3 * i + 1] = v!.uv!.y;
      this.bufuvs[3 * i + 2] = 0;

      // default GP blue color
      this.bufcolors[3 * i + 0] = 0;
      this.bufcolors[3 * i + 1] = 0.5;
      this.bufcolors[3 * i + 2] = 1;

      const n = v.normal(this.params.normalMethod);
      this.bufnormals[3 * i + 0] = n.x;
      this.bufnormals[3 * i + 1] = n.y;
      this.bufnormals[3 * i + 2] = n.z;
    });
  }
  renderMesh() {
    // clear old instances
    if (this.internal.meshNormalHelper !== null) {
      this.sceneMesh.remove(this.internal.meshNormalHelper!);
    }
    if (this.internal.meshWireframeHelper !== null) {
      this.sceneMesh.remove(this.internal.meshWireframeHelper!);
    }
    if (this.internal.mesh3js !== null) {
      this.sceneMesh.remove(this.internal.mesh3js!);
    }

    const idxs = new Uint32Array(this.internal.mesh!.faces.length * 3);
    this.internal.mesh!.faces.forEach(f => {
      f.vertices((v, i) => {
        idxs[3 * f.idx + i] = v.idx;
      });
    });

    const g = new BufferGeometry();
    g.setIndex(new BufferAttribute(idxs, 1));
    g.setAttribute('position', new BufferAttribute(this.bufpos, 3));
    g.setAttribute('uv', new BufferAttribute(this.bufuvs, 3));
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
        flatShading: this.params.flatShading,
      })
    );
    (<MeshPhongMaterial>this.internal.mesh3js.material).map =
      this.checkboardTexture();

    this.internal.meshNormalHelper = new VertexNormalsHelper(
      this.internal.mesh3js,
      0.03,
      0xaa0000
    );
    this.internal.meshWireframeHelper = new LineSegments(
      new WireframeGeometry(g),
      new LineBasicMaterial({color: 0x000000, linewidth: 1})
    );

    this.sceneMesh.add(this.internal.mesh3js);
    if (this.params.showNormals) {
      this.sceneMesh.add(this.internal.meshNormalHelper);
    }
    if (this.params.showWireframe) {
      this.sceneMesh.add(this.internal.meshWireframeHelper);
    }
  }
  renderUV() {
    // clear old instances
    if (this.internal.uvWireframeHelper !== null) {
      this.sceneUV.remove(this.internal.uvWireframeHelper!);
    }
    if (this.internal.uv3js !== null) {
      this.sceneUV.remove(this.internal.uv3js!);
    }

    const idxs = new Uint32Array(this.internal.mesh!.faces.length * 3);
    this.internal.mesh!.faces.forEach(f => {
      f.vertices((v, i) => {
        idxs[3 * f.idx + i] = v.idx;
      });
    });

    const g = new BufferGeometry();
    g.setIndex(new BufferAttribute(idxs, 1));
    g.setAttribute('position', new BufferAttribute(this.bufuvs, 3)); // use uv as position
    g.setAttribute('uv', new BufferAttribute(this.bufuvs, 3));
    g.setAttribute('color', new BufferAttribute(this.bufcolors, 3));
    g.setAttribute('normal', new BufferAttribute(this.bufnormals, 3));

    this.internal.uv3js = new Mesh(
      g,
      new MeshPhongMaterial({
        vertexColors: true,
        polygonOffset: true,
        side: DoubleSide,
      })
    );
    (<MeshPhongMaterial>this.internal.uv3js.material).map =
      this.checkboardTexture();
    this.internal.uvWireframeHelper = new LineSegments(
      new WireframeGeometry(g),
      new LineBasicMaterial({color: 0x000000, linewidth: 1})
    );
    this.sceneUV.add(this.internal.uv3js);
    if (this.params.showWireframe) {
      this.sceneUV.add(this.internal.uvWireframeHelper);
    }
  }

  checkboardTexture() {
    const h = 100;
    const w = 100;
    const data = new Uint8Array(h * w * 3);
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < w; j++) {
        let o = 1;
        if (((i & 0x8) === 0) === true && ((j & 0x8) === 0) === true) {
          o = 0;
        } else if (((i & 0x8) === 0) === false && ((j & 0x8) === 0) === true) {
          o = 1;
        } else if (((i & 0x8) === 0) === true && ((j & 0x8) === 0) === false) {
          o = 1;
        } else if (((i & 0x8) === 0) === false && ((j & 0x8) === 0) === false) {
          o = 0;
        }

        let c = o * 255;
        if (c === 0) {
          c = 155;
        }
        data[3 * (w * i + j) + 0] = c;
        data[3 * (w * i + j) + 1] = c;
        data[3 * (w * i + j) + 2] = c;
      }
    }
    const tex = new DataTexture(data, h, w, RGBFormat);
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
  }
}

new Main().render();
