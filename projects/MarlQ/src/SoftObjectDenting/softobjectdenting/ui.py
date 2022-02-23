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
    from_mix : BoolProperty(
        name = "Shape key from mix",
        description = "Determines whether the newly created shaped is created from mix. ",
        default = False
        )
    use_decimate : BoolProperty(
        name = "Use decimate",
        description = "Using a temporary planar decimate on the hard object can help eliminate non-important features and improve deformation.",
        default = False
        )
    displace_increase : FloatProperty(
        name = "Indentation increase",
        description = "Additional displacement at the indentation point (makes the indentation deeper, creating a gap).",
        default = 0.02,
        )
    calculate_sinkin_range : BoolProperty(
        name = "Auto-calculate sink-in range",
        description = "Estimate the range of the sink-in based on the indentation depth (recommended).",
        default = True
        )
        
    sinkin_range : FloatProperty(
        name = "Sink-in range",
        description = "The range of the sink-in effect. A values that is too high may adversely affect volume preservation.",
        default = 1.2,
        min = 0.0
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
    

# ------------------------------------------------------------------------
#    Operators
# ------------------------------------------------------------------------

class WM_OT_SOD(Operator):
    bl_idname = "wm.sod"
    bl_label = "Deform"
    
    def execute(self, context):
        scene = context.scene
        sod_tool = scene.sod_tool
        main.deform(from_mix=sod_tool.from_mix,
                    displace_increase=sod_tool.displace_increase, 
                    calculate_sinkin_range=sod_tool.calculate_sinkin_range,
                    sinkin_range=sod_tool.sinkin_range,
                    delta_initial=sod_tool.delta_initial,
                    delta_increase=sod_tool.delta_increase,
                    volume_preservation=sod_tool.volume_preservation,
                    use_decimate=sod_tool.use_decimate)
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
        
        layout.prop(sod_tool, "from_mix")
        layout.prop(sod_tool, "use_decimate")
        layout.prop(sod_tool, "displace_increase")
        layout.prop(sod_tool, "calculate_sinkin_range")
        row = self.layout.row()
        row.prop(sod_tool, "sinkin_range")
        if sod_tool.calculate_sinkin_range is True:
            row.enabled = False
        layout.prop(sod_tool, "delta_initial")
        layout.prop(sod_tool, "delta_increase")
        layout.separator()
        layout.prop(sod_tool, "volume_preservation")

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