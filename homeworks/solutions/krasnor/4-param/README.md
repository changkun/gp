# Homework 4: Tutte's Barycentric Embedding

In this homework, your task is to implement the Tutte's barycentric embedding
for mesh parameterization for different types of boundary and Laplacian weights.

## Skeleton

The skeleton for this homework is structured as follows:

```
4-param
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
Most time consuming was to implement the disk parameterization and finding the bug in the laplace matrix.
Mostly because the results could not be debugged.
After just plotting my calculated border-uvs I was also able to check if my border-uv-mapping was correct.
Then after a while I found out, that my matrix is incorrect (values in the millions -> nothing rendered). 

Square parameterization took some time too, mostly because it was always a differently rotated (than in the reference pictures).
Creating a version is rotated in the same was took some time.
```

2. **Debugging complexity**: Describe an impressive bug that you wrote while implementing this project, and briefly explain how you fixed it.

```
Very hard to debug.
Mostly because of the difficult matrix debugging.
Bug: Laplace Matrix was wrong
for the Border vertices value should be 1 and not anything else e.g. count of edges (in uniform case)  
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

To submit your solution, please send a [pull request](https://github.com/mimuc/gp-ws2021/pulls) before 11.01.2021 00:00:00.

If you have any questions regarding the skeleton, please comment on [the discussion thread](https://github.com/mimuc/gp-ws2021/discussions/4).