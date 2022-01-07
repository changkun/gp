# Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
# Created by Changkun <https://changkun.de>.
#
# Use of this source code is governed by a GNU GPLv3 license that can be found
# in the LICENSE file.

# This file serves as a demonstration of source code files.
import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import (
        distance_point_to_plane,
        closest_point_on_tri,
        normal)
from math import pi, acos, inf


def insideMesh(point, mesh):
    _, closest, normal, _ = mesh.closest_point_on_mesh(point)
    p2 = closest-point
    v = p2.dot(normal)
    return not(v < 0.0)

def localC(point, obj):
    return obj.matrix_world.inverted() @ point

def globalC(point, obj):
    return obj.matrix_world @ point

# TODO: Multiple hard objects

softObject = bpy.context.object
hardObject = set(bpy.context.selected_objects).difference(set([softObject])).pop()

# FIXME: Not enough objects selected

print(softObject)

# STEP 1: Find overlapping faces, and displace vertices so that they no longer overlap

# Get their world matrix
mat1 = softObject.matrix_world
mat2 = hardObject.matrix_world

# Get the geometry in world coordinates
verts1 = [mat1 @ v.co for v in softObject.data.vertices] 
poly1 = [p.vertices for p in softObject.data.polygons]

verts2 = [mat2 @ v.co for v in hardObject.data.vertices] 
poly2 = [p.vertices for p in hardObject.data.polygons]

# Create the BVH trees
depsgraph = bpy.context.evaluated_depsgraph_get()
bvh1 = BVHTree.FromPolygons( verts1, poly1 )
bvh2 = BVHTree.FromPolygons( verts2, poly2 )

# Overlapping vertices (list of index pairs, first belongs to the soft object, the other to the hard object)


# IDEA
# Find overlap of hard with soft
overlap = bvh2.overlap(bvh1)
overlap_fi = list(dict.fromkeys([i1 for (i1, i2) in overlap]))
print(overlap_fi)

for j in range(len(verts1)):
    vert1_global = verts1[j]
    vert1_local_ho = hardObject.matrix_world.inverted() @ vert1_global
    # For each inside vert:
    if insideMesh(vert1_local_ho, hardObject):
        # Find closest face of overlap to inside vert
        dist_min = inf
        closest_min = Vector((0.0, 0.0, 0.0))
        for face2_index in overlap_fi:
            face2 = poly2[face2_index]
            f2_v1, f2_v2, f2_v3 = localC(verts2[face2[0]], hardObject), localC(verts2[face2[1]], hardObject), localC(verts2[face2[2]], hardObject)
            dist = abs(distance_point_to_plane(vert1_local_ho, f2_v1, normal(f2_v1, f2_v2, f2_v3)))
            if dist < dist_min:
                dist_min = dist
                closest = closest_point_on_tri(vert1_local_ho, f2_v1, f2_v2, f2_v3)
                closest_min = closest
        closest_so = localC(globalC(closest_min, hardObject), softObject)
        softObject.data.vertices[j].co = closest_so



#   Displace inside vert along face normal by distance


# FIXME: objects don't overlap
# FIXME: all vertices overlap
    
