// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

import {AABB} from '../geometry/aabb';
import {Vertex} from '../geometry/primitive';
import {Matrix} from '../linalg/mat';
import {approxEqual} from '../linalg/utils';
import {Vector} from '../linalg/vec';
import {Scene} from './scene';

/**
 * Rasterizer is a CPU rasterizer.
 */
export class Rasterizer {
  // width is the width of the rasterizer
  width: number;
  // height is the height of the rasterizer
  height: number;
  // frameBuf is the frame buffer
  frameBuf: Array<Vector>;
  // depthBuf is the depth buffer
  depthBuf: Array<number>;
  // context is the scene to render
  context?: Scene;

  /**
   * constructor constructs a rasterizer for rendering a scene to a
   * screen with the given size (width x height).
   *
   * @param width is the width of the screen for rasterization
   * @param height is the height of the screen for rasterization
   */
  constructor(width: number, height: number) {
    if (width <= 0.5 || height <= 0.5) {
      throw new Error('The size of rasterizer is too small!');
    }

    this.width = Math.round(width);
    this.height = Math.round(height);
    this.frameBuf = this.initFrameBuffer();
    this.depthBuf = this.initDepthBuffer();
  }
  /**
   * initFrameBuffer initializes a frame buffer by the size of the
   * rasterizer.
   *
   * @returns a frame buffer that stores a black color in all pixels.
   */
  initFrameBuffer(): Array<Vector> {
    return new Array<Vector>(this.width * this.height).fill(
      new Vector(0, 0, 0, 1)
    );
  }
  /**
   * initDepthBuffer initializes a depth buffer by the size of the
   * rasterizer.
   *
   * @returns a depth buffer that stores a black color in all pixels.
   */
  initDepthBuffer(): Array<number> {
    // Any values <= -1 are valid, but -1 is the optimal.
    return new Array<number>(this.width * this.height).fill(-1);
  }

