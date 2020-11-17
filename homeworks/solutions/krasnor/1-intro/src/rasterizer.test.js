/**
 * CG1 Online-Hausarbeit 3: Implementing a Rasterization Pipeline
 * Copyright (C) 2020 Changkun Ou <https://changkun.de/>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// This is a quick and dirty but working solution for the automatic grading
// of the CG1 Online-Hausearbeit 3.
// To use this file, place it inside the src folder, then use
//
// $ npm i
//
// to install all dependencies (jest).
//
// Then run the test using:
//
// $ npm test
//
// The grade will be shoed on the bottom of the test log.
// For instance, using the test file with the reference solution, you will
// get the grading result as follows:
//
// PASS  src/rasterizer.test.js (18.802 s)
// Vector
//   ✓ (1p) add (2 ms)
//   ✓ (1p) sub
//   ✓ (1p) multiplyScalar
//   ✓ (1p) dot (1 ms)
//   ✓ (2p) crossVectors (1 ms)
//   ✓ (1p) normalize (1 ms)
//   ✓ (2p) applyMatrix
// Matrix
//   ✓ (1p) set
//   ✓ (3p) multiplyMatrices (1 ms)
// initBuffers
//   ✓ (2p) init frameBuf (1814 ms)
//   ✓ (2p) init depthBuf (15045 ms)
// initTransformations
//   ✓ (6p) Tmodel (1 ms)
//   ✓ (6p) Tcamera (1 ms)
//   ✓ (6p) Tpersp (1 ms)
//   ✓ (3p) Tviewport (1 ms)
// render() method
//   ✓ (1p) call inits (4 ms)
//   ✓ (2p) pass as arguments to draw() (1 ms)
//   ✓ (3p) access 3 vertices (1 ms)
//   ✓ (2p) access 3 UVs (5 ms)
//   ✓ (2p) access 3 vertex normals (3 ms)
// draw() rasterization
//   ✓ (1p) process vertex using vertex shader (4 ms)
//   ✓ (5p) View frustum (AABB) culling (70 ms)
//   ✓ (6p) barycentric coords (2 ms)
//   ✓ (3p) skip frags outside triangle (65 ms)
//   ✓ (4p) z-test
//   ✓ (2p) UV interpolation (1 ms)
//   ✓ (2p) frag pos interpolation
//   ✓ (4p) normal interpolation (1 ms)
//   ✓ (1p) update depth buf
//   ✓ (2p) update frame buf (63 ms)
// shaders
//   ✓ (5p) vertexShader (1 ms)
//   ✓ (5+12p) fragmentShader (1 ms)
//
// console.log
//   Total points: 100
//
//     at Object.<anonymous> (src/rasterizer.test.js:33:11)
//
// Test Suites: 1 passed, 1 total
// Tests:       32 passed, 32 total
// Snapshots:   0 total
// Time:        19.746 s
// Ran all test suites.

import Vector from './vec'
import Matrix from './mat'
import Rasterizer from './rasterizer'
import {Vector2, Vector3} from 'three'

const closeCheck = true // allow floating number precision error

let totalPoints = 0 // accumulated when tests are passed
afterAll(() => {
  console.log(`Total points: ${totalPoints}`)
})

/**
 * ---------------------------------------------------------------------
 */

describe('Vector', () => {
  test('(1p) add', () => {
    expect(new Vector(1, 2, 3, 4).add(new Vector(1, 2, 3, 4)))
      .toEqual(new Vector(2, 4, 6, 8))

    totalPoints += 1
  })
  test('(1p) sub', () => {
    expect(new Vector(1, 2, 3, 4).sub(new Vector(1, 2, 3, 4)))
      .toEqual(new Vector(0, 0, 0, 0))

    totalPoints += 1
  })
  test('(1p) multiplyScalar', () => {
    expect(new Vector(1, 2, 3, 4).multiplyScalar(2))
      .toEqual(new Vector(2, 4, 6, 8))

    totalPoints += 1
  })
  test('(1p) dot', () => {
    expect(() => {
      new Vector(1, 2, 3, 1).dot(new Vector(1, 2, 3, 1))
    })
      .toThrow()
    expect(() => {
      new Vector(1, 2, 3, 1).dot(new Vector(1, 2, 3, 0))
    })
      .toThrow()
    expect(() => {
      new Vector(1, 2, 3, 0).dot(new Vector(1, 2, 3, 1))
    })
      .toThrow()
    expect(new Vector(1, 2, 3, 0).dot(new Vector(1, 2, 3, 0)))
      .toEqual(1+4+9)

    totalPoints += 1
  })
  test('(2p) crossVectors', () => {
    expect(() => {
      new Vector().crossVectors(new Vector(1, 2, 3, 1), new Vector(1, 2, 3, 1))
    }).toThrow()
    expect(() => {
      new Vector().crossVectors(new Vector(1, 2, 3, 1), new Vector(1, 2, 3, 0))
    }).toThrow()
    expect(() => {
      new Vector().crossVectors(new Vector(1, 2, 3, 0), new Vector(1, 2, 3, 1))
    }).toThrow()

    expect(new Vector()
      .crossVectors(new Vector(0, 0, 0, 0), new Vector(1, 2, 3, 0)))
      .toEqual(new Vector(0, 0, 0, 0))
    expect(new Vector()
      .crossVectors(new Vector(1, 2, 3, 0), new Vector(1, 2, 3, 0)))
      .toEqual(new Vector(0, 0, 0, 0))
    expect(new Vector()
      .crossVectors(new Vector(1, 0, 0, 0), new Vector(0, 1, 0, 0)))
      .toEqual(new Vector(0, 0, 1, 0))

    const randomInts = () => {
      return Math.floor(Math.random() * 10)
    }

    // orthogonal
    const v1 = new Vector(randomInts(), randomInts(), randomInts(), 0)
    const v2 = new Vector(randomInts(), randomInts(), randomInts(), 0)
    expect(v1.dot(new Vector().crossVectors(v1, v2))).toBe(0)

    // jacobi
    const a1 = new Vector(randomInts(), randomInts(), randomInts(), 0)
    const a2 = new Vector(randomInts(), randomInts(), randomInts(), 0)
    const a3 = new Vector(randomInts(), randomInts(), randomInts(), 0)
    expect(
      new Vector().crossVectors(a1, new Vector().crossVectors(a2, a3))
        .add(new Vector().crossVectors(a2, new Vector().crossVectors(a3, a1)))
        .add(new Vector().crossVectors(a3, new Vector().crossVectors(a1, a2)))
    ).toEqual(new Vector(0, 0, 0, 0))

    totalPoints += 2
  })

  test('(1p) normalize', () => {
    expect(() => {
      new Vector().crossVectors(new Vector(1, 2, 3, 1), new Vector(1, 2, 3, 1))
    }).toThrow()
    expect(() => {
      new Vector().crossVectors(new Vector(1, 2, 3, 1), new Vector(1, 2, 3, 0))
    }).toThrow()
    expect(() => {
      new Vector().crossVectors(new Vector(1, 2, 3, 0), new Vector(1, 2, 3, 1))
    }).toThrow()

    expect(new Vector(1, 1, 1, 0).normalize())
      .toEqual(new Vector(1/Math.sqrt(3), 1/Math.sqrt(3), 1/Math.sqrt(3), 0))
    expect(new Vector(2, 1, 2, 0).normalize())
      .toEqual(new Vector(2/3, 1/3, 2/3, 0))
    expect(new Vector(1, 1, 3, 0).normalize())
      .toEqual(new Vector(1/Math.sqrt(11), 1/Math.sqrt(11), 3/Math.sqrt(11), 0))
    expect(new Vector(1, 2, -2, 0).normalize())
      .toEqual(new Vector(1/3, 2/3, -2/3, 0))

    totalPoints += 1
  })

  test('(2p) applyMatrix', () => {
    const m = new Matrix()
    m.xs = [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4]
    expect(new Vector(1, 2, 3, 4).applyMatrix(m))
      .toEqual(new Vector(30, 30, 30, 30))

    totalPoints += 2
  })
})

