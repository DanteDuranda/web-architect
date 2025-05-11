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

const wallTexture = new THREE.TextureLoader().load('res/image/wall_1.png');
wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
wallTexture.anisotropy = 16;

const wallSideMaterial = new THREE.MeshStandardMaterial({ map: wallTexture });

class Wall extends WObject {
    constructor(wall, start, end, wallWidth, wallHeight, color=0x000000, lengthLabel) {
        super();
        this.name = "Wall";

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
        this.originalMaterial = wallSideMaterial;

        this.userData = {
            catalogItem: null,
            dimensions: {"wallWidth": wallWidth, "wallHeight": wallHeight, "wallLength": Number(this.length.toFixed(2))},
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

        this.setupWallMaterials(wallWidth, wallHeight);

        const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const wallDirection = new THREE.Vector3().subVectors(end, start).normalize();
        const wallNormal = new THREE.Vector3(-wallDirection.z, 0, wallDirection.x).normalize();

        this.wallPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(wallNormal, center);
        if (AppState.debugEnabled)
        {
            const planeHelper = new THREE.PlaneHelper(this.wallPlane, wallHeight, 0xFFA500);
            planeHelper.position.copy(center);
            this.add(planeHelper);
        }

        this.vertexLayers = null;
        this.layerColors = new Map();

        if (this.wallGeometry && this.wallGeometry.geometry) {
            this.wallGeometry.geometry.computeBoundingBox();

            const boundingBox = this.wallGeometry.geometry.boundingBox.clone();
            boundingBox.applyMatrix4(this.wallGeometry.matrixWorld);
            this.userData.boundingBox = boundingBox;

            const boxHelper = new THREE.BoxHelper(this.wallGeometry, 0xffff00); // yellow wireframe
            boxHelper.name = "boundingWireframe";
            this.userData.boundingWireframe = boxHelper;
            this.add(boxHelper);
        }


        this.updateMatrixWorld(true);
        this.updateWallLayers();
    }

    onColorApply(color, layerKey) {
        const indices = this.vertexLayers?.[layerKey];
        if (!indices) return;

        this.layerColors.set(layerKey, color);

        for (const index of indices) { // wall
            if (typeof index === 'number') {
                const colorAttr = this.wallGeometry.geometry.attributes.color;

                if (!colorAttr)
                    continue;

                colorAttr.setXYZ(index, color.r, color.g, color.b);
                colorAttr.needsUpdate = true;

            } else if (typeof index === 'string' && index.startsWith('corner')) { // corners || pointIndicators
                const [cornerId, vertIndexStr] = index.split('_');
                const cornerIndex = parseInt(cornerId.replace('corner', ''));
                const vertIndex = parseInt(vertIndexStr);

                const indicator = this.pointIndicators[cornerIndex];
                if (!indicator || !indicator.geometry?.attributes?.color) continue;

                const colorAttr = indicator.geometry.attributes.color;
                colorAttr.setXYZ(vertIndex, color.r, color.g, color.b);
                colorAttr.needsUpdate = true;
            }
        }
    }

    updateWallLayers() {
        const geometry = this.wallGeometry.geometry;
        const positionAttr = geometry.attributes.position;
        const matrixWorld = this.wallGeometry.matrixWorld;

        // Get plane normal and constant (a, b, c, d)
        const plane = this.wallPlane;
        const normal = plane.normal;
        const constant = plane.constant;

        const insideLayer = [];
        const outsideLayer = [];

        const tempVec = new THREE.Vector3();

        // Helper to test and classify a vertex
        const classifyVertex = (index, vertex) => {
            const worldVertex = vertex.clone().applyMatrix4(matrixWorld);
            const result = normal.dot(worldVertex) + constant;
            if (result >= 0) {
                insideLayer.push(index);
            } else {
                outsideLayer.push(index);
            }
        };

        // Classify wallGeometry vertices
        for (let i = 0; i < positionAttr.count; i++) {
            tempVec.fromBufferAttribute(positionAttr, i);
            classifyVertex(i, tempVec);
        }

        // Classify point indicator (cylinder) vertices
        /*pointIndicators dont share the same vertex buffer as the wall, their vertices dont have stable,
        numeric indices in the wall's buffer. Using a unique string key avoids index collisions
        and preserves identification per corner.*/
        this.pointIndicators.forEach((indicator, cornerIndex) => {
            const posAttr = indicator.geometry.attributes.position;
            const worldMatrix = indicator.matrixWorld;

            for (let i = 0; i < posAttr.count; i++) {
                tempVec.fromBufferAttribute(posAttr, i).applyMatrix4(worldMatrix);
                const result = normal.dot(tempVec) + constant;
                const globalIndex = `corner${cornerIndex}_${i}`;
                if (result >= 0) {
                    insideLayer.push(globalIndex);
                } else {
                    outsideLayer.push(globalIndex);
                }
            }
        });

        this.vertexLayers = { insideLayer, outsideLayer };
    }

    restoreLayerColors() {
        if (!this.layerColors || !this.vertexLayers) return;

        for (const [layerKey, color] of this.layerColors.entries()) {
            this.onColorApply(color, layerKey);
        }
    }

    applyWhiteVertexColors(geometry) {
        const count = geometry.attributes.position.count;
        const white = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            white[i * 3] = 1;     // r
            white[i * 3 + 1] = 1; // g
            white[i * 3 + 2] = 1; // b
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(white, 3));
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

    setupWallMaterials(wallWidth, wallHeight) {
        wallTexture.repeat.set(this.length, wallHeight);
        this.wallHeight = wallHeight;

        wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
        wallTexture.anisotropy = 16;

        const unifiedWallMaterial = new THREE.MeshStandardMaterial({
            map: wallTexture,
            vertexColors: true
        });

        const geometry = this.wallGeometry.geometry;
        this.applyWhiteVertexColors(geometry);

        this.wallGeometry.material = unifiedWallMaterial;

        this.pointIndicators.forEach(indicator => {
            indicator.material = unifiedWallMaterial;
        });

        this.originalMaterial = unifiedWallMaterial;

        this.setupPointIndicatorColors();
    }

    setupPointIndicatorColors() {
        this.pointIndicators.forEach(indicator => {
            const geometry = indicator.geometry;
            this.applyWhiteVertexColors(geometry);

            indicator.material = this.originalMaterial;
        });
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

        this.toggleHighlight(this.isHighlighted)
    }

    resetWallGeom() {
        this.wallGeometry.geometry.dispose();
        this.wallGeometry.geometry = this.originalWallGeometry.clone();
    }

    updateWindoorOnWall() {
        this.resetWallGeom();

        this.userData.winDoors.forEach((winDoor) => {
            const centerCube = winDoor.userData.centerCubeMesh;

            winDoor.updateMatrixWorld(true);
            centerCube.updateMatrixWorld(true);

            const clone = centerCube.clone();
            clone.applyMatrix4(centerCube.matrixWorld);
            clone.updateMatrix();

            const bspWall = CSG.fromMesh(this.wallGeometry);
            const bspHole = CSG.fromMesh(clone);
            const bspResult = bspWall.subtract(bspHole);

            const resultMesh = CSG.toMesh(bspResult, this.wallGeometry.matrixWorld, this.wallGeometry.material);
            this.wallGeometry.geometry.dispose(); // dispose first for safety
            this.wallGeometry.geometry = resultMesh.geometry;
            this.wallGeometry.geometry.needsUpdate = true;
        });

        this.onWallGeometryUpdate();
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

        this.subtracted = true;
        this.onWallGeometryUpdate();
    }

    areWallsOverlapping(start1, end1, start2, end2) {

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
            if(AppState.debugEnabled)
                console.log(windoor.constructor.name);

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