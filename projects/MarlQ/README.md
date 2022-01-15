# (Volume-preserving) Soft Object Denting
## Functionality

Consider the situation where you have a soft object (e.g. a squishy ball), and a hard object (e.g. a hand).
You want the soft object to deform when the hard object presses into it.
But you do not want to sculpt this deformation by hand, nor do you want a complicated physics simulation.

This project provides a quick and dirty solution for this, without any kind of simulation.
Simply put the hard object into the soft object at the final position where it should be.
Then you just execute the script.

Because the algorithm has no concept of time or force, the results are obviously not physically accurate.
## How to use
Select two objects. 
The first selected object is considered the hard object, the last selected object (active object) is considered the soft object.
Then, execute the script (preferably from inside a Python editor window, using run script - shortcut Alt + P).

For the script to work properly, the two objects have to overlap (otherwise the script will do nothing).
The soft object should also be convex in the overlapping area, or the resulting geometry will be messed up (just as in real life its impossible to compress a non-convex shape).
## Comparison to other solutions

**Sculpting:** My solution takes significantly less effort and time, and provides more realistic results in terms of volume preservation.
Detail and geometry might be better when sculpting, however.

**Dynamic Paint:** Displacement using dynamic paint is not volume preserving, and can result in some artifacts. 
It is also troublesome to use with shape keys, and slows down animation.
My solution has none of these problems.

**Shrinkwrap:** Shrinkwrap can only be used as long as the nearest surface point of the hard object is not on the other side.
It also requires the usage of vertex groups.

**Boolean**: Booleans cause major changes to the mesh geometry, adding new vertices, and generally breaking edge flow.
Also not volume preserving.

**Soft body simulation:** ...


## Current issues

1. The overlapping soft object vertices are currently deformed along the average direction of their closest surface point on the hard object.
This creates unwanted results in a lot of cases.

2. 