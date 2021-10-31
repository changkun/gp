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

material_base = bpy.data.materials.new(name="Material_Base")
material_base.diffuse_color = (0.491021, 0.412543, 0.313989, 1.0)
material_wireframe = bpy.data.materials.new(name="Material_Wireframe")
material_wireframe.diffuse_color = (0.165132, 0.114435, 0.068478, 1.0)

bpy.data.objects['Camera'].location = (-0.0253, 0.0853, 0.4853)
#bpy.data.objects['Camera'].rotation_euler = Euler((0.3, 0.3, 0.4), 'XYZ')

#ttc = bpy.data.objects['bunny'].constraints.new(type='TRACK_TO')
#ttc.target = bpy.data.objects['bunny']
#ttc.track_axis = 'TRACK_NEGATIVE_Z'
#ttc.up_axis = 'UP_Y'
#bpy.ops.view3d.camera_to_view_selected()
print(bpy.data.objects['Camera'].location)
bpy.data.objects['Camera'].location = bpy.data.objects['Camera'].location + mathutils.Vector((0,0,0.2))




# Bunny 3: Wireframe
bunny_3 = bpy.data.objects['bunny']
bunny_3.select_set(True)
bpy.context.view_layer.objects.active = bunny_3

bunny_3.data.materials.append(material_base)
bunny_3.data.materials.append(material_wireframe)
bunny_3.data.materials[0] = material_base # Why is necessary? I doesn't work without it
bunny_3.data.materials[1] = material_wireframe # Why is necessary? I doesn't work without it

bpy.ops.object.modifier_add(type="WIREFRAME")
bpy.context.object.modifiers["Wireframe"].thickness = 0.001
bpy.context.object.modifiers["Wireframe"].use_replace = False
bpy.context.object.modifiers["Wireframe"].material_offset = 1

# Bunny 4: Subdiv Wireframe
#bunny_4 = bunny_3.copy()
#bunny_4.location.x += 0.5 # Doesn't work for some reason
#bunny_4.location.y += 0.2
#bpy.ops.object.modifier_add(type="SUBSURF")




#bpy.data.objects['Camera'].location = (0.3367, -0.3550, 0.3416)
#bpy.ops.view3d.camera_fit_coords((0,0,0))
bpy.context.scene.render.film_transparent = True
bpy.context.scene.render.image_settings.color_mode = 'RGBA'

bpy.context.scene.render.filepath = '//assets/teaser.png'
bpy.ops.render.render(write_still = True)
