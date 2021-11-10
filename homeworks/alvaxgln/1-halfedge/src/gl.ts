// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import {Scene, WebGLRenderer, Vector3, Color, OrthographicCamera} from 'three';
import {TrackballControls} from 'three/examples/jsm/controls/TrackballControls';
import {GUI} from 'dat.gui';

export class GLRenderer {
  // properties for three.js
  renderer: WebGLRenderer;
  scene: Scene;
  screenCamera: OrthographicCamera;
  screenControl: TrackballControls;
  gui: GUI;

  constructor() {
    const container = document.body;
    container.style.overflow = 'hidden';
    container.style.margin = '0';

    this.gui = new GUI();
    this.gui
      .add({export: () => this.exportScreenshot()}, 'export')
      .name('screenshot');

    // renderer is the three.js rendering backend.
    this.renderer = new WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    // scene is the three.js scene graph manager.
    this.scene = new Scene();
    this.scene.background = new Color('#181818');

    // screenCamera is the camera that points to the simulated screen.
    const scaleFactor = 3.5;
    this.screenCamera = new OrthographicCamera(
      -window.innerWidth / scaleFactor,
      window.innerWidth / scaleFactor,
      window.innerHeight / scaleFactor,
      -window.innerHeight / scaleFactor
    );
    this.screenCamera.position.copy(
      new Vector3(
        Math.round(500 * (window.innerWidth / window.innerHeight)) / 2,
        250,
        0.5
      )
    );
    this.screenCamera.lookAt(
      new Vector3(
        Math.round(500 * (window.innerWidth / window.innerHeight)) / 2,
        250,
        -1
      )
    );

    // handle window resizing
    window.addEventListener(
      'resize',
      () => {
        this.screenCamera.left = -window.innerWidth / scaleFactor;
        this.screenCamera.right = window.innerWidth / scaleFactor;
        this.screenCamera.top = window.innerHeight / scaleFactor;
        this.screenCamera.bottom = -window.innerHeight / scaleFactor;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.screenCamera.updateProjectionMatrix();
      },
      false
    );

    this.screenControl = new TrackballControls(
      this.screenCamera,
      this.renderer.domElement
    );
    this.screenControl.noRotate = true;
    this.screenControl.target.copy(
      new Vector3(
        Math.round(500 * (window.innerWidth / window.innerHeight)) / 2,
        250,
        -1
      )
    );
    this.screenControl.panSpeed = 20;
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
  render() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.screenControl.update();
    this.renderer.render(this.scene, this.screenCamera);
    window.requestAnimationFrame(() => this.render());
  }
}
