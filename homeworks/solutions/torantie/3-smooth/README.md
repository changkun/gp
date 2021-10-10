# Homework 3: Laplacian Smoothing

In this homework, your task is to implement the Laplacian smoothing algorithm
for the **uniform** and the **cotan** Laplace-Beltrami operator.

## Skeleton

The skeleton for this homework is structured as follows:

```
3-smooth
├── package.json
├── package-lock.json
├── README.md             <--- You work on this file
├── src
│   ├── assets
│   │   └── bunny_tri.obj
│   ├── halfedge.js       <--- You work on this file
│   ├── main.js
│   ├── renderer.js
│   └── vec.js
└── webpack.config.js
```

You coding tasks are located in the `halfedge.js`.
Please look for `TODO:` in these two files and complete them to archive
the reference results listed below.

> It might be useful to read the code in `main.js`.

You should also document your implementation process. Specifically, you
should answer the following questions:

1. **Implementation complexity**: Which code snippet (report in line numbers) in the `halfedge.js` is the most time consuming for you to implement? Explain your coding experience and encountered challenges briefly.

```
TODO: your answer goes here
```

line 562-631 the smooth function: Translating the linear equation into code was very time consuming because i didn't understand or find what some things of the equations ment in the slides. Also debugging the Matrices was extremely hard because you couldn't print sparse matrices.

2. **Debugging complexity**: Describe an impressive bug that you wrote while implementing this project, and briefly explain how you fixed it.

```
TODO: your answer goes here
```

I worked with the already changed array of vertices and not with the original vertice positions, resulting in incorrect calculations. Also after one smoothing operation the vertice positions were not reset with the original positions, therefore i couldn't do multiple smoothing operations. I fixed it by filling the originalVertices array with the original vertices and their original positions.


3. **Runtime performance**: Which part of your code could be a bottleneck and how the computation performance could be improved?

```
TODO: your answer goes here
```

Mass and weight matrices could have been done in one for loop and not seperately. This was done for clarity reasons but takes more time. To fix this we can create the mass and weight matrices in one for loop.



## Reference Results

The original bunny mesh:

<img src="./references/origin.png" height="200"/>

The smoothed version of the original bunny mesh:

|Laplacian|`t=0.500`|`t=2.000`|`t=5.000`|`t=10.000`|
|:--:|:--:|:--:|:--:|:--:|
|Uniform|![](./references/uniform-0.500.png)|![](./references/uniform-2.000.png)|![](./references/uniform-5.000.png)|![](./references/uniform-10.000.png)|
|Cotan|![](./references/cotan-0.500.png)|![](./references/cotan-2.000.png)|![](./references/cotan-5.000.png)|![](./references/cotan-10.000.png)|

where `t` is the time step and all reference results are performed for `1` smooth step.

## Submission

Before you submit, please read [this](../README.md) document and understand
how you should organize your submitted files.

For this project, you should submit the following files (i.e. exclude the `assets` folder):

```
├── package.json
├── package-lock.json
├── README.md
├── src
│   ├── halfedge.js
│   ├── main.js
│   ├── renderer.js
│   └── vec.js
└── webpack.config.js
```

To submit your solution, please send a [pull request](https://github.com/mimuc/gp/pulls) before ~~14.12.2020 00:00:00~~21.12.2020 00:00:00.

If you have any questions regarding the skeleton, please comment on [the discussion thread](https://github.com/mimuc/gp/discussions/3).
