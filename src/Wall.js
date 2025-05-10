import * as THREE from 'three';
import { ThreeGeometry } from './ThreeGeometry.js';
import { WinDoor } from "./WinDoor.js";
import CSG from "../THREE-CSGMesh-master/three-csg.js";
import {WObject} from "./WObject.js";
import {AppState} from "./AppState.js";

const HIGHLIGHT_MATERIAL = new THREE.MeshBasicMaterial({
    color: 0xAAAAAA,
    transparent: true,
    opacity: 0.5,
    wireframe: false, // debug purposes...
});

class Wall extends WObject {
    constructor(wall, start, end, wallWidth, wallHeight, color=0x000000, lengthLabel) {
        super();

        this.p1 = start;
        this.p2 = end;
        this.length = start.distanceTo(end);

        this.wallGeometry = wall;
        this.wallGeometry.name = "wallGeometry"
        this.wallGeometry.layers.set(3);
        this.wallGeometry.layers.enable(0);
        this.wallGeometry.layers.enable(1);
        this.wallGeometry.userData.root = this;
        this.add(this.wallGeometry);
        this.add(lengthLabel);
        this.originalWallGeometry = this.wallGeometry.geometry.clone();
        this.originalMaterial = this.wallGeometry.material;

        this.userData = {
            catalogItem: null,
            dimensions: {"wallWidth": wallWidth, "wallHeight": wallHeight, "wallLength": Number(start.distanceTo(end).toFixed(2))},
            model: null,
            boundingBox: null,
            boundingWireframe: null,
            winDoors: [],
            isAttached: false,
            originalWallGeometry: null,
            lengthLabel: lengthLabel
        };

        this.pointIndicators = []

        this.cylinder1 = ThreeGeometry.CreateCylinder(wallWidth / 2, wallHeight, color);
        this.cylinder1.name = "corner";
        this.cylinder2 = ThreeGeometry.CreateCylinder(wallWidth / 2, wallHeight, color);
        this.cylinder1.name = "corner";

        this.pointIndicators.push(this.cylinder1, this.cylinder2);
        this.setPointIndicatorsPos(wallHeight);
        this.add(this.pointIndicators[0]);
        this.add(this.pointIndicators[1]);

        this.name = "Wall";
    }

    setPointIndicatorsPos(wallHeight) {
        this.pointIndicators[0].position.copy(this.p1);
        this.pointIndicators[0].position.y += wallHeight / 2;
        this.pointIndicators[0].layers.set(3);
        this.pointIndicators[0].layers.enable(0);
        this.pointIndicators[0].layers.enable(1);

        this.pointIndicators[1].position.copy(this.p2);
        this.pointIndicators[1].position.y += wallHeight / 2;
        this.pointIndicators[1].layers.set(3);
        this.pointIndicators[1].layers.enable(0);
        this.pointIndicators[1].layers.enable(1);
    }

    addWindoor(type) {
        const windoor = new WinDoor(this, type);

        const direction = new THREE.Vector3().subVectors(this.p2, this.p1).normalize();
        const midpoint = new THREE.Vector3().addVectors(this.p1, this.p2).multiplyScalar(0.5);

        windoor.position.copy(midpoint);
        windoor.position.y = this.wallGeometry.scale.y; // Adjust vertical center if needed

        const angle = Math.atan2(direction.z, direction.x); // rotate around y
        windoor.rotation.y = -angle; // negative because threejs uses lefthanded system for z

        this.userData.winDoors.push(windoor);
        this.add(windoor);

        this.updateWindoorOnWall();
    }

    resetWallGeom() {
        this.wallGeometry.geometry.dispose();
        this.wallGeometry.geometry = this.originalWallGeometry.clone();
    }

    updateWindoorOnWall() {
        this.resetWallGeom();

        const wall = this.wallGeometry;

        this.userData.winDoors.forEach((winDoor) => {
            const centerCube = winDoor.userData.centerCubeMesh;

            winDoor.updateMatrixWorld(true);
            centerCube.updateMatrixWorld(true);

            const clone = centerCube.clone();
            clone.applyMatrix4(centerCube.matrixWorld);
            clone.updateMatrix();

            const bspWall = CSG.fromMesh(wall);
            const bspHole = CSG.fromMesh(clone);
            const bspResult = bspWall.subtract(bspHole);

            const resultMesh = CSG.toMesh(bspResult, wall.matrixWorld, wall.material);
            wall.geometry.dispose(); // dispose first for safety
            wall.geometry = resultMesh.geometry;
            wall.geometry.needsUpdate = true;
        });
    }

