import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import (
        distance_point_to_plane,
        closest_point_on_tri,
        normal)
from math import pi, acos, inf, sqrt, exp
from numpy import log as ln

# DEPRECATED: Determines whether point is inside mesh (deprecated, too many false positives)
def insideMesh(point, mesh):
    _, closest, normal, _ = mesh.closest_point_on_mesh(point)
    p2 = closest-point
    v = p2.dot(normal)
    return not(v < 0.0)

# Determines whether point is inside mesh (by raycasting)
def is_inside(point, ob):
    axes = [ Vector((1,0,0)) , Vector((0,1,0)), Vector((0,0,1))  ]
    outside = False
    for axis in axes:
        orig = point
        count = 0
        while True:
            _,location,normal,index = ob.ray_cast(orig,orig+axis*10000.0)
            if index == -1: break
            count += 1
            orig = location + axis*0.00001
        if count%2 == 0:
            outside = True
            break
    return not outside

# Converts from global to obj local coordinates
def localC(point, obj):
    return obj.matrix_world.inverted() @ point

# Converts from obj local to global coordinates
def globalC(point, obj):
    return obj.matrix_world @ point

# Gets all connected vert islands in verts and returns them separately as indices
# Currently unused, because I haven't found a way to determine which islands "belong together"
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
                    
# Determines all the verts1 that are connected to any vert from verts2
def determineBoundaryVerts(verts1, verts2, edges):
    boundaryVerts = []
    searchEdges = [e for e in edges if e.vertices[0] in verts1 or e.vertices[1] in verts1]
    for edge in searchEdges:
        if edge.vertices[0] in verts2:
            boundaryVerts.append(edge.vertices[1])
        elif edge.vertices[1] in verts2:
            boundaryVerts.append(edge.vertices[0])
    return boundaryVerts

# Depresses all verts in overlap_verts_s (in softObject) onto the verts in overlap_verts_h (in hardObject)
def indentationFunction(overlap_verts_s, softObject, overlap_verts_h, hardObject, delta_initial, verts1, verts2, displace_increase, sk):
    dist_total = 0
    for vert1_index in overlap_verts_s:
        # Calculate the average normal of all hard object vertices that are inside the soft object
        len_delta = 0
        delta = delta_initial
        average_displace = Vector((0.0, 0.0, 0.0))
        while len_delta < 1:
            # TODO: Only look at vertices of inside_vert_ho that are actually part of an island which pierces through the island of vert1. This would eliminate a lot of issues of setting a high delta value
            for vert2_index in overlap_verts_h:
                if (verts2[vert2_index] - verts1[vert1_index]).length < delta:
                    normal = hardObject.data.vertices[vert2_index].normal
                    average_displace = average_displace + normal
                    len_delta = len_delta + 1
            if len_delta < 1:
                # Delta was not high enough
                delta = delta + delta_increase
            if delta > 100:
                print("Error: no overlapping vertices. Aborting.")
                break
        if len_delta > 0:
            average_displace = average_displace * (1 / len_delta)
            
            # Use this average to displace all soft object vertices inside the hard object
            vert1_global = verts1[vert1_index]
            vert1_local_ho = localC(vert1_global, hardObject)
            hit, hitloc, normal, index = hardObject.ray_cast(vert1_local_ho, average_displace)
            if hit:
                hitloc_local = localC(globalC(hitloc, hardObject), softObject)
                hitloc_local = hitloc_local + displace_increase * normal
                dist = (hitloc_local - sk.data[vert1_index].co ).length
                dist_total = dist_total + dist
                #softObject.data.vertices[vert1_index].co = hitloc_local
                sk.data[vert1_index].co = hitloc_local
    return dist_total

# Finds the mininum distances between each vert from verts1_i and verts2_i
def minimumDistances(verts1_i, verts2_i, verts, object):
    minDist = {}
    for vert1_index in verts1_i:
        vert1 = localC(verts[vert1_index], object)
        dist_min = inf
        closest_vert = vert1_index
        for vert2_index in verts2_i:
            vert2 = localC(verts[vert2_index], object)
            dist = (vert1 - vert2).length
            if dist < dist_min:
                dist_min = dist
                closest_vert = vert2_index
        minDist[vert1_index] = dist_min
    return minDist  

# Function to describe the sink-in around the indentation. 
# Goes from 1 at x = 0, to 0 at x = sinkinRange
# Almost linear for b values above 2, but very smooth for small b.
def sinkinFunction(x, sinkinRange, smoothness):
    b = -2.999 * smoothness + 3 # Maps values from 0 to 1 to values from 3 to 0.001
    #b = 0.01
    a = 1 + b
    return a * exp( ln(b/a) * x / sinkinRange ) - b

#Function to describe the volume distribution
# Goes smoothly from 0 at x = 0, to 1 at x = volumeRamp, then remains constant
def volumeFunction(x, volumeRamp):
    
    if x < volumeRamp:
        a = - 1 / (volumeRamp * volumeRamp)
        return a * (x - volumeRamp) * (x - volumeRamp) + 1
    else:
        return 1
    
    