/**
 * ---------------------------------------------------------------------
 */

describe('Matrix', () => {
  test('(1p) set', () => {
    const m = new Matrix()
    m.set(
      1, 2, 3, 4,
      1, 2, 3, 4,
      1, 2, 3, 4,
      1, 2, 3, 4
    )
    const n = new Matrix()
    n.xs = [
      1, 2, 3, 4,
      1, 2, 3, 4,
      1, 2, 3, 4,
      1, 2, 3, 4,
    ]
    expect(m).toEqual(n)

    totalPoints += 1
  })

  test('(3p) multiplyMatrices', () => {
    const m = new Matrix()
    m.xs = [
      57, 87, 95, 45,
      51, 58, 82, 7,
      29, 78, 0, 96,
      46, 65, 64, 58,
    ]
    const n = new Matrix()
    n.xs = [
      23, 54, 77, 66,
      75, 54, 52, 97,
      33, 54, 95, 95,
      32, 69, 36, 27,
    ]
    const want = new Matrix()
    want.xs = [
      12411, 16011, 19558, 22441,
      8453, 10797, 14985, 16971,
      9589, 12402, 9745, 12072,
      9901, 13452, 15090, 16987,
    ]
    expect(new Matrix().multiplyMatrices(m, n)).toEqual(want)

    totalPoints += 3
  })
})

/**
 * ---------------------------------------------------------------------
 */

