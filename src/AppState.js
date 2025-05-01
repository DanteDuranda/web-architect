import * as THREE from 'three';

import {Wall} from "./Wall.js";
import {Furniture} from "./Furniture.js";
import {Room} from "./Room.js";
import { PlanCursor, PlanLabel} from "./planMode.js";
import {SideBar} from "./UiControl.js";
import {WTransformControl} from "./WTransformControl.js";
import {ThreeGeometry} from "./ThreeGeometry.js";
import {OrbitControls} from 'OrbitControls';
import {Telemetry} from "./Ui2d.js";
import {CSS2DRenderer} from 'CSS2DRenderer';

const NO_CULLING_LIMIT = 50;
const MIN_ZOOM = 1;
const MAX_ZOOM = 100;
let aspectRatio = window.innerWidth / window.innerHeight;

const canvas = document.querySelector('canvas');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x4A4848);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true  });
const cSS2DRenderer = new CSS2DRenderer();
const ANISOTROPY_MAX = renderer.capabilities.getMaxAnisotropy();

let cameraOrtho = new THREE.OrthographicCamera(
    NO_CULLING_LIMIT * aspectRatio / -2,     // left
    NO_CULLING_LIMIT * aspectRatio / 2,     //  right
    NO_CULLING_LIMIT / 2,                  //   top
    NO_CULLING_LIMIT / -2,                //    bottom
    1,                                   //     near
    1000                                //      far
);

const cameraPersp = new THREE.PerspectiveCamera(60, aspectRatio, 0.1, 1000);

let gridHelperM, gridHelperDm, gridHelperCm;

function Init() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio * 1.25);

    cSS2DRenderer.setSize(window.innerWidth, window.innerHeight);
    cSS2DRenderer.domElement.style.position = 'absolute';
    cSS2DRenderer.domElement.style.top = '0';
    cSS2DRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(cSS2DRenderer.domElement);

    gridHelperM = new THREE.GridHelper(50, 50, 0x232526, 0xFFFFFF);
    scene.add(gridHelperM);

    gridHelperDm = new THREE.GridHelper(50, 500, 0x232526, 0x556677);
    gridHelperDm.position.y -= 0.001;
    scene.add(gridHelperDm);

    gridHelperCm = new THREE.GridHelper(50, 5000, 0x232526, 0x556677);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xB97A20, 1);
    scene.add(hemisphereLight);

    cameraOrtho.position.set(0, 30, 0);
    cameraOrtho.lookAt(0, 0, 0);
    cameraOrtho.layers.enable(0);
    cameraOrtho.layers.enable(1);
    cameraOrtho.layers.enable(2);

    cameraPersp.position.set(10, 10, 10);
    cameraPersp.lookAt(0, 0, 0);
    cameraPersp.layers.enable(0);
    cameraPersp.layers.enable(1);
    cameraPersp.layers.enable(2);
    cameraPersp.layers.enable(3);

    cameraPersp.addEventListener('zoom', AppState.wmouse.wTransformControls.updateGizmoSize);
    cameraPersp.addEventListener('move', AppState.wmouse.wTransformControls.updateGizmoSize);
    scene.add(AppState.wmouse.wTransformControls);
}

document.addEventListener("addFurnitureRequested", (event) => {
    const { catalogItem } = event.detail;
    const furnitureToAdd = new Furniture(catalogItem, ANISOTROPY_MAX);
    furnitureToAdd.position.y += 0.1;
    ObjectFilter.addByInstance(furnitureToAdd)
    scene.add(furnitureToAdd);
});

document.addEventListener('wallPlacingToggled', (event) => {
    if (event.detail && AppState.isPlanModeActive) {
        AppState.wallPlacingEnabled = true;
        scene.add(AppState.wmouse.planCursor.cursorGroup);
    } else {
        AppState.wallPlacingEnabled = false;
        scene.remove(AppState.wmouse.planCursor.cursorGroup);
    }
});

