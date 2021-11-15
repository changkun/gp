# Homework 2: Visualizing Curvatures

**Task 1. Use your halfedge mesh structure from [Homework 1](../1-halfedge/README.md), further extend the [geometry/primitive.ts](./src/geometry/primitive.ts) file and implement different normal and curvature computing methods.**

|Mean|Gauss|Kmin|Kmax|
|:--:|:--:|:--:|:--:|
|<img src="./assets/Mean.png" height="120"/>|<img src="./assets/Gaussian.png" height="120"/>|<img src="./assets/Kmin.png" height="120"/>|<img src="./assets/Kmax.png" height="120"/>|

**Task 2. Answer the following questions.**

Which code snippet (report in line numbers) in the `geometry/primitive.ts` is the most time consuming for you to implement? Explain your coding experience and encountered challenges briefly.

```
line 251-264: these lines are calculating the area of the voronoi cell, and the challenge was more about geometry than programming. I first tried doing that by finding the intersection of orthogonal vectors going inside the face from the vertex edges, which was very long and didn't work right. Then later i used the provided formula, which made it much easier ^^
```

Describe an impressive bug that you wrote while implementing this project, and briefly explain how you fixed it.

```
It's not impressive, but rather stupid: In the cotan() function i wrote: 
    "if (this.onBoundary = 0) return 0;"
So it always returned zero.
Fixing it was easy, i just rewrote it to:
    "if (this.onBoundary) return 0;"

```

## Submission Instruction

In short: Send a [pull request](https://github.com/mimuc/gp/pulls).

To submit a solution, one should create a folder named by the corresponding GitHub username in the `homeworks` folder and that folder will serve for all future submissions.

For example, in the `homeworks` folder, there is an existing folder `changkun`
that demonstrates how to organize submissions:

```
gp
├── README.md               <-- Top level README
├── 2-ddg                   <-- Project skeleton
└── homeworks
    └── changkun            <-- GitHub username
        └── 2-ddg           <-- Actual submission
```
