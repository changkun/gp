# Copyright (c) 2022 LMU Munich Geometry Processing Authors. All rights reserved.
# Created by Changkun Ou <https://changkun.de>.
#
# Use of this source code is governed by a GNU GPLv3 license that can be found
# in the LICENSE file.

import os
import torch
import numpy as np
import pytorch3d
from pytorch3d.io import load_obj, save_obj
from pytorch3d.loss import (
    mesh_edge_loss,
    mesh_laplacian_smoothing,
    mesh_normal_consistency,
)
from pytorch3d.structures import Meshes
from pytorch3d.renderer import (
    look_at_view_transform,
    FoVPerspectiveCameras,
    PointLights,
    RasterizationSettings,
    MeshRenderer,
    MeshRasterizer,
    HardFlatShader,
    BlendParams,
    Textures
)
import matplotlib.pyplot as plt

debug  = True
device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
print(f"torch: {torch.__version__}, torch3d: {pytorch3d.__version__}, device: ", device)

def load_and_uniform(model_path: str) -> Meshes:
    # load target mesh
    verts, faces, _ = load_obj(model_path)
    verts = verts.to(device)
    faces = faces.verts_idx.to(device)

    # rescale to the unit AABB and construct the target mesh.
    T = verts.mean(0)
    verts = verts - T
    S = max(verts.abs().max(0)[0])
    verts = verts / S
    return Meshes(
        verts=[verts], faces=[faces],
        textures = Textures(verts_rgb=torch.tensor([0, 0.5, 1]).repeat(verts.shape[0], 1)[None].to(device))
    )

def save_fig(fname: str, img: torch.Tensor):
    plt.imshow(img.cpu().detach().numpy()[0, ..., :3])
    plt.grid("off")
    plt.axis("off")
    plt.gcf().set_facecolor("black")
    plt.savefig(fname)

class Render():
    def __init__(self) -> None:
        R, T = look_at_view_transform(2, 30, 60)
        self.camera = FoVPerspectiveCameras(znear=0.01, zfar=1000, R=R, T=T, device=device)
        self.renderer = MeshRenderer(
        rasterizer=MeshRasterizer(
            cameras=self.camera,
            raster_settings=RasterizationSettings(
                perspective_correct=False,
                image_size=128,
                blur_radius=0.001,
                faces_per_pixel=10,
            ),
        ),
        shader=HardFlatShader(
            device=device,
            cameras=self.camera,
            lights=PointLights(device=device, location=[[1.0, 1.0, 1.0]]),
            blend_params=BlendParams(background_color=(0,0,0)),
        )
    ).to(device)

    def render(self, mesh: Meshes, camera: FoVPerspectiveCameras = None) -> torch.Tensor:
        return self.renderer(mesh, cameras=camera or self.camera)


# TODO: implement an optimization process that deforms the given source mesh to
# the given bunny mesh. General steps:
#
# 1. Load meshes and transform them into a unit cube.
# 2. Define losses, learning target (i.e. deformation tensor), optimizer.
# 3. Create a renderer
# 4. Implement an optimization loop that computes a defined loss of the two meshes.
#    Based on the computed loss, a backward propagation by the optimizer computes an
#    updated deformation tensor to deform the initial mesh.
# 5. Stop the loop if the results are satisfying.
#
# Hints:
#
# - deformation tensor is a tensor that adds to all given verts positions, to transform
#   a given Meshes, one can use .offset_verts() method.
# - The loss can be defined in multiple ways, a recommended combination consists of
#   edge, normal, laplacian, and rendered image. The MSELoss can be used for computing
#   the difference between two rendered images.
# - It is wise to use multiple camera views to compute the rendering difference.