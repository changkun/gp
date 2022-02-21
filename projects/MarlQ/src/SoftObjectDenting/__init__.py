bl_info = {
    "name": "(Volume-preserving) Soft Object Denting",
    "description": "",
    "author": "MarlQ",
    "version": (0, 0, 1),
    "blender": (3, 0, 0),
    "category": "Object",
    "support": "COMMUNITY",
    "warning": "Work in progress", # used for warning icon and text in addons panel
    "wiki_url": "",
    "tracker_url": "",
    "location": "3D Viewport",
} 

import bpy

from .softobjectdenting import ui

def register():
    ui.register()

def unregister():
    ui.unregister()