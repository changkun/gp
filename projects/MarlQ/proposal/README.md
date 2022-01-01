# Proposal: (Volume-preserving) Soft Object Denting

MarlQ (Marcel Quanz)

[Date]

## Abstract

A short abstract that summarizes the proposal. Maximum 200 words.






The basic idea of the project is to simulate the volume displacement of soft (squishy) objects.
In practice, an actor, e.g. a hand, displaces the area of impact with a soft object, e.g. a stress ball, and forms a dent around the impact area.
In Blender, however, this simple deformation technique is absent for the most part.
Of course, the objects could be simulated as part of a soft body or cloth simulation to get the desired outcome, but this technique is cumbersome and not easy to control.
Complicated physics simulations are problematic in the context of rigged objects, and do not always produce the prefered results.
A simple, boolean-like operation, however, provides a simple way to get the desired shape, and apply e.g. as a shape key.
Ideal would be the implementation as a C++-modifier for Blender, but this out of the scope of the project for now.


## Motivation

In this section, we should write a good introduction to the background of an
individual project. The following questions should be answered as an introduction:

1. What are the problems or features included in the project?
2. Why is it interesting to *you*, or what motivates you to work on it?
3. Why it is interesting to *others*, or what attracts people to admire the work?






Physics simulations for Blender provide realistic, but hard-to-control and not always viable methods for the deformation of soft objects.
Particularly, a simple volume displacement which creates (semi-)realistic dents is not available, especially for rigged objects, which are problematic to use with physics simulations.
When I was working with soft objects as part of an animation, I realised that Blender does not provide good tools for this kind of work.
The problem can be solved via hand-sculpted shape keys, but creating those is very time consuming.
Since this kind of deformation is actually present in a lot of daily interactions (considering hands themselves can act as a sort of soft body), making it important for ultra-realistic animation, I imagine others would be interested in this feature as well. 

## Proposal

This section should discuss the core idea of a proposal, and also
addresses these question:

1. What are the planned features to implement? Explain with decent details.
2. Is the proposal related to a research paper(s)? List all of them.
3. Why this is a geometry processing related topic/project?
4. What are the existing implementations/solutions? Or if not, please indicate.
5. How exactly the project can do things differently?

Note that it is important that an implementation should be done differently than
existing ones. For instance, an existing implementation was written in C++ and OpenGL, and you may propose to implement it using TypeScript and three.js.



The proposed feature is a simple, momentary simulation of the volume displacement of a soft object caused by one (or more) solid object(s).
This displacement would directly impact the vertex positions of the soft object, changing the mesh.
Ideally, these deformations could then be saved as shape keys.
Physical properties like elasticity or material density of the soft object could be factored in as parameters, to control the range of the volume displacement and its strength.
Meanwhile other typical physical properties like gravity, or even push resistance should not be considered.
The former (gravity) would create undesirable side effects. The latter (push resistance) does not make sense, considering it is a momentary simulation. 
This means that the hard object already intersects with the soft object which would indicate a possibly infinite force being exerted onto the soft object, rendering any push resistance meaningless.


Unfortunately, I could not yet find much regarding this topic, except a video showcasing a simple method utilizing booleans for Houdini, which labels the method as 'boolean denting' (Boolean Denting (VDB Basics)).
Jasper Flick also made a tutorial for a similar effect for the Unity engine, mentioning the use of the inverse-square law in conjunction with the force exerted onto the soft object (Mesh Deformation - Making a Stress Ball).

## Implementation

This section should discuss a concrete plan about how to implement the proposed idea.
The following question should be answered in this section:

1. What could be the development settings, e.g., programming language, possible dependencies, target platforms, etc.
2. What are the milestones for the project?
3. What issues might occur in each milestone during the implementation?
4. What are challenges might encounter?
5. How is the plan of solving all these issues and challenges?
6. What are the alternative solutions (Plan B) if the issue cannot be resolved?


As a Blender addon, the project will be implemented in Python.
For now, the connected functions will be implemented one after the other, starting with a simple displacement operation, which displaces all overlapping vertices of a soft object with another, hard object.
To enable better shadow and light interactions, here, already, can be made improvements by creating a small gap betweent the objects.
Afterwards, the dents will be generated, based on the displaced volume, and the object density as a parameter.
Considerations will have to be made how to handle the overlapping points (when the objects at multiple points).
Lastly, the remaining displaced volume will distributed across the rest of the object (though this step could also be combined with the previous).
How exactly it will be distributed remains an open question, but there multiple posibilities (e.g. simple linear falloff, inverse-square).
Material properties could change the exact way the force caused by the volume displacement is distributed.



## References

- Entagma. Boolean Denting (VDB Basics). Dec 26, 2019.  https://www.youtube.com/watch?v=9VcIP7ByDGE
- Jasper Flick. Mesh Deformation - Making a Stress Ball (Unity C# Tutorials). https://catlikecoding.com/unity/tutorials/mesh-deformation/