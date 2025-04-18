import * as THREE from 'three';
import {FBXLoader} from "FBXLoader";

const boundingBoxMaterial = new THREE.MeshBasicMaterial({
    color: 0xFFA500,
    opacity: 0.15,
    transparent: true,
});

class Furniture extends THREE.Group {
    constructor(catalogItem) {
        super();

        this.userData = {
            catalogItem: catalogItem,
            dimensions: {"X": -1, "Z": -1, "Y": -1},
            model: null,
            boundingBox: null,
            boundingWireframe: null,
            gizmoMode: 'full',
        };

        this.loadModel(); /* <= dimensions; = boundings*/
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
            this.addBoundings();

            this.traverse(obj => {
                if (obj.name !== "boundingBox" && obj.name !== "boundingWireframe") {
                    obj.layers.set(1);
                }
            });

        }, undefined, (error) => {
            console.error("cant load the model", error);
        });
    }

    // to measure dimensions
    addBoundings() {
        if (!this.userData.model) {
            return;
        }

        let box = new THREE.Box3().setFromObject(this.userData.model);

        const size = new THREE.Vector3();
        box.getSize(size);

        // in meters
        this.userData.dimensions = {
            "X": parseFloat(size.x.toFixed(2)), // width
            "Y": parseFloat(size.y.toFixed(2)), // height
            "Z": parseFloat(size.z.toFixed(2)), // depth
        };

        const geometry = new THREE.BoxGeometry(size.x+0.001, size.y+0.001, size.z+0.001);

        const boundingBoxMesh = new THREE.Mesh(geometry, boundingBoxMaterial);
        const center = new THREE.Vector3();

        box.getCenter(center);
        boundingBoxMesh.position.set(center.x, center.y, center.z);

        this.userData.boundingBox = boundingBoxMesh;
        this.userData.boundingBox.layers.set(3);
        this.userData.boundingBox.name = "boundingBox";
        this.userData.boundingBox.visible = false;
        this.add(this.userData.boundingBox);

        this.userData.boundingWireframe = new THREE.Box3Helper(box, new THREE.Color(0xFFA500));
        this.userData.boundingWireframe.layers.set(2);
        this.userData.boundingWireframe.name = "boundingWireframe";
        this.userData.boundingWireframe.visible = false;
        this.add(this.userData.boundingWireframe);
    }

}

export { Furniture };
