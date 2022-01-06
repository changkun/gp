# Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
# Created by Changkun <https://changkun.de>.
#
# Use of this source code is governed by a GNU GPLv3 license that can be found
# in the LICENSE file.

# This file serves as a demonstration of source code files.
import bmesh
import bpy
import mathutils

softObject = bpy.context.object
hardObjects = set(bpy.context.selected_objects).difference(set([softObject]))

softObject_verts = bmesh.from_edit_mesh(softObject.data).verts

