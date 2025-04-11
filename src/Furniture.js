import * as THREE from 'three';
import { FBXLoader } from "FBXLoader";

class Furniture extends THREE.Group {

    constructor(catalogItem) {
        super();

        this.userData = {
            catalogItem: catalogItem,
            smartResize: false,
            model: null,
            boundingBox: null
        };
        this.loadModel();
    }

    loadModel() {
        const fbxPath = this.userData.catalogItem.modelPath;
        const loader = new FBXLoader();

        loader.load(fbxPath, (object) => {
            this.userData.model = object;

            object.traverse(child => {
                child.userData.root = this;
            });

            this.add(this.userData.model);
            this.addBoundingBox();

            this.traverse(obj => {
                if (obj !== this.userData.boundingBox) {
                    obj.layers.set(1);
                }
            });

        }, undefined, (error) => {
            console.error("cant load the model", error);
        });
    }



    addBoundingBox() {
        if (!this.userData.model) {
            return;
        }

        let box = new THREE.Box3().setFromObject(this.userData.model);
        let bbox = new THREE.Box3Helper(box, new THREE.Color(0xFFA500));
        bbox.visible = false;
        this.userData.boundingBox = bbox;

        this.userData.boundingBox.layers.set(2);

        this.add(bbox);

        console.log("bbox size:", box.getSize(new THREE.Vector3()));
    }

}

export { Furniture };
