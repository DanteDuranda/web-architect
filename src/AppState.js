
/**
 * @class ObjectFilter
 * @description Static class that manages a collection of furnitures.
 */
export class ObjectFilter {
    static addedFurnitures = [];

    static removeFurniture(furniture) {
        this.addedFurnitures = this.addedFurnitures.filter(f => f !== furniture);
    }
}

export default ObjectFilter;