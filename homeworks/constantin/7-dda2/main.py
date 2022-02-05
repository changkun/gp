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
    chamfer_distance, # added
    #point_mesh_edge_distance, #added
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
# added dependencies begin
from pytorch3d.ops import sample_points_from_meshes
from mpl_toolkits.mplot3d import Axes3D
# added dependencies end
import matplotlib.pyplot as plt

debug  = True
"""device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
print(f"torch: {torch.__version__}, torch3d: {pytorch3d.__version__}, device: ", device)"""
device = torch.device("cpu")

# how many points we sample from the surface of the mesh in each iteration
N_SAMPLE_POINTS=10000
# enable/disable also using the 3D rendered image and the difference for the loss
# note: suboptimal, only renders from one single view point, but I cannot do more with my hardware
ENABLE_3D_RENDERING_LOSS=False

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

    def render_and_debug(self, mesh: Meshes, camera: FoVPerspectiveCameras = None):
        images=self.render(mesh,camera)
        plt.figure(figsize=(10, 10))
        plt.imshow(images[0, ..., :3].cpu().numpy())
        plt.axis("off");
        plt.show();


# 1. Load meshes and transform them into a unit cube.
#trg_mesh = load_and_uniform(os.path.join('./data2', 'dolphin.obj')) # target mesh
trg_mesh = load_and_uniform(os.path.join('./data', 'bunny.obj'))
src_mesh = load_and_uniform(os.path.join('./data', 'source.obj')) # source mesh

# debug the current looks of the mesh
def plot_pointcloud(mesh, title=""):
    # Sample points uniformly from the surface of the mesh.
    points = sample_points_from_meshes(mesh, N_SAMPLE_POINTS)
    x, y, z = points.clone().detach().cpu().squeeze().unbind(1)    
    fig = plt.figure(figsize=(5, 5))
    ax = Axes3D(fig)
    ax.scatter3D(x, z, -y)
    ax.set_xlabel('x')
    ax.set_ylabel('z')
    ax.set_zlabel('y')
    ax.set_title(title)
    ax.view_init(190, 30)
    plt.show()


# for debugging
#plot_pointcloud(trg_mesh, "Target mesh")
#plot_pointcloud(src_mesh, "Source mesh")

# 2. Define losses, learning target (i.e. deformation tensor), optimizer.
# We will learn to deform the source mesh by offsetting its vertices
# The shape of the deform parameters is equal to the total number of vertices in src_mesh
deform_verts = torch.full(src_mesh.verts_packed().shape, 0.0, device=device, requires_grad=True)

# The optimizer
optimizer = torch.optim.SGD([deform_verts], lr=1.0, momentum=0.9)


renderer = Render()

#renderer.render_and_debug(src_mesh)
#renderer.render_and_debug(trg_mesh)

#images1=renderer.render(src_mesh)
#images2=renderer.render(trg_mesh)
criterionMSE = torch.nn.MSELoss(reduction='sum')
#loss = criterionMSE(images1, images2)


# Number of optimization steps
Niter = 500
# Weight for the chamfer loss
w_chamfer = 1.0 
# Weight for the MSELoss between the rendered images
# only applied if ENABLE_3D_RENDERING_LOSS is true
w_mse_rendered=0.5
# Weight for mesh edge loss
w_edge = 1.0 
# Weight for mesh normal consistency
w_normal = 0.05 
#w_normal = 0.0
# Weight for mesh laplacian smoothing
w_laplacian = 0.1 
# Plot period for the losses -
plot_period = 1000
loop = range(Niter)

chamfer_losses = []
laplacian_losses = []
edge_losses = []
normal_losses = []
mse_rendered_losses = []

print("Optimizing begin")