window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    cameraOrtho.left = -50 * aspect / 2;
    cameraOrtho.right = 50 * aspect / 2;
    cameraOrtho.top = 50 / 2;
    cameraOrtho.bottom = -50 / 2;
    cameraOrtho.updateProjectionMatrix();
    cameraPersp.aspect = aspect;
    cameraPersp.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    cSS2DRenderer.setSize(window.innerWidth, window.innerHeight);
}

Telemetry.createTelemetryDisplay();

export class AppState {
    static debugEnabled = false;

    static isPlanModeActive = false;
    static wallPlacingEnabled = false;

    static init() {
        this.wmouse = new WMouse();

        this.sideBar = new SideBar(this.wmouse.wTransformControls);
        Init();
        document.getElementById("renderer").addEventListener("click", this.wmouse.onMouseLeftClick.bind(this.wmouse));
        document.getElementById("renderer").addEventListener("contextmenu", this.wmouse.onMouseRightClick.bind(this.wmouse));
        document.getElementById("renderer").addEventListener("mousemove", this.wmouse.onMouseMove.bind(this.wmouse));

        document.getElementById("planModeBt").addEventListener("click", AppState.activatePlanMode);
        document.getElementById("designModeBt").addEventListener("click", AppState.activateDesignMode);

        AppState.activatePlanMode();
    }

    static Render() {
        if (AppState.isPlanModeActive) {
            renderer.render(scene, cameraOrtho);
            cSS2DRenderer.render(scene, cameraOrtho);
        } else {
            AppState.updateWallVisibility();
            renderer.render(scene, cameraPersp);
            cSS2DRenderer.render(scene, cameraPersp);
        }
    }

    static activatePlanMode() {
        if (AppState.isPlanModeActive)
            return;

        AppState.wmouse.orbControlOrtho.enabled = true;
        AppState.wmouse.orbControlPersp.enabled = false;

        ObjectFilter.placedWalls.forEach((wall) => {
            wall.visible = true;
            wall.setLengthLabelVisible(true);
        });

        AppState.wmouse.crosshair.style.opacity = 0;

        AppState.wmouse.wTransformControls.switchCamera(cameraOrtho);

        AppState.isPlanModeActive = true;

        AppState.sideBar.updateSidebar(AppState.isPlanModeActive);
    }


    static activateDesignMode() {
        if (!AppState.isPlanModeActive)
            return;

        AppState.wallPlacingEnabled = false;

        AppState.wmouse.crosshair.style.opacity = 0.2;
        scene.remove(AppState.wmouse.planCursor.cursorGroup);
        canvas.style.cursor = 'default';

        AppState.sideBar.isWallPlacingActive = false;

        AppState.wmouse.orbControlOrtho.enabled = false;
        AppState.wmouse.orbControlPersp.enabled = true;

        AppState.wmouse.wTransformControls.switchCamera(cameraPersp);

        ObjectFilter.placedWalls.forEach((wall) => {
            wall.setLengthLabelVisible(false);
        })

        AppState.isPlanModeActive = false;

        AppState.sideBar.updateSidebar(AppState.isPlanModeActive);
    }

    static updateWallVisibility() {
        let raycaster = new THREE.Raycaster();
        raycaster.layers.set(3);
        let screenCenter = new THREE.Vector2(0, 0); // center of the screen (normalized device coordinates)

        raycaster.setFromCamera(screenCenter, cameraPersp);

        let intersects = raycaster.intersectObjects(ObjectFilter.placedWalls, true);

        ObjectFilter.placedWalls.forEach((wall) => {
            wall.toggleVisibility(true);
        });

        if (intersects.length > 0) {
            let firstHit = intersects[0].object;

            if (!firstHit.parent.isAttached)
                firstHit.parent.toggleVisibility(false);
        }
    }
}


export class WMouse {
    static instance = null;

