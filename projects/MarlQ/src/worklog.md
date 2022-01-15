The following only documents problems with the approach, *not* the implementation.

# Step 1: Displacing the soft object vertices so that it no longer intersects with the hard object

## First implementation
Trying to find vertices of the soft object inside the hard object, then move those to the closest point on the hard object.

**Problem:** closest point on the hard object can potentially be on the other side of the hard object. 
The soft object still intersects the hard object at the end.

## Second implementation
For all vertices of the soft object, find the closest point on all surfaces of the hard object, which *intersect* with the soft object.

**Problem:** Even though a face intersects with the soft object, that doesn't mean that *all points* on the face intsersect with the soft object.
This could 

## Idea (not implemented)
Sample points along the faces of the hard object, which intersect with the soft object *and* are inside the soft object.
Then, for each point of the soft object inside the hard object, find the closest among those sampled points.

**Potential problem:** if not enough points are sampled, two inside vertices could find the same sampled point.

## Third implementation
For all vertices of the soft object, find the closest point on all surfaces of the hard object, which *intersect* with the soft object.
Then calculate the average of all those direction vectors.
Then, for each vert of the soft object, raycast using that average vector onto the hard object, and use the point of intersection as the new position.

**Problems:**
1. The faces around the edge of the impact area can stretch very far, especially if the hard object sticks into the soft object quite far.
2. Also still suffers from the problem that faces can still intersect with the hard object at the end, because verts are moved, not faces.
3. Most severe: if the hard object sticks too far into the soft object, and not straight on, the average vector is completely wrong (goes to the side)

## Idea (to solve 3.)
Take the average normal fector of all inside faces (or verts). This way, the average is not affected by how the hard object hits the soft object.


## Other problems

- Even if not vertices of the soft object are inside the hard object, some faces of the soft object can still intersect with the hard object.
However, simply moving faces instead of vertices would create jagged edges.
- Non-convex soft object shapes are not preserved at all (creating lots of intersecting geometry). *NOT A PROBLEM. IMPOSSIBLE TO SOLVE.*


## Solution requirements
Soft object has to be convex at the overlapping area (otherwise intersecting geometry in the solution can occur).

- All points for each face in the soft object have to be moved *in the same direction* (otherwise the face can still overlap with the hard object)
- The target points for each vertex of the soft object inside the hard object:
    - Have to be inside the original soft object
    - Have to be on the surface of the hard object
    - Have to be unique
    - Should not cause the soft object geometry to intersect excessively


# Step 2: Adding the lost volume back to the soft object

## First implementation
Sum up all distances that all vertices moved during the first step.
Then, based on the distance to the closest overlapping vertex, distribute this distance across the mesh according to the inverse square law.
Every vertex is then discplaces along its normal by this distance.
