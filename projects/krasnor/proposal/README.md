# Proposal: Catmull–Clark Subdivision for a Halfedge-Mesh structure

krasnor

16.01.2021

## Abstract

The goal of this project is to implement the Catmull–Clark subdivision algorithm for a halfedge-mesh structure. The halfedge-mesh structure must be capable of handling quad-faces, as the algorithm can produce quad faces from triangle faces.

## Motivation

During the lecture we were introduced into the halfedge-structure and various remeshing algorithms. In the exercises we got to know a down-sampling algorithm (QEM) much closer by implementing it, but we did not implement an up-sampling algorithm. Since I like the idea of altering the mesh structure via an algorithm I want to implement/extend the halfegde structure by an subdivision algorithm (Catmull-Clark). 

## Proposal

I want to implement the Catmull-Clark subdivision algorithm [see Catmull et al.] for a halfedge-mesh structrue [see Kettner]. During initial reseach I noticed that the algorithm can convert triangle faces into quad-faces. Thus the halfedge structure must have quad-face support. As remeshing is part of geometry processing this project is relevant to the lecture. 

I will use HTML5, Javascript, [Node.js](https://nodejs.org/) and the library [three.js](http://threejs.org/) for this project. 

The implementation of the halfedge structure will be based on the already known code from the exercises and lecture, but will be extended to be able to handle quad-faces, the Catmull-Clark subdivision algorithm will be based on the original paper but adjusted to use the halfedge structure (instead of an Matrix representation used in the paper). Thus the project is not based on an already existing solution.

## Implementation

The Project will be implemented in by the usage of HTML5, JavaScript, [Node.js](https://nodejs.org/) and [three.js](http://threejs.org/). Milestones will be:

1. implementing halfedge connectivity for quad-faces
2. adjust calculations for normals
3. get threejs to handle the Quads Mesh (as three.js does not have Face4 Support anymore)
4. implement the Catmull–Clark Subdivision algorithm
5. add support to compare original mesh and subdivided mesh, along with additional information (e.g. vertex count)



## References

The reference section should list all possible resources (e.g., Research papers, blog posts, development documentation, YouTube videos, etc.) that can help you finish the implementation. All resources should be formulated in the following format and ordered by name: 

- E. Catmull, J. Clark. Recursively generated B-spline surfaces on arbitrary topological meshes. November 1978. https://doi.org/10.1016/0010-4485(78)90110-0
- L. Kettner, Chapter 29 Halfedge Data Structures. December 21, 2004 https://www.ics.uci.edu/~dock/manuals/cgal_manual/HalfedgeDS/Chapter_main.html
- OpenJS Foundation, Node.js, Last visited 17.012021, https://nodejs.org/en/
- Three.js, Last visited 17.01.2021, https://threejs.org/