    constructor() {
        if (WMouse.instance) {
            return WMouse.instance;
        }

        this.cursorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.planCursor = new PlanCursor();
        this.mouseDownPosition = { x: 0, y: 0 };
        this.movementThreshold = 5; // pixels
        this.isClickSuppressed = false;
        this.isPlacingWall = false;
        this.wallStartPoint = null;
        this.startPoint = new THREE.Vector3();
        this.tempWallVisualizer = null;
        this.distanceLabel = null;
        this.newCornerPoints = [];
        this.newWalls = [];
        this.wTransformControls = null;
        this.crosshair = document.createElement("crosshair");
        this.orbControlOrtho = null;
        this.orbControlPersp = null;

        canvas.addEventListener('mousedown', (event) => {
            this.mouseDownPosition = { x: event.clientX, y: event.clientY };
            this.isClickSuppressed = false;
        });

        canvas.addEventListener('mouseup', (event) => {
            const dx = Math.abs(event.clientX - this.mouseDownPosition.x);
            const dy = Math.abs(event.clientY - this.mouseDownPosition.y);

            if (dx > this.movementThreshold || dy > this.movementThreshold) {
                this.isClickSuppressed = true;
            }
        });

        this.init();

        WMouse.instance = this;
    }

    static getWMouse() {
        if (!WMouse.instance) {
            WMouse.instance = new WMouse();
        }
        return WMouse.instance;
    }

    init() {
        this.orbControlOrtho = new OrbitControls(cameraOrtho, renderer.domElement);
        this.orbControlOrtho.enableRotate = false;

        this.orbControlPersp = new OrbitControls(cameraPersp, renderer.domElement);

        this.wTransformControls = new WTransformControl(cameraOrtho, renderer.domElement);

        this.orbControlOrtho.addEventListener("change", this.manageZoomInPlanMode.bind(this));


        this.wTransformControls.addEventListener('dragging-changed', (event) => {
            this.orbControlPersp.enabled = !event.value;
            this.wTransformControls.isDragging = event.value;
        });

        this.createCrosshair();
    }

    gridHelperMap = {
        m: gridHelperM,
        dm: gridHelperDm,
        cm: gridHelperCm
    };

    gridHelperGridSizes = {
        cm: 0.01,
        dm: 0.1,
        m: 1
    };

    onMouseLeftClick(event) {
        if (this.isClickSuppressed)
            return;

        if (AppState.isPlanModeActive && AppState.wallPlacingEnabled) {
            this.wallPlaceClick(event);
        } else { //TODO:: ezt kivenni h orthoval is selectelhessek DEPRECATED
            let intersects = this.getIntersects(event, null, 1);

            const maxDepth = Math.min(intersects.length, 3); //TODO: raycastert kikene szervezni mostmar...
            for (let i = 0; i < maxDepth; i++) {
                if (intersects[i] && intersects[i].object.userData.root) {
                    if (!intersects[i].object.userData.root.visible)
                        continue;

                    let model = intersects[i].object.userData.root;
                    if (model)
                        this.wTransformControls.attach(model);
                }
            }
        }
    }

    onMouseRightClick(event) {
        event.preventDefault(); // disables the browsers context menu

        // console.log(ObjectFilter.placedWalls); // debug only

        if(this.isClickSuppressed)
            return;

        if (AppState.isPlanModeActive && this.isPlacingWall) {
            this.exitWallPlacement();
            this.generateFloor();
            this.startPoint = new THREE.Vector3();
            scene.remove(this.wallStartPoint);
        } else {
            if(this.wTransformControls.object) {
                this.wTransformControls.detach();
            }
        }
    }

    getIntersects(event, searchObject = null, layer = 0) {
        let mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1; // Remove +5

        let raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, AppState.isPlanModeActive ? cameraOrtho : cameraPersp);

        if (searchObject === null) {
            raycaster.layers.set(layer);
            return raycaster.intersectObjects(scene.children, true);
        }

