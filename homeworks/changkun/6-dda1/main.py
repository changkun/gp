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

device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
torch.cuda.set_device(device)

mesh    = load_objs_as_meshes([os.path.join("./data", "bunny.obj")], device=device)
verts  = mesh.verts_packed()
center = verts.mean(0)
scale  = max((verts - center).abs().max(0)[0])
mesh.offset_verts_(-center)
mesh.scale_verts_((1.0 / float(scale)))

R, T = look_at_view_transform(2, 30, 60)
camera = FoVPerspectiveCameras(znear=0.01, zfar=1000, R=R, T=T, device=device)
renderer = MeshRenderer(
    rasterizer=MeshRasterizer(
        cameras=camera,
        raster_settings=RasterizationSettings(
            image_size=1024,
            blur_radius=0.0,
            faces_per_pixel=1,
        ),
    ),
    shader=SoftPhongShader(
        device=device,
        cameras=camera,
        lights=PointLights(device=device, location=[[1.0, 1.0, 1.0]]),
        blend_params=BlendParams(background_color=(0,0,0)),
    )
)
target_images = renderer(mesh)
plt.imshow(target_images.cpu().numpy()[0, ..., :3])
plt.grid("off")
plt.axis("off")
plt.gcf().set_facecolor("black")
plt.savefig('render.png')