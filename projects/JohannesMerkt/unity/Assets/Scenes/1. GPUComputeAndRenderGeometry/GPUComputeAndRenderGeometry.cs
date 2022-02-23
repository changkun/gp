using System.Collections;
using System.Collections.Generic;
using UnityEngine;

[ExecuteAlways]
public class GPUComputeAndRenderGeometry : MonoBehaviour
{
    public ComputeShader computeShader;
    public Material material;
    [Range(2,128)]
    public int pointsPerSide = 64;
    public float scale = 2;
    public float surfaceDensity = 1f;

    int computeKernel;
    uint numThreadX;
    uint numThreadY;
    uint numThreadZ;
    ComputeBuffer facesBuffer;
    ComputeBuffer faceCountBuffer;
    Bounds meshBounds;

    void Awake() 
    {
        Initialize();
    }

    void OnValidate() 
    {
        Initialize();
    }

    void OnEnable() {
        Initialize();
    }

    void Initialize()
    {
        facesBuffer?.Dispose();
        faceCountBuffer?.Dispose();
        computeKernel = computeShader.FindKernel("CSMain");
        computeShader.GetKernelThreadGroupSizes(computeKernel, out numThreadX, out numThreadY, out numThreadZ);
        int cubesPerSide = pointsPerSide - 1;
        facesBuffer = new ComputeBuffer(cubesPerSide * cubesPerSide * cubesPerSide * 5, sizeof(float) * 6 * 3, ComputeBufferType.Append);
        facesBuffer.SetCounterValue(0);
        faceCountBuffer = new ComputeBuffer(1, sizeof(int), ComputeBufferType.IndirectArguments);

        computeShader.SetInt("_pointsPerSide", pointsPerSide);
        computeShader.SetFloat("_time", Time.realtimeSinceStartup);
        computeShader.SetFloat("_scale", scale);
        computeShader.SetFloat("_surfaceDensity", surfaceDensity);
        computeShader.SetBuffer(computeKernel, "g_faces", facesBuffer);

        material.SetBuffer("verts", facesBuffer);
        meshBounds = new Bounds(transform.position, Vector3.one * scale);
    }

    void Update()
    {
        computeShader.SetFloat("_time", Time.realtimeSinceStartup);

        facesBuffer.SetCounterValue(0);

        int groupsPerSide = Mathf.CeilToInt((pointsPerSide - 1) / ((float) numThreadX));
        computeShader.Dispatch(computeKernel, groupsPerSide, groupsPerSide, groupsPerSide);
        
        ComputeBuffer.CopyCount(facesBuffer, faceCountBuffer, 0);
        int[] args = new int[] {0};
        faceCountBuffer.GetData(args);
        
        Graphics.DrawProcedural(material, meshBounds, MeshTopology.Triangles, args[0] * 3);
    }

    void OnDrawGizmos() {
        Gizmos.color = Color.white;
        Gizmos.DrawWireCube(meshBounds.max, meshBounds.size);
    }

    void OnDestroy() {
        facesBuffer?.Dispose();
        faceCountBuffer?.Dispose();
    }

    void OnDisable() {
        facesBuffer?.Dispose();
        faceCountBuffer?.Dispose();
    }
}
