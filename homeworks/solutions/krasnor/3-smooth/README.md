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
The smooth() function (lines 484-523) took longest to implement.
Most time was spend debugging. 
E.g. finding out if the generated matrices are correc (Which is not easy as i was not able to inspect the content of the SparseMatrix in runtime, due to internal storage format)
But most time took finding the Bug described in 2 (lines 405-414).
```

2. **Debugging complexity**: Describe an impressive bug that you wrote while implementing this project, and briefly explain how you fixed it.

```
Smothing changes were not or only in unnoticable stength applied. The calculations were correct but not the rendered result
Reason:
My resetVertexArray() function did not reset the vertex array correctly.
- I created new Vertex objects, and stored them in this.vertices
- However Halfedge.vertex had still a reference to the old Vertex object -> links broken -> glitches

After fixing this rendering was correct.
```

3. **Runtime performance**: Which part of your code could be a bottleneck and how the computation performance could be improved?

```
Mass and Wheight Matrix are calculated seperately (2 loops). This could be done in one loop.
```

## Reference Results


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

To submit your solution, please send a [pull request](https://github.com/mimuc/gp-ws2021/pulls) before ~~14.12.2020 00:00:00~~21.12.2020 00:00:00.

If you have any questions regarding the skeleton, please comment on [the discussion thread](https://github.com/mimuc/gp-ws2021/discussions/3).