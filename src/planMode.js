import * as THREE from "three";
import {CSS2DObject} from 'CSS2DRenderer';
import {AppState} from "./AppState.js";

export class PlanLabel {
    static createLabel() {
        const element = document.createElement('div');
        element.className = 'distance-label';
        element.style.fontSize = '14px';
        element.style.color = '#FAE8DE';
        element.style.background = 'rgba(0, 0, 0, 0.6)';
        element.style.padding = '2px 4px';
        element.style.borderRadius = '4px';
        element.style.whiteSpace = 'nowrap';
        element.style.pointerEvents = 'none';
        element.style.transform = 'translate(-50%, -50%)';

        const labelObject = new CSS2DObject(element);
        labelObject.position.set(0, 0, 0);

        return labelObject ;
    }


    static updateLabel(label, startPoint, endPoint, distance) {
        const distanceInCm = (distance * 100).toFixed(0);
        label.element.textContent = `${distanceInCm}cm`;
        const midPoint = new THREE.Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);

        label.position.set(midPoint.x, 0, midPoint.z);
    }
}

export class PlanCursor {
    constructor(radius = 0.2, crossThickness = 0.05, crossLengthFactor = 10) {
        this.radius = radius;
        this.crossThickness = crossThickness;
        this.crossLengthFactor = crossLengthFactor;

        this.cursorGroup = this.createCursor();
        this.resizeCursor(1);
    }

    createCursor() {
        const segments = 20; // number of segments for the circle

        // center circle
        const circleGeometry = new THREE.CircleGeometry(this.radius, segments);
        const circleMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
        const planCursor = new THREE.Mesh(circleGeometry, circleMaterial);
        planCursor.rotation.x = -Math.PI / 2; // Align with XZ plane
        planCursor.position.y += 1;

        // cross lines
        const crossLength = this.radius * this.crossLengthFactor;

        // horizontal line
        const horizontalGeometry = new THREE.BoxGeometry(crossLength, this.crossThickness, this.crossThickness);
        const horizontalMaterial = new THREE.MeshBasicMaterial({ color: 0xFFA500 });
        const horizontalLine = new THREE.Mesh(horizontalGeometry, horizontalMaterial);

        // vertical line
        const verticalGeometry = new THREE.BoxGeometry(this.crossThickness, crossLength, this.crossThickness);
        const verticalMaterial = new THREE.MeshBasicMaterial({ color: 0xFFA500 });
        const verticalLine = new THREE.Mesh(verticalGeometry, verticalMaterial);
        verticalLine.rotation.x = -Math.PI / 2;

        // group all parts
        const cursorGroup = new THREE.Group();
        cursorGroup.add(planCursor);
        cursorGroup.add(horizontalLine);
        cursorGroup.add(verticalLine);

        return cursorGroup;
    }

    // resize the cursor based on zoom level
    resizeCursor(zoom) {
        let cursorScale;

        if (zoom >= 1 && zoom < 5) {
            cursorScale = 1;
        } else if (zoom >= 5 && zoom < 20) {
            cursorScale = 0.5;
        } else if (zoom >= 20 && zoom < 30) {
            cursorScale = 0.2;
        } else if (zoom >= 30 && zoom < 40) {
            cursorScale = 0.1;
        } else if (zoom >= 40) {
            cursorScale = 0.02;
        }

        this.cursorGroup.scale.setScalar(cursorScale);

        if(AppState.debugEnabled)
            console.log(`cursor Scale: ${this.cursorGroup.scale.x}, zoom Level: ${zoom}`);
    }

    drawDebugMarker(x, y, z, scene) {
        const markerGeometry = new THREE.SphereGeometry(0.1, 16, 16); // Small sphere
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red color

        const marker = new THREE.Mesh(markerGeometry, markerMaterial);

        marker.position.set(x, y, z);

        scene.add(marker);

        // remove after timeout
        setTimeout(() => {
            scene.remove(marker);
            marker.geometry.dispose();
            marker.material.dispose();
        }, 2000); // 2 secs
    }

    updateCursorIndicator(canvas, wallHeight, isWallPlacingActive, unit, camera, intersectionPoint) {
        if (isWallPlacingActive) {
            canvas.style.cursor = 'none';

            if (intersectionPoint) {
                const snappedX = intersectionPoint.x;
                const snappedZ = intersectionPoint.z;

                const precision = 1 / unit;

                const snap = (val) => Math.round(val * precision) / precision;
                this.cursorGroup.position.set(snap(snappedX), wallHeight, snap(snappedZ));

                if(AppState.debugEnabled)
                    console.log("snappedX: " + snappedX + "; snappedZ: " + snappedZ);
            }
        } else {
            canvas.style.cursor = 'default';
        }
    }

    cornerToPoint(point, wallWidth, wallHeight, color) {
        const radiusTop = wallWidth / 2;
        const radiusBottom = wallWidth / 2;
        const radialSegments = 32;

        const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, wallHeight, radialSegments);
        const material = new THREE.MeshBasicMaterial({ color: color });
        const cylinder = new THREE.Mesh(geometry, material);

        cylinder.position.set(point.x, point.y + wallHeight / 2, point.z);

        return cylinder;
    }
}
