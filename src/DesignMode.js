import * as THREE from "three";

/**
 * @class ObjectFilter
 * @description Static class that manages a collection of furnitures.
 */
export class ObjectFilter { //TODO: DEPRECATED
    static addedFurnitures = [];

    static removeFurniture(furniture) {
        this.addedFurnitures = this.furnitures.filter(f => f !== furniture);
    }
}

export default ObjectFilter;
