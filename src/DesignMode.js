import * as THREE from "three";

/**
 * @class ObjectFilter
 * @description Singleton class that manages a collection of furnitures.
 */
export class ObjectFilter {
    constructor() {
        if (!ObjectFilter.instance) {
            this.furnitures = [];

            ObjectFilter.instance = this;
        }
        this.addedFurnitures = [];
        return ObjectFilter.instance;
    }
}

const objectFilterInstance = new ObjectFilter();
export default objectFilterInstance;