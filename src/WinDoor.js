import * as THREE from 'three';

import { ThreeGeometry } from './ThreeGeometry.js';
import { CatalogItem } from './UiControl.js';
import {WObject} from "./WObject.js";

const glassWidth = 1.0;
const glassHeight = 1.0;
const glassDepth = 0.02;

const doorWidth = 0.9;
const doorHeight = 1.8;

const glassMaterial = new THREE.MeshPhysicalMaterial({
    roughness: 0.3,
    metalness: 0.3,
    transparent: true,
    opacity: 0.9,
    envMapIntensity: 0.9,
    transmission: 0.95,
    reflectivity: 0.2,
    clearcoat: 1
});

const doorMaterial = new THREE.MeshStandardMaterial({
    transparent: true,
    opacity: 0
});

class WinDoor extends WObject {
    constructor(wall, type = "plane") {
        super();
        this.position.y = 0.8;
        this.isHighlighted = false;

        let frameWidth = type === "door" ? doorWidth : glassWidth;
        let frameHeight = type === "door" ? doorHeight : glassHeight;

        const CSGGeometry = ThreeGeometry.CreateCube(frameWidth + 0.1, frameHeight + 0.1, wall.userData.dimensions.wallWidth + 0.1, 0xFF0000);
        CSGGeometry.name = "csg";
        CSGGeometry.visible = false;

        const glassGeometry = new THREE.BoxGeometry(frameWidth, frameHeight, glassDepth);
        const windowGlass = new THREE.Mesh(glassGeometry, type === "door" ? doorMaterial : glassMaterial);
        windowGlass.position.set(0, 0, 0);
        windowGlass.name = "windowGlass";
        windowGlass.userData.root = this;
        this.add(windowGlass);

        const parts = [
            { name: 'left', object: ThreeGeometry.CreateCube(0.1, frameHeight + 0.1, 0.1, 0xFFFFFFF) },
            { name: 'right', object: ThreeGeometry.CreateCube(0.1, frameHeight + 0.1, 0.1, 0xFFFFFFF) },
            { name: 'top', object: ThreeGeometry.CreateCube(frameWidth + 0.1, 0.1, 0.1, 0xFFFFFFF) },
            { name: 'bottom', object: ThreeGeometry.CreateCube(frameWidth + 0.1, 0.1, 0.1, 0xFFFFFFF) }
        ];

        parts[0].object.position.set(-frameWidth / 2, 0, 0);
        parts[1].object.position.set(frameWidth / 2, 0, 0);
        parts[2].object.position.set(0, frameHeight / 2, 0);
        parts[3].object.position.set(0, -frameHeight / 2, 0);

        parts.forEach(({ object }) => {
            object.userData.root = this;
            object.layers.set(1);
            object.layers.enable(3);
            object.layers.enable(0);
            this.add(object);
        });

        this.userData = {
            catalogItem: new CatalogItem("testWindow", "testWindow", "testWindow", "testWindow", "only_xy", true, null),
            dimensions: { "X": -1, "Y": -1, "Z": -1 },
            parts: parts,
            centerCubeMesh: CSGGeometry,
            boundingWireframe: null,
            windowGlass: windowGlass,
            wall: wall,
            isAttached: false,
            marker: null
        };

        this.userData.windowGlass.layers.set(1);
        this.userData.windowGlass.layers.enable(3);
        this.userData.windowGlass.layers.enable(0);

        this.userData.parts = parts;

        this.add(CSGGeometry);

        const wireframe = new THREE.BoxHelper(CSGGeometry, 0xFFA500);
        wireframe.root = this;
        wireframe.layers.set(2);
        wireframe.visible = false;
        this.boundingWireframe = wireframe;
        this.userData.boundingWireframe = wireframe;
        this.add(wireframe);

        const bounds = new THREE.Box3().setFromObject(wireframe);
        const size = new THREE.Vector3();
        bounds.getSize(size);

        this.userData.dimensions = {
            "X": parseFloat(size.x.toFixed(2)),
            "Y": parseFloat(size.y.toFixed(2)),
            "Z": parseFloat(size.z.toFixed(2)),
        };

        this.addWindowStyle(type);

        this.name = "windoor";

        this.#addMarker(type, frameWidth, wall.userData.dimensions.wallWidth, wall.userData.dimensions.wallHeight);
    }