const geo = {
  // face 65494 (draw face), 65505 (view frustum culled face), 30 (back face)
  // face 10, 20, 30
  faces: [
    {
      a: 0,
      b: 1,
      c: 2,
      materialIndex: 0,
      normal: new Vector3(
        0.09674783257605377, -0.6488555880618578, 0.7547359026392852),
      vertexNormals: [
        new Vector3(
          0.08065400272607803, -0.6789420247077942, 0.729748010635376),
        new Vector3(
          0.18715600669384003, -0.6975449919700623, 0.6916670203208923),
        new Vector3(
          -0.024477999657392502, -0.6003170013427734, 0.7993879914283752),
      ],
    },
    {
      a: 3,
      b: 4,
      c: 5,
      materialIndex: 0,
      normal: new Vector3(
        0.28148681119341873, -0.7991305339131912, 0.531183174518714),
      vertexNormals: [
        new Vector3(
          0.27720001339912415, -0.8220980167388916, 0.49730798602104187),
        new Vector3(
          0.2257460057735443, -0.7910199761390686, 0.5686169862747192),
        new Vector3(
          0.24778400361537933, -0.8152750134468079, 0.5233830213546753),
      ],
    },
    // don't check backface culling since this is an optimization
    // {
    //   a: 6,
    //   b: 7,
    //   c: 8,
    //   materialIndex: 0,
    //   normal: new Vector3(
    //     -0.26192526081644624, 0.9647270735704966, -0.02639756174994669),
    //   vertexNormals: [
    //     new Vector3(
    //       -0.2312449961900711, 0.9704750180244446, -0.06858699768781662),
    //     new Vector3(
    //       -0.2532010078430176, 0.9674059748649597, 0.003790999995544553),
    //     new Vector3(
    //       -0.24307399988174438, 0.9699770212173462, -0.007677000015974045),
    //   ]
    // },
  ],
  vertices: [
    new Vector3(
      0.046348001807928085, 0.010332999750971794, 0.03602999821305275),
    new Vector3(
      0.04774300009012222, 0.010598000138998032, 0.03607900068163872),
    new Vector3(
      0.04616999998688698, 0.01157199963927269, 0.03711799904704094),
    new Vector3(
      0.045875001698732376, 0.007108999881893396, 0.032079000025987625),
    new Vector3(
      0.04547800123691559, 0.007925000041723251, 0.03351699933409691),
    new Vector3(
      0.04436999931931496, 0.006649999879300594, 0.03218600153923035),
    // don't check backface culling since this is an optimization
    // new Vector3(
    //   -0.02448200061917305, 0.11461599916219711, 0.013710999861359596),
    // new Vector3(
    //   -0.025147000327706337, 0.11447799950838089, 0.015266000293195248),
    // new Vector3(
    //   -0.023586999624967575, 0.11491700261831284, 0.015830999240279198),
  ],
  faceVertexUvs: [[
    [
      new Vector2(0.7362840175628662, 0.8487160205841064),
      new Vector2(0.7332140207290649, 0.8507850170135498),
      new Vector2(0.7335690259933472, 0.8452860116958618),
    ],
    [
      new Vector2(0.7459840178489685, 0.8585190176963806),
      new Vector2(0.7441890239715576, 0.8542519807815552),
      new Vector2(0.7497239708900452, 0.8563339710235596),
    ],
    // don't check backface culling since this is an optimization
    // [
    //   new Vector2(0.5217689871788025, 0.574379026889801),
    //   new Vector2(0.5254989862442017, 0.5727049708366394),
    //   new Vector2(0.5268329977989197, 0.5765889883041382),
    // ],
  ]],
}
const textureData = [
  107, 107, 107, 255, 107, 107, 107, 255, 107, 107, 107, 255, 107, 107, 107,
  255, 137, 131, 125, 255, 127, 120, 113, 255, 200, 191, 182, 255, 197, 189,
  180, 255, 197, 189, 180, 255, 197, 189, 180, 255, 170, 164, 158, 255, 107,
  107, 107, 255, 107, 107, 107, 255, 107, 107, 107, 255, 107, 107, 107, 255,
  107, 107, 107, 255, 107, 107, 107, 255, 107, 107, 107, 255, 118, 116, 113,
  255, 218, 194, 167, 255, 225, 204, 182, 255, 226, 214, 199, 255, 107, 107,
  107, 255, 107, 107, 107, 255, 189, 180, 168, 255, 219, 199, 178, 255, 199,
  179, 158, 255, 107, 107, 107, 255, 107, 107, 107, 255, 107, 107, 107, 255,
  107, 107, 107, 255, 107, 107, 107, 255, 107, 107, 107, 255, 119, 117, 114,
  255, 230, 208, 182, 255, 235, 218, 198, 255, 239, 225, 208, 255, 161, 154,
  146, 255, 154, 148, 141, 255, 240, 225, 209, 255, 234, 216, 194, 255, 229,
  205, 179, 255, 167, 155, 141, 255, 107, 107, 107, 255, 107, 107, 107, 255,
  107, 107, 107, 255, 107, 107, 107, 255, 113, 112, 111, 255, 230, 207, 181,
  255, 233, 213, 189, 255, 236, 219, 200, 255, 239, 225, 208, 255, 239, 226,
  211, 255, 240, 227, 211, 255, 238, 223, 205, 255, 236, 219, 198, 255, 238,
  223, 206, 255, 174, 162, 148, 255, 107, 107, 107, 255, 107, 107, 107, 255,
  107, 107, 107, 255, 107, 107, 107, 255, 168, 155, 142, 255, 233, 213, 190,
  255, 235, 217, 195, 255, 239, 223, 206, 255, 238, 222, 203, 255, 241, 228,
  214, 255, 241, 227, 213, 255, 238, 224, 207, 255, 236, 219, 198, 255, 236,
  219, 199, 255, 231, 208, 183, 255, 107, 107, 107, 255, 107, 107, 107, 255,
  107, 107, 107, 255, 216, 194, 169, 255, 235, 215, 194, 255, 234, 214, 191,
  255, 238, 223, 205, 255, 239, 225, 208, 255, 242, 230, 217, 255, 241, 228,
  214, 255, 242, 229, 216, 255, 239, 225, 209, 255, 239, 225, 208, 255, 236,
  219, 199, 255, 233, 212, 189, 255, 220, 199, 174, 255, 118, 116, 113, 255,
  140, 133, 127, 255, 235, 220, 202, 255, 234, 216, 194, 255, 233, 213, 190,
  255, 236, 219, 198, 255, 239, 225, 209, 255, 241, 227, 212, 255, 239, 225,
  209, 255, 239, 225, 209, 255, 238, 224, 207, 255, 236, 219, 200, 255, 235,
  216, 195, 255, 236, 218, 197, 255, 238, 221, 202, 255, 144, 138, 131, 255,
  188, 174, 159, 255, 234, 215, 193, 255, 233, 213, 190, 255, 231, 210, 185,
  255, 237, 221, 202, 255, 239, 226, 210, 255, 240, 228, 213, 255, 205, 194,
  180, 255, 180, 172, 164, 255, 238, 222, 204, 255, 237, 221, 202, 255, 236,
  219, 199, 255, 232, 212, 189, 255, 233, 214, 191, 255, 188, 173, 157, 255,
  107, 107, 107, 255, 200, 175, 147, 255, 224, 202, 178, 255, 232, 209, 185,
  255, 238, 224, 207, 255, 235, 222, 206, 255, 119, 118, 116, 255, 107, 107,
  107, 255, 107, 107, 107, 255, 185, 171, 155, 255, 241, 227, 213, 255, 235,
  217, 196, 255, 231, 209, 185, 255, 201, 178, 152, 255, 107, 107, 107, 255,
  107, 107, 107, 255, 107, 107, 107, 255, 126, 122, 119, 255, 237, 222, 203,
  255, 240, 226, 212, 255, 185, 174, 162, 255, 107, 107, 107, 255, 107, 107,
  107, 255, 107, 107, 107, 255, 107, 107, 107, 255, 239, 224, 208, 255, 235,
  218, 196, 255, 145, 138, 130, 255, 107, 107, 107, 255, 107, 107, 107, 255,
  115, 114, 113, 255, 146, 142, 138, 255, 147, 143, 138, 255, 142, 138, 133,
  255, 172, 165, 158, 255, 124, 122, 120, 255, 149, 145, 141, 255, 107, 107,
  107, 255, 144, 140, 136, 255, 108, 108, 108, 255, 110, 110, 109, 255, 109,
  109, 108, 255, 107, 107, 107, 255, 147, 143, 139, 255, 125, 124, 122, 255,
  148, 145, 142, 255, 243, 233, 223, 255, 243, 232, 222, 255, 239, 226, 211,
  255, 224, 209, 193, 255, 233, 223, 211, 255, 242, 229, 217, 255, 221, 211,
  200, 255, 240, 226, 213, 255, 173, 166, 158, 255, 225, 211, 195, 255, 226,
  213, 197, 255, 229, 220, 211, 255, 243, 233, 223, 255, 152, 149, 147, 255,
  196, 177, 175, 255, 240, 207, 199, 255, 238, 207, 196, 255, 148, 143, 137,
  255, 238, 223, 206, 255, 224, 208, 190, 255, 236, 222, 207, 255, 242, 229,
  216, 255, 194, 175, 155, 255, 238, 223, 205, 255, 172, 164, 154, 255, 113,
  112, 111, 255, 239, 212, 202, 255, 241, 206, 203, 255, 196, 182, 180, 255,
  228, 219, 208, 255, 227, 215, 203, 255, 225, 213, 197, 255, 162, 155, 147,
  255, 107, 107, 107, 255, 221, 204, 185, 255, 224, 208, 190, 255, 224, 210,
  193, 255, 223, 208, 193, 255, 135, 129, 123, 255, 107, 107, 107, 255, 209,
  193, 175, 255, 225, 211, 195, 255, 225, 214, 199, 255, 215, 206, 196, 255,
  107, 107, 107, 255, 107, 107, 107, 255, 107, 107, 107, 255, 107, 107, 107,
  255, 107, 107, 107, 255, 107, 107, 107, 255, 107, 107, 107, 255, 107, 107,
  107, 255, 107, 107, 107, 255, 107, 107, 107, 255, 107, 107, 107, 255, 107,
  107, 107, 255, 107, 107, 107, 255, 107, 107, 107, 255, 107, 107, 107, 255,
]
const params = {
  screen: {width: 800, height: 500},
  camera: {
    position: new Vector(-550, 194, 734, 1),
    fov: 45, aspect: 1.6, near: 100, far: 600,
    lookAt: new Vector(-1000, 0, 0, 1),
    up: new Vector(0, 1, 1, 0),
  },
  light: {
    color: 0xffffff, Kamb: 0.5, Kdiff: 0.6, Kspec: 1,
    position: new Vector(-200, 250, 600, 1),
  },
  model: {
    scale: new Vector(1500, 1500, 1500, 0),
    position: new Vector(-700, -5, 350, 1),
    geometry: geo,
    texture: {
      data: textureData,
      width: 15,
      height: 15,
      shininess: 150,
    },
  },
}

// a helper to check multiple solution
const expectOr = (...tests) => {
  try {
    tests.shift()()
  } catch (e) {
    if (tests.length) expectOr(...tests)
    else throw e
  }
}

