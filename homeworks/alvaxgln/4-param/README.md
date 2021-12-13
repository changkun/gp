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
The implementation for this homework was actually quite straight forward, and i think all the steps were pretty similar in terms of the time it took me to write them. Most time consuming was probably the calculation of boundary coordinates for the rectangle. (lines 265-313)

```

**Debugging complexity**: Describe an impressive bug that you wrote while implementing this project, and briefly explain how you fixed it.

```
I didn't check for both U and V entries of a vertex in the computeInteriorMatrix() function, which led to a completely messed up result.
So i fixed it by checking, wheather the entry for a vertex in either U or V was non-zero, inwhich case the entries in the Laplace Matrix get skipped.
```

**Runtime performance**: Which part of your code could be a bottleneck and how the computation performance could be improved?

```
The computation of the boundary rectangle coordinates uses a lot of if() conditionals.
Maybe it could be improved, but i don't think that it's a bottleneck since it only loops over boundary vertices.
If the calculations that loop over all vertices could be made more efficient it would probably improve runtime further.
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
