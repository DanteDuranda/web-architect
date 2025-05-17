import * as THREE from 'three';

import { GLTFLoader } from "GLTFLoader";
import { WObject } from "./WObject.js";
import { AppState } from "./AppState.js";

const boundingBoxMaterial = new THREE.MeshBasicMaterial({
    opacity: 0.15,
    transparent: true,
    color: 0xFFA500
});

class Furniture extends WObject {
    constructor(catalogItem, ANISOTROPY_MAX, otherObject = null) {
        super();

        this.userData = {
            catalogItem: catalogItem,
            originalDimensions: { X: -1, Z: -1, Y: -1 },
            dimensions: { X: -1, Z: -1, Y: -1 },
            model: null,
            materialColorMap: null,
            boundingBox: null,
            boundingWireframe: null,
        };

        if (otherObject) {
            this.scale.copy(otherObject.scale); // jsut in case

            this.userData.originalDimensions = { ...otherObject.userData.originalDimensions };
            this.userData.dimensions = { ...otherObject.userData.dimensions };
            this.userData.materialColorMap = { ...otherObject.userData.materialColorMap };
        }

        this.loadModel(ANISOTROPY_MAX);
    }


    loadModel(ANISOTROPY_MAX) {
        const gltfPath = this.catalogItem.modelPath;
        const loader = new GLTFLoader();

        loader.load(gltfPath, (gltf) => {
            const model = gltf.scene;

            if(this.catalogItem.gizmoType === "horizontal")
                model.position.y += 0.1; // place above the floor | TODO: transformcontrols stayed at 0 y coordinate...

            if (!this.userData.materialColorMap)
                this.userData.materialColorMap = {};

            const savedColors = this.userData.materialColorMap;

            model.traverse(child => {
                child.userData.root = this;

                if (!child.isMesh || !child.material)
                    return;

                const materials = Array.isArray(child.material) ? child.material : [child.material];

                materials.forEach(material => {
                    const savedHexColor = savedColors[child.name];

                    if (savedHexColor && material.color) { // the part has user defined color
                        material.color.set(savedHexColor);
                    } else if (material.userData?.default_color) { // the model just loaded in with blender attribute color
                        material.color.set(material.userData.default_color);

                        if (material.color)
                            savedColors[child.name] = `#${material.color.getHexString()}`;
                    }

                    setTimeout(() => {
                        if (material.map?.image) {
                            material.map.anisotropy = ANISOTROPY_MAX;
                            material.map.needsUpdate = true;
                        }
                    }, 1000);
                });
            });


            this.add(model);
            this.userData.model = model; // at this state the model will be loaded (its async)
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

    onColorApply(otherFurnitureMColorMap) {
        this.userData.materialColorMap = { ...otherFurnitureMColorMap };

        this.userData.model.traverse(originalChild => {
            if (originalChild.isMesh && originalChild.material) {
                const savedHex = this.userData.materialColorMap[originalChild.name];
                if (savedHex && originalChild.material.color) {
                    originalChild.material.color.set(savedHex);
                    originalChild.material.needsUpdate = true;
                }
            }
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
        this.dimensions =
        {
            "X": parseFloat(size.x.toFixed(2)),
            "Y": parseFloat(size.y.toFixed(2)),
            "Z": parseFloat(size.z.toFixed(2)),
        };

        this.originalDimensions =
        {
            X: size.x,
            Y: size.y,
            Z: size.z
        };

        const geometry = new THREE.BoxGeometry(size.x + 0.001, size.y + 0.001, size.z + 0.001); // to prevent texture clipping between the model and the bounding box
        const boundingBoxMesh = new THREE.Mesh(geometry, boundingBoxMaterial);
        const center = new THREE.Vector3();

        box.getCenter(center);
        this.worldToLocal(center);

        this.boundingBox = boundingBoxMesh;
        this.boundingBox.position.copy(center);
        this.boundingBox.layers.set(3);
        this.boundingBox.name = "boundingBox";
        this.boundingBox.visible = false;
        this.add(this.boundingBox);

        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xFFA500 });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        this.boundingWireframe = wireframe;
        this.boundingWireframe.position.copy(center);
        this.boundingWireframe.layers.set(2);
        this.boundingWireframe.name = "boundingWireframe";
        this.boundingWireframe.visible = false;
        this.add(wireframe);
    }

    handleAttachDetach(attachState) // TODO: igy mar lehet ez itt tulzas, de hatha irni kell ide meg valamit
    {
        this.toggleHighlight(attachState);
    }

    toggleHighlight(highlightState) {
        this.boundingWireframe.visible = highlightState;
    }

    onResize() {
        const limits = this.catalogItem.sizeLimits;
        if (!limits) return;

        // check if its a valid dimension
        let newDims = {
            X: this.originalDimensions.X * this.scale.x,
            Y: this.originalDimensions.Y * this.scale.y,
            Z: this.originalDimensions.Z * this.scale.z,
        };

        // clamp to limits (in meters)
        newDims.X = Math.min(limits.maxX, Math.max(limits.minX, newDims.X));
        newDims.Y = Math.min(limits.maxY, Math.max(limits.minY, newDims.Y));
        newDims.Z = Math.min(limits.maxZ, Math.max(limits.minZ, newDims.Z));

        // apply new scale to match clamped dims
        this.scale.x = newDims.X / this.originalDimensions.X;
        this.scale.y = newDims.Y / this.originalDimensions.Y;
        this.scale.z = newDims.Z / this.originalDimensions.Z;

        this.updateFurnitureDimensions();

        if (AppState.debugEnabled) {
            console.log("Clamped dimensions:", this.dimensions);
            console.log("Result scale:", this.scale);
        }
    }

    updateFurnitureDimensions() {
        this.dimensions = {
            X: parseFloat((this.originalDimensions.X * this.scale.x).toFixed(2)),
            Y: parseFloat((this.originalDimensions.Y * this.scale.y).toFixed(2)),
            Z: parseFloat((this.originalDimensions.Z * this.scale.z).toFixed(2))
        };

        if(AppState.debugEnabled)
            console.log(this.dimensions);
    }

    onDelete() {
        if (this.userData.model) {
            this.userData.model.traverse(child => {
                if (child.isMesh) {

                    if (child.geometry)
                        child.geometry.dispose();

                    if (child.material)
                        super.materialOnDelete(child);
                }
            });
        }

        if (this.userData.boundingBox && this.userData.boundingBox.geometry) {
            this.userData.boundingBox.geometry.dispose();
        }

        if (this.userData.boundingWireframe) {
            this.remove(this.userData.boundingWireframe);
        }

        if (this.parent)
            this.parent.remove(this );

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
