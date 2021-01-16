# Proposal: [Quadrilateral Mesh Smoothing with mean value weights]

[torantie]

[16.01.2021]

## Abstract

The aim of this object is to give the existing halfedge structure from our exercises quadrilateral support and implement the Laplacian smooth with mean value weights.

## Motivation

Our lecture already introduced the halfedge structure to us. This was inteded as storage for a triangular mesh. Since the structure can also be used for quadrilateral meshes it could be interseting to extend the current implementation. Additionally, i want to focus on smoothing the different mesh structure. In the lectures and through  our exercises we were introduced to Laplacian smoothing with uniform and cotan weight. I want to implement this smoothing and add the option of mean value weights, since i find the resulting mesh interesting.


## Proposal

I want to implement quadrilateral support for the existing halfedge structure we were using in our exercises and implement Laplacian smoothing with mean value weights.
The project is mostly related to the content provided in lecture 1, 3 and 4. Specifically for the mean value weights of the Laplacian smooth, the paper of Floater describing mean value coordinates is relevant.
This is releavnt to geometry processing since it extends a data structure used for storing geometry and shows a different represantion of a geometry object. Furthermore, it concerns itself with mesh smoothing which is releavnt to decrease noise in the mesh.
Half edge structures can be implemented in a multitude of ways (see Lutz Kettner and Kalle Rutanen) and the smoothing will be based on the paper from Floater and the lecture slides, therefore this project will not be based on an existing solution.

Note that it is acceptable if there is an existing implementation. What's important is, you must do your implementation differently, e.g., an existing implementation was written in C++ and OpenGL, and you propose to implement it using JavaScript and three.js.

## Implementation

The programming language will be JavaScript and three.js. These will be the milestones.
1. building/adjusting the halfedge connectivity
2. adjust handling of boundary edges
3. adapt smoothing calculations based on mesh type (triangular or quadrilateral) for cotan, uniform and mean value weights

## References

The reference section should list all possible resources (e.g., Research papers, blog posts, development documentation, YouTube videos, etc.) that can help you finish the implementation. All resources should be formulated in the following format and ordered by name: 

- Author name. Title. Publish date. https://link.to.the/resource.
- Floater MS. Mean value coordinates. Computer aided geometric design. 2003 Mar. http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.95.6026&rep=rep1&type=pdf
- Lutz Kettner, Chapter 29 Halfedge Data Structures Tue, December 21, 2004 https://www.ics.uci.edu/~dock/manuals/cgal_manual/HalfedgeDS/Chapter_main.html
- Kalle Rutanen, Half-edge structure, 16.12.2014 https://kaba.hilvi.org/homepage/blog/halfedge/halfedge.htm
