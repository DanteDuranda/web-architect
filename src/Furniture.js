import * as THREE from 'three';
import { FBXLoader } from "FBXLoader";

class Furniture extends THREE.Group {

    constructor(catalogItem) {
        super();

        this.userData = {
            catalogItem: catalogItem,
            smartResize: false,
            model: null,
            boundingBox: null // Store bounding box reference
        };

        this.loadModel();
    }

    loadModel() {
        const fbxPath = this.userData.catalogItem.modelPath;
        const loader = new FBXLoader();
        loader.load(fbxPath, (object) => {
            this.userData.model = object; // Store model in userData
            this.add(this.userData.model);
            this.addBoundingBox();
        }, undefined, (error) => {
            console.error("cant load the model", error);
        });
    }

    addBoundingBox() {
        if (!this.userData.model) {
            throw new Error("model not loaded");
        }

        let box = new THREE.Box3().setFromObject(this.userData.model);
        let bbox = new THREE.Box3Helper(box, new THREE.Color(0xFFA500));

        this.userData.boundingBox = bbox;
        this.add(bbox);

        console.log("bbox size:", box.getSize(new THREE.Vector3()));
    }
}

export { Furniture };
