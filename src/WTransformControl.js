import * as THREE from 'three';
import {TransformControls} from "TransformControls";
import {LineGeometry} from "LineGeometry";
import {LineMaterial} from "LineMaterial";
import {Line2} from "Line2";
import {CSS2DObject} from 'CSS2DRenderer';

LineMaterial

const FLOOR_OFFSET = 0.05;
const MAX_DISTANCE = 10;

// will be applied using sign()
const directions = [
    new THREE.Vector3(1, 0, 0),  // +X
    new THREE.Vector3(-1, 0, 0), // -X
    new THREE.Vector3(0, 0, 1),  // +Z
    new THREE.Vector3(0, 0, -1)  // -Z
];

const distanceLineMat = new LineMaterial({
    color: 0xFFA500,
    linewidth: 5,
    transparent: true,
    opacity: 0.5,
    depthTest: false,
});

const GizmoPresets = Object.freeze({
    HORIZONTAL: {
        translate: { x: true, y: false, z: true },
        rotate: { x: false, y: true, z: false },
        scale: { x: true, y: false, z: true }
    },

    FULL: {
        translate: { x: true, y: true, z: true },
        rotate: { x: true, y: true, z: true },
        scale: { x: true, y: true, z: true }
    },

    NONE: {
        translate: { x: false, y: false, z: false },
        rotate: { x: false, y: false, z: false },
        scale: { x: false, y: false, z: false }
    },

    ONLY_XY: {
        translate: { x: true, y: true, z: false },
        rotate: { x: true, y: true, z: false },
        scale: { x: true, y: true, z: false }
    }
});

export class WTransformControl extends TransformControls {

    #rayLines = [];
    #highlightedBoxes = []
    #rotationLabel;
    #snappingThresh;
    #snapAngle;