describe('initBuffers', () => {
  const r = new Rasterizer(params)
  r.initBuffers()

  test('(2p) init frameBuf', () => {
    const want = new Array(params.screen.width*params.screen.height)
    want.fill([0, 0, 0])
    expect(r.frameBuf.length).toEqual(params.screen.width*params.screen.height)
    expect(r.frameBuf).toEqual(want)

    totalPoints += 2
  })

  test('(2p) init depthBuf', () => {
    const want = new Array(params.screen.width*params.screen.height)
    want.fill(-Infinity)
    expect(r.depthBuf.length).toEqual(params.screen.width*params.screen.height)
    r.depthBuf.forEach((v, i) => {
      expect(v <= -1 || v >= 1).toEqual(true)
    })

    totalPoints += 2
  })
})

describe('initTransformations', () => {
  const r = new Rasterizer(params)
  r.initTransformation()

  test('(6p) Tmodel', () => {
    const want = new Matrix()
    want.set(
      1500, 0, 0, -700,
      0, 1500, 0, -5,
      0, 0, 1500, 350,
      0, 0, 0, 1
    )
    if (closeCheck) { // approx equal, default precision: 2
      for (let i = 0; i < r.Tmodel.xs.length; i++) {
        expect(r.Tmodel.xs[i]).toBeCloseTo(want.xs[i])
      }
    } else expect(r.Tmodel).toEqual(want)

    totalPoints += 6
  })

  test('(6p) Tcamera', () => {
    const want = new Matrix()
    want.set(
      0.6469966392206304, 0.5391638660171921, -0.5391638660171921,
      646.9966392206305,
      -0.5669309063966456, 0.8130082437851895, 0.13269115610921495,
      -566.9309063966456,
      0.5098869445372056, 0.21981792720048418, 0.8316822606451308,
      -372.6616376949569,
      0, 0, 0, 1,
    )
    if (closeCheck) { // approx equal, default precision: 2
      for (let i = 0; i < r.Tcamera.xs.length; i++) {
        expect(r.Tcamera.xs[i]).toBeCloseTo(want.xs[i])
      }
    } else expect(r.Tcamera).toEqual(want)

    totalPoints += 6
  })

  test('(6p) Tpersp', () => {
    const want = new Matrix() // tutorial slides solution
    want.set(
      -1.5088834764831844, 0, 0, 0,
      0, -2.414213562373095, 0, 0,
      0, 0, -1.4, -240,
      0, 0, 1, 0,
    )
    const want2 = new Matrix() // NDC-space solution, OpenGL
    want2.set(
      1.5088834764831844, 0, 0, 0,
      0, 2.414213562373095, 0, 0,
      0, 0, -1.4, -240,
      0, 0, -1, 0,
    )
    expectOr(
      () => {
        if (closeCheck) { // approx equal, default precision: 2
          for (let i = 0; i < r.Tpersp.xs.length; i++) {
            expect(r.Tpersp.xs[i]).toBeCloseTo(want.xs[i])
          }
        } else expect(r.Tpersp).toEqual(want)
      },
      () => {
        if (closeCheck) { // approx equal, default precision: 2
          for (let i = 0; i < r.Tpersp.xs.length; i++) {
            expect(r.Tpersp.xs[i]).toBeCloseTo(want2.xs[i])
          }
        } else expect(r.Tpersp).toEqual(want2)
      }
    )

    totalPoints += 6
  })

  test('(3p) Tviewport', () => {
    const want = new Matrix()
    want.set(
      400, 0, 0, 400,
      0, 250, 0, 250,
      0, 0, 1, 0,
      0, 0, 0, 1
    )
    if (closeCheck) { // approx equal, default precision: 2
      for (let i = 0; i < r.Tviewport.xs.length; i++) {
        expect(r.Tviewport.xs[i]).toBeCloseTo(want.xs[i])
      }
    } else expect(r.Tviewport).toEqual(want)

    totalPoints += 3
  })
})

describe('render() method', () => {
  test('(1p) call inits', () => {
    /**
     * RasterizerForRender overwrite draw to hijack the params from render.
     */
    class RasterizerForRender extends Rasterizer {
      /**
       * draw is a hijack of the Rasterizer's draw, and receives the params
       * from the render() call.
       * @param {*} tri receives the triangle passed from render()
       * @param {*} uvs receives the UV passed from render()
       * @param {*} normals receives the normals passed from render()
       */
      draw(tri, uvs, normals) {
      }
    }
    const r = new RasterizerForRender(params)
    r.initBuffers = jest.fn()
    r.initTransformation = jest.fn()
    r.render()

    expect(r.initBuffers).toHaveBeenCalled()
    expect(r.initTransformation).toHaveBeenCalled()

    totalPoints += 1
  })

  const wantTris = [[
    new Vector(
      0.046348001807928085, 0.010332999750971794, 0.03602999821305275, 1),
    new Vector(
      0.04774300009012222, 0.010598000138998032, 0.03607900068163872, 1),
    new Vector(
      0.04616999998688698, 0.01157199963927269, 0.03711799904704094, 1),
  ], [
    new Vector(
      0.045875001698732376, 0.007108999881893396, 0.032079000025987625, 1),
    new Vector(
      0.04547800123691559, 0.007925000041723251, 0.03351699933409691, 1),
    new Vector(
      0.04436999931931496, 0.006649999879300594, 0.03218600153923035, 1),
  ]]
  const wantUVs = [[
    new Vector(0.7362840175628662, 0.8487160205841064, 0, 1),
    new Vector(0.7332140207290649, 0.8507850170135498, 0, 1),
    new Vector(0.7335690259933472, 0.8452860116958618, 0, 1),
  ], [
    new Vector(0.7459840178489685, 0.8585190176963806, 0, 1),
    new Vector(0.7441890239715576, 0.8542519807815552, 0, 1),
    new Vector(0.7497239708900452, 0.8563339710235596, 0, 1),
  ]]
  const wantNormals = [[
    new Vector(
      0.08065400272607803, -0.6789420247077942, 0.729748010635376, 0),
    new Vector(
      0.18715600669384003, -0.6975449919700623, 0.6916670203208923, 0),
    new Vector(
      -0.024477999657392502, -0.6003170013427734, 0.7993879914283752, 0),
  ], [
    new Vector(
      0.27720001339912415, -0.8220980167388916, 0.49730798602104187, 0),
    new Vector(
      0.2257460057735443, -0.7910199761390686, 0.5686169862747192, 0),
    new Vector(
      0.24778400361537933, -0.8152750134468079, 0.5233830213546753, 0),
  ]]
  const gotTris = []
  const gotUVs = []
  const gotNormals = []
  /**
   * RasterizerForRender overwrite draw to hijack the params from render.
   */
  class RasterizerForRender extends Rasterizer {
    /**
     * draw is a hijack of the Rasterizer's draw, and receives the params
     * from the render() call.
     * @param {Array.<Vector>} tri receives the triangle passed from render()
     * @param {Array.<Vector>} uvs receives the UV passed from render()
     * @param {Array.<Vector>} normals receives the normals passed from render()
     */
    draw(tri, uvs, normals) {
      gotTris.push(tri)
      gotUVs.push(uvs)
      gotNormals.push(normals)
    }
  }
  const r = new RasterizerForRender(params)
  r.render()

  test('(2p) pass as arguments to draw()', () => {
    expect(gotTris.length === 2).toEqual(true)
    expect(gotUVs.length === 2).toEqual(true)
    expect(gotNormals.length === 2).toEqual(true)

    totalPoints += 2
  })

  test('(3p) access 3 vertices', () => {
    if (closeCheck) { // approx equal, default precision: 2
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 3; j++) {
          expect(gotTris[i][j].x).toBeCloseTo(wantTris[i][j].x)
          expect(gotTris[i][j].y).toBeCloseTo(wantTris[i][j].y)
          expect(gotTris[i][j].z).toBeCloseTo(wantTris[i][j].z)
          expect(gotTris[i][j].w).toBeCloseTo(wantTris[i][j].w)
        }
      }
    } else expect(gotTris).toEqual(wantTris)

    totalPoints += 3
  })

  test('(2p) access 3 UVs', () => {
    if (closeCheck) { // approx equal, default precision: 2
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 3; j++) {
          expect(gotUVs[i][j].x).toBeCloseTo(wantUVs[i][j].x)
          expect(gotUVs[i][j].y).toBeCloseTo(wantUVs[i][j].y)
          expect(gotUVs[i][j].z).toBeCloseTo(wantUVs[i][j].z)
          expect(gotUVs[i][j].w).toBeCloseTo(wantUVs[i][j].w)
        }
      }
    } else expect(gotUVs).toEqual(wantUVs)

    totalPoints += 2
  })

  test('(2p) access 3 vertex normals', () => {
    if (closeCheck) { // approx equal, default precision: 2
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 3; j++) {
          expect(gotNormals[i][j].x).toBeCloseTo(wantNormals[i][j].x)
          expect(gotNormals[i][j].y).toBeCloseTo(wantNormals[i][j].y)
          expect(gotNormals[i][j].z).toBeCloseTo(wantNormals[i][j].z)
          expect(gotNormals[i][j].w).toBeCloseTo(wantNormals[i][j].w)
        }
      }
    } else expect(gotNormals).toEqual(wantNormals)

    totalPoints += 2
  })
})

