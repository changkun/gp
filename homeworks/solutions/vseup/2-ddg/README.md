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

```
The most difficult part was definitely the construction of the halfedge structure. (lines 353 - 533)
With my first implementation my bunny looked (a bit) wrong. (At least I could tell it could be a bunny :-P)
To debug my code I decided to use a simpple cube first, that I exportet from blender - 
because it's much easier to get an overview of what is happening and the processing is much faster.
In the end the order of how the vertices where modified in vertices function of face was wrong.
Furthermore the handling of the hole at the bottom of the bunny was a bit tricky.

As there are some problems with my angleSum for gaussian curvature and the overall calculation of the mean curvature,
they might be equally time consuming to fix.
```

2. Describe an impressive bug that you wrote while implementing this project, and briefly explain how you fixed it.

```
As described above, the order of the vertices modified in vertices function of face class was wrong.
It got much clearer to me that something was wrong with the vertices, when I tried my code with a simple cube object.
And first I used vertex.idx for i in the callback function instead of a range from 0 - 2. 
```

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

To submit your solution, please send a [pull request](https://github.com/mimuc/gp-ws2021/pulls) before 30.11.2020 00:00:00.

If you have any questions regarding the skeleton, please comment on [this issue](https://github.com/mimuc/gp-ws2021/issues/2).