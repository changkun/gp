// Copyright (c) 2021 LMU Munich Geometry Processing Authors. All rights reserved.
// Created by JohannesMerkt johannes.merkt@campus.lmu.de
// 
// Use of this source code is governed by a GNU GPLv3 license that can be found
// in the LICENSE file.

using System.Collections;
using System.Collections.Generic;
using UnityEngine;

[RequireComponent(typeof(MeshFilter))]
[ExecuteAlways]
public class MergeCubesCPUwithUnityNormals : MonoBehaviour
{
    struct FaceIndexTuple {
        public int a;
        public int b;
        public int c;
    }

    struct VertWithIndex {
        public Vector3 pos;
        public int index;
    }
    struct CubeData {
        public int infos;
        public VertWithIndex vert1;
        public VertWithIndex vert2;
        public VertWithIndex vert3;
        public VertWithIndex vert4;
        public VertWithIndex vert5;
        public VertWithIndex vert6;
        public VertWithIndex vert7;
        public VertWithIndex vert8;
        public VertWithIndex vert9;
        public VertWithIndex vert10;
        public VertWithIndex vert11;
        public VertWithIndex vert12;
        public Vector3Int face1;
        public Vector3Int face2;
        public Vector3Int face3;
        public Vector3Int face4;
        public Vector3Int face5;
    };
    public ComputeShader computeShader;
    [Range(2,128)]
    public int pointsPerSide = 64;
    public float scale = 2;
    public float surfaceDensity = 1f;
    public int framesPerSecond = 10;

    float nextFrame = 0;
    bool settingsChanged = false;
    bool initialized = false;
    int computeKernel;
    uint numThreadX;
    uint numThreadY;
    uint numThreadZ;

    ComputeBuffer cubesBuffer;
    Mesh mesh;

    bool isCalculatingMesh = false;

    void Awake() {
        Initialize();
    }

    void OnValidate() {
        Initialize();
    }

    void Initialize() {
        settingsChanged = true;
        mesh = new Mesh();
        GetComponent<MeshFilter>().mesh = mesh;
        computeKernel = computeShader.FindKernel("CSMain");
        computeShader.GetKernelThreadGroupSizes(computeKernel, out numThreadX, out numThreadY, out numThreadZ);
        ReleaseBuffer();
        int cubesPerSide = pointsPerSide - 1;
        cubesBuffer = new ComputeBuffer(cubesPerSide * cubesPerSide * cubesPerSide, ((sizeof(float) * 3) + sizeof(int)) * 12 + sizeof(int) * 3 * 5 + sizeof(int));
        computeShader.SetInt("_pointsPerSide", pointsPerSide);
        computeShader.SetFloat("_scale", scale);
        computeShader.SetFloat("_surfaceDensity", surfaceDensity);
        computeShader.SetBuffer(computeKernel, "_cubeDataOutput", cubesBuffer);
    }

    void Update()
    {
        if (!isCalculatingMesh && (settingsChanged || (Time.realtimeSinceStartup >= nextFrame))) {
            nextFrame = Time.realtimeSinceStartup + (1f / ((float) framesPerSecond));
            calculateMesh();
            settingsChanged = false;
        }
    }

