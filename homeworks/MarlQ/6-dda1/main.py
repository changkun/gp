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
)
import matplotlib.pyplot as plt

device = torch.device('cuda:0') if torch.cuda.is_available() else torch.device('cpu')
torch.cuda.set_device(device)

mesh = load_objs_as_meshes([os.path.join('./data', 'bunny.obj')], device=device)

# TODO: render the loaded mesh using the already imported classes and functions
os.environ["KMP_DUPLICATE_LIB_OK"]="TRUE"

R, T = look_at_view_transform(
    dist=3.5, 
    elev=30, 
    azim=60,
    device=device,
    at=((0,1.75,0.7),)
)
cameras = FoVPerspectiveCameras(device=device, R=R, T=T)
blend_params = BlendParams(
    background_color=[[0.0,0.0,0.0]]
)
raster_settings = RasterizationSettings(
    image_size=512,
    blur_radius=0.0,
    faces_per_pixel=1,
)
lights = PointLights(
    device=device, 
    location=[[1.5, 3.0, 1.0]]
    )
renderer = MeshRenderer(
    rasterizer=MeshRasterizer(cameras=cameras, raster_settings=raster_settings),
    shader=SoftPhongShader(device=device, cameras=cameras, lights=lights, blend_params=blend_params)
)
images = renderer(mesh)
#plt.figure(figsize=(10, 10))
plt.imshow(X=images[0, ..., :3].cpu().numpy())

plt.grid('off')
plt.axis('off')
plt.gcf().set_facecolor('black')
plt.savefig('render.png')