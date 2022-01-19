# Proposal: Delta Mush

nico778

01.01.2022

## Abstract

Delta Mush smoothes a deformed mesh while not losing the detail of the original mesh.
This project tries to implement the algorithm presented in the paper by Mancewicz et al.

## Motivation

Character rigs that are used in animations should represent a realistic and natural model of the character. To achieve this, the deformations, or even short sequences of an information, should avoid looking unrealistic and unnatural to the human eye.
Since the clean up of these bad deformations relies on a lot of manual labour. 
Delta Mush solves this by maintaining the detail of the original mesh in the deformed mesh.
Delta Mush caught my eye during the lecture, because I was not aware that there is already a solution for this problem.
I'm very interested to see how the algorithm works in detail. 
This work could be interesting to anybody involved in the creation of animations(in games/films). There might also be application potential in the field of engineering, specifically various CAD tasks.

## Proposal

The goal is to implement the Delta Mush algorithm that is described in the paper by Mancewicz et al..
This project is geometry processing related because it solves a practical problem by modifying the mesh structure
There are a few implementation on github, mostly in C++ and with Maya integration.
I have not seen any js implementations using three.js.  

## Implementation

Since I am already used to typescript and three.js, these will be used in this project.

Milestones:
1. the smoothing of the original undeformed mesh
2. creating the local rest coordinate system
3. creating the local current coordinate system
4. restore the volume and detail of the mesh

For now only a simple tube consisting of connected separate rings(page 20, gp-ws2122-06-deform) will be used as a mesh to work on. I am expecting to run into a few problems with the local coordinate systems, especially how to verify that they are correct.
Hopefully this can be managed by writing appropriate test. If necessary I will be looking at existing implementations in other programming languages.

## References

- Mancewicz et al.. Delta Mush: Smoothing Deformations While Preserving Detail. 2014. https://dl-acm-org.emedien.ub.uni-muenchen.de/doi/pdf/10.1145/2633374.2633376.