    void calculateMesh() {
        float calculationStart = Time.realtimeSinceStartup;
        int cubesPerSide = pointsPerSide - 1;
        computeShader.SetFloat("_time", Time.realtimeSinceStartup);
        isCalculatingMesh = true;
        computeShader.Dispatch(computeKernel, Mathf.CeilToInt(cubesPerSide / (float) numThreadX), Mathf.CeilToInt(cubesPerSide / (float) numThreadY), Mathf.CeilToInt(cubesPerSide / (float) numThreadZ));
        CubeData[] cubeData = new CubeData[cubesBuffer.count];
        cubesBuffer.GetData(cubeData);

        Dictionary<int, int> vertMap = new Dictionary<int, int>();
        List<Vector3> verts = new List<Vector3>();
        List<int> faces = new List<int>();
        for(int i = 0; i < cubeData.Length; i++) {
            int cubeY = Mathf.FloorToInt(i / (float) (cubesPerSide * cubesPerSide));
            int remaining = i - cubeY * cubesPerSide * cubesPerSide;
            int cubeZ = Mathf.FloorToInt(i / (float) cubesPerSide);
            int cubeX = remaining - cubeZ * cubesPerSide;
            BitArray bitArray = new BitArray(new int[] { cubeData[i].infos });
            bool[] bits = new bool[bitArray.Count];
            bitArray.CopyTo(bits, 0);
            if (bits[0]) {
                int faceCount = 0;
                if (bits[1]) {
                    faceCount++;
                }
                if (bits[2]) {
                    faceCount+=2;
                }
                if (bits[3]) {
                    faceCount+=4;
                }
                // verts
                for (int j = 4; j < 16; j++) {
                    if (bits[j]) {
                        VertWithIndex vert = getVert(cubeData[i],j-4);
                        if (!vertMap.ContainsKey(vert.index)) {
                            vertMap.Add(vert.index, verts.Count);
                            verts.Add(vert.pos);
                        }
                    }
                }
                // faces
                for (int k = 0; k < faceCount; k++) {
                    Vector3Int face = getFace(cubeData[i], k);
                    VertWithIndex vert1 = getVert(cubeData[i], face.x);
                    VertWithIndex vert2 = getVert(cubeData[i], face.y);
                    VertWithIndex vert3 = getVert(cubeData[i], face.z);
                    Vector3Int realIndices = Vector3Int.zero;
                    bool error = false;
                    if (vertMap.ContainsKey(vert1.index)) {
                        realIndices.x = vertMap[vert1.index];
                    } else {
                        error = true;
                        Debug.LogError("Vert of face does not exist");
                    }
                    if (vertMap.ContainsKey(vert2.index)) {
                        realIndices.y = vertMap[vert2.index];
                    } else {
                        error = true;
                        Debug.LogError("Vert of face does not exist");
                    }
                    if (vertMap.ContainsKey(vert3.index)) {
                        realIndices.z = vertMap[vert3.index];
                    } else {
                        error = true;
                        Debug.LogError("Vert of face does not exist");
                    }
                    if (!error) {
                        faces.Add(realIndices.x);
                        faces.Add(realIndices.y);
                        faces.Add(realIndices.z);
                    }
                }
            }
        }
        mesh.Clear();
        mesh.vertices = verts.ToArray();
        mesh.triangles = faces.ToArray();
        mesh.RecalculateNormals();
        Debug.Log("CalculationTime:");
        Debug.Log(Time.realtimeSinceStartup - calculationStart);
        isCalculatingMesh = false;
        initialized = true;
    }

    void OnDrawGizmos() {
        Gizmos.color = Color.white;
        Gizmos.DrawWireCube(getCubeCenter(transform.position, scale), Vector3.one * scale);
        Gizmos.DrawSphere(transform.position, 0.1f);
    }

    Vector3 getCubeCenter(Vector3 pos, float size) {
        return pos + Vector3.one * size / 2;
    }

    VertWithIndex getVert(CubeData cubeData, int index) {
        if (index == 0) {
            return cubeData.vert1;
        }
        if (index == 1) {
            return cubeData.vert2;
        }
        if (index == 2) {
            return cubeData.vert3;
        }
        if (index == 3) {
            return cubeData.vert4;
        }
        if (index == 4) {
            return cubeData.vert5;
        }
        if (index == 5) {
            return cubeData.vert6;
        }
        if (index == 6) {
            return cubeData.vert7;
        }
        if (index == 7) {
            return cubeData.vert8;
        }
        if (index == 8) {
            return cubeData.vert9;
        }
        if (index == 9) {
            return cubeData.vert10;
        }
        if (index == 10) {
            return cubeData.vert11;
        }
        return cubeData.vert12;
    }

    Vector3Int getFace(CubeData cubeData, int index) {
        if (index == 0) {
            return cubeData.face1;
        }
        if (index == 1) {
            return cubeData.face2;
        }
        if (index == 2) {
            return cubeData.face3;
        }
        if (index == 3) {
            return cubeData.face4;
        }
        return cubeData.face5;
    }

    void ReleaseBuffer() {
        cubesBuffer?.Release();
        initialized = false;
    }

    void OnDisable() {
        ReleaseBuffer();
    }

    void OnDestroy() {
        ReleaseBuffer();
    }
}
