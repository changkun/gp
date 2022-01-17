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


plt.grid('off')
plt.axis('off')
plt.gcf().set_facecolor('black')
plt.savefig('render.png')