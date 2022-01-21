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

# STEP 1: Find overlapping faces, and displace vertices so that they no longer overlap

# Get the verts and faces in world coordinates
mat1 = softObject.matrix_world
mat2 = hardObject.matrix_world

verts1 = [mat1 @ v.co for v in softObject.data.vertices] 
poly1 = [p.vertices for p in softObject.data.polygons]

verts2 = [mat2 @ v.co for v in hardObject.data.vertices] 
poly2 = [p.vertices for p in hardObject.data.polygons]

# Vertices of soft object inside hard object
inside_verts = [i for i in range(len(verts1)) if insideMesh( localC(verts1[i], hardObject), hardObject)]
average_displace = Vector((0.0, 0.0, 0.0))

inside_vert_ho = [i for i in range(len(verts2)) if insideMesh( localC(verts2[i], softObject), softObject)]


# Calculate the average normal of all hard object vertices that are inside the soft object
for vert2_index in inside_vert_ho:
    normal = hardObject.data.vertices[vert2_index].normal
    average_displace = average_displace + normal
    
average_displace = average_displace * (1 / len(inside_verts))
dist_total = 0

# Use this average to displace all soft object vertices inside the hard object
for vert1_index in inside_verts:
    vert1_global = verts1[vert1_index]
    vert1_local_ho = localC(vert1_global, hardObject)
    hit, hitloc, normal, index = hardObject.ray_cast(vert1_local_ho, average_displace)
    if hit:
        hitloc_local = localC(globalC(hitloc, hardObject), softObject)
        dist = (hitloc_local - softObject.data.vertices[vert1_index].co).length
        dist_total = dist_total + dist
        softObject.data.vertices[vert1_index].co = hitloc_local

# FIXME: objects don't overlap
# FIXME: all vertices overlap

# STEP 2: Add the lost volume back
outside_verts = [i for i in range(len(verts1)) if i not in inside_verts]

# Calculate shortest distance between an inside and an outside vert
shortest_dist = inf
for vert1_index in inside_verts:
    vert1 = localC(verts1[vert1_index], softObject)
    for vert2_index in outside_verts:
        vert2 = localC(verts1[vert2_index], softObject)
        dist = (vert1 - vert2).length

        if dist < shortest_dist:
            shortest_dist = dist

inverse_square_sum = 0
for vert1_index in outside_verts:
    vert1 = localC(verts1[vert1_index], softObject)
    dist_min = inf
    for vert2_index in inside_verts:
        vert2 = localC(verts1[vert2_index], softObject)
        dist = (vert1 - vert2).length
        if dist < dist_min:
            dist_min = dist # TODO: Save these for later
    inverse_square_sum += 1 / ( shortest_dist + dist_min * dist_min )
    
x_fac = dist_total / inverse_square_sum # The factor by which the inverse square of each distance is multiplied so that the total is always dist_total
print(x_fac)

for vert1_index in outside_verts:
    vert1_global = verts1[vert1_index]
    vert1 = localC(verts1[vert1_index], softObject)
    dist_min = inf
    for vert2_index in inside_verts:
        vert2 = localC(verts1[vert2_index], softObject)
        dist = (vert1 - vert2).length
        if dist < dist_min:
            dist_min = dist # TODO: Save these for later
    #print(dist_min)
    move_dist = x_fac * 1 / (shortest_dist + dist_min * dist_min)
    #print(move_dist)
    normal = softObject.data.vertices[vert1_index].normal
    newPos = softObject.data.vertices[vert1_index].co + move_dist * normal
    softObject.data.vertices[vert1_index].co = newPos