describe('draw() rasterization', () => {
  test('(1p) process vertex using vertex shader', () => {
    params.model.geometry.vertices.forEach((p, i) => {
      const pp = new Vector(p.x, p.y, p.z, 1)
      const v = r.vertexShader(pp)
      // expect a new vertex other than transform the old one, reason in
      // the comments of the reference solution
      expect(v).not.toEqual(null)
      expect(v).not.toEqual(undefined)
      expect(v).not.toEqual(pp)
    })

    totalPoints += 1
  })

  const wantUV = [
    new Vector(0.735543711183949, 0.8485618404868156, 0, 1),
    new Vector(0.7343479145806542, 0.8469274148439698, 0, 1),
    new Vector(0.7334294636975227, 0.8479434796694204, 0, 1),
  ]
  const wantNormal = [
    [ // world space normal solution
      new Vector(
        0.08176690482354261, -0.6731048899088585, 0.735012911761665, 0),
      new Vector(
        0.030727332142068745, -0.6375137870106233, 0.7698259559347195, 0),
      new Vector(
        0.07814258208752269, -0.6528337100315652, 0.7534599418091961, 0),
    ],
    [ // camera space normal solution
      new Vector(-0.7063033251360041, -0.4960662968760277, 0.5050285556337669),
      new Vector(-0.7389062559779178, -0.4335751425329463, 0.5157810976123794),
      new Vector(-0.7076647340912505, -0.47508316220694174, 0.522978597182535),
    ],
  ]
  const wantX = [
    [ // world space frag pos
      new Vector(
        -630.2363408918961, 10.78247352784858, 404.25729603767536, 1),
      new Vector(
        -630.4037428008703, 11.63647775612575, 405.01295266619144, 1),
      new Vector(
        -629.6178682006945, 11.641630193655983, 404.91664284959757, 1),
    ],
    [ // camera space frag pos
      new Vector(
        27.08843826403942, -147.22283856733682, -355.42711705674697, 1),
      new Vector(
        27.03315526363472, -146.33335182187344, -354.6962814522675, 1),
      new Vector(
        27.59631826998563, -146.787478907986, -354.37454082144353, 1),
    ],
  ]
  const gotUV = []
  const gotNormal = []
  const gotX = []

  /**
   * RasterizerForDraw overwrite fragmentShader to hijack params from draw.
   */
  class RasterizerForDraw extends Rasterizer {
    /**
     * fragmentShader is a hijack to the Rasterizer that receives params
     * from the draw call.
     * @param {Vector} uv the received UV
     * @param {Vector} normal the received normal
     * @param {Vector} x the received frag pos
     */
    fragmentShader(uv, normal, x) {
      gotUV.push(uv)
      gotNormal.push(normal)
      gotX.push(x)
    }
  }
  const g = params.model.geometry
  const r = new RasterizerForDraw(params)
  r.initBuffers()

  const initDepthBufValue = r.depthBuf[0]

  r.initTransformation()
  r.draw([
    new Vector(g.vertices[0].x, g.vertices[0].y, g.vertices[0].z, 1),
    new Vector(g.vertices[1].x, g.vertices[1].y, g.vertices[1].z, 1),
    new Vector(g.vertices[2].x, g.vertices[2].y, g.vertices[2].z, 1),
  ], [
    new Vector(g.faceVertexUvs[0][0][0].x, g.faceVertexUvs[0][0][0].y, 0, 1),
    new Vector(g.faceVertexUvs[0][0][1].x, g.faceVertexUvs[0][0][1].y, 0, 1),
    new Vector(g.faceVertexUvs[0][0][2].x, g.faceVertexUvs[0][0][2].y, 0, 1),
  ], [
    new Vector(
      g.faces[0].vertexNormals[0].x, g.faces[0].vertexNormals[0].y,
      g.faces[0].vertexNormals[0].z, 1),
    new Vector(
      g.faces[0].vertexNormals[1].x, g.faces[0].vertexNormals[1].y,
      g.faces[0].vertexNormals[1].z, 1),
    new Vector(
      g.faces[0].vertexNormals[2].x, g.faces[0].vertexNormals[2].y,
      g.faces[0].vertexNormals[2].z, 1),
  ])

  test('(5p) View frustum (AABB) culling', () => {
    // the fragment shader will only be called less than 4*6=24 times
    // for this face because of view frustum culling,
    expect(gotUV.length <= 24 && gotUV.length >= 3).toEqual(true)


    // test a case where face is out side the view frustum
    const uvs = []
    /**
     * RasterizerForDraw overwrite fragmentShader to hijack params from draw.
     */
    class RasterizerForDraw extends Rasterizer {
      /**
       * fragmentShader is a hijack to the Rasterizer that receives params
       * from the draw call.
       * @param {Vector} uv the received UV
       * @param {Vector} normal the received normal
       * @param {Vector} x the received frag pos
       */
      fragmentShader(uv, normal, x) {
        uvs.push(uv)
      }
    }
    const g = params.model.geometry
    const r = new RasterizerForDraw(params)
    r.initBuffers()
    r.initTransformation()
    r.draw([
      new Vector(g.vertices[3].x, g.vertices[3].y, g.vertices[3].z, 1),
      new Vector(g.vertices[4].x, g.vertices[4].y, g.vertices[4].z, 1),
      new Vector(g.vertices[5].x, g.vertices[5].y, g.vertices[5].z, 1),
    ], [
      new Vector(g.faceVertexUvs[0][1][0].x, g.faceVertexUvs[0][1][0].y, 0, 1),
      new Vector(g.faceVertexUvs[0][1][1].x, g.faceVertexUvs[0][1][1].y, 0, 1),
      new Vector(g.faceVertexUvs[0][1][2].x, g.faceVertexUvs[0][1][2].y, 0, 1),
    ], [
      new Vector(
        g.faces[1].vertexNormals[0].x, g.faces[1].vertexNormals[0].y,
        g.faces[1].vertexNormals[0].z, 1),
      new Vector(g.faces[1].vertexNormals[1].x, g.faces[1].vertexNormals[1].y,
        g.faces[1].vertexNormals[1].z, 1),
      new Vector(g.faces[1].vertexNormals[2].x, g.faces[1].vertexNormals[2].y,
        g.faces[1].vertexNormals[2].z, 1),
    ])
    expect(uvs.length).toEqual(0) // view frustum culling
    totalPoints += 5
  })

  test('(6p) barycentric coords', () => {
    // check interpolated values, any interpolation is correct then means
    // barycentric is correctly calculated. More precision is needed,
    // increased to 5
    if (closeCheck) {
      for (let i = 0; i < 3; i++) {
        expectOr(
          // uv interpo
          () => {
            expect(gotUV[i].x).toBeCloseTo(wantUV[i].x, 5)
            expect(gotUV[i].y).toBeCloseTo(wantUV[i].y, 5)
            expect(gotUV[i].z).toBeCloseTo(wantUV[i].z, 5)
            expect(gotUV[i].w).toBeCloseTo(wantUV[i].w, 5)
          },
          // frag pos interpo
          () => {
            expect(gotX[i].x).toBeCloseTo(wantX[0][i].x, 5)
            expect(gotX[i].y).toBeCloseTo(wantX[0][i].y, 5)
            expect(gotX[i].z).toBeCloseTo(wantX[0][i].z, 5)
            expect(gotX[i].w).toBeCloseTo(wantX[0][i].w, 5)
          },
          () => {
            expect(gotX[i].x).toBeCloseTo(wantX[1][i].x, 5)
            expect(gotX[i].y).toBeCloseTo(wantX[1][i].y, 5)
            expect(gotX[i].z).toBeCloseTo(wantX[1][i].z, 5)
            expect(gotX[i].w).toBeCloseTo(wantX[1][i].w, 5)
          },
          // normal interpo
          () => {
            expect(gotNormal[i].x).toBeCloseTo(wantNormal[0][i].x, 5)
            expect(gotNormal[i].y).toBeCloseTo(wantNormal[0][i].y, 5)
            expect(gotNormal[i].z).toBeCloseTo(wantNormal[0][i].z, 5)
            expect(gotNormal[i].w).toBeCloseTo(wantNormal[0][i].w, 5)
          },
          () => {
            expect(gotNormal[i].x).toBeCloseTo(wantNormal[1][i].x, 5)
            expect(gotNormal[i].y).toBeCloseTo(wantNormal[1][i].y, 5)
            expect(gotNormal[i].z).toBeCloseTo(wantNormal[1][i].z, 5)
            expect(gotNormal[i].w).toBeCloseTo(wantNormal[1][i].w, 5)
          }
        )
      }
    } else {
      expectOr(
        // uv interpo
        () => expect(gotUV).toEqual(wantUV),
        // frag pos interpo
        () => expect(gotX).toEqual(wantX[0]),
        () => expect(gotX).toEqual(wantX[1]),
        // normal interpo
        () => expect(gotNormal).toEqual(wantNormal[0]),
        () => expect(gotNormal).toEqual(wantNormal[1])
      )
    }

    totalPoints += 6
  })

  test('(3p) skip frags outside triangle', () => {
    // the fragment shader will only be called 3 times for this face
    // because of view frustum culling and skipping frags outside triangle
    expect(gotUV.length).toEqual(3)

    // test a case where face is out side the view frustum
    const uvs = []
    /**
     * RasterizerForDraw overwrite fragmentShader to hijack params from draw.
     */
    class RasterizerForDraw extends Rasterizer {
      /**
       * fragmentShader is a hijack to the Rasterizer that receives params
       * from the draw call.
       * @param {Vector} uv the received UV
       * @param {Vector} normal the received normal
       * @param {Vector} x the received frag pos
       */
      fragmentShader(uv, normal, x) {
        uvs.push(uv)
      }
    }
    const g = params.model.geometry
    const r = new RasterizerForDraw(params)
    r.initBuffers()
    r.initTransformation()
    r.draw([
      new Vector(g.vertices[3].x, g.vertices[3].y, g.vertices[3].z, 1),
      new Vector(g.vertices[4].x, g.vertices[4].y, g.vertices[4].z, 1),
      new Vector(g.vertices[5].x, g.vertices[5].y, g.vertices[5].z, 1),
    ], [
      new Vector(g.faceVertexUvs[0][1][0].x, g.faceVertexUvs[0][1][0].y, 0, 1),
      new Vector(g.faceVertexUvs[0][1][1].x, g.faceVertexUvs[0][1][1].y, 0, 1),
      new Vector(g.faceVertexUvs[0][1][2].x, g.faceVertexUvs[0][1][2].y, 0, 1),
    ], [
      new Vector(g.faces[1].vertexNormals[0].x, g.faces[1].vertexNormals[0].y,
        g.faces[1].vertexNormals[0].z, 1),
      new Vector(g.faces[1].vertexNormals[1].x, g.faces[1].vertexNormals[1].y,
        g.faces[1].vertexNormals[1].z, 1),
      new Vector(g.faces[1].vertexNormals[2].x, g.faces[1].vertexNormals[2].y,
        g.faces[1].vertexNormals[2].z, 1),
    ])
    expect(uvs.length).toEqual(0) // view frustum culling
    totalPoints += 3
  })

  test('(4p) z-test', () => {
    // check a specific z value
    const want = -0.7233619183469197
    const i = 446
    const j = 1

    expectOr(
      // tutorial slides solution
      () => expect(r.depthBuf[j*params.screen.width + i]).toBeCloseTo(want),
      // OpenGL solution
      () => expect(r.depthBuf[j*params.screen.width + i]).toBeCloseTo(-want)
    )

    totalPoints += 4
  })

  test('(2p) UV interpolation', () => {
    if (closeCheck) {
      for (let i = 0; i < 3; i++) {
        // more precision is needed, increased to 5
        expect(gotUV[i].x).toBeCloseTo(wantUV[i].x, 5)
        expect(gotUV[i].y).toBeCloseTo(wantUV[i].y, 5)
        expect(gotUV[i].z).toBeCloseTo(wantUV[i].z, 5)
        expect(gotUV[i].w).toBeCloseTo(wantUV[i].w, 5)
      }
    } else {
      expect(gotUV).toEqual(wantUV)
    }

    totalPoints += 2
  })

  test('(2p) frag pos interpolation', () => {
    if (closeCheck) {
      for (let i = 0; i < 3; i++) {
        // more precision is needed, increased to 5
        expectOr(
          () => {
            expect(gotX[i].x).toBeCloseTo(wantX[0][i].x, 5)
            expect(gotX[i].y).toBeCloseTo(wantX[0][i].y, 5)
            expect(gotX[i].z).toBeCloseTo(wantX[0][i].z, 5)
            expect(gotX[i].w).toBeCloseTo(wantX[0][i].w, 5)
          },
          () => {
            expect(gotX[i].x).toBeCloseTo(wantX[1][i].x, 5)
            expect(gotX[i].y).toBeCloseTo(wantX[1][i].y, 5)
            expect(gotX[i].z).toBeCloseTo(wantX[1][i].z, 5)
            expect(gotX[i].w).toBeCloseTo(wantX[1][i].w, 5)
          }
        )
      }
    } else {
      expectOr(
        () => expect(gotX).toEqual(wantX[0]),
        () => expect(gotX).toEqual(wantX[1])
      )
    }

    totalPoints += 2
  })

  test('(4p) normal interpolation', () => {
    if (closeCheck) {
      for (let i = 0; i < 3; i++) {
        // more precision is needed, increased to 5
        expectOr(
          () => {
            expect(gotNormal[i].x).toBeCloseTo(wantNormal[0][i].x, 5)
            expect(gotNormal[i].y).toBeCloseTo(wantNormal[0][i].y, 5)
            expect(gotNormal[i].z).toBeCloseTo(wantNormal[0][i].z, 5)
            expect(gotNormal[i].w).toBeCloseTo(wantNormal[0][i].w, 5)
          },
          () => {
            expect(gotNormal[i].x).toBeCloseTo(wantNormal[1][i].x, 5)
            expect(gotNormal[i].y).toBeCloseTo(wantNormal[1][i].y, 5)
            expect(gotNormal[i].z).toBeCloseTo(wantNormal[1][i].z, 5)
            expect(gotNormal[i].w).toBeCloseTo(wantNormal[1][i].w, 5)
          }
        )
      }
    } else {
      expectOr(
        () => expect(gotNormal).toEqual(wantNormal[0]),
        () => expect(gotNormal).toEqual(wantNormal[1])
      )
    }

    totalPoints += 4
  })

  test('(1p) update depth buf', () => {
    expect(r.depthBuf.length).toEqual(params.screen.width*params.screen.height)
    let updated = false
    for (let i = 0; i < r.depthBuf.length; i++) {
      if (r.depthBuf[i] < 1 &&
          r.depthBuf[i] > -1 &&
          r.depthBuf[i] !== initDepthBufValue) {
        updated = true
        break
      }
    }
    expect(updated).toEqual(true)

    totalPoints += 1
  })

  test('(2p) update frame buf', () => {
    const r = new Rasterizer(params)
    r.initBuffers()
    const initFrameBufBlack = r.frameBuf[0][0] === 0
    r.initTransformation()
    r.draw([
      new Vector(g.vertices[0].x, g.vertices[0].y, g.vertices[0].z, 1),
      new Vector(g.vertices[1].x, g.vertices[1].y, g.vertices[1].z, 1),
      new Vector(g.vertices[2].x, g.vertices[2].y, g.vertices[2].z, 1),
    ], [
      new Vector(g.faceVertexUvs[0][0][0].x, g.faceVertexUvs[0][0][0].y, 0, 1),
      new Vector(g.faceVertexUvs[0][0][1].x, g.faceVertexUvs[0][0][1].y, 0, 1),
      new Vector(g.faceVertexUvs[0][0][2].x, g.faceVertexUvs[0][0][2].y, 0, 1),
    ], [
      new Vector(g.faces[0].vertexNormals[0].x, g.faces[0].vertexNormals[0].y,
        g.faces[0].vertexNormals[0].z, 1),
      new Vector(g.faces[0].vertexNormals[1].x, g.faces[0].vertexNormals[1].y,
        g.faces[0].vertexNormals[1].z, 1),
      new Vector(g.faces[0].vertexNormals[2].x, g.faces[0].vertexNormals[2].y,
        g.faces[0].vertexNormals[2].z, 1),
    ])

    expect(r.frameBuf.length).toEqual(params.screen.width*params.screen.height)

    let updated = false
    for (let i = 0; i < r.frameBuf.length; i++) {
      const v = r.frameBuf[i]
      // check if contains non black value
      if ((v[0] !== 0 && initFrameBufBlack) ||
          (v[1] !== 0 && initFrameBufBlack) ||
          (v[2] !== 0 && initFrameBufBlack)) {
        updated = true
        break
      }
    }
    expect(updated).toEqual(true)

    totalPoints += 2
  })
})

