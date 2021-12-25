# Homework 4: Tutte's Barycentric Embedding

**Task 1. Use your halfedge mesh structure from [Homework 1](../1-halfedge/README.md), further extend the [geometry/mesh_param.ts](./src/geometry/mesh_param.ts) file and implement Tutte's barycentric embedding algorithm for mesh parameterization using for **uniform** and the **cotan** Laplacian weights.**

The original bunny mesh and parameterization:

<img src="./assets/original.png" height="200"/>

The computed Tutte's parameterization:

|Laplacian|Disk|Rectangle|
|:--:|:--:|:--:|
|Uniform|![](./assets/uniform-disk.png)|![](./assets/uniform-rect.png)|
|Cotan|![](./assets/cotan-disk.png)|![](./assets/cotan-rect.png)|

_*Note that a mesh must contain at least one boundary._

**Task 2. Answer questions regarding the implementation.**

**Implementation complexity**: Which code snippet (report in line numbers) in the `geometry/mesh_param.ts` is the most time consuming for you to implement? Explain your coding experience and encountered challenges briefly.

```
The most time-consuming part was actually the implementation of the rectangle boundary (lines 133-165), because I initially tried to distribute the vertices evenly, which resulted in the corners being cropped. Afterwards, I still had some weird issues where I kept messing up the coordinates. Circle boundaries where straightforward. The interior vertices where more straightforward to implement. 
```

**Debugging complexity**: Describe an impressive bug that you wrote while implementing this project, and briefly explain how you fixed it.

```
Trying to solve the linear equation with cholesky resulted in some weird distortions. Using solveSquare fixed this. Also, I previously tried to implement the square boundaries using sine and cosine, which cut off corners.
```

**Runtime performance**: Which part of your code could be a bottleneck and how the computation performance could be improved?

```
Hard to say. I imagine the neighbor vertices do not have to be found and then iterated, but rather can be iterated immediately as they are found.
```

## Submission Instruction

In short: Send a [pull request](https://github.com/mimuc/gp/pulls).

To submit a solution, one should create a folder named by the corresponding GitHub username in the `homeworks` folder and that folder will serve for all future submissions.

For example, in the `homeworks` folder, there is an existing folder `changkun`
that demonstrates how to organize submissions:

```
gp
├── README.md                 <-- Top level README
├── 4-param                   <-- Project skeleton
└── homeworks
    └── changkun              <-- GitHub username
        └── 4-param           <-- Actual submission
```