    subtractWallGeometry(wall) {
        const currentWall = this.wallGeometry;
        const newWall = wall.wallGeometry;

        currentWall.updateMatrix()
        newWall.updateMatrix()

        if (!newWall|| !currentWall)
            return;

        const bspCurrentWall = CSG.fromMesh(currentWall);
        const bspNewWall = CSG.fromMesh(newWall);

        const bspResult = bspCurrentWall.subtract(bspNewWall);

        const resultMesh = CSG.toMesh(bspResult, currentWall.matrixWorld, currentWall.material);

        currentWall.geometry.dispose();
        currentWall.geometry = resultMesh.geometry;
        currentWall.geometry.needsUpdate = true;

        this.onWallGeometryUpdate();
    }

    onWallGeometryUpdate() {
        this.updateMatrixWorld(true);
        this.updateWallLayers();
        this.setupWallMaterials(null,this.wallHeight);
        this.restoreLayerColors();
    }

    toggleHighlight(highLightState) {
        this.isHighlighted = highLightState;
        HIGHLIGHT_MATERIAL.wireframe = AppState.debugEnabled;

        this.wallGeometry.material = this.isHighlighted ? HIGHLIGHT_MATERIAL : this.originalMaterial;
        this.pointIndicators[0].material = this.isHighlighted ? HIGHLIGHT_MATERIAL : this.originalMaterial;
        this.pointIndicators[1].material = this.isHighlighted ? HIGHLIGHT_MATERIAL : this.originalMaterial;

        this.userData.winDoors.forEach(windoor => {
            //console.log(windoor.constructor.name); // debug purposes
            windoor.toggleHighlight(highLightState);
        });
    }

    toggleVisibility(visibilityState) {
        this.visible = visibilityState;

        this.userData.winDoors.forEach(windoor => {
            windoor.toggleVisibility(visibilityState);
        });
    }

    handleAttachDetach(attachState)
    {
        this.isAttached = attachState;
        this.winDoors.forEach(windoor => {
            windoor.isAttached = attachState;
        })
    }

    onDelete() {
        if (this.wallGeometry) {
            this.wallGeometry.geometry?.dispose();
            if (Array.isArray(this.wallGeometry.material)) {
                this.wallGeometry.material.forEach(mat => mat.dispose?.());
            } else {
                this.wallGeometry.material?.dispose?.();
            }
            this.remove(this.wallGeometry);
        }

        this.userData.winDoors.forEach(wd => {
            if (wd.userData.centerCubeMesh) {
                wd.userData.centerCubeMesh.geometry?.dispose();
                wd.userData.centerCubeMesh.material?.dispose?.();
            }
            wd.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material?.dispose) obj.material.dispose();
            });
            this.remove(wd);
        });
        this.userData.winDoors.length = 0;

        this.pointIndicators.forEach(p => {
            p.geometry?.dispose();
            p.material?.dispose?.();
            this.remove(p);
        });
        this.pointIndicators.length = 0;

        this.userData.lengthLabel.parent?.remove(this.userData.lengthLabel);

        if (this.userData.lengthLabel.element && this.userData.lengthLabel.element.parentNode)
            this.userData.lengthLabel.element.parentNode.removeChild(this.userData.lengthLabel.element);

        this.userData.lengthLabel.element = null;

        this.parent?.remove(this);
    }

    setLengthLabelVisible(visible) {
        this.userData.lengthLabel.visible = visible;
    }

    static updateCornersVisibility(placedWalls) {
        return; // for testing purposes disabled

        placedWalls.forEach(wall => {
            wall.pointIndicators.forEach(indicator => {
                indicator.visible = true;
            });
        });

        // map to store unique (horizontal) positions
        const pointMap = new Map();

        placedWalls.forEach(wall => {
            wall.pointIndicators.forEach(indicator => {
                const pos = indicator.position;
                const key = `${pos.x.toFixed(5)}_${pos.z.toFixed(5)}`;

                if (!pointMap.has(key)) {
                    // first indicator at this point
                    pointMap.set(key, indicator);
                } else {
                    indicator.visible = false;
                }
            });
        });
    } // Maybe DEPRECATED

    get catalogItem() {
        return this.userData.catalogItem;
    }

    get dimensions() {
        return this.userData.dimensions;
    }

    set dimensions(value) {
        this.userData.dimensions = value;
    }

    get model() {
        return this.userData.model;
    }

    set model(value) {
        this.userData.model = value;
    }

    get boundingBox() {
        return this.userData.boundingBox;
    }

    set boundingBox(value) {
        this.userData.boundingBox = value;
    }

    get boundingWireframe() {
        return this.userData.boundingWireframe;
    }

    set boundingWireframe(value) {
        this.userData.boundingWireframe = value;
    }

    get winDoors() {
        return this.userData.winDoors;
    }

    set winDoors(value) {
        this.userData.winDoors = value;
    }

    get isAttached() {
        return this.userData.isAttached;
    }

    set isAttached(value) {
        this.toggleHighlight(value);
        this.userData.isAttached = value;
    }
}

export { Wall };