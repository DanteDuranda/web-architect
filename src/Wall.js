import * as THREE from 'three';
import {ThreeGeometry} from './ThreeGeometry.js';

class Wall extends THREE.Group {
    constructor(wall, start, end, wallWidth, wallHeight, color=0xFFFFFF) {
        super();

        this.p1 = start;
        this.p2 = end;
        this.length = start.distanceTo(end);

        this.wallGeometry = wall;
        this.add(this.wallGeometry);

        this.pointIndicators = []

        let cylinder1 = ThreeGeometry.CreateCylinder(wallWidth / 2, wallHeight, color);
        let cylinder2 = ThreeGeometry.CreateCylinder(wallWidth / 2, wallHeight, color);
        this.pointIndicators.push(cylinder1, cylinder2);
        this.setPointIndicatorsPos(wallHeight);
        this.add(cylinder1);
        this.add(cylinder2);
    }

    setPointIndicatorsPos(wallHeight) {
        this.pointIndicators[0].position.copy(this.p1);
        this.pointIndicators[0].position.y += wallHeight / 2;
        this.pointIndicators[1].position.copy(this.p2);
        this.pointIndicators[1].position.y += wallHeight / 2;
    }

}

export { Wall };