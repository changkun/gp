# Homework 1: Implement the Halfedge Structure

**Task 1. Build Halfedge-based mesh structure in the [`buildMesh`](./src/geometry/halfedge.ts) method, then render the mesh using the provided [software rasterizer](./src/).**

![](./assets/expect.png)

- _Hint: Don't work directly on a complex mesh, but try to start with a single triangle._
- Think about how to turn the learned data structure to code.
- Read blender's [developer documentation](https://wiki.blender.org/wiki/Source/Modeling/BMesh/Design), try to answer these questions:
- What is the blender's internal mesh data structure?
- How it works and what are the differences compare to Halfedge-based mesh structure?

Write the answers here:

```
Blenders internal mesh data structure is a geometry representation that simplifies processing non-manifold meshes through its data structure. BMesh stores the element structures Faces, Loops, Edges and Verts. Vertices, Edges and Faces each have individual loop types, which store information about the connectivity between all element structures. The comprehensive connectivity information embedded in the BMesh data structure enables clear representations of any kind of non-manifold condition and therefore simplifies processing of non-manifold geometry. A halfedge-based mesh however cant represent such conditions.
```

**Task 2. Write a reproducer of teaser image in [teaser.py](./teaser.py).**

- Tutorial: [The official Blender 2.8 Tutorial](https://www.youtube.com/playlist?list=PLa1F2ddGya_-UvuAqHAksYnB0qL9yWDO6), [Blender Guru's Beginner Tutorial Series](https://www.youtube.com/playlist?list=PLjEaoINr3zgEq0u2MzVgAaHEBt--xLB6U), etc.
- Checkout Blender's [Python API documentation](https://docs.blender.org/api/current/index.html).
- Use [the bunny model](./assets/bunny.obj) from GitHub repository, write a Python script that reproduce the course [teaser figure](../assets/teaser.png). To execute the script:

    ```sh
    $ blender -b -P ./teaser.py
    ```

**Task 3. Think about your individual project ideas.**

- _Hint: See submitted projects from last year in https://github.com/mimuc/gp/tree/ws2021#final-projects_

Write initial ideas here:

```
Answers go here...
```

## Submission Instruction

In short: Send a [pull request](https://github.com/mimuc/gp/pulls).

To submit a solution, one should create a folder named by the corresponding GitHub username in the `homeworks` folder and that folder will serve for all future submissions.

For example, in the `homeworks` folder, there is an existing folder `changkun`
that demonstrates how to organize submissions:

```
gp
├── README.md               <-- Top level README
├── 1-halfedge              <-- Project skeleton
└── homeworks
    └── changkun            <-- GitHub username
        └── 1-halfedge      <-- Actual submission
```
