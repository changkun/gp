# Copyright (c) 2022 LMU Munich Geometry Processing Authors. All rights reserved.
# Created by Changkun Ou <https://changkun.de>.
#
# Use of this source code is governed by a GNU GPLv3 license that can be found
# in the LICENSE file.

import torch
from pytorch3d.utils import ico_sphere

device = torch.device("cuda:0") if torch.cuda.is_available() else torch.device("cpu")
torch.cuda.set_device(device)
print(device)

m = ico_sphere(level=1)
print(m.verts_packed().shape, m.faces_packed().shape)