  /**
   * render computes one rendering pass and returns a rendered frame
   * buffer.
   *
   * @returns a frame buffer that renders the scene.
   */
  render(s: Scene): Array<Vector> {
    this.context = s;

    // Render all meshes on a scene.
    for (let m = 0; m < s.meshes.length; m++) {
      const mesh = s.meshes[m];
      const length = mesh.faces.length;
      for (let i = 0; i < length; i++) {
        const f = mesh.faces[i];
        const verts: Vertex[] = [];
        f.vertices(v => {
          verts.push(v);
        });

        this.drawTriangle(
          // prettier-ignore
          new Map<string, Matrix>([
            ['modelMatrix', mesh.modelMatrix()],
            ['viewMatrix', s.camera.viewMatrix()],
            ['projMatrix', s.camera.projMatrix()],
            ['vpMatrix', new Matrix(
              this.width / 2, 0, 0, this.width / 2,
              0, this.height / 2, 0, this.height / 2,
              0, 0, 1, 0,
              0, 0, 0, 1
            )],
          ]),
          verts[0],
          verts[1],
          verts[2],
          mesh.color,
          mesh.wireframe
        );
      }
    }

    return this.frameBuf;
  }
  /**
   * vertexShader is a shader that applies on a given vertex and outputs
   * a new vertex.
   *
   * @param v is a given vertex
   * @param uniforms is the uniform values that are equal among all vertices
   * @returns a vertex
   */
  vertexShader(v: Vertex, uniforms: Map<string, Matrix>): Vertex {
    const modelMatrix = <Matrix>uniforms.get('modelMatrix');
    const viewMatrix = <Matrix>uniforms.get('viewMatrix');
    const projMatrix = <Matrix>uniforms.get('projMatrix');
    const vpMatrix = <Matrix>uniforms.get('vpMatrix');
    const pos = v.position
      .apply(modelMatrix)
      .apply(viewMatrix)
      .apply(projMatrix)
      .apply(vpMatrix);
    return new Vertex(pos.scale(1 / pos.w));
  }
  /**
   * drawTriangle draws the given triangle on the given frame buffer.
   */
  drawTriangle(
    uniforms: Map<string, Matrix>,
    v1: Vertex,
    v2: Vertex,
    v3: Vertex,
    color: Vector,
    wire: Vector
  ) {
    const t1 = this.vertexShader(v1, uniforms);
    const t2 = this.vertexShader(v2, uniforms);
    const t3 = this.vertexShader(v3, uniforms);

    // Backface culling
    const fN = t2.position.sub(t1.position).cross(t3.position.sub(t1.position));
    if (new Vector(0, 0, -1, 0).dot(fN) >= 0) {
      return;
    }

    // View frustum culling
    const viewportAABB = new AABB(
      new Vector(this.width, this.height, 1, 1),
      new Vector(0, 0, 0, 1),
      new Vector(0, 0, -1, 1)
    );
    const triangleAABB = new AABB(t1.position, t2.position, t3.position);
    if (!viewportAABB.intersect(triangleAABB)) {
      return;
    }

    // Compute AABB and make the AABB a little bigger and align it with pixels
    // to contain the entire triangle
    const aabb = new AABB(t1.position, t2.position, t3.position);
    const xmin = Math.round(aabb.min.x) - 1;
    const xmax = Math.round(aabb.max.x) + 1;
    const ymin = Math.round(aabb.min.y) - 1;
    const ymax = Math.round(aabb.max.y) + 1;

    // Loop all pixels in the AABB and draw if it is inside the triangle
    for (let x = xmin; x < xmax; x++) {
      for (let y = ymin; y < ymax; y++) {
        // Compute barycentric coordinates
        const bc = this.computeBarycentric(
          new Vector(x, y, 0, 1),
          t1.position,
          t2.position,
          t3.position
        );
        if (bc.x < 0 || bc.y < 0 || bc.z < 0) {
          continue;
        }

        // Early Z-test
        const z = this.barycentricInterpolation(
          bc,
          t1.position.z,
          t2.position.z,
          t3.position.z
        );
        if (z <= this.depthBuf[x + y * this.width]) {
          continue;
        }

        // We completed the color, let's draw the pixel!
        this.fragmentProcessing(x, y, z, color);
      }
    }
    this.drawWireframe(t1, t2, t3, wire);
  }
  /**
   * computeBarycentric computes the barycentric coordinates for
   * the given position. The computed barycentric coordinates are
   * in viewport space.
   *
   * @param p is a position
   * @param v1 is a given vertex
   * @param v2 is a given vertex
   * @param v3 is a given vertex
   * @returns the barycentric coordinates
   */
  computeBarycentric(p: Vector, v1: Vector, v2: Vector, v3: Vector): Vector {
    // Compute the barycentric coordinates for p. The vectors
    // v1, v2, and v3 represent a triangle. Note that barycentric
    // coordinates are computed in a 2D space, thus conceptually,
    // the computation only needs to utilize the x-y coordinates and
    // can ignore z and w components. The returned value that contains
    // the barycentric coordinates is typed using Vector but the
    // corresponding w component can either be 1 or 0 (does not matter
    // in this case because it is neither a position nor a vector).
    const ap = p.sub(new Vector(v1.x, v1.y, 0, 1));
    const ab = new Vector(v2.x, v2.y, 0, 1).sub(new Vector(v1.x, v1.y, 0, 1));
    const ac = new Vector(v3.x, v3.y, 0, 1).sub(new Vector(v1.x, v1.y, 0, 1));
    const bc = new Vector(v3.x, v3.y, 0, 1).sub(new Vector(v2.x, v2.y, 0, 1));
    const bp = p.sub(new Vector(v2.x, v2.y, 0, 1));
    const out = new Vector(0, 0, -1, 0);
    const Sabc = ab.cross(ac).dot(out);
    const Sabp = ab.cross(ap).dot(out);
    const Sapc = ap.cross(ac).dot(out);
    const Sbcp = bc.cross(bp).dot(out);
    return new Vector(Sbcp / Sabc, Sapc / Sabc, Sabp / Sabc, 1);
  }
  /**
   * barycentricInterpolation implements the barycentric interpolation for
   * the input values, i.e. barycentric coordinates or vertex attribute values.
   *
   * @param bc contains the barycentric coordinates for interpolation
   * @param v1 is one of the three values for barycentric interpolation
   * @param v2 is one of the three values for barycentric interpolation
   * @param v3 is one of the three values for barycentric interpolation
   * @returns the barycentric interpolated values
   */
  barycentricInterpolation(
    bc: Vector,
    v1: number,
    v2: number,
    v3: number
  ): number {
    // Interpolate v1,v2,v3 using barycentric coordinates (bc),
    // and return the computed value. The interpolation only requires
    // the xyz component of the bc Vector and the w component is *not*
    // used here.
    return v1 * bc.x + v2 * bc.y + v3 * bc.z;
  }
  /**
   * drawWireframe draws the wireframe of the given triangle.
   *
   * @param v1 is a given vertex position
   * @param v2 is a given vertex position
   * @param v3 is a given vertex position
   * @param color is a given color for drawing
   */
  drawWireframe(v1: Vertex, v2: Vertex, v3: Vertex, color: Vector) {
    // The order of drawing wireframe is important because the line
    // drawing numerical instability of the Bresenham algorithm may show
    // different types of results. Therefore, we stick to the convention
    // of in this course, i.e. draw the lines counterclock-wise: v1->v2->v3.
    this.drawLine(v1.position, v2.position, color);
    this.drawLine(v2.position, v3.position, color);
    this.drawLine(v3.position, v1.position, color);
  }
  /**
   * drawLine implements the Bresenham algorithm that draws a line
   * segment starting from p1 and ends at p2. The drawn pixels are
   * stored in a given frame buffer.
   *
   * @param p1 is the staring point for line drawing
   * @param p2 is the end point for line drawing
   * @param color is the drawing color
   * @param epsilon is used for dealing with numeric issue
   */
  drawLine(p1: Vector, p2: Vector, color: Vector, epsilon = 1e-3) {
    if (Math.abs(p2.y - p1.y) < Math.abs(p2.x - p1.x)) {
      if (p1.x > p2.x) {
        [p1, p2] = [p2, p1];
      }
      this.drawLineLow(p1, p2, color, epsilon);
    } else {
      if (p1.y > p2.y) {
        [p1, p2] = [p2, p1];
      }
      this.drawLineHigh(p1, p2, color, epsilon);
    }
  }
  drawLineLow(p1: Vector, p2: Vector, color: Vector, epsilon: number) {
    const x0 = Math.round(p1.x);
    const y0 = Math.round(p1.y);
    const z0 = p1.z;
    const x1 = Math.round(p2.x);
    const y1 = Math.round(p2.y);
    const z1 = p2.z;

    const dx = x1 - x0;
    let dy = y1 - y0;
    let yi = 1;
    if (dy < 0) {
      yi = -1;
      dy = -dy;
    }
    let D = 2 * dy - dx;
    let y = y0;
    for (let x = x0; x <= x1; x++) {
      const z = ((z1 - z0) * (x - x0)) / (x1 - x0) + z0;
      // Dealing with numeric issues.
      if (approxEqual(this.depthBuf[x + y * this.width], z, epsilon)) {
        this.fragmentProcessing(x, y, z, color);
      }
      if (D > 0) {
        y += yi;
        D -= 2 * dx;
      }
      D += 2 * dy;
    }
  }
  drawLineHigh(p1: Vector, p2: Vector, color: Vector, epsilon: number) {
    const x0 = Math.round(p1.x);
    const y0 = Math.round(p1.y);
    const z0 = p1.z;
    const x1 = Math.round(p2.x);
    const y1 = Math.round(p2.y);
    const z1 = p2.z;

    let dx = x1 - x0;
    const dy = y1 - y0;
    let xi = 1;
    if (dx < 0) {
      xi = -1;
      dx = -dx;
    }
    let D = 2 * dx - dy;
    let x = x0;
    for (let y = y0; y <= y1; y++) {
      const z = ((z1 - z0) * (y - y0)) / (y1 - y0) + z0;
      // Dealing with numeric issues.
      if (approxEqual(this.depthBuf[x + y * this.width], z, epsilon)) {
        this.fragmentProcessing(x, y, z, color);
      }
      if (D > 0) {
        x += xi;
        D -= 2 * dy;
      }
      D += 2 * dx;
    }
  }
  /**
   * fragmentProcessing fills pixel with color by its given position
   * (x, y), the drawing color is stored in the frame buffer.
   *
   * @param x is the x coordiante in screen space
   * @param y is the y coordiante in screen space
   * @param z is the depth value
   * @param color is the color to draw
   */
  fragmentProcessing(x: number, y: number, z: number, color: Vector) {
    this.updateBuffer(this.depthBuf, x, y, z);
    this.updateBuffer(this.frameBuf, x, y, color);
  }
  /**
   * updateBuffer updates a given buffer with a given value.
   *
   * This is a generic function that can be used to update any type of
   * buffers that contains different types of values. However, there is
   * no difference from the caller side.
   */
  updateBuffer<Type>(buf: Array<Type>, i: number, j: number, value: Type) {
    if (i < 0 || i >= this.width) {
      return;
    }
    if (j < 0 || j >= this.height) {
      return;
    }

    buf[i + j * this.width] = value;
  }
}
