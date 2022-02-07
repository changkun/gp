# Individual Project - Voxelizer

# Installation and running
npm install 
npm start

# Usage
Use "showVoxels" to display. Use "n half vox per axis" to change the size of the individual voxel cubes.

# Input format constraints:
Since at the time the algorithm only performs Surface Voxelization, the only constraint on the input mesh
is that it needs to be a manifold mesh. The input mesh is scaled and translated to fit into a unit cube (cube size 1 with center(0,0,0) ).
This makes it easier to display and the voxelizing algorithm only needs to check a pre-defined axis range.

# Current TODOs
# LIMITATION
I did not add the code to efficiently create a single half-edge mesh during or after the voxelizing step. At the time, only Three.js is used
to visualize the voxels. 
I plan to add a method appendNewCube(Cube cube) that merges each new cube into the already existing mesh.

# Other Ideas
1) Visualize Half edge(s)
I plan to add a new rendering mode for both the input and output mesh that visualizes the halfedge data structure. For example, one can render
Halfedges, edges and edges on boundaries with different colors. This way it is easier to validate the correctness of the half edge construction(s).


