# Copyright (c) 2022 LMU Munich Geometry Processing Authors. All rights reserved.
# Created by Changkun Ou <https://changkun.de>.
#
# Use of this source code is governed by a GNU GPLv3 license that can be found
# in the LICENSE file.

import os
import torch
from pytorch3d.io import load_objs_as_meshes
from pytorch3d.renderer import (
    look_at_view_transform,
    FoVPerspectiveCameras,
    PointLights,
    RasterizationSettings,
    MeshRenderer,
    MeshRasterizer,
    SoftPhongShader,
    BlendParams,
    Materials # added 
)
import matplotlib.pyplot as plt

print("Begin")

#device = torch.device('cuda:0') if torch.cuda.is_available() else torch.device('cpu')
#torch.cuda.set_device(device)
"""if torch.cuda.is_available():
    device = torch.device("cuda:0")
    torch.cuda.set_device(device)
    print("CUDA yes")
else:
    device = torch.device("cpu")
    print("CUDA no")"""
# Consti10 - I was not able to pytorch3D with CUDA enabled. But I am running in linux (since windows didn't work)    
# which has cuda - therefore the above code won't work
device = torch.device("cpu")


mesh = load_objs_as_meshes([os.path.join('./data', 'bunny.obj')], device=device)
print("Done loading mesh")

# TODO: render the loaded mesh using the already imported classes and functions

# ---------------------------------
# Initialize a camera.
# With world coordinates +Y up, +X left and +Z in, the front of the cow is facing the -Z direction. 
# So we move the camera by 180 in the azimuth direction so it is facing the front of the cow. 
#R, T = look_at_view_transform(2.7, 0, 180) 
# MODIFIED for assignment
# Move camera by 180 in the azimuth directon so it is facing the side of the bunny
R, T = look_at_view_transform(8, 0, 45) 
cameras = FoVPerspectiveCameras(device=device, R=R, T=T)

# Define the settings for rasterization and shading. Here we set the output image to be of size
# 512x512. As we are rendering images for visualization purposes only we will set faces_per_pixel=1
# and blur_radius=0.0. We also set bin_size and max_faces_per_bin to None which ensure that 
# the faster coarse-to-fine rasterization method is used. Refer to rasterize_meshes.py for 
# explanations of these parameters. Refer to docs/notes/renderer.md for an explanation of 
# the difference between naive and coarse-to-fine rasterization. 
raster_settings = RasterizationSettings(
    image_size=512, 
    blur_radius=0.0, 
    faces_per_pixel=1, 
)

# Place a point light in front of the object. As mentioned above, the front of the cow is facing the 
# -z direction. 
lights = PointLights(device=device, location=[[0.0, 0.0, 0.0]])

# Change specular color to green and change material shininess 
materials = Materials(
    device=device,
    specular_color=[[0.0, 1.0, 0.0]],
    shininess=50.0
)

# Create a Phong renderer by composing a rasterizer and a shader. The textured Phong shader will 
# interpolate the texture uv coordinates for each vertex, sample from a texture image and 
# apply the Phong lighting model
renderer = MeshRenderer(
    rasterizer=MeshRasterizer(
        cameras=cameras, 
        raster_settings=raster_settings
    ),
    shader=SoftPhongShader(
        device=device, 
        cameras=cameras,
        lights=lights
    )
)

# --------------------------------- 
# testing,visualize the texture map
"""plt.figure(figsize=(7,7))
texture_image=mesh.textures.maps_padded()
plt.imshow(texture_image.squeeze().cpu().numpy())
plt.axis("off");"""
# render the textured mesh
images = renderer(mesh,lights=lights,materials=materials)
plt.figure(figsize=(10, 10))
plt.imshow(images[0, ..., :3].cpu().numpy())
plt.axis("off");
# -------------------------------
print("Done rendering")

plt.grid('off')
plt.axis('off')
plt.gcf().set_facecolor('black')
plt.savefig('render1.png')

print("Done plotting")