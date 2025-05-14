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

        this.label = PlanLabel.createLabel();
        this.updateLabel();

        if (floor && floor.parent) {
            floor.parent.add(this.label);
        }
    }

    calculateCircumference() {
        if (!this.roomWalls || this.roomWalls.length === 0) {
            return 0;
        }

        return this.roomWalls.reduce((total, wall) => {
            return total + (wall.length || 0);
        }, 0);
    }

    calculatePaintSurfaceArea() {
        const wallHeight = this.roomWalls[0]?.wallHeight || 0; // assumes uniform height
        const circumference = this.calculateCircumference();

        return circumference * wallHeight;
    }

    calculateArea() {
        let points = this.roomWalls.map(wall => wall.p1);

        if (!points[0].equals(points[points.length - 1])) { // polygon close
            points.push(points[0]);
        }

        let area = 0;
        for (let i = 0; i < points.length - 1; i++) {
            area += (points[i].x * points[i + 1].z) - (points[i + 1].x * points[i].z); // shoelace formula
        }

        return Math.abs(area) / 2;
    }

    deleteFloor() {
        this.floor.parent.remove(this.floor);

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


        if (!currentFloor || !newFloor) return;
        if (!currentFloor.geometry || !newFloor.geometry) return;

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

    updateLabel() {
        const center = this.calculateCenter();

        if (center && this.label) {
            this.label.element.innerHTML = `Area: ${this.area.toFixed(2)} m² <br> Paint surface: ${this.paintSurfaceArea.toFixed(2)} m²`;
            this.label.position.set(center.x, 0.1, center.z);
        }
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
        this.label.visible = visible;
        this.roomWalls.forEach((wall) => {
            wall.setLengthLabelVisible(visible);
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