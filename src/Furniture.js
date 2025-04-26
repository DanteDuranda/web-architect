import * as THREE from 'three';
import { FBXLoader } from "FBXLoader";
import { WObject } from "./WObject.js";

const boundingBoxMaterial = new THREE.MeshBasicMaterial({
    color: 0xFFA500,
    opacity: 0.15,
    transparent: true,
});

class Furniture extends WObject {
    constructor(catalogItem, ANISOTROPY_MAX) {
        super();

        this.userData = {
            catalogItem: catalogItem,
            dimensions: {"X": -1, "Z": -1, "Y": -1},
            model: null,
            boundingBox: null,
            boundingWireframe: null,
        };

        this.loadModel(ANISOTROPY_MAX); /* <= dimensions; = boundings*/
    }

    loadModel(ANISOTROPY_MAX) {
        const fbxPath = this.userData.catalogItem.modelPath;
        const loader = new FBXLoader();

        loader.load(fbxPath, (object) => {
            this.userData.model = object;

            object.traverse(child => {
                child.userData.root = this;

                if (child.isMesh && child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(material => {
                        ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'bumpMap', 'emissiveMap'].forEach(mapType => { // TODO: atkell majd gondolnom a vegen, hogy kell e az osszes
                            setTimeout(() => {
                                if (material[mapType] && material[mapType].image) {
                                    material[mapType].anisotropy = ANISOTROPY_MAX;
                                    material[mapType].needsUpdate = true;
                                }
                            }, 1000); // heka to prevent material[mapType] === undefined and throwing warnings to the console
                        });
                    });
                }
            });

            this.add(this.userData.model);
            this.addBoundings();

            this.traverse(obj => {
                if (obj.name !== "boundingBox" && obj.name !== "boundingWireframe") {
                    obj.layers.set(1);
                }
            });

        }, undefined, (error) => {
            console.error("unable to load the model", error);
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

    handleAttachDetach(attachState) //TODO: igy mar lehet ez itt tulzas, de hatha irok meg bele valamit
    {
        this.toggleHighlight(attachState);
    }

    toggleHighlight(highlightState) {
        this.userData.boundingWireframe.visible = highlightState;
    }

    onDelete() {
        if (this.userData.model) {
            this.userData.model.traverse(child => {
                if (child.isMesh) {

                    if (child.geometry) {
                        child.geometry.dispose();
                    }

                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(material => {
                        ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'bumpMap', 'emissiveMap'].forEach(mapType => {
                            if (material[mapType]) {
                                material[mapType].dispose();
                            }
                        });
                        material.dispose();
                    });
                }
            });
        }

        if (this.userData.boundingBox && this.userData.boundingBox.geometry) {
            this.userData.boundingBox.geometry.dispose();
        }
        if (this.userData.boundingWireframe) {
            this.remove(this.userData.boundingWireframe);
        }
        if (this.parent) {
            this.parent.remove(this );
        }

        this.userData.model = null;
        this.userData.boundingWireframe = null;
        this.userData.boundingBox = null;
    }

    get model() {
        return this.userData.model;
    }

    set model(value) {
        this.userData.model = value;
        this.add(value);
    }

    get boundingBox() {
        return this.userData.boundingBox;
    }

    set boundingBox(value) {
        this.userData.boundingBox = value;
        this.add(value);
    }

    get boundingWireframe() {
        return this.userData.boundingWireframe;
    }

    set boundingWireframe(value) {
        this.userData.boundingWireframe = value;
        this.add(value);
    }

    get catalogItem() {
        return this.userData.catalogItem;
    }

    set catalogItem(value) {
        this.userData.catalogItem = value;
    }

    get dimensions() {
        return this.userData.dimensions;
    }

    set dimensions(value) {
        this.userData.dimensions = value;
    }
}

export { Furniture };