        const intersectionPoint = new THREE.Vector3();
        const hit = raycaster.ray.intersectPlane(this.cursorPlane, intersectionPoint);
        return hit ? intersectionPoint : null;
    }

    onMouseMove(event) {
        if (AppState.isPlanModeActive){
            if(this.isPlacingWall)
                this.wallPlacerMouseMove(event);

            this.planCursor.updateCursorIndicator(canvas, AppState.sideBar.wallHeight, AppState.sideBar.isWallPlacingActive,
                this.gridHelperGridSizes[AppState.sideBar.unit], cameraOrtho, this.getIntersects(event, this.cursorPlane));
        }
    }

    wallPlacerMouseMove(event) {
        let point = new THREE.Vector3();

        point.y = 0; // stay on gridHeight
        point.x = AppState.wmouse.planCursor.cursorGroup.position.x;
        point.z = AppState.wmouse.planCursor.cursorGroup.position.z;

        const distance = this.startPoint ? this.startPoint.distanceTo(point) : 0;

        if (!this.tempWallVisualizer) {
            // initialize the wall on the first interaction
            this.tempWallVisualizer = this.updateWall(null, this.startPoint, point, true);
            scene.add(this.tempWallVisualizer);

            if (!this.distanceLabel) {
                this.distanceLabel = PlanLabel.createLabel();
                scene.add(this.distanceLabel);
            }
        } else {
            // update the wall and its label while the moving
            this.updateWall(this.tempWallVisualizer, this.startPoint, point, false);
            PlanLabel.updateLabel(this.distanceLabel, this.startPoint, point, distance);
        }
    }

    wallPlaceClick(event) {
        let point = new THREE.Vector3();

        point.y = 0;
        point.x = this.planCursor.cursorGroup.position.x;
        point.z = this.planCursor.cursorGroup.position.z;

        this.newCornerPoints.push(point);
        //console.log(cornerPoints);
        if (!this.isPlacingWall) {
            // start placing a wall
            this.startPoint.copy(point);
            this.isPlacingWall = true;

            this.wallStartPoint = this.planCursor.cornerToPoint(point, AppState.sideBar.wallWidth + 0.05, AppState.sideBar.wallHeight+0.01, 0xFFFF00);
            scene.add(this.wallStartPoint);
        } else {
            // finalize the wall placement
            const finalizedWall = this.updateWall(this.tempWallVisualizer, this.startPoint, point, true);

            let testWall = new Wall(finalizedWall, this.startPoint, point, AppState.sideBar.wallWidth, AppState.sideBar.wallHeight, 0x422800, this.distanceLabel);
            this.newWalls.push(testWall);
            scene.add(testWall);

            this.resetTempWall();
            this.startPoint = point;
        }
    }

    updateWall(wall, start, end, click = false) {
        const wallLength = start.distanceTo(end);

        if (click) {
            // create a new wall
            const wallGeometry = new THREE.BoxGeometry(wallLength, AppState.sideBar.wallHeight, AppState.sideBar.wallWidth);
            const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x422800 });
            wall = new THREE.Mesh(wallGeometry, wallMaterial);
        } else /*if (move)*/{
            // update the existing wall
            wall.geometry.dispose();
            wall.geometry = new THREE.BoxGeometry(wallLength, AppState.sideBar.wallHeight, AppState.sideBar.wallWidth);
        }

        wall.position.set((start.x + end.x) / 2, AppState.sideBar.wallHeight/ 2, (start.z + end.z) / 2);
        wall.rotation.y = -Math.atan2(end.z - start.z, end.x - start.x);

        return wall;
    }

    exitWallPlacement() {
        this.isPlacingWall = false;
        this.resetTempWall();
    }

    generateFloor() {
        Wall.updateCornersVisibility(ObjectFilter.placedWalls);

        ObjectFilter.placedWalls.forEach(placedWall => {
            this.newWalls.forEach(newWall => {
                placedWall.subtractWallGeometry(newWall);
            })
        })

        if (this.newCornerPoints.length < 2) return; // need at least 2 points to form a line

        if (!this.newCornerPoints.at(0).equals(this.newCornerPoints.at(this.newCornerPoints.length-1))) {
            alert("Start and end points does not matches.");
        }

        const floorMesh = ThreeGeometry.createExtrudedFloor(this.newCornerPoints);

        ObjectFilter.placedRooms.forEach(room => {
            room.subtractFloorGeometry(floorMesh);
        })

        scene.add(floorMesh);
        this.newCornerPoints = [];
        ObjectFilter.addByInstance(this.newWalls);

        ObjectFilter.addByInstance(new Room(this.newWalls, floorMesh));

        this.newWalls = [];
    }

    resetTempWall() {
        if (this.tempWallVisualizer) {
            scene.remove(this.tempWallVisualizer);
            scene.remove(this.distanceLabel);
            this.tempWallVisualizer.geometry.dispose();
            this.tempWallVisualizer = null;
        }
        if (this.distanceLabel) {
            scene.remove(this.distanceLabel.sprite);
            this.distanceLabel = null;
        }
    }

    createCrosshair() {
        this.crosshair.style.position = "absolute";
        this.crosshair.style.width = "8px";
        this.crosshair.style.height = "8px";
        this.crosshair.style.background = "white";
        this.crosshair.style.opacity = 0.2;
        this.crosshair.style.borderRadius = "50%";
        this.crosshair.style.top = "50%";
        this.crosshair.style.left = "50%";
        this.crosshair.style.transform = "translate(-50%, -50%)";
        this.crosshair.style.zIndex = "1000";
        document.body.appendChild(this.crosshair);
    }

    manageZoomInPlanMode() {
        cameraOrtho.zoom = Math.max(MIN_ZOOM, Math.min(cameraOrtho.zoom, MAX_ZOOM));
        cameraOrtho.updateProjectionMatrix();

        this.planCursor.resizeCursor(cameraOrtho.zoom);
        if (cameraOrtho.zoom >= 40) {
            scene.add(gridHelperCm);
        } else {
            scene.remove(gridHelperCm);
        }
    }
}