    addWindowStyle(type) {
        if (type === "cross" || type === "vertical") {
            const verticalBar = ThreeGeometry.CreateCube(0.05, glassHeight, glassDepth + 0.01, 0xDDDDDD);
            verticalBar.position.set(0, 0, 0);
            verticalBar.name = "verticalBar";
            verticalBar.userData.root = this;
            this.add(verticalBar);
        }

        if (type === "cross") {
            const horizontalBar = ThreeGeometry.CreateCube(glassWidth, 0.05, glassDepth + 0.01, 0xDDDDDD);
            horizontalBar.position.set(0, 0, 0);
            horizontalBar.name = "horizontalBar";
            horizontalBar.userData.root = this;
            this.add(horizontalBar);
        }
    }

    toggleHighlight(highLightState) {
        this.isHighlighted = highLightState;
        this.boundingWireframe.visible = highLightState;
    }

    toggleVisibility(visibilityState) {
        this.visible = visibilityState
        this.userData.windowGlass.visible = visibilityState;
        this.userData.wall.visible = visibilityState;
    }

    toggleVisibleMarker(visible) {
        this.userData.marker.visible = visible;
    }

    handleAttachDetach(attachState)
    {
        this.wall.isAttached = attachState;
        this.isAttached = attachState;
    }

    onDelete() {
        if (this.userData.windowGlass) {
            this.userData.windowGlass.geometry?.dispose();
            this.userData.windowGlass.material?.dispose?.();
            this.remove(this.userData.windowGlass);
        }

        if (this.userData.centerCubeMesh) {
            this.userData.centerCubeMesh.geometry?.dispose();
            this.userData.centerCubeMesh.material?.dispose?.();
            this.remove(this.userData.centerCubeMesh);
            this.wall.resetWallGeom();

            if(this.wall.winDoors.length !== 0)
                this.wall.updateWindoorOnWall();
        }

        this.userData.parts?.forEach(part => {
            part.object.geometry?.dispose();
            part.object.material?.dispose?.();
            this.remove(part.object);
        });
        this.userData.parts.length = 0;

        if (this.userData.boundingWireframe) {
            this.remove(this.userData.boundingWireframe);
        }

        this.children.slice().forEach(child => {
            if (child.geometry) child.geometry.dispose?.();
            if (child.material) child.material.dispose?.();
            this.remove(child);
        });

        this.parent?.remove(this);
    }

    #addMarker(type, frameWidth, wallWidth, wallHeight) {
        const marker = new THREE.Mesh(
            new THREE.PlaneGeometry(frameWidth, type === "door" ? wallWidth + 0.1 : wallWidth - 0.07),
            new THREE.MeshBasicMaterial({ color: 0xfffbe9, transparent: true, opacity: 0.8 })
        );
        marker.rotation.x = -Math.PI / 2;
        marker.position.y = wallHeight + 10;

        marker.userData.root = this;
        marker.layers.set(1);
        this.userData.marker = marker;
        this.add(marker);
    }

    /******************/
    /*getters & setters/
    /******************/

    get catalogItem() {
        return this.userData.catalogItem;
    }

    set catalogItem(value) {
        this.userData.catalogItem = value;
    }

    get dimensions() {
        return this.userData.dimensions;
    }

    set dimensions(value) {
        this.userData.dimensions = value;
    }

    get centerCubeMesh() {
        return this.userData.centerCubeMesh;
    }

    set centerCubeMesh(value) {
        this.userData.centerCubeMesh = value;
    }

    get boundingWireframe() {
        return this.userData.boundingWireframe;
    }

    set boundingWireframe(value) {
        this.userData.boundingWireframe = value;
    }

    set windowGlass(value) {
        this.userData.windowGlass = value;
    }

    get wall() {
        return this.userData.wall;
    }

    set wall(value) {
        this.userData.wall = value;
    }

    get isAttached() {
        return this.userData.isAttached;
    }

    set isAttached(value) {
        this.toggleHighlight(value);
        this.userData.isAttached = value;

        this.wall.winDoors.forEach(windoor => {
            if (windoor !== this)
                windoor.userData.isAttached = value;
        });
    }
}

export { WinDoor };
