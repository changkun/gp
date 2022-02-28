// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by JohannesMerkt johannes.merkt@campus.lmu.de
// 
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

using System.Collections.Generic;
using UnityEngine;

[RequireComponent(typeof(MeshFilter))]
[ExecuteAlways]
public class GPUComputeChunksMergeOnCPU : MonoBehaviour
{
    struct FaceIndexTuple {
        public uint a;
        public uint b;
        public uint c;
    }

    struct VertWithIndex {
        public Vector3 pos;
        public Vector3 normal;
        public uint uniqueKey;
    }

    public ComputeShader computeShader;
    [Range(2,128)]
    public int pointsPerSide = 64;
    public float scale = 2;
    public float surfaceDensity = 1f;
    public bool drawChunks = false;

    int computeKernel;
    uint numThreadX;
    uint numThreadY;
    uint numThreadZ;

    ComputeBuffer cubeInfosBuffer;
    ComputeBuffer cubeFacesBuffer;
    ComputeBuffer cubeVertsBuffer;
    ComputeBuffer chunkInfosBuffer;
    ComputeBuffer chunkFacesBuffer;
    ComputeBuffer chunkVertsBuffer;
    Mesh mesh;


    void Awake() {
        Initialize();
    }

    void OnValidate() {
        Initialize();
    }

    void Initialize() {
        mesh = new Mesh();
        GetComponent<MeshFilter>().mesh = mesh;
        computeKernel = computeShader.FindKernel("CSMain");
        computeShader.GetKernelThreadGroupSizes(computeKernel, out numThreadX, out numThreadY, out numThreadZ);
        ReleaseBuffer();
        int cubesPerSide = pointsPerSide - 1;
        int chunksPerSide = Mathf.CeilToInt(cubesPerSide / 3f);
        cubeInfosBuffer = new ComputeBuffer(chunksPerSide * chunksPerSide * chunksPerSide * 27, sizeof(uint));
        cubeFacesBuffer = new ComputeBuffer(chunksPerSide * chunksPerSide * chunksPerSide * 27 * 5, sizeof(uint) * 3);
        cubeVertsBuffer = new ComputeBuffer(chunksPerSide * chunksPerSide * chunksPerSide * 27 * 12, sizeof(float) * 6 + sizeof(uint));
        chunkInfosBuffer = new ComputeBuffer(chunksPerSide * chunksPerSide * chunksPerSide, sizeof(uint));
        chunkFacesBuffer = new ComputeBuffer(chunksPerSide * chunksPerSide * chunksPerSide * 135, sizeof(uint) * 3);
        chunkVertsBuffer = new ComputeBuffer(chunksPerSide * chunksPerSide * chunksPerSide * 144, sizeof(uint) + sizeof(float) * 6);
        computeShader.SetInt("_pointsPerSide", pointsPerSide);
        computeShader.SetInt("_chunksPerSide", chunksPerSide);
        computeShader.SetFloat("_scale", scale);
        computeShader.SetFloat("_surfaceDensity", surfaceDensity);
        computeShader.SetBuffer(computeKernel, "_cubeInfosOutput", cubeInfosBuffer);
        computeShader.SetBuffer(computeKernel, "_cubeFacesOutput", cubeFacesBuffer);
        computeShader.SetBuffer(computeKernel, "_cubeVertsOutput", cubeVertsBuffer);
        computeShader.SetBuffer(computeKernel, "_chunkInfosOutput", chunkInfosBuffer);
        computeShader.SetBuffer(computeKernel, "_chunkFacesOutput", chunkFacesBuffer);
        computeShader.SetBuffer(computeKernel, "_chunkVertsOutput", chunkVertsBuffer);
    }

    void Update()
    {
        calculateMesh();
    }

