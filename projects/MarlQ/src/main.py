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
        closest_point_on_tri)

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
vert1 = [mat1 @ v.co for v in softObject.data.vertices] 
poly1 = [p.vertices for p in softObject.data.polygons]

vert2 = [mat2 @ v.co for v in hardObject.data.vertices] 
poly2 = [p.vertices for p in hardObject.data.polygons]

# Create the BVH trees
depsgraph = bpy.context.evaluated_depsgraph_get()
bvh1 = BVHTree.FromPolygons( vert1, poly1 )
bvh2 = BVHTree.FromPolygons( vert2, poly2 )

# Overlapping vertices (list of index pairs, first belongs to the soft object, the other to the hard object)
overlap = bvh1.overlap(bvh2)

print(overlap)

# FIXME: objects don't overlap
# FIXME: all vertices overlap

for i in overlap:
    print(i)
    face1 = poly1[i[0]]
    face2 = poly2[i[1]]
    face1_verts = [(vert1[vi], vi) for vi in face1]
    face2_verts = [vert2[vi] for vi in face2]
    print(face2_verts)
    
    for vert in face1_verts:
        print(vert)

        (result, location, normal, index) = hardObject.closest_point_on_mesh(vert[0])
        print(result)
        print(location)
        print(normal)
        print(index)
        
        if result:
            loc_global = hardObject.matrix_world @ location
            loc_local = softObject.matrix_world.inverted() @ loc_global
            softObject.data.vertices[vert[1]].co = loc_local

        # FIXME: This only works for triangles
        """ plane_co = face2_verts[0]
        plane_no = (face2_verts[2] - face2_verts[0]).cross(face2_verts[1] - face2_verts[0]).normalized()
        dist = distance_point_to_plane(vert[0],plane_co,plane_no)
        
        if dist < 0: # vert is overlapping
            closest = closest_point_on_tri(vert[0], face2_verts[0], face2_verts[1], face2_verts[2])
            print(dist)
            print(closest)
            softObject.data.vertices[vert[1]].co = closest """
    # TODO: Get overlapping verts of face1
    # TODO: Get overlapping distance between vert and face2
    # TODO: Move vert along face2 normal by distance
    
