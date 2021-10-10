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
Mostly because debugging the laplace matrix is difficult.
Most time consuming was to implement the disk parameterization (~line 457) and finding the bug in the laplace matrix.
First I always thought my border-uv-mapping is wrong.
After just plotting my calculated border-uvs I was also able to check if my border-uv-mapping was correct.
Then after a while I found out, that my matrix was incorrect (values in the millions -> nothing rendered).

Square parameterization (~line 469) took some time too, mostly because it was always a differently rotated (than in the reference pictures). My first attempt was based on a sine/cosine function for even spacing.
Creating a version that is rotated in the same way as the reference took some time.
```

2. **Debugging complexity**: Describe an impressive bug that you wrote while implementing this project, and briefly explain how you fixed it.

```
Very hard to debug.
Mostly because of the difficult matrix debugging.

Bug: My Laplace Matrix was wrong
The Border vertice values should be 1 (at i,j) and nothing else e.g. should not include count of edges (as uniform case would set).
In my case the border vertices had weights != 1 => wrong calculations.
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

To submit your solution, please send a [pull request](https://github.com/mimuc/gp/pulls) before 11.01.2021 00:00:00.

If you have any questions regarding the skeleton, please comment on [the discussion thread](https://github.com/mimuc/gp/discussions/4).