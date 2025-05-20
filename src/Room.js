import * as THREE from 'three';

import {WObject} from "./WObject.js";
import CSG from "../THREE-CSGMesh-master/three-csg.js";
import {AppState} from "./AppState.js";
import {PlanLabel} from "./planMode.js";

export class Room extends WObject {

    constructor(walls, floor) {
        super();

        this.userData = {
            roomWalls: [],
            floor: null,
            paintSurfaceArea: -1,
            area: -1
        };

        this.userData.roomWalls = walls;
        this.userData.floor = floor;
        this.userData.paintSurfaceArea = this.calculatePaintSurfaceArea();
        this.userData.area = this.calculateArea();

        this.roomLabel = PlanLabel.createLabel();
        this.updateLabel(true);

        if (floor && floor.parent) {
            floor.parent.add(this.roomLabel);
        }
    }

    calculateCircumference() {
        if (!this.roomWalls || this.roomWalls.length === 0) {
            return 0;
        }

        let lengthSum = 0;

        this.roomWalls.forEach(wall => {
            lengthSum += wall.length;
        });

        return lengthSum;
    }

    calculatePaintSurfaceArea() {
        const wallHeight = this.roomWalls[0]?.wallHeight || 0;

        return this.calculateCircumference() * wallHeight;
    }

    calculateArea() {
        let startPoints = this.roomWalls.map(wall => wall.p1);

        if (!startPoints[0].equals(startPoints[startPoints.length - 1])) // polygon close
            startPoints.push(startPoints[0]);

        let area = 0;
        for (let i = 0; i < startPoints.length - 1; i++) {
            area += (startPoints[i + 1].z * startPoints[i].x) - (startPoints[i + 1].x * startPoints[i].z); // shoelace formula
        }

        return Math.abs(area) / 2;
    }

    deleteFloor() {
        if (this.floor.parent) {
            this.floor.parent.remove(this.floor);
            this.roomLabel.parent.remove(this.roomLabel);
            this.roomLabel = null;
        }

        if (this.floor.geometry) {
            this.floor.geometry.dispose();
        }

        if (this.floor.material) {
            if (Array.isArray(this.floor.material)) {
                this.floor.material.forEach(material => material.dispose());
            } else {
                this.floor.material.dispose();
            }
        }
    }

    subtractFloorGeometry(floor) {
        const currentFloor = this.floor;
        const newFloor = floor;

        if(AppState.debugEnabled) {
            console.log(currentFloor.geometry.index);
            console.log(currentFloor.geometry.attributes.position);

            console.log(newFloor.geometry.index);
            console.log(newFloor.geometry.attributes.position);
        }

        if (!currentFloor || !newFloor)
            return;

        if (!currentFloor.geometry || !newFloor.geometry)
            return;

        if (
            !currentFloor.geometry.attributes?.position ||
            !newFloor.geometry.attributes?.position
        ) {
            console.warn("invalid floor geometry for CSG");
            return;
        }

        currentFloor.updateMatrix();
        newFloor.updateMatrix();

        const bspCurrent = CSG.fromMesh(currentFloor);
        const bspOther = CSG.fromMesh(newFloor);

        const bspResult = bspCurrent.subtract(bspOther);

        const resultMesh = CSG.toMesh(
            bspResult,
            currentFloor.matrixWorld,
            currentFloor.material
        );

        currentFloor.geometry.dispose();
        currentFloor.geometry = resultMesh.geometry;
        currentFloor.geometry.needsUpdate = true;
    }

    updateLabel(needtoSetPos=false) {
        const center = this.calculateCenter();

        if (center && this.roomLabel) {
            this.roomLabel.element.innerHTML = `area: ${this.area.toFixed(2)} m² <br> paintable surface: ${this.paintSurfaceArea.toFixed(2)} m²`;

            if (needtoSetPos)
                this.roomLabel.position.set(center.x, 0.1, center.z);
        }
    }

    updateStats() {
        this.userData.paintSurfaceArea = this.calculatePaintSurfaceArea();
    }

    calculateCenter() {
        if (!this.roomWalls || this.roomWalls.length === 0) return new THREE.Vector3(0, 0, 0);

        const points = this.roomWalls.map(wall => wall.p1);
        const center = new THREE.Vector3();

        for (const pt of points) {
            center.add(pt);
        }

        center.divideScalar(points.length);
        return center;
    }

    setWallsVisibility(visible) {
        this.roomWalls.forEach((wall) => {
            wall.visible = true;
            wall.setLengthLabelVisible(true);
        });
    }

    setLabelsVisibility(visible) {
        if(!this.roomLabel)
            return;

        this.roomLabel.visible = visible;
        this.roomWalls.forEach((wall) => {
            wall.setLengthLabelVisible(visible);
        })
    }

    setWindoorMarkersVisibility(visible) {
        this.roomWalls.forEach((wall) => {
            wall.winDoors.forEach((windoor) => {
                windoor.toggleVisibleMarker(visible);
            })
        })
    }

    get area() {
        return this.userData.area;
    }

    get circumference() {
        return this.userData.circumference;
    }

    get paintSurfaceArea() {
        return this.userData.paintSurfaceArea;
    }

    get roomWalls() {
        return this.userData.roomWalls;
    }

    set roomWalls(roomWalls) {
        this.userData.roomWalls = roomWalls;
    }

    get floor() {
        return this.userData.floor;
    }
}