    void calculateMesh() {
        float calculationStart = Time.realtimeSinceStartup;
        computeShader.SetFloat("_time", Time.realtimeSinceStartup);
        int cubesPerSide = pointsPerSide - 1;
        int chunksPerSide = Mathf.CeilToInt(cubesPerSide / 3f);
        computeShader.Dispatch(computeKernel, chunksPerSide, chunksPerSide, chunksPerSide);

        uint[] chunkInfosData = new uint[chunkInfosBuffer.count];
        FaceIndexTuple[] chunkFacesData = new FaceIndexTuple[chunkFacesBuffer.count];
        VertWithIndex[] chunkVertsData = new VertWithIndex[chunkVertsBuffer.count];

        chunkInfosBuffer.GetData(chunkInfosData);
        chunkFacesBuffer.GetData(chunkFacesData);
        chunkVertsBuffer.GetData(chunkVertsData);

        Dictionary<uint, int> vertMap = new Dictionary<uint, int>();
        List<Vector3> verts = new List<Vector3>();
        List<Vector3> normals = new List<Vector3>();
        List<int> faces = new List<int>();
        for(int i = 0; i < chunkInfosData.Length; i++) {
            if (IsBitSet(chunkInfosData[i], 0)) { // check if chunk contains mesh

                int faceCount = getNumberFromBits(chunkInfosData[i], 1, 8);
                for (int f = 0; f < faceCount; f++) {
                    FaceIndexTuple faceTuple = chunkFacesData[(i * 135) + f];
                    VertWithIndex[] faceVerts = new VertWithIndex[] {
                        chunkVertsData[(i * 144) + faceTuple.a],
                        chunkVertsData[(i * 144) + faceTuple.b],
                        chunkVertsData[(i * 144) + faceTuple.c],
                    };
                    for (int v = 0; v < faceVerts.Length; v++) {
                        if (!vertMap.ContainsKey(faceVerts[v].uniqueKey)) {
                            vertMap.Add(faceVerts[v].uniqueKey, verts.Count);
                            verts.Add(faceVerts[v].pos);
                            normals.Add(faceVerts[v].normal);
                        } else {
                            normals[vertMap[faceVerts[v].uniqueKey]] += faceVerts[v].normal;
                        }
                    }
                    faces.Add(vertMap[faceVerts[0].uniqueKey]);
                    faces.Add(vertMap[faceVerts[1].uniqueKey]);
                    faces.Add(vertMap[faceVerts[2].uniqueKey]);
                }
            }
        }
        for (int l = 0; l < normals.Count; l++) {
            normals[l] = normals[l].normalized;
        }
        mesh.Clear();
        mesh.vertices = verts.ToArray();
        mesh.triangles = faces.ToArray();
        mesh.normals = normals.ToArray();
        Debug.Log("CalculationTime:");
        
        Debug.Log(Time.realtimeSinceStartup - calculationStart);
    }

    void OnDrawGizmos() {
        if (drawChunks) {
            int cubesPerSide = pointsPerSide - 1;
            int chunksPerSide = Mathf.CeilToInt(cubesPerSide / 3f);
            float chunkSize = scale / chunksPerSide;
            Gizmos.color = Color.yellow;
            for (int x = 0; x < chunksPerSide; x++) {
                for (int y = 0; y < chunksPerSide; y++) {
                    for (int z = 0; z < chunksPerSide; z++) {
                        
                        Vector3 offset = new Vector3(x,y,z) * chunkSize;
                        Gizmos.DrawWireCube(getCubeCenter(transform.position + offset, chunkSize), Vector3.one * chunkSize);
                    }
                }
            }
        }
        Gizmos.color = Color.white;
        Gizmos.DrawWireCube(getCubeCenter(transform.position, scale), Vector3.one * scale);
        Gizmos.DrawSphere(transform.position, 0.1f);
    }

    Vector3 getCubeCenter(Vector3 pos, float size) {
        return pos + Vector3.one * size / 2;
    }

    int getNumberFromBits(uint info, int startPos, int endPos) {
        int result = 0;
        for(int i = startPos; i <= endPos; i++) {
            if (IsBitSet(info, i)) {
                result += Mathf.RoundToInt(Mathf.Pow(2, i - startPos));
            }
        }
        return result;
    }

    bool IsBitSet(uint info, int pos) {
        return (info & (1 << pos)) != 0;
    }

    void ReleaseBuffer() {
        cubeInfosBuffer?.Release();
        cubeFacesBuffer?.Release();
        cubeVertsBuffer?.Release();
        chunkInfosBuffer?.Release();
        chunkFacesBuffer?.Release();
        chunkVertsBuffer?.Release();
    }

    void OnDisable() {
        ReleaseBuffer();
    }

    void OnDestroy() {
        ReleaseBuffer();
    }
}
