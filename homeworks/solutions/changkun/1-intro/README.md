# Homework 1: Getting started with mesh

This document explains my solution for homework 1.

## Implementation an .obj file loader and a CPU rasterizer

The source code files are placed in the `src` folder. One can run the solution
using the following commands:

```sh
$ npm i
$ npm start
```

The core implementation of the rasterizer and obj file loader are located
in the `src/raster.js` file.

## Reproduce teaser

Here is my reproduced teaser picture:

![](./assets/teaser.png)

> Note that you do not have to submit your `.blend` file.

There is also a procedure script that demonstrates how to reproduce
the teaser automatically. One can execute the Python script using
the following command:

```sh
$ blender -b -P teaser.py
```

## The BMesh data structure

After reading the blender's developer documentation, here are some of
the understanding highlights regarding its internal mesh structure:

TODO: