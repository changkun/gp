# Homework 7: Learning to Deform A Mesh

**Task 1. Implement an optimization loop that deforms a source mesh to a target mesh using PyTorch3D.**

| Iter=0 | Iter=100 | Iter=500 | Iter=1000 | ... | Target |
|:------:|:------:|:------:|:------:|:------:|:------:|
|![](./out/render_0.png)|![](./out/render_100.png)|![](./out/render_500.png)|![](./out/render_1000.png)|...|![](./deform.png)|

# My Best Run
| Iter=0 | Iter=1000 | Iter=2000 | Iter=3000 | ... | Final(5000) |
|:------:|:------:|:------:|:------:|:------:|:------:|
|![](./out_test1/render_0.png)|![](./out_test1/render_1000.png)|![](./out_test1/render_2000.png)|![](./out_test1/render_3000.png)|...|![](./out_test1/render_final.png)|


The `data` folder provides two meshes: bunny.obj as our learning target, and source.obj as the initial mesh. The task is to deform the initial mesh to the given bunny. See more information and hints in the `main.py` file.

> Note: An appropriate parameter setting on an NVIDIA RTX 2080Ti requires at least 30 minutes of computation and a minimum of 10000 iterations. The training may require excessive amount of debugging.
> There are also known bugs in pytorch3d, see https://github.com/facebookresearch/pytorch3d/issues/561 for more details and alternative solution if you found your loss got NaN after a few optimization steps.

**Task 2. Answer the following questions.**

1. What are the reasons that you choose the submitted loss function? How much possibilities have you tried and how long does it take you to train on what kind of hardware?

```
The submitted loss function uses similar weights as the losses from the Pytorch3D "deform dolphin" project. However, the N of samples taken from the source and dest mesh per iteration had to be increased for the best results. I played with the weights a lot, but modifying the N of iterations and N of samples had the biggest effects. Comparing the results was also not easy, since each training phase took quite a while to complete. While playing with the parameters, I had to reduce the samples taken by quite a lot. The Best Run (See above images) used 4000 iterations and took ~4h to complete on my system (i7 laptop CPU, Gigabyte Aero 15X).
Note: I've added the code to also render the image and compute the loss between target and current rendered image. It can be enabled by also setting 
ENABLE_3D_RENDERING_LOSS=True. However, I cannot test this configuration due to computational limitations.
```

2. Which part is the most time consuming for you to implement?

```
Modifying the optimizer. To see changes take effect, I had to train the model for an average of ~1-2min each with a greatly reduced sample size. 
```


## Submission Instruction

In short: Send a [pull request](https://github.com/mimuc/gp/pulls).

To submit a solution, one should create a folder named by the corresponding GitHub username in the `homeworks` folder and that folder will serve for all future submissions.

For example, in the `homeworks` folder, there is an existing folder `changkun`
that demonstrates how to organize submissions:

```
gp
├── README.md             <-- Top level README
├── 7-gdd2                <-- Project skeleton
└── homeworks
    └── changkun          <-- GitHub username
        └── 7-gdd2        <-- Actual submission
```