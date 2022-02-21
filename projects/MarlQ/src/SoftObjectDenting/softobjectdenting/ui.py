import bpy
from bpy.types import (Panel,
                       Operator,
                       PropertyGroup
                       )

from bpy.props import (BoolProperty,
                       FloatProperty,
                       PointerProperty
                       )

from . import main

# ------------------------------------------------------------------------
#    Scene Properties
# ------------------------------------------------------------------------      

class SODSettings(PropertyGroup):
    displace_increase : FloatProperty(
        name = "Indentation increase",
        description = "Additional displacement at the indentation point (makes the indentation deeper, creating a gap).",
        default = 0.02,
        )
    calculate_indent_range : BoolProperty(
        name = "Auto-calculate sink-in range",
        description = "Estimate the range of the sink-in based on the indentation depth (recommended).",
        default = True
        )
        
    indent_range : FloatProperty(
        name = "Sink-in range",
        description = "The range of the sink-in effect. A values that is too high may adversely affect volume preservation.",
        default = 1.2,
        min = 0.0
        )
    indent_smoothness : FloatProperty(
        name = "Sink-in smoothness",
        description = "The smoothness of the sink-in. Linear at value 0.",
        default = 0.95,
        min = 0.0,
        max = 1.0
        )

    delta_initial : FloatProperty(
        name = "Indentation displacement delta",
        description = "The distance at which the soft object vertices are affected by the hard object vertices. For the cleanest displacement, leave this value as high as possible, but if there are multiple intersections, the value has to be lower.",
        default = 5.0,
        min = 0.0001
        )

    delta_increase : FloatProperty(
        name = "Indentation displacement delta increase",
        description = "How much the delta increases each iteration if no hard object vertices can be found in the vicinity. Lower values may severely increase calculation times on low-density meshes.",
        default = 0.1,
        min = 0.0001
        )

    volume_preservation : FloatProperty(
        name = "Volume preservation factor",
        description = "How much of the volume is presrved and distributed across the rest of the mesh.",
        default = 1.0,
        )

    volume_ramp : FloatProperty(
        name = "Volume distribution ramp",
        description = "Over what distance the volume distribution ramps up before becoming constant.",
        default = 0.8,
        min = 0.0
        )

# ------------------------------------------------------------------------
#    Operators
# ------------------------------------------------------------------------

class WM_OT_SOD(Operator):
    bl_idname = "wm.sod"
    bl_label = "Deform"
    
    def execute(self, context):
        scene = context.scene
        sod_tool = scene.sod_tool
        main.deform(displace_increase=sod_tool.displace_increase, 
                    calculate_indent_range=sod_tool.calculate_indent_range,
                    indent_range=sod_tool.indent_range,
                    indent_smoothness=sod_tool.indent_smoothness,
                    delta_initial=sod_tool.delta_initial,
                    delta_increase=sod_tool.delta_increase,
                    volume_preservation=sod_tool.volume_preservation,
                    volume_ramp=sod_tool.volume_ramp)
        return {'FINISHED'}


# ------------------------------------------------------------------------
#    Panel in Object Mode
# ------------------------------------------------------------------------    

class OBJECT_PT_SODPanel(Panel):
    bl_idname = "OBJECT_PT_SODPanel"
    bl_label = "(Volume-preserving) Soft Object Denting"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "SoftObjectDenting"
    bl_context = "objectmode"
    
    @classmethod
    def poll(self,context):
        return context.object is not None
    
    def draw(self, context):
        layout = self.layout
        scene = context.scene
        sod_tool = scene.sod_tool
        
        layout.prop(sod_tool, "displace_increase")
        layout.prop(sod_tool, "calculate_indent_range")
        row = self.layout.row()
        row.prop(sod_tool, "indent_range")
        if sod_tool.calculate_indent_range is True:
            row.enabled = False
        layout.prop(sod_tool, "indent_smoothness")
        layout.prop(sod_tool, "delta_initial")
        layout.prop(sod_tool, "delta_increase")
        layout.separator()
        layout.prop(sod_tool, "volume_preservation")
        layout.prop(sod_tool, "volume_ramp")

        layout.operator("wm.sod")


def register():
    bpy.utils.register_class(SODSettings)
    bpy.utils.register_class(WM_OT_SOD)
    bpy.utils.register_class(OBJECT_PT_SODPanel)
    bpy.types.Scene.sod_tool = PointerProperty(type=SODSettings)

def unregister():
    bpy.utils.unregister_class(SODSettings)
    bpy.utils.unregister_class(WM_OT_SOD)
    bpy.utils.unregister_class(OBJECT_PT_SODPanel)
    del bpy.types.Scene.sod_tool