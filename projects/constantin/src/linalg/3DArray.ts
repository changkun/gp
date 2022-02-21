

export class ThreeDArray {
    value:number[][][];

    constructor(size:number){
        this.value=new Array(size);
        for(let i=0;i<size;i++){
            this.value[i]=new Array(size);
            for(let j=0;j<size;j++){
                this.value[i][j]=new Array<number>(size);
            }
        }
    }

    get(x:number,y:number,z:number):number{
        return this.value[x][y][z];
    }

    set(x:number,y:number,z:number,val:number){
        this.value[x][y][z]=val;
    }

    static create3DArray(size:number):number[][][]{
        let value=new Array(size);
        for(let i=0;i<size;i++){
            value[i]=new Array(size);
            for(let j=0;j<size;j++){
                value[i][j]=new Array<number>(size);
            }
        }
        return value;
    }
}