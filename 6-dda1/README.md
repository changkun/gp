# Homework 6: Rendering with PyTorch(3D)

**Task 1. Setup the environment and install PyTorch and PyTorch 3D.**

This task requires you to establish an isolated environment for the upcoming
tasks that uses [PyTorch](https://pytorch.org/) and [PyTorch 3D](https://pytorch3d.org/).

If you finished the installation, please run the provided program and fill our output:

```bash
$ python test.py
cuda:0
torch.Size([42, 3]) torch.Size([80, 3])
```

> The following content gives you few more hints on setting up the environment.
> However, the content may not applicable for Windows users, hence one should
> always refer to the official documentation regarding the installation if
> anything unexpected happened.

- Miniconda: https://docs.conda.io/en/latest/miniconda.html
- PyTorch: https://pytorch.org/get-started/locally/
- PyTorch3D: https://github.com/facebookresearch/pytorch3d/blob/main/INSTALL.md
- CUDA (Linux or Windows): https://developer.nvidia.com/cuda-downloads

PyTorch and PyTorch3D should be installed in a CUDA-enabled environment, which means a GPU is necessary. If you don't have an NVIDIA GPU, you can still complete the tasks with the CPU versions of these packages, but the results will be substantially slower than if you have one. (If you require a laboratory GPU, please contact us.)

Because the geometry processing field is still evolving at a rapid pace, and a lot of breaking changes could be added between released versions, dependency management in Python is much more complicated than in other languages like Go and JavaScript. As a result, constantly keep in mind the current environment that you are working in.

The recommended practice is to set up a separate Python environment (including Python itself) that manages all of a project's dependency versions. Due to the simplicity of prebuilt binaries and the fact that some library providers only offer their packages to Anaconda as of 2022, [Conda](https://docs.conda.io/projects/conda/en/latest/) would be the current optimal choice over [virtualenv](https://virtualenv.pypa.io/en/latest/). Although installing from source is feasible, installing from prebuilt binaries allows us to get started quickly and avoids the frustration of resolving compiling errors.

However, conda itself is still too big for our educational purpose. A lightweight version of Conda,
as known as [Miniconda](https://docs.conda.io/en/latest/miniconda.html) is recommended.

When you have miniconda avaliable on your system, you can create an isolate environment
through the following command:

```shell
# create an Python 3.9 environment named as "gp"
$ conda create -n gp python=3.9
# activate the created environment "gp"
$ conda activate gp
# check if the current environment had switched to "gp" or not
$ conda info --envs
base                     /home/changkun/miniconda3
gp                    *  /home/changkun/miniconda3/envs/gp
# check if python command is now refering to the conda's python environment
$ python --version
Python 3.9.x
$ where python
/home/changkun/miniconda3/envs/gp/bin/python
```

Then, we can install pytorch and pytorch3d. For computers with no CUDA support (for instance, macOS):

```shell
# install pytorch
$ pip install torch==1.9.0 torchvision==0.10.0 torchaudio==0.9.0
# install pytorch3d
$ pip install pytorch3d
```

For computers with CUDA support (for instance, Linux):

```shell
# install pytorch, cuda version 11.3
# conda install pytorch torchvision torchaudio cudatoolkit=11.3 -c pytorch
$ pip install torch==1.10.1+cu113 torchvision==0.11.2+cu113 torchaudio==0.10.1+cu113 -f https://download.pytorch.org/whl/cu113/torch_stable.html

# install core dependencies from pytorch3d
$ pip install iopath fvcore

# install pytorch3d
$ pip install --no-cache --no-index pytorch3d -f https://dl.fbaipublicfiles.com/pytorch3d/packaging/wheels/py39_cu113_pyt1101/download.html
```

**Task 2. Read the given documentations of PyTorch3D, and answer the following questions.**

- https://pytorch3d.readthedocs.io/en/latest/modules/io.html
- https://pytorch3d.readthedocs.io/en/latest/modules/loss.html
- https://pytorch3d.readthedocs.io/en/latest/modules/structures.html
- https://pytorch3d.readthedocs.io/en/latest/modules/renderer/index.html

1. What are the supported structures in PyTorch3D?

```
TODO: your answer goes here
```

2. What are the required arguments for Pytorch3D to save an .OBJ file, and how can you get these arguments from a mesh?

```
TODO: your answer goes here
```

3. (Answer this after Task 3 is completed) Which part is the most time consuming for you to implement?

```
TODO: your answer goes here
```

**Task 3. Render the bunny provided in the data folder using PyTorch3D.**

After the installation, complete the `main.py` program to render a bunny.

The expected rendering effects:

- Texture
- Black background
- Similar camera angle
- Phong shading effects

Here is an example outputs:

![](./render.png)

## Submission Instruction

In short: Send a [pull request](https://github.com/mimuc/gp/pulls).

To submit a solution, one should create a folder named by the corresponding GitHub username in the `homeworks` folder and that folder will serve for all future submissions.

For example, in the `homeworks` folder, there is an existing folder `changkun`
that demonstrates how to organize submissions:

```
gp
├── README.md             <-- Top level README
├── 6-gdd1                <-- Project skeleton
└── homeworks
    └── changkun          <-- GitHub username
        └── 6-gdd1        <-- Actual submission
```