import * as THREE from 'three';
import { FBXLoader } from "FBXLoader";
import { WObject } from "./WObject.js";

const boundingBoxMaterial = new THREE.MeshBasicMaterial({
    opacity: 0.15,
    transparent: true,
    color: 0xFFA500
});

class Furniture extends WObject {
    constructor(catalogItem, ANISOTROPY_MAX) {
        super();

        this.userData = {
            catalogItem: catalogItem,
            originalDimensions: {"X": -1, "Z": -1, "Y": -1},
            dimensions: {"X": -1, "Z": -1, "Y": -1},
            model: null,
            boundingBox: null,
            boundingWireframe: null,
        };

        this.loadModel(ANISOTROPY_MAX); /* <= dimensions; = boundings*/
    }

    loadModel(ANISOTROPY_MAX) {
        const fbxPath = this.catalogItem.modelPath;
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

            this.convertResizeLimits();
        }, undefined, (error) => {
            console.error("unable to load the model", error);
        });
    }

    // to measure dimensions
    addBoundings() {
        if (!this.model)
            return;

        let box = new THREE.Box3().setFromObject(this.model);

        const size = new THREE.Vector3();
        box.getSize(size);

        // in meters
        this.dimensions = {
            "X": parseFloat(size.x.toFixed(2)), // width
            "Y": parseFloat(size.y.toFixed(2)), // height
            "Z": parseFloat(size.z.toFixed(2)), // depth
        };

        this.originalDimensions = {
            X: size.x,
            Y: size.y,
            Z: size.z
        };

        const geometry = new THREE.BoxGeometry(size.x+0.001, size.y+0.001, size.z+0.001);

        const boundingBoxMesh = new THREE.Mesh(geometry, boundingBoxMaterial);
        const center = new THREE.Vector3();

        box.getCenter(center);
        boundingBoxMesh.position.set(center.x, center.y, center.z);

        this.boundingBox = boundingBoxMesh;
        this.boundingBox.layers.set(3);
        this.boundingBox.name = "boundingBox";
        this.boundingBox.visible = false;
        this.add(this.boundingBox);

        this.boundingWireframe = new THREE.Box3Helper(box, new THREE.Color(0xFFA500));
        this.boundingWireframe.layers.set(2);
        this.boundingWireframe.name = "boundingWireframe";
        this.boundingWireframe.visible = false;
        this.add(this.boundingWireframe);
    }

    handleAttachDetach(attachState) //TODO: igy mar lehet ez itt tulzas, de hatha irni kell ide meg valamit
    {
        this.toggleHighlight(attachState);
    }

    toggleHighlight(highlightState) {
        this.boundingWireframe.visible = highlightState;
    }

    convertResizeLimits() {
        if (!this.catalogItem.sizeLimits)
            return null;

        const baseBox = new THREE.Box3().setFromObject(this.model);
        const baseSize = new THREE.Vector3();
        baseBox.getSize(baseSize);

        this.catalogItem.sizeLimits.minX = this.catalogItem.sizeLimits.minX / baseSize.x;
        this.catalogItem.sizeLimits.maxX = this.catalogItem.sizeLimits.maxX / baseSize.x;
        this.catalogItem.sizeLimits.minZ = this.catalogItem.sizeLimits.minZ / baseSize.z;
        this.catalogItem.sizeLimits.maxZ = this.catalogItem.sizeLimits.maxZ / baseSize.z;
        this.catalogItem.sizeLimits.minY = this.catalogItem.sizeLimits.minY / baseSize.y;
        this.catalogItem.sizeLimits.maxY = this.catalogItem.sizeLimits.maxY / baseSize.y;
    }

    onResize() {
        this.updateFurnitureDimensions();

        if (this.catalogItem.sizeLimits) {
            this.scale.x = Math.min(this.catalogItem.sizeLimits.maxX, Math.max(this.catalogItem.sizeLimits.minX, this.scale.x));
            this.scale.y = Math.min(this.catalogItem.sizeLimits.maxY, Math.max(this.catalogItem.sizeLimits.minY, this.scale.y));
            this.scale.z = Math.min(this.catalogItem.sizeLimits.maxZ, Math.max(this.catalogItem.sizeLimits.minZ, this.scale.z));

            //console.log(`x=${obj.scale.x.toFixed(2)}, z=${obj.scale.z.toFixed(2)}, y=${obj.scale.y.toFixed(2)}`);
        }
    }

    updateFurnitureDimensions() {
        this.dimensions = {
            X: parseFloat((this.originalDimensions.X * this.scale.x).toFixed(2)),
            Y: parseFloat((this.originalDimensions.Y * this.scale.y).toFixed(2)),
            Z: parseFloat((this.originalDimensions.Z * this.scale.z).toFixed(2))
        };
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

    get originalDimensions() {
        return this.userData.originalDimensions;
    }

    set originalDimensions(value) {
        this.userData.originalDimensions = value;
    }

    get dimensions() {
        return this.userData.dimensions;
    }

    set dimensions(value) {
        this.userData.dimensions = value;
    }
}

export { Furniture };