/**
 * @class ObjectFilter
 * @description Static class that manages a collection of furnitures.
 */
export class ObjectFilter {
    static addedFurnitures = [];
    static placedWalls = [];
    static placedRooms = [];

    static removeByInstance(item) {
        if (item instanceof Wall) {
            this.removeWall(item);
        } else if (item instanceof Furniture) {
            this.removeFurniture(item);
        }
    }

    static addByInstance(item) {
        const isArray = Array.isArray(item);
        const checkItem = isArray ? item[0] : item;

        if (checkItem instanceof Wall) {
            this.addWall(item);
        } else if (checkItem instanceof Furniture) {
            this.addFurniture(item);
        } else if (checkItem instanceof Room) {
            this.addRoom(item);
        } else {
            throw new Error(`there is no such instance: ${checkItem}`);
        }
    }

    static removeFurniture(furniture) {
        this.addedFurnitures = this.addedFurnitures.filter(f => f !== furniture);
    }

    static removeWall(wall) {
        // Remove from placedWalls
        this.placedWalls = this.placedWalls.filter(f => f !== wall);

        for (let room of this.placedRooms) {
            room.roomWalls = room.roomWalls.filter(roomWall => roomWall !== wall);

            if(room.roomWalls.length < 1)
            {
                room.deleteFloor();
                this.removeRoom();
            }
        }
    }

    static removeRoom(room) {
        this.placedRooms = this.placedRooms.filter(r => r !== room);
    }

    static addFurniture(furniture) {
        if (!this.addedFurnitures.includes(furniture)) {
            this.addedFurnitures.push(furniture);
        }
    }

    static addWall(walls) {
        if (Array.isArray(walls)) {
            walls.forEach(wall => {
                if (!this.placedWalls.includes(wall)) {
                    this.placedWalls.push(wall);
                }
            });
        } else {
            if (!this.placedWalls.includes(walls)) {
                this.placedWalls.push(walls);
            }
        }
    }

    static addRoom(room) {
        if (!this.placedRooms.includes(room)) {
            this.placedRooms.push(room);
        }
    }
}