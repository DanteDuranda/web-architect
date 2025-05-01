import {WObject} from "./WObject.js";

export class Room extends WObject {

    constructor(walls, floor) {
        super();

        this.userData = {
            roomWalls: [],
            floor: null,
            circumference: -1,
            area: -1
        };

        this.userData.roomWalls = walls;
        this.userData.floor = floor;
        this.userData.circumference = this.calculateCircumference();
        this.userData.area = this.calculateArea();
    }

    calculateCircumference() {
        if (!this.roomWalls || this.roomWalls.length === 0) {
            return 0;
        }

        return this.roomWalls.reduce((total, wall) => {
            return total + (wall.length || 0);
        }, 0);
    }

    calculateArea() {
        if (!this.roomWalls || this.roomWalls.length < 3) {
            return -1;
        }

        // corner points
        let points = this.roomWalls.map(wall => wall.p1);

        // polygon close
        if (!points[0].equals(points[points.length - 1])) {
            points.push(points[0]);
        }

        // shoelace formula to calculate area of polygon
        let area = 0;
        for (let i = 0; i < points.length - 1; i++) {
            area += (points[i].x * points[i + 1].z) - (points[i + 1].x * points[i].z);
        }

        return Math.abs(area) / 2;
    }

    deleteFloor() {
        const event = new CustomEvent("floorRemoved", {
            detail: { floor: this.floor },
        });
        window.dispatchEvent(event);

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

    get area() {
        return this.userData.area;
    }

    get circumference() {
        return this.userData.circumference;
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