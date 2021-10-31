# Homework 1: Implement the Halfedge Structure

**Task 1. Build Halfedge-based mesh structure in the [`buildMesh`](./src/geometry/halfedge.ts) method, then render the mesh using the provided [software rasterizer](./src/).**

![](./assets/expect.png)

- _Hint: Don't work directly on a complex mesh, but try to start with a single triangle._
- Think about how to turn the learned data structure to code.
- Read blender's [developer documentation](https://wiki.blender.org/wiki/Source/Modeling/BMesh/Design), try to answer these questions:
- What is the blender's internal mesh data structure?
- How it works and what are the differences compare to Halfedge-based mesh strcture?

Write the answers here:

```
Blenders internal data structure is the BMesh Structure.

The basic entities of the BMesh structure are:
-Vertices
-Edges
-Loops
-Faces.

Connectivity is stored using three Connectivity Cycles:

All edges connected to a vertex make up the "disk cycle";
The "disk cycle" is maintained by using a data stored inside the edges;
Each edge has two entries (one for each vertex of that edge)

The "loop cycle" allows navigation through edges of a Face (it is accessed through the Loop objects;
In addition to the associated vertex and edge, each Loop has a reference to the next loop within the face)

The "radial cycle" contains all Faces connected to an edge;
Each edge has a reference to one loop associated with the edge;
each loop also has a reference to the next loop in the radial cycle stored in "radial_next"

Unlike Halfedge, the BMesh data structure also stores "disk cycle" and "radial cycle" (and that independenty from face data).
That means it can also be used to represent non Manifold meshes.

```

**Task 2. (optional) Write a reproducer of teaser image in [teaser.py](./teaser.py).**

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
I have not had that many ideas yet, one thing i thought of was writing a script that creates 3D geometry from other kinds of data, like e.g. measurements.
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
