# This script reproduces the teaser picture for the Winter Semester
# 2020/21 Practical Geometry Processing at LMU Munich
#
# Written based on Blender 2.90.1 API set.
#
# Copyright 2020 Changkun Ou <https://changkun.de>. All rights reserved.
# Use of this source code is governed by a GNU GLPv3 license that can be
# found in the LICENSE file.

import os
import time
import random
import string
import math
import bpy
import bmesh

def random_str() -> str:
    return ''.join(random.choice(string.ascii_lowercase) for i in range(7))

def init_scene():
    """init initializes an empty scene for subsequent operations.
    """
    # read from homefile and clear all objects.
    bpy.ops.wm.read_homefile()
    bpy.ops.object.select_all(action = 'SELECT')
    bpy.ops.object.delete()

def init_renderer():
    """init_renderer initializes the settings for rendering engine.
    """
    # setup cycles as rendering engine
    bpy.context.scene.render.engine           = 'CYCLES'
    bpy.context.scene.render.film_transparent = True
    bpy.context.scene.cycles.samples          = 128 
    bpy.context.scene.cycles.max_bounces      = 6
    bpy.context.scene.cycles.film_exposure    = 1.5
    bpy.data.scenes[0].view_layers['View Layer']['cycles']['use_denoising'] = 1

    # setup rendering devices
    p = bpy.context.preferences.addons['cycles'].preferences
    p.compute_device_type = 'CUDA'
    for dev in p.devices:
        dev.use = True
        if dev.type == 'CPU':
            dev.use = False
    bpy.context.scene.cycles.device = 'GPU'
    for dev in p.devices:
        print(f'{dev}: {dev.use}')

    # set scene aspect & render resolution
    bpy.data.scenes['Scene'].render.resolution_x   = 2000
    bpy.data.scenes['Scene'].render.resolution_y   = 500
    bpy.data.scenes['Scene'].render.resolution_percentage = 200
    bpy.data.scenes['Scene'].render.pixel_aspect_x = 1.0
    bpy.data.scenes['Scene'].render.pixel_aspect_y = 1.0

def import_obj(filepath: str) -> bpy.types.Object:
    """import_obj loads an .obj file from the given file path.
    """
    # workaround: import mesh object from an .obj file is painful,
    # one must record all existing objects to determine what was
    # added after the import action.
    before = [bpy.data.objects[i].name for i in range(len(list(bpy.data.objects)))]

    bpy.ops.import_scene.obj(filepath=filepath)

    after  = [bpy.data.objects[i].name for i in range(len(list(bpy.data.objects)))]
    return bpy.data.objects[list(set(after) - set(before))[0]]

def duplicate(o: bpy.types.Object) -> bpy.types.Object:
    oo = bpy.data.objects.new(random_str(), o.data.copy())
    bpy.context.scene.collection.objects.link(oo)
    return oo

def apply_modifiers(o: bpy.types.Object):
    bpy.context.view_layer.objects.active = o
    for m in o.modifiers:
        print(f'{m.name}, status: {bpy.ops.object.modifier_apply(modifier=m.name)}')

def decimate(o: bpy.types.Object, ratio: float) -> bpy.types.Object:
    """decimate applies decimate modifier to the given mesh with respect
    to the given ratio. This function will create a new object and the 
    object will be named with an additional suffix `_decimated`.
    """
    oo = bpy.data.objects.new(o.name+'_decimated', o.data.copy())
    bpy.context.scene.collection.objects.link(oo)

    m  = oo.modifiers.new(name=random_str(), type='DECIMATE')
    m.decimate_type = 'COLLAPSE'
    m.ratio         = ratio
    apply_modifiers(oo)

    return oo


def voxelization(o: bpy.types.Object) -> bpy.types.Object:
    """voxelization remeshes the given mesh to a voxel-like mesh
    """
    oo = bpy.data.objects.new(o.name+'_voxel', o.data.copy())
    bpy.context.scene.collection.objects.link(oo)

    v  = oo.modifiers.new(name='voxel', type='REMESH')
    v.mode         = 'BLOCKS'
    v.octree_depth = 5
    v.scale        = 0.9
    apply_modifiers(oo)

    return oo

def wireframe(o: bpy.types.Object, thickness: float) -> bpy.types.Object:
    """add_wireframe creates a wireframe object for the given mesh object.
    """
    oo = bpy.data.objects.new(o.name+'_wireframe', o.data.copy())
    bpy.context.scene.collection.objects.link(oo)

    w = oo.modifiers.new(name='wireframe', type='WIREFRAME')
    w.thickness           = thickness
    w.use_relative_offset = True
    w.use_replace         = True
    apply_modifiers(oo)

    return oo

def render(fpath: str, camera: bpy.types.Object):
    """render renders the current scene.
    """
    bpy.data.scenes['Scene'].render.filepath = fpath
    bpy.data.scenes['Scene'].camera          = camera
    bpy.ops.render.render(write_still = True)

def create_material_texture(tex_path: str) -> bpy.types.Material:
    mat = bpy.data.materials.new(random_str())
    mat.use_nodes = True
    tree = mat.node_tree

    # add principled bsdf shader
    p = tree.nodes['Principled BSDF']
    p.inputs['Roughness'].default_value = 1.0
    p.inputs['Sheen Tint'].default_value = 0

    # link texture as color input to the principled bsdf shader
    tex = tree.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(os.path.abspath(tex_path))
    tree.links.new(tex.outputs['Color'], p.inputs['Base Color'])
    return mat

