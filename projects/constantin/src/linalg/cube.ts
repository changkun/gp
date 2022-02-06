// Consti10

import { Vector } from "./vec";

// a cube is defined by its middle point and a size
export class Cube {
    middle:Vector;
    size: number;
  
    constructor(x: number, y: number, z: number, size:number) {
        this.middle=new Vector(x,y,z);
        this.size=size;
    }
}


export class CubeGrid {
    cubes: boolean[][][] = [];

    constructor(size:number){
        //this.cubes =  new Array<Array<<Array<boolean>>();
    }
}
  