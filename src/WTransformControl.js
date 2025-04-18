import * as THREE from 'three';
import { TransformControls } from "TransformControls";
import { LineGeometry } from "LineGeometry";LineMaterial
import { LineMaterial } from "LineMaterial";
import { Line2 } from "Line2";
import { CSS2DObject } from 'CSS2DRenderer';

const FLOOR_OFFSET = 0.05;

// will be applied using sign()
const directions = [
    new THREE.Vector3(1, 0, 0),  // +X
    new THREE.Vector3(-1, 0, 0), // -X
    new THREE.Vector3(0, 0, 1),  // +Z
    new THREE.Vector3(0, 0, -1)  // -Z
];

const material = new LineMaterial({
    color: 0xFFA500,
    linewidth: 5,
    transparent: true,
    opacity: 0.5,
    depthTest: false,
});

export class WTransformControl extends TransformControls {

    #rayLines = [];
    #highlightedBoxes = []

    constructor(camera, canvas) {
        super(camera, canvas);

        this.isDragging = false;

        for (let i = 0; i < 4; i++) {
            const geometry = new LineGeometry();
            geometry.setPositions([0, 0, 0, 0, 0, 0]);

            const line = new Line2(geometry, material);
            line.visible = false;

            const distanceLabel = this._createLabel('');
            distanceLabel.visible = false;

            this.add(distanceLabel);
            this.add(line);
            this.#rayLines.push({ line, direction: directions[i], distanceLabel: distanceLabel });
        }

        this.setTranslationSnap(0.1)
        this.#recolorArrows();
        this.setSize(0.5);
    }

    #recolorArrows() {
        this._gizmo.gizmo.translate.children.splice(1, 1); // remove the negative side arrows
        this._gizmo.gizmo.translate.children.splice(6, 1);

        if (this.children[0]) {
            this.children[0].traverse((child) => {
                if (child.material) {
                    if (child.name.includes("X")) {
                        child.material.color.set(0xFFA500); // x
                    } else if (child.name.includes("Y")) {
                        child.material.color.set(0xFFA500); // y
                    } else if (child.name.includes("Z")) {
                        child.material.color.set(0xFFA500); // z
                    }
                }
            });
        }
    }

    attach(otherObject) {
        if(this.object)
            this.object.userData.boundingWireframe.visible = false;

        otherObject.userData.boundingWireframe.visible = true;

        super.attach(otherObject);
        this.handleGizmoModes();
    }

    detach() {
        if (this.object)
            this.object.userData.boundingWireframe.visible = false;
        super.detach();
    }

    handleGizmoModes()
    {
        switch (this.object.userData.catalogItem.gizmoType) {
            case ("only-horizontal"):
                this.showY = false;
                this.showX = true;
                this.showZ = true;
                break;
            case ("full"):
                break;
            default:
                console.error("no such gizmo mode!")
        }
    }

    //https://discourse.threejs.org/t/how-to-prevent-shrinking-transformcontrols/60714
    //https://codepen.io/boytchev/pen/MWxOWga
    updateGizmoSize() {
        const size = 20 / this.position.distanceTo(this.camera.position) *
            Math.min(1.9 * Math.tan(Math.PI * this.camera.fov / 360) / this.camera.zoom, 7);

        this.setSize(size / 10);
    }

    updateRayLines(furniture, placedWalls) {
        if (!this.object)
            return;

        this._resetHighlightedBoxes();

        if (!this.isDragging) {
            this.#rayLines.forEach(({ line, distanceLabel }) => {
                line.visible = false;
                distanceLabel.visible = false;
            });
            return;
        }

        const origin = this.object.position.clone();
        origin.y += FLOOR_OFFSET;
        const maxDistance = 10;

        this.#rayLines.forEach(({ line, direction, distanceLabel }) => {
            let raycaster;
            direction.normalize();

            raycaster = new THREE.Raycaster(origin, direction, 0, maxDistance);
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
                endPoint = origin.clone().add(direction.clone().multiplyScalar(maxDistance));
                line.visible = false;
                distanceLabel.visible = false;
            }

            let dimensions = this.object.userData.dimensions;

            const start = origin.clone();

            start.x += dimensions.X / 2 * Math.sign(direction.x);
            start.z += dimensions.Z / 2 * Math.sign(direction.z);

            line.geometry.setPositions([
                origin.x + dimensions.X / 2 * Math.sign(direction.x), start.y, origin.z + dimensions.Z / 2 * Math.sign(direction.z),
                endPoint.x, endPoint.y, endPoint.z
            ]);

            line.geometry.attributes.position.needsUpdate = true;

            const distance = start.distanceTo(endPoint).toFixed(2);
            this._updateLabel(distanceLabel, distance, start, endPoint);

            //distanceLabel.element.textContent = `${distance}m`;
        });
    }


    _resetHighlightedBoxes() {
        this.#highlightedBoxes.forEach(intersect => {
            if (intersect.object) {
                intersect.object.visible = false;
            }
        });
        this.#highlightedBoxes = [];
    }


    _createLabel(text) {
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


    _updateLabel(distanceLabel, distance, start, endPoint) {
        const midPoint = new THREE.Vector3().addVectors(start, endPoint).multiplyScalar(0.5);
        const distanceInCm = (distance * 100).toFixed(0);
        distanceLabel.position.copy(midPoint);
        distanceLabel.element.textContent = `${distanceInCm}cm`;
    }
}