# This script reproduces the teaser picture for the Winter Semester
# 2021/22 Practical Geometry Processing at LMU Munich.
#
# Written based on Blender 2.93 API set.

import bpy
import mathutils

bpy.data.objects['Cube'].select_set(True)
print(bpy.data.objects['Cube'].location)
bpy.ops.object.delete() 

file_loc = 'assets\\bunny.obj'
imported_object = bpy.ops.import_scene.obj(filepath=file_loc)
obj_object = bpy.context.object

bpy.data.objects['bunny'].location = (0,0,0)
bpy.data.objects['Camera'].rotation_euler = (0, 0, 0)
bpy.data.objects['bunny'].rotation_euler = (0, 0, 0)

#bpy.data.objects['Camera'].location = (0,5,0)
#bpy.data.objects['Camera'].rotation_euler = Euler((0.3, 0.3, 0.4), 'XYZ')

#ttc = bpy.data.objects['bunny'].constraints.new(type='TRACK_TO')
#ttc.target = bpy.data.objects['bunny']
#ttc.track_axis = 'TRACK_NEGATIVE_Z'
#ttc.up_axis = 'UP_Y'
bpy.ops.view3d.camera_to_view_selected()
print(bpy.data.objects['Camera'].location)
bpy.data.objects['Camera'].location = bpy.data.objects['Camera'].location + mathutils.Vector((0,0,0.2))

bpy.data.objects['bunny'].select_set(True)
bpy.context.view_layer.objects.active = bpy.data.objects['bunny']
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.mark_freestyle_edge(clear=False)
#bpy.data.objects['Camera'].location = (0.3367, -0.3550, 0.3416)
#bpy.ops.view3d.camera_fit_coords((0,0,0))
bpy.context.scene.render.film_transparent = True
bpy.context.scene.render.image_settings.color_mode = 'RGBA'

bpy.context.scene.render.use_freestyle = True

bpy.context.scene.view_layers["View Layer"].freestyle_settings.linesets["LineSet"].select_edge_mark = True

bpy.context.scene.render.filepath = '//assets/teaser.png'
bpy.ops.render.render(write_still = True)