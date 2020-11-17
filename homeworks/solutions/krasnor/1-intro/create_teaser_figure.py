### tested with blender 2.90.1 ###############################
# Read before script execution:
# - asset paths must be adjusted before script execution!
# - if there is a Object called cube in the scene it will be deleted

# Notes: 
# - by default transparency does not work with Eevee renderer
# - the first bunny (dots) will only be rendered at Frame 1
# - model import may take some time, during this time blender is not responsive
# - modifiers are not applied so can still be altered inside blender


import bpy
import bmesh
import mathutils
import math

assetDirectory =  '..path.to.assets..\\gp-ws2021\\homeworks\\1-intro\\assets' # TODO adjust to your system before execution!
filepath_bunny_tri  = assetDirectory + '\\bunny_tri.obj'
filepath_bunny_quad = assetDirectory + '\\bunny_quad.obj'
filepath_bunny_tex  = assetDirectory + '\\texture.jpg'

#filepath_bunny_tri  = bpy.path.abspath('//assets\\bunny_tri.obj') # convert relative paths into absolute paths, does not work for unsaved .blend projects
#filepath_bunny_quad = bpy.path.abspath('//assets\\bunny_quad.obj')
#filepath_bunny_tex  = bpy.path.abspath('//assets\\texture.jpg')


### set up needed materials
if assetDirectory.startswith('..path.to.assets..'):
	print('Please set a path to the assets')
