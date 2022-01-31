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

# Determines whether point is inside mesh
def insideMesh(point, mesh):
    _, closest, normal, _ = mesh.closest_point_on_mesh(point)
    p2 = closest-point
    v = p2.dot(normal)
    return not(v < 0.0)

# Converts from global to obj local coordinates
def localC(point, obj):
    return obj.matrix_world.inverted() @ point

# Converts from obj local to global coordinates
def globalC(point, obj):
    return obj.matrix_world @ point

# Gets all connected vert islands in verts and returns them separately as indices
def getIslands(verts):
    islands = []
    for vert in verts:
        island_verts = [vert]
        for i_vert in island_verts:
            for edge in i_vert.link_edges:
                v_other = edge.other_vert(i_vert)
                if v_other in verts and v_other not in island_verts:
                    island_verts.append(v_other)
                    verts.remove(v_other)
        islands.append(island_verts)
    islands_i = []
    for island in islands:
        island_indices = [v.index for v in island]
        islands_i.append(island_indices)
    return islands_i
                    
        
# Variables
delta_initial = 3.0
delta_increase = 0.1
delta = delta_initial

elasticity = 0.3
elasticity_factor = -0.2
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

dist_total = 0


for vert1_index in inside_verts:
    # Calculate the average normal of all hard object vertices that are inside the soft object
    len_delta = 0
    while len_delta < 1:
        # TODO: Only look at vertices of inside_vert_ho that are actually part of an island which pierces through the island of vert1. This would eliminate a lot of issues of setting a high delta value
        for vert2_index in inside_vert_ho:
            if (verts2[vert2_index] - verts1[vert1_index]).length < delta:
                normal = hardObject.data.vertices[vert2_index].normal
                average_displace = average_displace + normal
                len_delta = len_delta + 1
        if len_delta < 1:
            # Delta was not high enough
            delta = delta + delta_increase
    if len_delta > 0:
        average_displace = average_displace * (1 / len_delta)
        
        # Use this average to displace all soft object vertices inside the hard object
        vert1_global = verts1[vert1_index]
        vert1_local_ho = localC(vert1_global, hardObject)
        hit, hitloc, normal, index = hardObject.ray_cast(vert1_local_ho, average_displace)
        if hit:
            hitloc_local = localC(globalC(hitloc, hardObject), softObject)
            dist = (hitloc_local - softObject.data.vertices[vert1_index].co).length
            dist_total = dist_total + dist
            softObject.data.vertices[vert1_index].co = hitloc_local
    else:
        print("Delta was too small")
    delta = delta_initial
        

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
    if dist_min < elasticity:
        print(dist_min)
        move_dist = elasticity_factor * 1 / (1 + (dist_min-shortest_dist) * (dist_min-shortest_dist))
        normal = softObject.data.vertices[vert1_index].normal
        newPos = softObject.data.vertices[vert1_index].co + move_dist * normal
        softObject.data.vertices[vert1_index].co = newPos
        dist_total = dist_total - move_dist
        print(move_dist)
        #outside_verts.remove(vert1_index)
        
    else:
        inverse_square_sum += 1 / ( 1 + (dist_min-shortest_dist) * (dist_min-shortest_dist) )
    
x_fac = dist_total / inverse_square_sum # The factor by which the inverse square of each distance is multiplied so that the total is always dist_total

test = 0
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
    move_dist = x_fac * 1 / (1 + (dist_min-shortest_dist) * (dist_min-shortest_dist))
    test += move_dist
    #print(move_dist)
    normal = softObject.data.vertices[vert1_index].normal
    newPos = softObject.data.vertices[vert1_index].co + move_dist * normal
    softObject.data.vertices[vert1_index].co = newPos