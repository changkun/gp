# Proposal: Draw Geometry with Code

Johannes Merkt

31.12.2021

## Abstract

Shaders can be used to draw images with code. At shadertoy.com you can find many astonishing examples. This project wants to move this concept to the 3d world with geometry, allowing a user to write a shader to draw 3d geometry.

## Motivation

This project will take in a shader that describes a 3D volume with code and turns this into a geometry by analizing the density of the volume. It might also be possible to describe this volume with color too and turn this color information into vertex color of the geometry. In order to make this possible I would have to write a meshing algorithm that takes in the shader and generates a geometry as fast as possible.

Drawing with shaders is very powerful, it allows for high performant art that updates in real time, is procedural and can also be interactive. I find that fascinating. But what if I could write shaders that describe 3d Geometry? Then you could create complex geometry in a completly new way which is also interesting for others. I hope I will be able to make this proposed system performant enough to draw geometry in real time. If not it is still useful but has to be rendered or cached first for real time viewing.


## Proposal

It is planned to write a engine that takes in a shader (likely a compute shader) that describes a volume. This engine then calculates the geometry for parts of the volume that are greater than zero in density. The meshing algorithm has to be decided later on. This proposal isnt related to a research paper although it might be using a meshing algorithm that is described in a paper. The meshing of a volume is very much related to geometry processing. I havent seen an existing implementation/solution. 

## Implementation

I would love to create this in typescript with three.js, but since Compute shaders are not supported in the browser I will have to use unity. In unity the programming language is C#, the compute shader language is HLSL and it can target many platforms such as windows, linux and macos. First milestone will be to create a compute shader system that displays the volume denisity in the 3D world with debug points in different colors. An issue here might be finding a representation to describe a volume. The next milestone will be a first meshing algorithm that generate a mesh from the volume information. This will likely be very slow at first. Here I will likely encounter the most issues when creating a nonmanifold mesh without artifacts. Finally I will try to optimize performance as much as possible. If I figure out a way I will try to use compute shaders to generate the mesh as fast as possible. A big challange of this project is making the meshing process as fast as possible. To achieve this one has to find clever solutions to run tasks in parrallel and maybe even on the gpu. This will involve alot of research and trial and error. If I cannot make these run in parrallel I will fall back to a single core approach which isnt as fast but can still be useful and interesting for experiments.

## References

- Johannes S. Mueller-Roemer. GPU Data Structures and Code Generation for Modeling, Simulation, and Visualization. 2019. https://tuprints.ulb.tu-darmstadt.de/11291/1/dissertation-2019-12-20.pdf
- Unity. Compute Shaders. 2017. https://docs.unity3d.com/560/Documentation/Manual/ComputeShaders.html
- Blender. Metaball. 2021. https://developer.blender.org/diffusion/B/browse/master/source/blender/editors/metaball/
