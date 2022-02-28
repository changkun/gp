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

# load source mesh
src_mesh = load_and_uniform(os.path.join(".", "data", "source.obj"))
dst_mesh = load_and_uniform(os.path.join(".", "data", "bunny.obj"))

r = Render()

losses = {
    "render":    {"weight": 1.0, "values": []},
    "edge":      {"weight": 1.0, "values": []},
    "normal":    {"weight": 0.01, "values": []},
    "laplacian": {"weight": 1.0, "values": []},
}

deformation = torch.full(src_mesh.verts_packed().shape, 0.0, device=device, requires_grad=True)
optimizer   = torch.optim.SGD([deformation], lr=1, momentum=0.9)
mse         = torch.nn.MSELoss()
N           = 10000

for i in range(N):
    optimizer.zero_grad()

    deformed_mesh = src_mesh.offset_verts(deformation)
    loss = {k: torch.tensor(0.0, device=device) for k in losses}
    loss["edge"]      = mesh_edge_loss(deformed_mesh)
    loss["normal"]    = mesh_normal_consistency(deformed_mesh)
    loss["laplacian"] = mesh_laplacian_smoothing(deformed_mesh, method="uniform")
    loss["render"]    = mse(r.render(deformed_mesh), r.render(dst_mesh))

    sum_loss = torch.tensor(0.0, device=device)
    for k, l in loss.items():
        sum_loss += l * losses[k]["weight"]
        losses[k]["values"].append(float(l.detach().cpu()))

    sum_loss.backward()
    optimizer.step()

    if i % 100 == 0:
        print(f'[{i}/{N}]: loss - {sum_loss}')
        if debug:
            save_fig(f'out/render_{i}.png', r.render(deformed_mesh))

save_fig(f'render.png', r.render(deformed_mesh))
save_fig(f'target.png', r.render(dst_mesh))
vs, fs = deformed_mesh.get_mesh_verts_faces(0)
save_obj(os.path.join(".", "output.obj"), vs, fs)