def create_material_color(color: [float, float, float, float]) -> bpy.types.Material:
    mat = bpy.data.materials.new(random_str())
    mat.use_nodes = True
    tree = mat.node_tree

    # add a color only principled bsdf shader
    tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = color
    tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.7
    tree.nodes['Principled BSDF'].inputs['Sheen Tint'].default_value = 0
    return mat

def apply_material(obj, mat):
    obj.data.materials.append(mat)
    obj.active_material = mat

def create_vertices(o: bpy.types.Object, ref: bpy.types.Object) -> bpy.types.ParticleSystem:
    part = o.modifiers.new(random_str(), 'PARTICLE_SYSTEM')
    part = o.particle_systems[part.name]

    part.settings.count           = 500000
    part.settings.frame_start     = 0
    part.settings.normal_factor   = 0.1
    part.settings.emit_from       = 'VERT'
    part.settings.render_type     = 'OBJECT'
    part.settings.instance_object = ref

    return part

def create_camera() -> bpy.types.Camera:
    name   = 'main_camera'
 
    camera = bpy.data.objects.new(name, bpy.data.cameras.new(name=name))
    camera.location       = [-0.1, -1.85, 0.35]
    camera.rotation_euler = [82 * math.pi / 180, 0, 0]
    bpy.context.scene.collection.objects.link(camera)

    return camera

def create_light() -> bpy.types.Light:
    name = 'main_light'

    data = bpy.data.lights.new(name=random_str(), type='POINT')
    data.energy = 80
    data.color = [0.775822, 0.603827, 0.434154]

    light  = bpy.data.objects.new(name=name, object_data=data)
    light.location = (1, -1, 1)
    bpy.context.collection.objects.link(light)
    bpy.context.view_layer.objects.active = light

    return light

def create_ground() -> bpy.types.Object:
    # ground plane as shadow catcher
    bpy.ops.mesh.primitive_plane_add(size=5)
    bpy.context.active_object.cycles.is_shadow_catcher = True

    return bpy.context.active_object

def main():
    """the main function
    """
    color_body      = [0.8, 0.725795, 0.636866, 1]
    color_wireframe = [0.147027, 0.116971, 0.0865, 1]
    input_mesh_mat  = '../../../1-intro/assets/texture.jpg'
    input_mesh_tri  = '../../../1-intro/assets/bunny_tri.obj'
    input_mesh_quad = '../../../1-intro/assets/bunny_quad.obj'
    output_figure   = './assets/teaser.png'
    output_blend    = './assets/bunnies.blend'

    # blender initial setups
    init_scene()
    init_renderer()

    # scene general setups
    camera = create_camera()
    light  = create_light()
    ground = create_ground()

    # load referal mesh objects
    btri_ref  = import_obj(input_mesh_tri)
    bquad_ref = import_obj(input_mesh_quad)
    btri_ref.hide_render = True
    bquad_ref.hide_render = True

    # load texture and prepare needed materials
    mat_body = create_material_color(color_body)
    mat_wire = create_material_color(color_wireframe)
    mat_tex  = create_material_texture(input_mesh_mat)

    # 1. create mid decimated bunny
    btri = decimate(btri_ref, 0.01)
    btri.rotation_euler = btri_ref.rotation_euler
    bpy.ops.object.shade_flat()

    btri_wire = wireframe(btri, 0.08)
    btri_wire.rotation_euler = btri.rotation_euler

    apply_material(btri, mat_body)
    apply_material(btri_wire, mat_wire)

    # 2. create voxelized bunny
    vox = voxelization(btri_ref)
    vox.rotation_euler = btri_ref.rotation_euler
    vox.location.x -= 0.2
    apply_material(vox, mat_body)

    # 3. create point cloud bunny

    # prepare vertex-only mesh data
    bm = bmesh.new()
    bm.from_mesh(btri_ref.data)
    verts = bpy.data.meshes.new(name=random_str())
    verts.from_pydata([v.co for v in bm.verts], [], [])

    # create point cloud object
    bpcloud = bpy.data.objects.new(random_str(), verts)
    bpy.context.scene.collection.objects.link(bpcloud)
    bpcloud.location.x -= 0.4
    bpcloud.location.z += 0.01
    bpcloud.rotation_euler = btri_ref.rotation_euler

    # create a sphere as vertex render reference object
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=0.03, location=(-100, 0, 0))
    dot = bpy.context.active_object
    create_vertices(bpcloud, dot)
    apply_material(dot, mat_body)

    # 4. create quad bunny
    bquad = duplicate(bquad_ref)
    bquad.rotation_euler = bquad_ref.rotation_euler
    bquad.location.x += 0.2

    bquad_wire = wireframe(bquad, 0.2)
    bquad_wire.rotation_euler = bquad.rotation_euler
    bquad_wire.location.x += 0.2

    apply_material(bquad, mat_body)
    apply_material(bquad_wire, mat_wire)

    # 5. create textured bunny
    btex = duplicate(btri_ref)
    btex.location.x += 0.4
    btex.rotation_euler = bquad_ref.rotation_euler

    apply_material(btex, mat_tex)

    # render it!
    bpy.ops.wm.save_mainfile(filepath=output_blend)
    render(output_figure, camera)

if __name__ == "__main__":
    major, minor, patch = bpy.app.version
    if major == 2 and minor == 90 and patch >= 1:
        start = time.time()
        main()
        print(f'time elapsed: {time.time() - start}s')
    else:
        print('requires blender version 2.90.x')
