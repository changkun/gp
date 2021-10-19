// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by Changkun Ou <https://changkun.de>.
//
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

export function approxEqual(v1: number, v2: number, epsilon = 1e-7): boolean {
  return Math.abs(v1 - v2) <= epsilon;
}
