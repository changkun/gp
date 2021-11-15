# Homework 2: Visualizing Curvatures

**Task 1. Use your halfedge mesh structure from [Homework 1](../1-halfedge/README.md), further extend the [geometry/primitive.ts](./src/geometry/primitive.ts) file and implement different normal and curvature computing methods.**

|Mean|Gauss|Kmin|Kmax|
|:--:|:--:|:--:|:--:|
|<img src="./assets/Mean.png" height="120"/>|<img src="./assets/Gaussian.png" height="120"/>|<img src="./assets/Kmin.png" height="120"/>|<img src="./assets/Kmax.png" height="120"/>|

**Task 2. Answer the following questions.**

Which code snippet (report in line numbers) in the `geometry/primitive.ts` is the most time consuming for you to implement? Explain your coding experience and encountered challenges briefly.

```
Implementing the "Voronoi Cell" was most time consuming - especially calculating the circumcenter of the Face. Line numbers: 112 / 130. Luckily, I was able to find a c++-code snipet (link in source code) that I just needed to translate into .ts (I am much more experienced with c++ than .ts). More general coding chalenges were for example understanding .ts and lambdas (e.g. the coding style of a getter like Vertex::faces(lambda) was new to me.) I also spent a lot of time on the curvatures, sometimes just using try & error. 
```

Describe an impressive bug that you wrote while implementing this project, and briefly explain how you fixed it.

```
The mean curvature caused a bit of confusion to me - but we talked about that in the lecture ( |H| versus 'just H'). But this is not really a bug - one thing I wasted a lot of time on was a bug
where I thought Vertex::halfedges(..) would just give me the edges of all faces (fixed by just using Vertex::faces(...)). Also, I probably should've started spliting the code into more manageable chuncks eariler (for example, calculating the area of a triangle given is used at multiple places - for calculating Face::area() and also for my complciated voronoi cell algorithm).
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
