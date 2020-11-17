# Homework 1: Getting Started with Mesh

1. Re-implement the rasterization and ray tracing pipeline

   - See [SS20 CG1 Assignment 7](https://www.medien.ifi.lmu.de/lehre/ss20/cg1/#tutorial) (ray tracing) and [Online-Hausarbeiten 3](https://www.medien.ifi.lmu.de/lehre/ss20/cg1/#online-hausarbeiten) (rasterization)

2. Getting started with Blender

   - Find awesome YouTube videos that fits your taste, e.g. [Blender Guru](https://www.youtube.com/watch?v=TPrnSACiTJ4&ab_channel=BlenderGuru).

   - Use models from GitHub repository, reproduce the course [teaser figure](../../assets/teaser.png).

   ![reproduced_teaser](I:\UNI_Git\gp-ws2021-fork\homeworks\solutions\krasnor\1-intro\assets\reproduced_teaser.png)

   - Checkout Blender's [API documentation](https://docs.blender.org/api/current/index.html), try to reproduce the figure in Python.
     - `create_teaser_figure.py`: open blender, switch to the scripting tab and import the script file, then run the script
     - asset path must be adjusted in the script

3. Extend the rasterizer, implement an .obj file loader that loads the model into your mesh data structure instead using [THREE.OBJLoader](https://threejs.org/docs/#examples/en/loaders/OBJLoader)

   - Think about how would you turn the learned data structure to code.
     
     - see `main.js` line 220-224 and `BasicOBJImporter.js`
   - Read blender's [developer documentation](https://wiki.blender.org/wiki/Source/Modeling/BMesh/Design), try to answer these questions:
     - What is the blender's internal mesh data structure?

       Blenders internal mesh structure is called BMesh. The topology is stored in 4 main element structures 

       - Faces: contains basic face information and a reference to its loop.

       - Loops - very similar to the Half-Edge approach, but can handle a polygon of any size

       - Edges: additionally to the basic edge information there is the radial cycle (stored in the Loop). It stores all Loops an edge is connected to. 

         This solves the Non-Manifold condition, that the Half-Edge algorithm cannot represent.

       - Verts - additionally to the basic vertex data you can access an edge in the disk cycle of the vertex. The Disk Cycle stores all edges a vertex is connected to. This also solves one of the Non-Manifold condition that the Half-Edge algorithm cannot represent.
     - How it works and what are the differences compare to what we learned in the kick-off session?
       
       - Very similar to the half edge approach, but can handle non manifold meshes

4. Start think about your individual project

## Submission

**This homework is not mandatory, but we highly recommend you to do it.** Feel free to send a [pull request](https://github.com/mimuc/gp-ws2021/pulls) and submit your answers.