import * as THREE from 'three';
import { FBXLoader } from "FBXLoader";

class Furniture extends THREE.Group {

    constructor(itemType) {
        super();

        if (typeof itemType !== 'string')
            throw new TypeError('Parameter [type] must be a string!');

        this.userData = {type: itemType, smartResize: false};
        this.model = null;
        this.boundingBox = null;
        this.catalogId = null;
    }

    /**
     * Factory method for furniture objects.
     * @param {string} type - The type of the furniture.
     * @param {string} catalogId - The catalog ID for furniture. (also the name of the model)
     * @returns {Furniture} - New instance of furniture subclass.
     */
    static createFurniture(type, catalogId = null) {
        switch (type.toLowerCase()) {
            case 'chair':
                return new Chair(type, catalogId);
            case 'table':
                return new Chair(type, catalogId);
            default:
                throw new Error(`INVALID furniture type: ${type}!`);
        }
    }

    loadModel() {
        const modelLoader = new FBXLoader();
        let pathToModel = "/res/models/" + this.userData.type + "/"+ this.catalogId +".fbx";
        modelLoader.load(pathToModel, (loadedModel) => {
                this.model = loadedModel;
                this.resizeLoadedModel();
                this.boundingBox = new THREE.Box3Helper(new THREE.Box3().setFromObject(this.model), new THREE.Color(0xff0000));
                this.add(this.model);
                this.add(this.boundingBox);
                this.boundingBox.visible = true;
            }
        );
        console.log(this.model);
    }

    resizeLoadedModel() {
        throw new Error('Method "loadModel" is not implemented for ' + this.userData.type + '!');
    }
}

export { Furniture };

class Chair extends Furniture {

    constructor(type, catalogId) {
        super(type);
        this.catalogId = catalogId;

        super.loadModel();
    }

    resizeLoadedModel() {
        if (this.model === null)
            throw new Error("Model not yet loaded!")

        let size = new THREE.Vector3();
        let box = new THREE.Box3().setFromObject(this.model);
        box.getSize(size);

        let scaleY = 0.97 / size.y; // height
        let scaleZ = 0.5 / size.z;  // depth
        let scaleX = 0.4 / size.x;  // width scale

        this.model.scale.set(scaleX, scaleY, scaleZ);
    }
}

export { Chair };
