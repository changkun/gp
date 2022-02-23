
# Procedural Geometry with Code

I have created the fundamentals for creating an engine that gets a function describing a volume and turns this into geometry in realtime. 
The function describing the geometry with its density output has the coordinates x, y and z as input together with a time parameter and should return a density value. Every density value above 1 is considered inside the geometry and every density value below 0 is outside the geometry.
Here is what such a function describing a plane could look like:
``` hlsl
float calculateDensity(float x, float y, float z, float time) {
    return 1.2 - y;
}
```
## Running the Code
Install Unity 2020.3.25f1 and open the project folder `unity` with unity.

Depending on your hardware there might be issues when running compute shaders that I cant anticipate. 
Preferably use a system with a dedicated external GPU.