else:
	print('# preparing materials #################################')
	mat_white = bpy.data.materials.new(name="mat_base")
	mat_white.diffuse_color = (1, 1, 1, 1)

	mat_base = bpy.data.materials.new(name="mat_base")
	mat_base.diffuse_color = (0.752942, 0.597202, 0.47932, 1)

	mat_highlight = bpy.data.materials.new(name="mat_highlight")
	mat_highlight.diffuse_color = (0.491021, 0.366253, 0.274677, 1)

	mat_alpha = bpy.data.materials.new(name="mat_alpha")
	mat_alpha.diffuse_color = (0,0,0,0)
	mat_alpha.use_nodes = True
	print(mat_alpha.node_tree.nodes)
	math_alpha_nodes = mat_alpha.node_tree.nodes
	for node in math_alpha_nodes:
		math_alpha_nodes.remove(node)
	math_alpha_links = mat_alpha.node_tree.links
	math_alpha_node_output  = math_alpha_nodes.new(type='ShaderNodeOutputMaterial')
	math_alpha_node_output.location = 400,0
	math_alpha_node_transparent  = math_alpha_nodes.new(type='ShaderNodeBsdfTransparent')
	math_alpha_node_transparent.location = 0,0
	math_alpha_node_transparent.inputs[0].default_value = (1,1,1,0) # transparent bsdf seems not to have a separate public field for the alpha-factor

	link = math_alpha_links.new(math_alpha_node_transparent.outputs['BSDF'], math_alpha_node_output.inputs['Surface'])

	mat_textured = bpy.data.materials.new(name="mat_bunny_texture")
	mat_textured.use_nodes = True
	bsdf = mat_textured.node_tree.nodes["Principled BSDF"]
	texImage = mat_textured.node_tree.nodes.new('ShaderNodeTexImage')
	texImage.image = bpy.data.images.load(filepath_bunny_tex)
	mat_textured.node_tree.links.new(bsdf.inputs['Base Color'], texImage.outputs['Color'])


	### prepare scene
	print('# Preparing scene #####################################')
	# set rendering resolution and position camera
	bpy.context.scene.render.engine = 'CYCLES'
	bpy.context.scene.render.resolution_x = 3647
	bpy.context.scene.render.resolution_y = 757

	obj_camera = bpy.context.scene.camera
	obj_camera.location = (0.10, -2.1, 0.3856)
	obj_camera.rotation_euler = mathutils.Euler((math.radians(82), 0, math.radians(3.69)), 'XYZ')

	# add plane
	bpy.ops.mesh.primitive_plane_add(size=40, enter_editmode=False, align='WORLD', location=(0, 0, 0), scale=(1, 1, 1))
	obj_plane = bpy.context.active_object
	obj_plane.data.materials.append(mat_white)

	# remove the default cube
	if 'Cube' in bpy.data.objects:
		obj_default_cube = bpy.data.objects['Cube']
		bpy.data.objects.remove(obj_default_cube, do_unlink=True)


	### Bunny - dots
	print('# (1/5) creating dots figure ##########################')
	bpy.ops.mesh.primitive_ico_sphere_add(enter_editmode=False, align='WORLD', location=(-0.6, 0, -0.03), scale=(0.04, 0.04, 0.04))
	dots_sphere = bpy.context.active_object
	dots_sphere.data.materials.append(mat_base)

	bpy.ops.object.shade_smooth() # shade the little spheres smooth

	import_state = bpy.ops.import_scene.obj(filepath=filepath_bunny_tri)
	bunny_dots_obj = bpy.context.selected_objects[0]
	bunny_dots_obj.name = 'bunny_dots'
	bunny_dots_obj.location.x += -0.6

	dots_particleSystem_mod = bunny_dots_obj.modifiers.new("",'PARTICLE_SYSTEM')
	dots_particleSystemSettings = bunny_dots_obj.particle_systems[0].settings
	print(dots_particleSystemSettings)

	#dots_particleSystemSettings.emit_from = 'FACE'
	dots_particleSystemSettings.count = 6000
	dots_particleSystemSettings.render_type = 'OBJECT'
	dots_particleSystemSettings.instance_object = dots_sphere
	dots_particleSystemSettings.frame_start = 1
	dots_particleSystemSettings.frame_end = 1
	dots_particleSystemSettings.physics_type = 'NO'


	bunny_dots_obj.data.materials[0] = mat_alpha


	### Bunny - voxel
	print('# (2/5) creating voxel figure #########################')
	import_state = bpy.ops.import_scene.obj(filepath=filepath_bunny_tri)
	bunny_voxel_obj = bpy.context.selected_objects[0]
	bunny_voxel_obj.name = 'bunny_voxel'
	bunny_voxel_obj.location.x += -0.3

	voxel_remesh_mod = bunny_voxel_obj.modifiers.new("",'REMESH')
	voxel_remesh_mod.mode = 'BLOCKS'
	voxel_remesh_mod.octree_depth = 6
	voxel_remesh_mod.scale = 0.990

	bunny_voxel_obj.data.materials[0] = mat_base


	### Bunny - triangles
	print('# (3/5) creating tris figure ##########################')
	import_state = bpy.ops.import_scene.obj(filepath=filepath_bunny_tri)
	bunny_tris_obj = bpy.context.selected_objects[0]
	bunny_tris_obj.name = 'bunny_triangulated'
	bunny_tris_obj.location.x += 0

	bpy.ops.object.shade_flat()

	tris_decimate_mod = bunny_tris_obj.modifiers.new("",'DECIMATE')
	tris_decimate_mod.decimate_type = 'COLLAPSE'
	tris_decimate_mod.ratio = 0.0050

	tris_wireframe_mod = bunny_tris_obj.modifiers.new("",'WIREFRAME')
	tris_wireframe_mod.thickness = 0.001
	tris_wireframe_mod.offset = 0
	tris_wireframe_mod.material_offset = 1
	tris_wireframe_mod.use_replace = False
	tris_wireframe_mod.use_even_offset = False

	bunny_tris_obj.data.materials[0] = mat_base
	bunny_tris_obj.data.materials.append(mat_highlight)


	### Bunny - quads
	print('# (4/5) creating quads figure #########################')
	import_state = bpy.ops.import_scene.obj(filepath=filepath_bunny_quad)
	bunny_quads_obj = bpy.context.selected_objects[0]
	bunny_quads_obj.name = 'bunny_quads'
	bunny_quads_obj.location.x += 0.3

	# first uploaded mesh needed to be unsubdivided
	#quad_decimate_mod = bunny_quads_obj.modifiers.new("",'DECIMATE')
	#quad_decimate_mod.decimate_type = 'UNSUBDIV'
	#quad_decimate_mod.iterations = 2

	quad_wireframe_mod = bunny_quads_obj.modifiers.new("",'WIREFRAME')
	quad_wireframe_mod.thickness = 0.001
	quad_wireframe_mod.offset = 0
	quad_wireframe_mod.material_offset = 1
	quad_wireframe_mod.use_replace = False
	quad_wireframe_mod.use_even_offset = False

	bunny_quads_obj.data.materials[0] = mat_base
	bunny_quads_obj.data.materials.append(mat_highlight)


	#### Bunny - textured
	print('# (5/5) creating textured figure ######################')
	import_state = bpy.ops.import_scene.obj(filepath=filepath_bunny_tri)
	bunny_textured_obj = bpy.context.selected_objects[0]
	bunny_textured_obj.name = 'bunny_textured'
	bunny_textured_obj.location.x += 0.6

	bunny_textured_obj.data.materials[0] = mat_textured


	### END
	print('# Done creating teaser figures #######################')



