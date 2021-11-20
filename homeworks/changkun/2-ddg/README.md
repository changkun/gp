# Homework 2: Visualizing Curvatures

**Task 1. Use your halfedge mesh structure from [Homework 1](../1-halfedge/README.md), further extend the [geometry/primitive.ts](./src/geometry/primitive.ts) file and implement different normal and curvature computing methods.**

|Mean|Gauss|Kmin|Kmax|
|:--:|:--:|:--:|:--:|
|<img src="./assets/Mean.png" height="120"/>|<img src="./assets/Gaussian.png" height="120"/>|<img src="./assets/Kmin.png" height="120"/>|<img src="./assets/Kmax.png" height="120"/>|

**Task 2. Answer the following questions.**

Which code snippet (report in line numbers) in the `geometry/primitive.ts` is the most time consuming for you to implement? Explain your coding experience and encountered challenges briefly.

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
TODO: your answer goes here
```

2. Describe an impressive bug that you wrote while implementing this project, and briefly explain how you fixed it.

```
TODO: your answer goes here
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
│   ├── colors.js
│   ├── halfedge.js
│   ├── main.js
│   ├── renderer.js
│   └── vector.js
└── webpack.config.js
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