def deform(from_mix=False, displace_increase=0.02, sinkin_smoothness=0.95, sinkin_range=1.2, calculate_sinkin_range=True, delta_initial=5.0, delta_increase=0.1, volume_preservation=1.0, volume_ramp=0.8):

    delta = delta_initial
    add_overlap = False

    # Prepare objects
    softObject = bpy.context.object
    hardObject = set(bpy.context.selected_objects).difference(set([softObject])).pop()
    decimate = hardObject.modifiers.new("SOD_DECIMATE", "DECIMATE")
    decimate.decimate_type = "DISSOLVE"
    decimate.angle_limit = 0.017453

    print("Creating shape keys")
    if softObject.data.shape_keys is None or len(softObject.data.shape_keys.key_blocks) < 1:
        sk_basis = softObject.shape_key_add(name='Basis',from_mix=False)
        #sk_basis.interpolation = 'KEY_LINEAR'
    softObject.data.shape_keys.use_relative = True

    # create new shape key
    sk = softObject.shape_key_add(name='Deform',from_mix=from_mix)
    #sk.interpolation = 'KEY_LINEAR'
    sk.slider_min = 0.0
    sk.slider_max = 1.0
    sk.value = 1.0

    # Get the verts and faces in world coordinates
    print("Getting object data.")

    mat1 = softObject.matrix_world
    mat2 = hardObject.matrix_world

    verts1 = [mat1 @ v.co for v in sk.data]
    poly1 = [p.vertices for p in softObject.data.polygons]

    ho_mesh = hardObject.to_mesh()

    verts2 = [mat2 @ v.co for v in hardObject.data.vertices]
    poly2 = [p.vertices for p in hardObject.data.polygons]

    # Vertices of soft object inside hard object
    inside_verts = set([i for i in range(len(verts1)) if is_inside( localC(verts1[i], hardObject), hardObject)])
    inside_vert_ho = set([i for i in range(len(verts2)) if insideMesh( localC(verts2[i], softObject), softObject)])

    # Overlapping vertices (list of index pairs, first belongs to the soft object, the other to the hard object)
    if add_overlap:
        # Create the BVH trees
        depsgraph = bpy.context.evaluated_depsgraph_get()
        bvh1 = BVHTree.FromPolygons( verts1, poly1 )
        bvh2 = BVHTree.FromPolygons( verts2, poly2 )
        overlap = bvh1.overlap(bvh2)
        for [v,_] in overlap:
            inside_verts.add(v)
        
    inside_verts_new = inside_verts

    outside_verts = set([i for i in range(len(verts1)) if i not in inside_verts])

    boundaryVerts_so = set(determineBoundaryVerts(inside_verts, outside_verts, softObject.data.edges))


    dist_total = 0

    """ This code was supposed to first add some of the most important features of the hard object, but did not look good.
    For this to work, it would have to be a lot more complicated...

    boundaryVerts_so_copy = boundaryVerts_so.copy()
    inside_verts_new = inside_verts.copy()
    print(inside_verts_new)
    print(boundaryVerts_so)
    for vert2_index in inside_vert_ho:
        if len(boundaryVerts_so_copy) > 0:
            vert2 = localC(verts2[vert2_index], softObject)
            dist_min = inf
            closest_vert = vert2
            for vert1_index in boundaryVerts_so_copy:
                vert1 = localC(verts1[vert1_index], softObject)
                dist = (vert1 - vert2).length
                if dist < dist_min:
                    dist_min = dist # TODO: Save these for later
                    closest_vert = vert1_index
            sk.data[closest_vert].co = localC(verts2[vert2_index], softObject)
            dist_total = dist_total + dist_min
            inside_verts_new.remove(closest_vert)
            boundaryVerts_so_copy.remove(closest_vert)

        
    print(inside_verts_new)
    """

    # STEP 1: Find overlapping faces, and displace vertices so that they no longer overlap

    print("Displacing verts")
    dist_total = dist_total + indentationFunction(inside_verts_new, softObject, inside_vert_ho, hardObject, delta_initial, verts1, verts2, displace_increase, sk)

    # STEP 2: Calculate sink-in (and prepare for volume displacement)

    # Calculate shortest distance between an inside and an outside vert
    print("Getting the shortest distance")
    minDist = minimumDistances(outside_verts, boundaryVerts_so, verts1, softObject)

    shortest_dist = inf
    for dist in minDist.values():
        if dist < shortest_dist:
                shortest_dist = dist

    if calculate_sinkin_range:
        sinkin_range = sqrt(dist_total / len(inside_verts_new) )

    print("Getting volume factor and adding sink-in")
    volume_sum = 0
    for vert1_index in outside_verts.copy():
        vert1 = localC(verts1[vert1_index], softObject)
        dist_min = inf
        closest_vert = vert1_index
        for vert2_index in boundaryVerts_so:
            vert2 = localC(verts1[vert2_index], softObject)
            dist = (vert1 - vert2).length
            if dist < dist_min:
                dist_min = dist
                closest_vert = vert2_index
        if dist_min <= sinkin_range:
            # Apply sink-in function
            closest_vert_move = (sk.data[closest_vert].co - sk.relative_key.data[closest_vert].co)

            move_dist = sinkinFunction(dist_min,sinkin_range, sinkin_smoothness) 
            
            newPos = sk.data[vert1_index].co  + move_dist * closest_vert_move
            sk.data[vert1_index].co = newPos
            outside_verts.remove(vert1_index)
            
        else:
            # Otherwise prepare calculation for the volume preservation
            volume_sum += volumeFunction(dist_min-sinkin_range, volume_ramp)
    
    # STEP 3: Add the lost volume back
    if volume_preservation > 0:
        dist_total = dist_total * volume_preservation
        volume_fac = dist_total / volume_sum # The factor by which the volume function is multiplied so that the total is always dist_total
        print("Adding back volume")

        for vert1_index in outside_verts:
            vert1_global = verts1[vert1_index]
            vert1 = localC(verts1[vert1_index], softObject)
            dist_min = minDist[vert1_index]

            move_dist = volume_fac * volumeFunction(dist_min-sinkin_range, volume_ramp)

            normal = softObject.data.vertices[vert1_index].normal
            newPos = sk.data[vert1_index].co + move_dist * normal
            sk.data[vert1_index].co = newPos

    hardObject.modifiers.remove(decimate)