describe('shaders', () => {
  const r = new Rasterizer(params)
  r.initBuffers()
  r.initTransformation()

  test('(5p) vertexShader', () => {
    const expected = [ // standard solution
      new Vector(
        445.62240340249065, 0.04852520745601844, -0.72544308288227, 1),
      new Vector(
        448.3806420818459, -2.260899617284344, -0.7231307624477288, 1),
      new Vector(
        445.7460561061624, 2.100345010949928, -0.7223390475939484, 1),
      new Vector(
        445.0368100001806, -2.7589879503040273, -0.7372781287417605, 1),
      new Vector(
        443.76894835588223, -1.281599900125488, -0.7340427856045016, 1),
      new Vector(
        441.70504197724455, -0.7141173802454492, -0.7394103882754525, 1),
    ]
    const expected2 = [ // no viewport transformation
      new Vector(
        0.11405600850622656, -0.9998058991701759, -0.72544308288227, 1),
      new Vector(
        0.12095160520461477, -1.0090435984691375, -0.7231307624477288, 1),
      new Vector(
        0.11436514026540603, -0.9915986199562002, -0.7223390475939484, 1),
      new Vector(
        0.11259202500045137, -1.0110359518012162, -0.7372781287417605, 1),
      new Vector(
        0.10942237088970541, -1.005126399600502, -0.7340427856045016, 1),
      new Vector(
        0.10426260494311136, -1.0028564695209818, -0.7394103882754525, 1),
    ]
    const expected3 = [ // no viewport trans and no perspective division
      new Vector(-40.579884879776436, 355.720043352492, 258.1047432374904,
        -355.7891023124932),
      new Vector(-42.88625282200957, 357.78027748511977, 256.4031180011375,
        -354.57365571509825),
      new Vector(-40.5034900804657, 351.18397768754613, 255.8231676283308,
        -354.1594054488077),
      new Vector(-40.77439899305628, 366.13946054262675, 267.000017008753,
        -362.14286929196646),
      new Vector(-39.43401835111469, 362.2309822457434, 264.53691729279245,
        -360.3835123519946),
      new Vector(-37.87983453300326, 364.3495877216378, 268.6365180990845,
        -363.31179864220326),
    ]

    // use different Tpersp, where z = -z
    const expected4 = [ // standard solution
      new Vector(
        445.62240340249065, 0.04852520745601844, 0.72544308288227, 1),
      new Vector(
        448.3806420818459, -2.260899617284344, 0.7231307624477288, 1),
      new Vector(
        445.7460561061624, 2.100345010949928, 0.7223390475939484, 1),
      new Vector(
        445.0368100001806, -2.7589879503040273, 0.7372781287417605, 1),
      new Vector(
        443.76894835588223, -1.281599900125488, 0.7340427856045016, 1),
      new Vector(
        441.70504197724455, -0.7141173802454492, 0.7394103882754525, 1),
    ]
    const expected5 = [ // no viewport transformation
      new Vector(
        0.11405600850622656, -0.9998058991701759, 0.72544308288227, 1),
      new Vector(
        0.12095160520461477, -1.0090435984691375, 0.7231307624477288, 1),
      new Vector(
        0.11436514026540603, -0.9915986199562002, 0.7223390475939484, 1),
      new Vector(
        0.11259202500045137, -1.0110359518012162, 0.7372781287417605, 1),
      new Vector(
        0.10942237088970541, -1.005126399600502, 0.7340427856045016, 1),
      new Vector(
        0.10426260494311136, -1.0028564695209818, 0.7394103882754525, 1),
    ]
    const expected6 = [ // no viewport trans and no perspective division
      new Vector(-40.579884879776436, 355.720043352492, 258.1047432374904,
        355.7891023124932),
      new Vector(-42.88625282200957, 357.78027748511977, 256.4031180011375,
        354.57365571509825),
      new Vector(-40.5034900804657, 351.18397768754613, 255.8231676283308,
        354.1594054488077),
      new Vector(-40.77439899305628, 366.13946054262675, 267.000017008753,
        362.14286929196646),
      new Vector(-39.43401835111469, 362.2309822457434, 264.53691729279245,
        360.3835123519946),
      new Vector(-37.87983453300326, 364.3495877216378, 268.6365180990845,
        363.31179864220326),
    ]

    params.model.geometry.vertices.forEach((p, i) => {
      const pp = new Vector(p.x, p.y, p.z, 1)
      const v = r.vertexShader(pp)
      // expect a new vertex other than transform the old one.
      expect(v).not.toEqual(pp)

      if (closeCheck) {
        expectOr(
          () => {
            expect(v.x).toBeCloseTo(expected[i].x)
            expect(v.y).toBeCloseTo(expected[i].y)
            expect(v.z).toBeCloseTo(expected[i].z)
            expect(v.w).toBeCloseTo(expected[i].w)
          },
          () => {
            expect(v.x).toBeCloseTo(expected2[i].x)
            expect(v.y).toBeCloseTo(expected2[i].y)
            expect(v.z).toBeCloseTo(expected2[i].z)
            expect(v.w).toBeCloseTo(expected2[i].w)
          },
          () => {
            expect(v.x).toBeCloseTo(expected3[i].x)
            expect(v.y).toBeCloseTo(expected3[i].y)
            expect(v.z).toBeCloseTo(expected3[i].z)
            expect(v.w).toBeCloseTo(expected3[i].w)
          },
          () => {
            expect(v.x).toBeCloseTo(expected4[i].x)
            expect(v.y).toBeCloseTo(expected4[i].y)
            expect(v.z).toBeCloseTo(expected4[i].z)
            expect(v.w).toBeCloseTo(expected4[i].w)
          },
          () => {
            expect(v.x).toBeCloseTo(expected5[i].x)
            expect(v.y).toBeCloseTo(expected5[i].y)
            expect(v.z).toBeCloseTo(expected5[i].z)
            expect(v.w).toBeCloseTo(expected5[i].w)
          },
          () => {
            expect(v.x).toBeCloseTo(expected6[i].x)
            expect(v.y).toBeCloseTo(expected6[i].y)
            expect(v.z).toBeCloseTo(expected6[i].z)
            expect(v.w).toBeCloseTo(expected6[i].w)
          },
        )
      } else {
        expectOr(
          () => expect(v).toEqual(expected[i]),
          () => expect(v).toEqual(expected2[i]),
          () => expect(v).toEqual(expected3[i]),
          () => expect(v).toEqual(expected4[i]),
          () => expect(v).toEqual(expected5[i]),
          () => expect(v).toEqual(expected6[i]),
        )
      }
    })

    totalPoints += 5
  })

  test('(5+12p) fragmentShader', () => {
    const data = [
      // only face 65494, face 65505 is view frustum culled
      { // 65494 i: 446 j: 0
        uv: new Vector(
          0.735543711183949, 0.8485618404868156, 0, 1),
        normal: new Vector(
          0.08176690482354261, -0.6731048899088585, 0.735012911761665, 0),
        x: new Vector(
          -630.2363408918961, 10.78247352784858, 404.25729603767536, 1),
        wantColor: [
          // world space normal solution
          [123.86119760687977, 116.05481960644617, 107.20759120595477],
          // camera space normal solution
          [119, 111.5, 103],
        ],
      },
      { // 65494 i: 446 j: 1
        uv: new Vector(
          0.7343479145806542, 0.8469274148439698, 0, 1),
        normal: new Vector(
          0.030727332142068745, -0.6375137870106233, 0.7698259559347195, 0),
        x: new Vector(
          -630.4037428008703, 11.63647775612575, 405.01295266619144, 1),
        wantColor: [
          [122.06824914755633, 114.37487210044144, 105.65571144704455],
          [119, 111.5, 103],
        ],
      },
      { // 65494 i: 447 j: 0
        uv: new Vector(
          0.7334294636975227, 0.8479434796694204, 0, 1),
        normal: new Vector(
          0.07814258208752269, -0.6528337100315652, 0.7534599418091961, 0),
        x: new Vector(
          -629.6178682006945, 11.641630193655983, 404.91664284959757, 1),
        wantColor: [
          [125.74002346460746, 117.81523206977926, 108.8338018223073],
          [119, 111.5, 103],
        ],
      },
    ]

    for (let i = 0; i < data.length; i++) {
      const got = r.fragmentShader(data[i].uv, data[i].normal, data[i].x)
      if (closeCheck) {
        got.forEach((v, idx) => {
          expectOr(
            () => expect(v < data[i].wantColor[0][idx]+15 &&
              v > data[i].wantColor[0][idx]-15).toEqual(true),
            () => expect(v < data[i].wantColor[1][idx]+15 &&
              v > data[i].wantColor[1][idx]-15).toEqual(true)
          )
        })
      } else {
        expectOr(
          () => expect(got).toEqual(data[i].wantColor[0]),
          () => expect(got).toEqual(data[i].wantColor[1])
        )
      }
    }

    totalPoints += 17
  })
})

