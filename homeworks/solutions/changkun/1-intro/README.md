# Homework 1: Getting started with mesh

This document explains my solution for homework 1.

## Implementation an .obj file loader and a CPU rasterizer

The source code files are placed in the `src` folder. One can run the solution
using the following commands:

```sh
$ npm i
$ npm start
```

The core implementation of the rasterizer and obj file loader are located
in the `src/raster.js` file.

## Reproduce teaser

Here is a reproduced teaser picture:

![](./assets/teaser.png)

> Note that you do not have to submit your `.blend` file.

There is also a procedure script that demonstrates how to reproduce
the teaser automatically. One can execute the Python script using
the following command:

```sh
$ blender -b -P teaser.py
```

Using blender from command line can be different in different OSes, further
information can be found [here](https://docs.blender.org/manual/en/latest/advanced/command_line/launch/index.html).

Further information regarding Python APIs can be found [here](https://docs.blender.org/api/current/index.html).

## The BMesh data structure

The BMesh structure is a non-manifold boundary representation, which
directly solves the issue that naive halfedge based structure cannot
represent manifold meshes.

The implementation can be found in: `source/blender/bmesh/*`.
The main elements:

- **Faces**, **Edges**, and **Verts** are generally the same comparing to the halfedge-based structure
  - Core difference: They all store a link to a loop (or halfedge) in **a (disk/radial/loop) cycle**.

```cpp
typedef struct BMHeader {
  ...
  int index;

  /** Element geometric type (verts/edges/loops/faces). */
  char htype;
  ...
} BMHeader;

typedef struct BMVert {
  BMHeader head;

  float co[3]; /* vertex coordinates */
  float no[3]; /* vertex normal */

  struct BMEdge *e;
} BMVert;

typedef struct BMEdge {
  BMHeader head;

  struct BMVert *v1, *v2; /* vertices (unordered) */

  /* the list of loops around the edge (use l->radial_prev/next)
   * to access the other loops using the edge */
  struct BMLoop *l;

  /**
   * Disk Cycle Pointers
   *
   * relative data: d1 indicates indicates the next/prev
   * edge around vertex v1 and d2 does the same for v2.
   */
  BMDiskLink v1_disk_link, v2_disk_link;
} BMEdge;


typedef struct BMFace {
  BMHeader head;

  int totbounds; /* total boundaries, is one plus the number of holes in the face */
  ListBase loops;
  int len;      /* number of vertices in the face */
  float no[3];  /* face normal */
  short mat_nr; /* material index */
} BMFace;
```

- **Loops** are almost identical to the halfedge concept, it is a boundary representation of a face.

```cpp
typedef struct BMLoop {
  BMHeader head;

  struct BMVert *v;
  struct BMEdge *e; /* edge, using verts (v, next->v) */
  struct BMFace *f;

  /* circular linked list of loops which all use the same edge as this one '->e',
   * but not necessarily the same vertex (can be either v1 or v2 of our own '->e') */
  struct BMLoop *radial_next, *radial_prev;

  struct BMLoop *next, *prev; /* next/prev verts around the face */
} BMLoop;
```

The core difference between halfedge and BMesh is the concept of **cycles**.
That is the connections between the elements are defined by loops around
topological entities. There are three types of cycles: disk cycle,
radial cycle, and loop cycle.
They surves the purspose for non-manifold representation.

- Loop cycle is basically a halfedge cycle that links all the edges of a polygon.

<img src="https://wiki.blender.org/w/images/9/99/Bmesh-facestructure.png" height="300"/>

- Disk cycle links all adjacent edges of a vertex (e.g. `v->e->v1_disk_link`), which is able to travel
all connecting edges directly instead of using a `for` loop though `halfedge.twin.next`. This basically solves the non-manifold condition on a vertex.

<img src="https://wiki.blender.org/w/images/0/0f/Bmesh-diskcycle.png" height="300"/>

- Radial cycle links all the faces around an edge, which is able to deal
with the non-manifold condition on an edge.

<img src="https://wiki.blender.org/w/images/6/6d/Bmesh-radialcycle.png" height="300"/>

### Mesh Editing

To allow further local operator implementation, the mesh editing functionality are separated to three different layers:

1. Low-level: primitive/atomic [Euler operators](https://en.wikipedia.org/wiki/Euler_operator), which preserves Euler-Poincaré characteristic, such as:

   - Split a given edge
   - Merge two edges and kill the connecting vert
   - Split a given face
   - Merge two faces and kill the connecting edge

2. Mid-level: iterators, walkers, etc as BMesh operator, such as (in `source/blender/bmesh/intern/bmesh_opdefines.c`):

    ```cpp
    const BMOpDefine *bmo_opdefines[] = {
        &bmo_average_vert_facedata_def,
        &bmo_beautify_fill_def,
        &bmo_bevel_def,
        &bmo_bisect_edges_def,
        &bmo_bmesh_to_mesh_def,
        &bmo_bridge_loops_def,
        &bmo_collapse_def,
        &bmo_collapse_uvs_def,
        &bmo_connect_verts_def,
        &bmo_connect_verts_concave_def,
        &bmo_connect_verts_nonplanar_def,
        &bmo_connect_vert_pair_def,
        &bmo_contextual_create_def,
        &bmo_create_circle_def,
        &bmo_create_cone_def,
        &bmo_create_cube_def,
        &bmo_create_grid_def,
        &bmo_create_icosphere_def,
        &bmo_create_monkey_def,
        &bmo_create_uvsphere_def,
        &bmo_create_vert_def,
        &bmo_delete_def,
        &bmo_dissolve_edges_def,
        &bmo_dissolve_faces_def,
        &bmo_dissolve_verts_def,
        &bmo_dissolve_limit_def,
        &bmo_dissolve_degenerate_def,
        &bmo_duplicate_def,
        &bmo_holes_fill_def,
        &bmo_face_attribute_fill_def,
        &bmo_offset_edgeloops_def,
        &bmo_edgeloop_fill_def,
        &bmo_edgenet_fill_def,
        &bmo_edgenet_prepare_def,
        &bmo_extrude_discrete_faces_def,
        &bmo_extrude_edge_only_def,
        &bmo_extrude_face_region_def,
        &bmo_extrude_vert_indiv_def,
        &bmo_find_doubles_def,
        &bmo_grid_fill_def,
        &bmo_inset_individual_def,
        &bmo_inset_region_def,
        &bmo_join_triangles_def,
        &bmo_mesh_to_bmesh_def,
        &bmo_mirror_def,
        &bmo_object_load_bmesh_def,
        &bmo_pointmerge_def,
        &bmo_pointmerge_facedata_def,
        &bmo_poke_def,
        &bmo_recalc_face_normals_def,
        &bmo_planar_faces_def,
        &bmo_region_extend_def,
        &bmo_remove_doubles_def,
        &bmo_reverse_colors_def,
        &bmo_reverse_faces_def,
        &bmo_reverse_uvs_def,
        &bmo_rotate_colors_def,
        &bmo_rotate_def,
        &bmo_rotate_edges_def,
        &bmo_rotate_uvs_def,
        &bmo_scale_def,
        &bmo_smooth_vert_def,
        &bmo_smooth_laplacian_vert_def,
        &bmo_solidify_def,
        &bmo_spin_def,
        &bmo_split_def,
        &bmo_split_edges_def,
        &bmo_subdivide_edges_def,
        &bmo_subdivide_edgering_def,
        &bmo_bisect_plane_def,
        &bmo_symmetrize_def,
        &bmo_transform_def,
        &bmo_translate_def,
        &bmo_triangle_fill_def,
        &bmo_triangulate_def,
        &bmo_unsubdivide_def,
        &bmo_weld_verts_def,
        &bmo_wireframe_def,
    };
    ```

3. Top-level: User-visible UI functionalities, written by scripts.
