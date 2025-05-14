import * as THREE from 'three';

class WObject extends THREE.Group {
    constructor() {
        super();
    }

    onDelete() {
        throw new Error(`${this.constructor.name}: onDelete() not implemented`);
    }

    materialOnDelete(modelChild) {
        const materials = Array.isArray(modelChild.material) ? modelChild.material : [modelChild.material];

        for (const material of materials)
            material.dispose?.();

        modelChild.material = null;
    }
}

export { WObject };
