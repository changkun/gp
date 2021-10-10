# Homework 5: Quadric Error Metric Simplification

In this homework, your task is to implement the
[QEM Simplification](https://dl.acm.org/doi/abs/10.1145/258734.258849)
algorithm.

## Skeleton

The skeleton for this homework is structured as follows:

```
5-remesh
├── package.json
├── package-lock.json
├── README.md                <-- You work on this file
├── src
│   ├── assets
│   │   ├── bunny_tri.obj
│   │   └── sphere.obj
│   ├── halfedge.js          <-- You work on this file
│   ├── main.js              <-- Change this file if needed
│   ├── mat.js
│   ├── pq.js
│   ├── renderer.js
│   └── vec.js
└── webpack.config.js
```

Implementation hints:

1. Your primary task is to implement the `Halfedge.simplify` method in the `halfedge.js`, but you will have to build halfedge representation of a given mesh first. Reuse your work from previous homeworks
2. Use `PriorityQueue` implementation from `pq.js` and `Matrix` implementation from `mat.js`
3. It might be useful to read the code in `main.js`, and you are allowed to change code there if needed

Think and answer the following questions:

1. What's the most unanticipated issue when you were implementing QEM? Explain your coding experience and encountered challenges briefly.
2. What are the cases missing from algorithm description, and how did you deal with it? For example, in which case you cannot do edge collapse directly. Explain your decision in your implementation.

```
1. Debugging is very difficult. Especially checking the results as no error values were known. I had to reread the paper multiple times and tried to follow the described algorithm as close as possible. In the end it looks like that I found something that seems to produce good error values for the bunny.
Decimation was very hard to debug too, as for a correct render the mesh has to be valid. When there are errors (e.g. normal calculation fails due to wrong linkups etc.) it is very hard to determine what went wrong, even in a small mesh. In the end I was not able to fix all bugs in the collapse algorithm (For a Cube it seems to work mostly, except if reduce ratio is near 1).

2. In some cases the error metric cannot be calculated directly (determinant != 0), so we cannot collapse to a point directly and thus need to first find an point (apporximation) that we can collapse to.
```

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
│   ├── mat.js
│   ├── pq.js
│   ├── renderer.js
│   └── vec.js
└── webpack.config.js
```

To submit your solution, please send a [pull request](https://github.com/mimuc/gp-ws2021/pulls) before 25.01.2021 00:00:00.

If you have any questions regarding the skeleton, please comment on [the discussion thread](https://github.com/mimuc/gp/discussions/5).