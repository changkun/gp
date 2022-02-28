# Copyright (c) 2022 LMU Munich Geometry Processing Authors. All rights reserved.
# Created by Changkun Ou <https://changkun.de>.
#
# Use of this source code is governed by a GNU GPLv3 license that can be found
# in the LICENSE file.

import torch
from pytorch3d.utils import ico_sphere
from pytorch3d.io import save_obj

device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
print("use: ", device)

m = ico_sphere(level=4)
save_obj("source.obj", m.verts_packed(), m.faces_packed())