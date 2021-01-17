# Proposal: Catmull–Clark Subdivision for a Halfedge-Mesh structure

krasnor

16.01.2021

## Abstract

The goal of this project is to implement the Catmull–Clark Subdivision surface algorithm for a halfedge-mesh structure. The halfedge-mesh structure must be capable of handling quad-faces, as the algorithm can produce quad faces from triangle faces.

## Motivation

During the lecture we were introduced into the halfedge-structure and various remeshing algorithms. In the exercises we got to know a down-sampling algorithm (QEM) much closer by implementing it, but we did not implement an up-sampling algorithm. Since I like the idea of altering the mesh structure via an algorithm I want to implement/extend the halfegde structure by an Subdivision (Catmull-Clark) algorithm. 

## Proposal

This section should discuss the core idea of your proposal, and also
addresses these question:

1. What exactly you want to implement? Explain with decent details.

2. Is your proposal related to a research paper(s)? List all of them.

   Why this is a geometry processing related topic/project?

4. What are the existing implementations/solutions? Or if not, please indicate.

5. How exactly your project can do things differently?

Note that it is acceptable if there is an existing implementation. What's important is, you must do your implementation differently, e.g., an existing implementation was written in C++ and OpenGL, and you propose to implement it using JavaScript and three.js.



I want to implement the Catmull-Clark subdivision algorithm [see Catmull et al.] for an halfedge-mesh structrue [?] . During initial reseach I noticed that the algorithm can/will convert triangle faces into quad-faces. Thus the halfedge structure must have quad-face support. As remeshing is part of geometry processing this project is relevant to the lecture. 

For the implementation the halfedge structure will be based on the already known code from the exercises and lecture, but will be extended to be able to handle quad-faces, the Catmull-Clark subdivision Algorithm will be based on original paper but adjusted to use the halfedge structure (instead of an Matrix representation used in the paper). Thus the project is not based on an already existing solution.

## Implementation

The Project will be implemented in JavaScript and three.js. Milestones will be:

1. implementing halfedge connectivity
2. adjust calculations for normals
3. handle (as three.js does not have )
4. implement the Catmull–Clark Subdivision algorithm
5. add support to compare original mesh and subdivided mesh, along with additional information (e.g. vertex count)



## References

The reference section should list all possible resources (e.g., Research papers, blog posts, development documentation, YouTube videos, etc.) that can help you finish the implementation. All resources should be formulated in the following format and ordered by name: 

- Author name. Title. Publish date. https://link.to.the/resource.
- E. Catmull, J. Clark. Recursively generated B-spline surfaces on arbitrary topological meshes. November 1978. https://doi.org/10.1016/0010-4485(78)90110-0
- ? halfgedge
