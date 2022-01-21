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

[<img src="/screenshots/characterSheet.png" width="400" height="400">](/assets/showcase_1.png)
[<img src="/screenshots/characterSheet.png" width="400" height="400">](/assets/showcase_2.png)
## How does it works

First, all overlapping vertices of both the soft object and the hard object are computed.
All overlapping vertices of the soft object are then displaced along the average normal of all overlapping vertices of the hard object until they hit the edges of the hard object.
The total displacement distance is accumulated, and then distributed across the rest of the mesh according to the inverse square law based on the distance to the overlap.
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

1. Since all overlapping vertices are displaced by the same vector, there can be a lot of stretching along the edges of overlap.
Some might consider this desirable, however.

2. Because the volume preservation works with displaced distance and not displaced volume, it is only fully volume preserving if the mesh geometry is even.