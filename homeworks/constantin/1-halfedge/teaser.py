# This script reproduces the teaser picture for the Winter Semester
# 2021/22 Practical Geometry Processing at LMU Munich.
#
# Written based on Blender 2.93 API set.

# TODO:

import bpy

assets_directory='C:\\Users\\geier\\Desktop\\LMU_2022\\GeometryProcessing\\gp\\1-halfedge\\assets\\'

source_file_location=assets_directory+'bunny.obj'

#imported_object = bpy.ops.import_scene.obj(filepath=source_file_location)
#obj_object = bpy.context.selected_objects[0] ####<--Fix
#print('Imported name: ', obj_object.name)

bpy.ops.mesh.primitive_cube_add()

#bpy.context.scene.render.filepath = 'assets/bunny.obj'
#bpy.context.scene.render.resolution_x = w #perhaps set resolution in code
#bpy.context.scene.render.resolution_y = h
#bpy.ops.render.render()


#scene=bpy.context.scene
#scene.render.image_settings.file_format='BMP'
#image.save_render("assets/lol.png",scene)

bpy.context.scene.render.engine = 'BLENDER_WORKBENCH'

scene=bpy.context.scene

scene.render.image_settings.file_format='PNG'
scene.render.filepath=assets_directory+'hmm.png'

print("Before write");

#bpy.ops.render.render()
#bpy.ops.render.write(write_still=True)

print("Done");