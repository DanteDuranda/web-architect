import * as THREE from 'three';

class WObject extends THREE.Group {
    constructor() {
        super();

        if (new.target === WObject) {
            throw new TypeError("object has no type!");
        }
    }

    onDelete() {
        throw new Error(`${this.constructor.name}: onDelete() not implemented`);
    }
}

export { WObject };
