import * as THREE from 'three';
import { ThreeGeometry } from './ThreeGeometry.js';
import { WinDoor } from "./WinDoor.js";
import CSG from "../THREE-CSGMesh-master/three-csg.js";
import {WObject} from "./WObject.js";
import {AppState} from "./AppState.js";

const HIGHLIGHT_MATERIAL = new THREE.MeshBasicMaterial({
    color: 0XFFA500,
    transparent: true,
    opacity: 0.5,
    wireframe: false, // debug purposes...
});

const wallTexture = new THREE.TextureLoader().load('res/image/wall_1.png');
wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;

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

        const wallCenter = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

        const wallDirection = new THREE.Vector3().subVectors(end, start);
        const wallNormal = new THREE.Vector3(wallDirection.z, 0, -wallDirection.x).normalize();

        this.wallPlane = new THREE.Plane();
        this.wallPlane.setFromNormalAndCoplanarPoint(wallNormal, wallCenter);

        if (AppState.debugEnabled)
            this.#createDebugVisualization(wallWidth, wallHeight, wallCenter, wallDirection, wallNormal);

        this.vertexLayers = null;
        this.layerColors = new Map();

        this.updateMatrixWorld(true);
        this.updateWallLayers();
    }

    onColorApply(color, layerKey) {
        const vertices = this.vertexLayers?.[layerKey];

        if (!vertices)
            return;

        const colorAttr = this.wallGeometry.geometry.attributes.color;

        const threshold  = 0.0001;

        const r = colorAttr.getX(vertices[0]);
        const g = colorAttr.getY(vertices[0]);
        const b = colorAttr.getZ(vertices[0]);

        if (
            Math.abs(r - color.r) < threshold  &&
            Math.abs(g - color.g) < threshold  &&
            Math.abs(b - color.b) < threshold
        ) {
            return;
        }

        this.layerColors.set(layerKey, color);

        for (const index of vertices) { // wall
            if (typeof index === 'number') {
                if (!colorAttr)
                    continue;

                colorAttr.setXYZ(index, color.r, color.g, color.b);
                colorAttr.needsUpdate = true;

            } else if (typeof index === 'string' && index.startsWith('corner')) { // corners || pointIndicators
                const [cornerId, vertIndexStr] = index.split('_');
                const cornerIndex = parseInt(cornerId.replace('corner', ''));
                const vertIndex = parseInt(vertIndexStr);

                const indicator = this.pointIndicators[cornerIndex];

                const colorAttr = indicator.geometry.attributes.color;
                colorAttr.setXYZ(vertIndex, color.r, color.g, color.b);
                colorAttr.needsUpdate = true;
            }
        }
    }

    updateWallLayers() {
        const insideLayer = [];
        const outsideLayer = [];

        const positionAttribute = this.wallGeometry.geometry.attributes.position;

        const tempVector = new THREE.Vector3();

        // wall geometry
        for (let i = 0; i < positionAttribute.count; i++) {
            tempVector.fromBufferAttribute(positionAttribute, i);

            const worldVertex = tempVector.clone().applyMatrix4(this.wallGeometry.matrixWorld);
            const result = this.wallPlane.distanceToPoint(worldVertex);

            if (result >= 0) {
                insideLayer.push(i);
            } else {
                outsideLayer.push(i);
            }

            if(AppState.debugEnabled)
                this.#placeVertexVisualizer(worldVertex, result >= 0 ? 0x00ff00 : 0xff0000);
        }

        // pointIndicators
        this.pointIndicators.forEach((indicator, cornerIndex) => {
            const posAttr = indicator.geometry.attributes.position;

            for (let i = 0; i < posAttr.count; i++) {
                const worldVertex = tempVector.clone().fromBufferAttribute(posAttr, i).applyMatrix4(indicator.matrixWorld);
                const result = this.wallPlane.distanceToPoint(worldVertex);

                const uid = `corner${cornerIndex}_${i}`;

                if (result >= 0) {
                    insideLayer.push(uid);
                } else {
                    outsideLayer.push(uid);
                }

                if(AppState.debugEnabled)
                    this.#placeVertexVisualizer(worldVertex, result >= 0 ? 0x00ff00 : 0xff0000, 0.005);
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
        wallTexture.anisotropy = AppState.ANISOTROPY_MAX;

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

            const cloneCC = centerCube.clone();
            cloneCC.applyMatrix4(centerCube.matrixWorld);
            cloneCC.updateMatrix();

            const bspWall = CSG.fromMesh(this.wallGeometry);
            const bspCC = CSG.fromMesh(cloneCC);
            const bspResult = bspWall.subtract(bspCC);

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

            super.materialOnDelete(this.wallGeometry);

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

    #createDebugVisualization(wallWidth, wallHeight, wallCenter, wallDirection, wallNormal) {
        let centerIndicator = ThreeGeometry.CreateCylinder(wallWidth, wallHeight + 0.1, 0xFFA500, wallCenter);

        const wallDirectionHelper = new THREE.ArrowHelper(wallDirection, this.p1, this.length + 2.5, 0xFFA500);

        const normalHelper = new THREE.ArrowHelper(wallNormal, wallCenter, 1, 0xff0000);

        const planeHelper = new THREE.PlaneHelper(this.wallPlane, wallHeight * 2, 0xFFA500);
        planeHelper.position.copy(wallCenter);

        this.add(centerIndicator);
        this.add(wallDirectionHelper);
        this.add(normalHelper);
        this.add(planeHelper);
    }

    #placeVertexVisualizer(position, color = 0x000000, size = 0.02) {
        const indicator = ThreeGeometry.CreateCube(size, size, size, color);
        indicator.position.copy(position);
        this.add(indicator);
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