    constructor(camera, canvas) {
        super(camera, canvas);

        this.isDragging = false;

        for (let i = 0; i < 4; i++) {
            const geometry = new LineGeometry();
            geometry.setPositions([0, 0, 0, 0, 0, 0]);

            const line = new Line2(geometry, distanceLineMat);
            line.visible = false;

            const distanceLabel = this.#createLabel('');
            distanceLabel.visible = false;

            this.add(distanceLabel);
            this.add(line);
            this.#rayLines.push({ line, direction: directions[i], distanceLabel: distanceLabel });
        }

        this.#snappingThresh = THREE.MathUtils.degToRad(10);
        this.#snapAngle = THREE.MathUtils.degToRad(45);

        this.#rotationLabel = this.#createLabel('');
        this.#rotationLabel.visible = false;
        this.add(this.#rotationLabel);

        this.setTranslationSnap(0.1);
        this.#recolorArrows();
        this.setSize(0.5);
        this.addEventListener('change', this.#handleRotation);
    }

    attach(otherObject) {
        if(this.object)
            return;

        /*if(this.object && this.object.userData.boundingWireframe)
            this.object.userData.boundingWireframe.visible = false;
        else if(this.object && this.object.name === "wallGeometry")
            this.object.parent.toggleHighlight(false);*/ //TODO: tempor disabled || DEPRECATED

        if (otherObject.name === "Wall") {   //TODO: ez itt szerintem osszevonhato lesz lassan
            this.setSpace("world");
            //otherObject.toggleHighlight(true);
            otherObject.handleAttachDetach(true);
        }
        else if (otherObject.name === "windoor") {    //TODO: ez itt szerintem osszevonhato lesz lassan
            this.setSpace("local");
            //otherObject.toggleHighlight(true);
            otherObject.handleAttachDetach(true);
        }
        else { // furnitures from the catalog
            otherObject.userData.boundingWireframe.visible = true;

            if(otherObject.userData.catalogItem.resizable)
                document.getElementById('scale').classList.remove('disabled');
            else {
                document.getElementById('scale').classList.add('disabled');
            }

            this.setSpace("world");
        }

        super.attach(otherObject);
        this.#handleGizmoModes(this.mode);
    }

    detach() {
        if (this.object) {
            this.object.handleAttachDetach(false);

            if (this.object.userData.catalogItem)
            {
                const isResizable = this.object.userData.catalogItem.resizable;
                if (!isResizable)
                    document.getElementById('scale').classList.remove('disabled');
            }
        }

        super.detach();
    }

    changeTransformModes(TransformMode) {
        switch (TransformMode){
            case 'translate':
                this.setMode("translate");
                this.#handleGizmoModes("translate");
                break;

            case 'rotate':
                this.setMode("rotate");
                this.#handleGizmoModes("rotate");
                break;

            case 'scale':
                this.setMode("scale");
                this.#handleGizmoModes("scale");
                break;
        }
    }

    switchCamera(camera) {
        this.camera = camera;
    }

    //https://discourse.threejs.org/t/how-to-prevent-shrinking-transformcontrols/60714
    //https://codepen.io/boytchev/pen/MWxOWga
    updateGizmoSize() {
        let size;

        if (this.camera.isPerspectiveCamera) {
            // Perspective Camera: gizmo size will change based on camera's position and zoom
            size = 20 / this.position.distanceTo(this.camera.position) *
                Math.min(1.9 * Math.tan(Math.PI * this.camera.fov / 360) / this.camera.zoom, 7);

            size = size / 5;
        } else if (this.camera.isOrthographicCamera) {
            size = Math.max(this.camera.zoom);
            size = size / 10;
        }

        this.setSize(size);
    }



    deleteObject() {
        if (!this.object)
            return;

        const attachedObject = this.object;
        this.detach();

        if (attachedObject.parent) {
            attachedObject.parent.remove(attachedObject);
        }

        attachedObject.onDelete(); // attached to wallgeometry and not for the group...TODO:
    }

    updateRayLines(furniture, placedWalls) {
        if (!this.object)
            return;

        this.#resetHighlightedBoxes();

        if (!this.isDragging) {
            this.#rayLines.forEach(({ line, distanceLabel }) => {
                line.visible = false;
                distanceLabel.visible = false;
            });
            return;
        }

        const origin = this.object.position.clone();
        origin.y += FLOOR_OFFSET;

        this.#rayLines.forEach(({ line, direction, distanceLabel }) => {
            const rotatedDirection = direction.clone().applyQuaternion(this.object.quaternion).normalize();
            const raycaster = new THREE.Raycaster(origin, rotatedDirection, 0, MAX_DISTANCE);

            raycaster.layers.set(3); // TODO: jo lenne a raycastra hasznalt layereket valahogy enumkent kezelni mert neha nem tudom kovetni...
            const targets = furniture.filter(obj => obj !== this.object);// --->
            targets.push(...placedWalls);                               // ----> union of the walls and the furnitures

            const intersects = raycaster.intersectObjects(targets, true);

            let endPoint;
            if (intersects.length > 0) {
                if (intersects[0].object.name === "boundingBox"){
                    intersects[0].object.visible = true;
                    this.#highlightedBoxes.push(intersects[0]);
                }
                endPoint = intersects[0].point;
                line.visible = true;
                distanceLabel.visible = true;

                const positions = line.geometry.attributes.position.array;
                positions[3] = intersects[0].point.x
                positions[4] = intersects[0].point.y
                positions[5] = intersects[0].point.z
            } else {
                endPoint = origin.clone().add(rotatedDirection.clone().multiplyScalar(MAX_DISTANCE));
                line.visible = false;
                distanceLabel.visible = false;
            }

            let dimensions = this.object.userData.dimensions;

            const localOffset = new THREE.Vector3(
                (dimensions.X / 2) * Math.sign(direction.x),
                0,
                (dimensions.Z / 2) * Math.sign(direction.z)
            );

            // rotate offset to match object orientation
            const rotatedOffset = localOffset.applyQuaternion(this.object.quaternion);
            const start = origin.clone().add(rotatedOffset);

            line.geometry.setPositions([
                start.x, start.y, start.z,
                endPoint.x, endPoint.y, endPoint.z
            ]);

            line.geometry.attributes.position.needsUpdate = true;

            const distance = start.distanceTo(endPoint).toFixed(2);
            this.#updateDistanceLabel(distanceLabel, distance, start, endPoint);
        });
    }

    #recolorArrows() {
        this._gizmo.gizmo.translate.children.splice(1, 1); // remove the negative side arrows
        this._gizmo.gizmo.translate.children.splice(6, 1);
        this._gizmo.gizmo.translate.children.splice(3, 1); // idk, but it works..

        if (this.children[0]) {
            this.children[0].traverse((child) => {
                if (child.material) {
                    if ( child.name.includes("X") || child.name.includes("Y") || child.name.includes("Z") ) {
                        child.material.color.set(0xFFA500);
                    }
                }
            });
        }
    }

    #handleGizmoModes(currentMode) {
        if (!this.object)
            return;

        let gizmoType;

        if (this.object.name === "Wall") {
           gizmoType = "none"
        }
        else
            gizmoType = this.object.userData.catalogItem.gizmoType;

        const config = GizmoPresets[gizmoType?.toUpperCase()];
        if (!config || !config[currentMode]) {
            console.error("undefined transform or gizmo mode", gizmoType, currentMode);
            return;
        }

        const { x, y, z } = config[currentMode];
        this.showX = x;
        this.showY = y;
        this.showZ = z;
    }

    #resetHighlightedBoxes() {
        this.#highlightedBoxes.forEach(intersect => {
            if (intersect.object) {
                intersect.object.visible = false;
            }
        });
        this.#highlightedBoxes = [];
    }

    #createLabel(text) {
        const measurementDiv = document.createElement('div');
        measurementDiv.className = 'measurementLabel';
        measurementDiv.textContent = text;

        measurementDiv.style.padding = '2px 6px';
        measurementDiv.style.background = 'rgba(255, 165, 0, 0.8)';
        measurementDiv.style.color = '#000';
        measurementDiv.style.borderRadius = '4px';
        measurementDiv.style.fontSize = '22px';
        measurementDiv.style.fontWeight = 'bold';
        measurementDiv.style.whiteSpace = 'nowrap';

        const label = new CSS2DObject(measurementDiv);
        label.visible = false;
        return label;
    }

    #updateDistanceLabel(distanceLabel, distance, start, endPoint) {
        const midPoint = new THREE.Vector3().addVectors(start, endPoint).multiplyScalar(0.5);
        const distanceInCm = (distance * 100).toFixed(0);
        distanceLabel.position.copy(midPoint);
        distanceLabel.element.textContent = `${distanceInCm}cm`;
    }

    #updateRotationLabel() {
        this.#rotationLabel.position.copy(this.object.position.clone());
    }

    #handleRotation = () => {
        const axis = this.axis?.toLowerCase(); // current active axis

        if (this.mode !== 'rotate' || !this.isDragging || !this.object || !axis) {
            this.#rotationLabel.visible = false;
            return;
        }

        const current = this.object.rotation[axis];
        const snapped = Math.round(current / this.#snapAngle) * this.#snapAngle;
        this.#updateRotationLabel(this.object.position.clone());
        this.#rotationLabel.visible = true;

        if (Math.abs(current - snapped) < this.#snappingThresh) {
            if (current !== snapped) {
                this.object.rotation[axis] = snapped;
            }
        }

        const value = this.object.rotation[axis];

        this.#rotationLabel.element.textContent = `${THREE.MathUtils.radToDeg(value).toFixed(0)}°`;
    };
}