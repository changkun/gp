# Proposal: (Volume-preserving) Soft Object Denting

MarlQ (Marcel Quanz)

01.01.2022

## Abstract

The basic idea of the project is to simulate the volume displacement of a soft (squishy) object by a hard object.
In practice, an actor, e.g. a hand, displaces the area of impact with a soft object, e.g. a stress ball, and forms a dent around the impact area.
In Blender, however, this simple deformation technique is absent for the most part.
Of course, the objects could be simulated as part of a soft body or cloth simulation to get the desired outcome, but this technique is cumbersome and not easy to control.
Complicated physics simulations are problematic in the context of rigged objects, and do not always produce the prefered results.
The proposed solution would be a simple, one-time executable operation to provide a simple way to get the desired shape, and apply it e.g. as a shape key.
Ideal would be the implementation as a C++-modifier for Blender in order to have it update automatically, but this out of the scope of the project for now.

## Motivation

Physics simulations for Blender provide realistic, but hard-to-control and not always viable methods for the deformation of soft objects.
Particularly, a simple volume displacement which creates (semi-)realistic dents is not available, especially for rigged objects, which are problematic to use with physics simulations.
When I was working with soft objects as part of an animation, I realised that Blender does not provide good tools for this kind of work.
The problem can be solved via hand-sculpted shape keys, but creating those is very time consuming.
Since this kind of deformation is actually present in a lot of daily interactions (considering hands themselves can act as a sort of soft body), it makes it important for ultra-realistic animation.
The shadows created by these deformations are important for realism.
I imagine others would be interested in this feature as well. 

## Proposal

The proposed feature is a simple, momentary simulation of the volume displacement of a soft object caused by one (or more) solid object(s).
This displacement would directly impact the vertex positions of the soft object, changing the mesh.
Ideally, these deformations could then be saved as shape keys.
Physical properties like elasticity or material density of the soft object could be factored in as parameters, to control the range of the volume displacement and its strength.
However, other typical physical properties like gravity, or even push resistance should not be considered.
The former (gravity) would create undesirable side effects. 
The latter (push resistance) does not make sense, considering it is a momentary simulation --- this means that the hard object already intersects with the soft object which would indicate a possibly infinite force being exerted onto the soft object, rendering any push resistance meaningless.

Unfortunately, I could not yet find much regarding this topic, except a video showcasing a simple method utilizing booleans for Houdini, which labels the method as 'boolean denting' (Boolean Denting (VDB Basics)).
The results from that method look alright for some cases, but the resulting dents are way too exaggerated, making them look more artistic rather than realistic.
Jasper Flick also made a tutorial for a similar effect for the Unity engine, mentioning the use of the inverse-square law in conjunction with the force exerted onto the soft object (Mesh Deformation - Making a Stress Ball).

## Implementation
As a Blender addon, the project will be implemented in Python.
For now, the connected functions will be implemented one after the other, starting with a simple displacement operation, which displaces all overlapping vertices of a soft object with another, hard object.
To enable better shadow and light interactions, here, already, can be made improvements by creating a small gap betweent the objects.

Then, the remaining displaced volume will distributed across the rest of the object.
How exactly it will be distributed remains an open question, but there multiple posibilities (e.g. simple linear falloff, inverse-square).
Material properties could change the exact way the force caused by the volume displacement is distributed.
Considerations will have to be made how to handle the overlapping points (when the objects intersect at multiple areas).

Lastly, the dents will be smoothed, based on the materials shear resistance, as the dents usually do not form in immediate vicinity of the displacing object.

## References

- Entagma. Boolean Denting (VDB Basics). Dec 26, 2019.  https://www.youtube.com/watch?v=9VcIP7ByDGE
- Jasper Flick. Mesh Deformation - Making a Stress Ball (Unity C# Tutorials). https://catlikecoding.com/unity/tutorials/mesh-deformation/