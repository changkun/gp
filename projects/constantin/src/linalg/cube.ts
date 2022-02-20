// Consti10

import { Vector } from "./vec";

// a cube is defined by its middle point and a size
export class Cube {
    lowerLeft:Vector;
    size: number;
  
    constructor(x: number, y: number, z: number, size:number) {
        this.lowerLeft=new Vector(x,y,z);
        this.size=size;
    }

    generateVertices(){
        
    }
}


export class CubeGrid {
    cubes: boolean[][][] = [];

    constructor(size:number){
        //this.cubes =  new Array<Array<<Array<boolean>>();
    }
}
  