for i in loop:
    print("Opt_loop begin");
    # Initialize optimizer
    optimizer.zero_grad()
    
    # Deform the mesh
    new_src_mesh = src_mesh.offset_verts(deform_verts)
    
    # We sample X points from the surface of each mesh 
    sample_trg = sample_points_from_meshes(trg_mesh, N_SAMPLE_POINTS)
    sample_src = sample_points_from_meshes(new_src_mesh, N_SAMPLE_POINTS)

    
    # We compare the two sets of pointclouds by computing (a) the chamfer loss
    loss_chamfer, _ = chamfer_distance(sample_trg, sample_src)

    # and (b) the edge length of the predicted mesh
    #https://pytorch3d.readthedocs.io/en/latest/modules/loss.html#pytorch3d.loss.mesh_edge_loss
    loss_edge = mesh_edge_loss(new_src_mesh)
    
    # mesh normal consistency
    # https://pytorch3d.readthedocs.io/en/latest/modules/loss.html#pytorch3d.loss.mesh_normal_consistency
    loss_normal = mesh_normal_consistency(new_src_mesh)
    
    # mesh laplacian smoothing
    loss_laplacian = mesh_laplacian_smoothing(new_src_mesh, method="uniform")
    #loss_laplacian = mesh_laplacian_smoothing(new_src_mesh, method="cot")
    
    # Weighted sum of the losses
    loss = loss_chamfer * w_chamfer + loss_edge * w_edge + loss_normal * w_normal + loss_laplacian * w_laplacian
    #loss = loss_chamfer * w_chamfer + loss_edge * w_edge + loss_normal * w_normal + loss_laplacian * w_laplacian + loss_mse_rendered*w_mse_rendered
    if(ENABLE_3D_RENDERING_LOSS==True):
        render1=renderer.render(trg_mesh)
        render2=renderer.render(new_src_mesh)
        loss_mse_rendered = criterionMSE(render1,render2)
        loss+=loss_mse_rendered*w_mse_rendered;
        mse_rendered_losses.append(float(loss_mse_rendered.detach().cpu()))

    
    # Print the losses
    #loop.set_description('total_loss = %.6f' % loss)
    
    # Save the losses for plotting
    chamfer_losses.append(float(loss_chamfer.detach().cpu()))
    edge_losses.append(float(loss_edge.detach().cpu()))
    normal_losses.append(float(loss_normal.detach().cpu()))
    laplacian_losses.append(float(loss_laplacian.detach().cpu()))
    #mse_rendered_losses.append(float(loss_mse_rendered.detach().cpu()))
    
    # Plot mesh
    if i % plot_period == 0:
        #plot_pointcloud(new_src_mesh, title="iter: %d" % i)
        images1=renderer.render(new_src_mesh)
        save_fig(os.path.join('./out_test', 'render_'+str(i)+".png"),images1)
        #plt.clf();
       
    # Optimization step
    loss.backward()
    optimizer.step()
    print("Opt_loop end"+str(i));

print("Optimizing end")

#Visualize the loss
fig = plt.figure(figsize=(13, 5))
ax = fig.gca()
ax.plot(chamfer_losses, label="chamfer loss (w:"+str(w_chamfer)+")")
ax.plot(edge_losses, label="edge loss (w:"+str(w_edge)+")")
ax.plot(normal_losses, label="normal loss (w:"+str(w_normal)+")")
ax.plot(laplacian_losses, label="laplacian loss (w:"+str(w_laplacian)+")")
ax.plot(mse_rendered_losses, label="mse rendered loss (w:"+str(w_mse_rendered)+")")
ax.legend(fontsize="16")
ax.set_xlabel("Iteration", fontsize="16")
ax.set_ylabel("Loss", fontsize="16")
ax.set_title("Loss vs iterations", fontsize="16");   
plt.show() # hm
#plt.savefig(os.path.join('./out_test', 'losses.png'))
#plt.clf()


images1=renderer.render(new_src_mesh)
save_fig(os.path.join('./out_test', 'render_final.png'),images1)

#debugging
plot_pointcloud(new_src_mesh, "New Source mesh")


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