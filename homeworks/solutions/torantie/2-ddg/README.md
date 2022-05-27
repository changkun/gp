# Homework 2: Visualizing Curvatures

In this homework, you will be working on the implementation of curvature
visualization for manifold triangle meshes.

## Skeleton

The skeleton for this homework is structured as follows:

```
2-ddg
├── package.json
├── package-lock.json
├── README.md          <--- You work on this file
├── src
│   ├── assets
│   │   └── bunny_tri.obj
│   ├── colors.js
│   ├── halfedge.js    <--- You work on this file
│   ├── main.js
│   ├── renderer.js
│   └── vector.js
└── webpack.config.js
```

You coding tasks are located in the `halfedge.js`.
Please look for `TODO:` in these two files and complete them to archive
the reference results listed below.

> It might be useful to read the code in `main.js`.

You should also document your implementation process. Specifically, you
should answer the following questions:

1. Which code snippet (report in line numbers) in the `halfedge.js` is the most time consuming for you to implement? Explain your coding experience and encountered challenges briefly.

Creating the halfedge structure was the most time consuming (lines 233-385). Specifically line 268-280 of the halfedge structure creation took the longest, since it was about creating and linking the halfedges. Overall errors in the halfedge structure resulted in a harder time implementing everything else. So often times i had to go back to the structure and look for errors, making it very time consuming.

2. Describe an impressive bug that you wrote while implementing this project, and briefly explain how you fixed it.

I gave edges, vertices and faces ids, starting from one, which resulted in the first coordinate/edge going to the middle of the cube. Additionally, i used a cube with quad faces not rectangulars, which resulted in the image bellow.
I fixed the first issue by counting from 0 and the second one by triangulating the faces of my test cube.


<img src="./src/Bug_Picture.png" height="120"/>

## Reference Results

|None|Mean|Gauss|Kmin|Kmax|
|:--:|:--:|:--:|:--:|:--:|
|<img src="./reference/cur-none.png" height="120"/>|<img src="./reference/cur-mean.png" height="120"/>|<img src="./reference/cur-guass.png" height="120"/>|<img src="./reference/cur-kmin.png" height="120"/>|<img src="./reference/cur-kmax.png" height="120"/>|

## Submission

Before you submit, please read [this](../README.md) document and understand
how you should organize your submitted files.

For this project, you should submit the following files (i.e. exclude the `assets` folder):

```
├── package.json
├── package-lock.json
├── README.md
├── src
│   ├── colors.js
│   ├── halfedge.js
│   ├── main.js
│   ├── renderer.js
│   └── vector.js
└── webpack.config.js
```

To submit your solution, please send a [pull request](https://github.com/mimuc/gp/pulls) before 30.11.2020 00:00:00.

If you have any questions regarding the skeleton, please comment on [this issue](https://github.com/mimuc/gp/issues/2).