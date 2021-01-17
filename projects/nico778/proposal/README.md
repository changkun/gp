# Proposal: [triangle mesh slicing as preparation for continuous fiber 3d printing]

[nico778]

[17.01.2020]

## Abstract

The goal of this project is the implementation of a simple slicing algorithm that transforms a triangle mesh into seperate, horizontal slices. These slices are also triangle meshes. 

## Motivation

Carbon fiber products have been around for decades, mostly in the form of singular components in fields such as aircraft, aerospace, motorsports, wind energy and automotive.  
In most conventional manufacturing processes carbon fibers are used in form of woven carbon fiber sheets. These sheets consist of many fiber filaments, which themself consist of many single carbon fibers.
The problem with this approach is the end point of each filament/fiber and the edges of each sheet. That is a structural weak point, which is solved by strategically arranging multiple layers of sheets on top of each other. The main advantage of carbon fiber vs various metal alloys are their tensile strength properties. With a continuous fiber manufacturing process we can leverage this main advantage to its full potential. 
However, it is a very tedious and "manual labour"-heavy process going from a 3d CAD model to usable instructions for the 3d printer. Particularly planning the layout of the fiber within the 3d model takes a lot of time[2]. In order for this working step to even be possible the 3d model has to be split into slices. This is necessary since most 3d printers have 3 axis and print an object layer by layer from the ground up. This slicing process is the core idea of this proposal.
Personally the use of carbon fiber and its possibilities has always fascinated me. Particularly well made DIY solutions. Since the cost of a capable 3d printers is going down year after year, the idea of reliable selfmade carbon fiber parts is slowly becoming reality. 


## Proposal

A simplistic slicing algorithm will be applied to an already existing 3d mesh. Based on my understanding of geometry processing, a slicing algorithm falls in this field because we are only applying mathematical operations in order to transform a geometric object into multiple geometric objects. The single slices will then be displayed as independent 3d meshes. As this project is implementing a very naive slicing algorithm, this proposal is not related to a research paper. There are solutions that implement such a naive algorithm, such as the referenced github repository.
I was also looking at various other, much better solutions presented in research papers. However, they far exceed my knowledge of mathematics and geometry processing and I did not even fully the research paper. So, implementing it would probably be impossible. My project will be different from the referenced one because I will be using a different programming language, etc.


## Implementation

Unlike in the referenced github repository, this implementation will be implemented with the same tech stack as in this course(VSCode/javascript/node.js/three.js).
Originally(and ultimately) my plan was using C++, OpenGL and the QT Framework. But because I have the same amount of javascript and C++ experience(very little), javascript seems to be the better route.
Like already mentioned, the proposed approach is the obvious naive solution. Using a plane as reference for the slicing process, we go through all the faces of the triangle mesh. We can then calculate which faces of the mesh are on which side of the plane. Based on that we the create the two resulting meshes. These meshes are not finished. We have to iterate through all faces of the original mesh that are intersected by the plane.
These faces are split into 3 new faces(see section Implementation[1]). The main difficulty will probably be the building of these boundary faces. Considering my struggle with HW4, this part will take the most time. 
Lastly our new meshes, whose number depends on the slice thickness) will be displayed as separate slices.
Should this project turn out to be too easy(I doubt it), the algorithm could be improved "indefinitely" to handle genus >0 meshes[3]/more complex meshes, and work faster.

## References

- Author name. Title. Publish date. https://link.to.the/resource.
- [1] Hugo Scurti. Mesh Cutter. Last visited on 17.01.2021. https://github.com/hugoscurti/mesh-cutter
- [2] Thomas Sanladerer. Carbon Fiber 3D Prints stronger than STEEL - from Anisoprint!. Last visited on 17.01.2021. https://www.youtube.com/watch?v=YI8y7rwSMFk&t=525s
- [3] Wiki Community. Genus g surface. Last visited on 17.01.2021. https://en.wikipedia.org/wiki/Genus_g_surface

