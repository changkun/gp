# Proposal: Halfedge Mesh Voxelizer

Constantin Geier

01.01.2022

## Abstract

The aim of this project is to implement an algorithm that voxelizes a mesh represented by the halfedge data structure from our exercises.
Furthermore,the output - either a point cloud or a cube mesh - will be rendered for comparison.

## Motivation

One of the first tasks of the lecture (teaser.png) included voxelizing a mesh in blender. Voxelizing a 3D mesh not only looks cool (Minecraft), but is also usefull for many applications (Physics simulations,volumetric imaging). 
While many implementations of this task already exist (blender,https://github.com/karimnaaji/voxelizer/blob/master/voxelizer.h) I cannot find an already existing implementation in .ts that takes a halfedge data structure (h.e.d.s.) as input. 
It would be interesting to see how an implementation of this task in .ts and using a h.e.d.s. looks and performs.


## Proposal

Several techniques exist to voxelize a mesh into either cubes or a point cloud. I plan to implement an algorithm that takes a mesh represented by a h.e.d.s as input and generates either a voxel grid (identically sized cubes eqidistant apart) or a point cloud
and/or also a representation of the result using a h.e.d.s. for simple visualization. This can be done simply by testing each cube against all faces of the h.e.d.s., but such a naive algorithm would have a O(n^n) run time complexity and therefore I plan to find
a more efficient way utilizing the properties of the h.e.d.s., like quick access to the neighbours of a face. As already mentioned, there are many implementations of this task in c/c++/ 3D modelling tools like blender, but I cannot find a single implementation
written a) in .ts and b) using a h.e.d.s as input instead of a nromal triangle mesh.


## Implementation

I plan to use the exercise template as a starting point and therefore implement this task in .ts. My milestones are:
1) naive implementation of the voxelizing algorithm in .ts.
2) improving the algorithm using properties of h.e.d.s.
3) visualizing the results nicely
4) adding additional features like coloring the resulting voxel mesh, variable cube size and calculating normals.

## References

Bronson zegeb, https://bronsonzgeb.com/index.php/2021/05/15/simple-mesh-voxelization-in-unity/
Blender, https://docs.blender.org/manual/en/latest/sculpt_paint/sculpting/tool_settings/remesh.html
karimnaji, https://github.com/karimnaaji/voxelizer
Guangming, Li, et al. "A new mesh simplification algorithm combining half-edge data structure with modified quadric error metric." Object recognition supported by user interaction for service robots. Vol. 2. IEEE, 2002. https://images-insite.sgp1.digitaloceanspaces.com/dunia_buku/koleksi-buku-lainnya/a-new-mesh-simplification-algorithm-combining-half-edge-data-structure-with-modified-quadric-pdfdrivecom-2881581480755.pdf