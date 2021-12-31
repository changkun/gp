# Proposal: Connectivity Regularization

Jakob Schmid

30.12.21

## Abstract

The project aims to write an algorithm, that regularizes an input mesh into a more regular mesh, by local operations on the vertices.
The implementation will be based on a section of the provided paper.

## Motivation

The process is related to the paper: "Explicit Surface Remeshing" by Surazhsky and Gotsman, that uses a complex algorithm for remeshing, and as the last step performs Connectivity Regularization.
Since i think the remeshing algorithm is too difficult and complex as a project for this course i thought i could implement only the last step.
What's interesting about the approach proposed is that, since it is using local operations, and is an elegant and efficient way to improve regularity of a mesh, while leaving the vertex positions largely the same.
The features are more closely described in the proposal section.

## Proposal

The approach described in the paper first uses basic edge flips, and then a sequence of steps, classifying irregluar edges using edge collapses further swaps and angle-based smoothing, in order to create a more regular mesh.
It is based on section 5 of the paper, which explains the process in more detail.
This is a geometry processing topic since triangulation and remeshing is a part of that.
The process is only part of a complex remeshing algorithm, and i didn't find any existing implementations of it so far.

## Implementation

I plan on implementing the project in typescript, like the homework assignments.

Milestones could be:
-Implementing basic edge operations, such as edge-flip, edge collapse, edge split
-Implementing angle based smoothing
-Algorithm for basic edge swaps
-Algorithm for advanced edge classification and handling

Problems could arise with the angle based smoothing, since that might be difficult to implement, and also changes Vertex positions.
I hope theose won't be too problematic, since the smoothing is only applied locally

A different idea i could use as a backup plan is to regularize a mesh, by using:
-First a simplification (e.g the qslim we implemented as homework)
-Then Use edge flips to regularize Vertices
-Use regular subdivision to get a high regular mesh
(A Problem of that approach would be loss of details during simplification)

## References


-Ligang Liu, Lecture slides on Delaunay Triangulation and Mesh Generation, http://staff.ustc.edu.cn/~lgliu/Courses/DGP_2012_spring-summer/Courseware/DGP03_DT-and-MeshGeneration.pdf
-Surazhsky and Gotsman, Explicit Surface Remeshing, 2003, http://mesh.brown.edu/DGP/pdfs/Surazhsky-sgp03.pdf
