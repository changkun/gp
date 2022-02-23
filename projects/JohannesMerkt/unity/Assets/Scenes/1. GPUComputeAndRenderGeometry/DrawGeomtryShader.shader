Shader "Custom/DrawGeomtryShader"
{
    Properties
    {
    }
    SubShader
    {
  Tags{"LightMode"="ForwardBase" "RenderType"="Opaque" "Queue"="Geometry" }

        Pass
        {
            CGPROGRAM
            #include "UnityCG.cginc"
            #pragma vertex vert
            #pragma fragment frag

            // make fog work
            #pragma multi_compile_fog

            struct Vert{
                float3 pos;
                float3 normal;
            };

            //geometry buffer with 3 verts creating one triangle/face
            StructuredBuffer<Vert> verts;

            struct v2f {
                float4 pos : SV_POSITION;
                float3 worldPos : TEXCOORD0;
                float3 worldNormal : TEXCOORD1;
                UNITY_FOG_COORDS(1)
            };

            v2f vert(uint vertex_id: SV_VertexID, uint instance_id: SV_InstanceID)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(float4(verts[vertex_id].pos, 1));
                o.worldNormal = UnityObjectToWorldNormal(verts[vertex_id].normal);
                o.worldPos = mul(unity_ObjectToWorld, verts[vertex_id].pos);
                UNITY_TRANSFER_FOG(o,o.pos);
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                fixed4 col = fixed4(max(dot(normalize(_WorldSpaceLightPos0), normalize(i.worldNormal)), 0.0).xxx + UNITY_LIGHTMODEL_AMBIENT, 1.0);
                // apply fog
                UNITY_APPLY_FOG(i.fogCoord, col);
                return col;
            }
            ENDCG
        }
    }
    Fallback "VertexLit"
}
