import * as THREE from 'three';

import { Wall } from "./Wall.js";
import { Furniture } from "./Furniture.js";
import { Room } from "./Room.js";
import { PlanCursor, PlanLabel} from "./planMode.js";
import { SideBar } from "./UiControl.js";
import { WTransformControl } from "./WTransformControl.js";
import { ThreeGeometry } from "./ThreeGeometry.js";
import { OrbitControls } from 'OrbitControls';
import { Telemetry } from "./Ui2d.js";
import { CSS2DRenderer } from 'CSS2DRenderer';
import {WinDoor} from "./WinDoor.js";


const MIN_ZOOM = 1;
const MAX_ZOOM = 100;
let aspectRatio = window.innerWidth / window.innerHeight;

const canvas = document.querySelector('canvas');

const previewCanvas = document.getElementById("preview-canvas");

const previewRenderer = new THREE.WebGLRenderer({
    canvas: previewCanvas,
    alpha: true,
    antialias: true,
});
previewRenderer.setSize(600, 600);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x4A4848);

const previewScene = new THREE.Scene();
previewScene.background = new THREE.Color(0xfffbe9);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true  });

const cSS2DRenderer = new CSS2DRenderer({ element: document.getElementById('css2d-ui') });

const ANISOTROPY_MAX = renderer.capabilities.getMaxAnisotropy();

const NO_CULLING_LIMIT = 50;
const cameraOrtho = new THREE.OrthographicCamera( // THREE.OrthographicCamera(left, right, top, bottom, near, far);
    NO_CULLING_LIMIT * aspectRatio / -2,
    NO_CULLING_LIMIT * aspectRatio / 2,
    NO_CULLING_LIMIT / 2,
    NO_CULLING_LIMIT / -2,
    1,
    1000
);

const cameraPersp = new THREE.PerspectiveCamera(60, aspectRatio, 0.1, 1000);

const previewCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000); // the preview canvas is rectangle shaped (ar = 1)
previewCamera.position.set(2, 2, 2);
previewCamera.lookAt(0, 1, 0);
previewCamera.layers.enable(1);

let gridHelperM, gridHelperDm, gridHelperCm;

function InitResources() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio * 1.25);
    cSS2DRenderer.setSize(window.innerWidth, window.innerHeight);

    gridHelperM = new THREE.GridHelper(50, 50, 0x232526, 0xFFFFFF);
    scene.add(gridHelperM);

    gridHelperDm = new THREE.GridHelper(50, 500, 0x232526, 0x556677);
    gridHelperDm.position.y -= 0.001;
    scene.add(gridHelperDm);

    gridHelperCm = new THREE.GridHelper(50, 5000, 0x232526, 0x556677);

    let hemisphereLMain = new THREE.HemisphereLight(0xffffff, 0xB97A20, 1);
    scene.add(hemisphereLMain);

    let hemisphereLPreview = new THREE.HemisphereLight(0xffffff, 0xB97A20, 1);
    previewScene.add(hemisphereLPreview);

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

    Telemetry.createTelemetryDisplay();
}

window.addEventListener('resize', onWindowResize, false);

document.addEventListener('wallPlacingToggled', (event) => {
    if (event.detail && AppState.isPlanModeActive) {
        AppState.wallPlacingEnabled = true;
        scene.add(AppState.wmouse.planCursor.cursorGroup);
    } else {
        AppState.wallPlacingEnabled = false;
        scene.remove(AppState.wmouse.planCursor.cursorGroup);
    }
});

document.addEventListener("addFurnitureRequested", (event) => {
    const { catalogItem } = event.detail;
    AppState.addFurnitureToScene(catalogItem);
});

canvas.addEventListener("dragover", (event) => {
    event.preventDefault();
});

canvas.addEventListener("drop", (event) => {
    event.preventDefault();

    const catalogData = event.dataTransfer.getData("application/json");
    if (!catalogData) return;

    const catalogItem = JSON.parse(catalogData);

    const mouse = new THREE.Vector2(
        (event.clientX / canvas.clientWidth) * 2 - 1,
        -(event.clientY / canvas.clientHeight) * 2 + 1
    );

    const dragNDropCaster = new THREE.Raycaster();
    dragNDropCaster.setFromCamera(mouse, cameraPersp);
    const intersectedPosOnCursorPlane = dragNDropCaster.ray.intersectPlane(AppState.wmouse.cursorPlane, new THREE.Vector3());

    AppState.addFurnitureToScene(catalogItem, intersectedPosOnCursorPlane);
});

function onWindowResize() {
    aspectRatio = window.innerWidth / window.innerHeight;

    cameraOrtho.left = -50 * aspectRatio / 2;
    cameraOrtho.right = 50 * aspectRatio / 2;
    cameraOrtho.top = 50 / 2;
    cameraOrtho.bottom = -50 / 2;
    cameraOrtho.updateProjectionMatrix();

    cameraPersp.aspect = aspectRatio;
    cameraPersp.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    cSS2DRenderer.setSize(window.innerWidth, window.innerHeight);
}

export class AppState {
    static debugEnabled = false;

    static isPlanModeActive = false;
    static wallPlacingEnabled = false;

    static isRecoloring = false;

    static isXrayEnabled = false;

    static wallPaintState = false;

    static originalObject = null;

    static init() {
        this.wmouse = new WMouse();

        this.sideBar = new SideBar(this.wmouse.wTransformControls);

        InitResources();

        canvas.addEventListener("click", this.wmouse.onMouseLeftClick.bind(this.wmouse));
        canvas.addEventListener("contextmenu", this.wmouse.onMouseRightClick.bind(this.wmouse));
        canvas.addEventListener("mousemove", this.wmouse.onMouseMove.bind(this.wmouse));

        previewCanvas.addEventListener('mousemove', this.wmouse.onPreviewMouseMove.bind(this.wmouse));
        previewCanvas.addEventListener("click", () => {
            AppState.wmouse.showColorPicker();
        });

        document.getElementById("planModeBt").addEventListener("click", AppState.activatePlanMode);
        document.getElementById("designModeBt").addEventListener("click", AppState.activateDesignMode);

        AppState.activatePlanMode();
    }

    static Render() {
        if (AppState.isPlanModeActive) {
            renderer.render(scene, cameraOrtho);
            cSS2DRenderer.render(scene, cameraOrtho);
        } else {
            if(AppState.isXrayEnabled)
                AppState.updateWallVisibility();

            renderer.render(scene, cameraPersp);
            cSS2DRenderer.render(scene, cameraPersp);
        }

        if(AppState.isObjectSelected() && AppState.isRecoloring)
            previewRenderer.render(previewScene, previewCamera);

        if (AppState.wmouse.wTransformControls.object && AppState.wmouse.wTransformControls.object.name !== "wallGeometry")
        {
            AppState.wmouse.wTransformControls.updateGizmoSize();
            AppState.wmouse.wTransformControls.updateRayLines(ObjectFilter.addedFurnitures, ObjectFilter.placedWalls);
        }

        if (AppState.wmouse.wTransformControls.object &&
            AppState.wmouse.wTransformControls.object instanceof WinDoor &&
            AppState.wmouse.wTransformControls.isDragging)
        {
            AppState.wmouse.wTransformControls.object.wall.updateWindoorOnWall();
        }
    }

    static addFurnitureToScene(catalogItem, position = null) {
        const furniture = new Furniture(catalogItem, ANISOTROPY_MAX);

        if (position)
            furniture.position.copy(position);

        ObjectFilter.addByInstance(furniture);
        scene.add(furniture);
    }

    static activatePlanMode() {
        if (AppState.isPlanModeActive)
            return;

        AppState.wmouse.orbControlOrtho.enabled = true;
        AppState.wmouse.orbControlPersp.enabled = false;

        ObjectFilter.placedRooms.forEach((room) => {
            room.setWallsVisibility(true);
            room.setLabelsVisibility(true);
        })

        AppState.wmouse.wTransformControls.switchCamera(cameraOrtho);

        AppState.toggle3dCursor(false);

        AppState.isPlanModeActive = true;

        AppState.sideBar.updateSidebar();
    }


    static activateDesignMode() {
        if (!AppState.isPlanModeActive)
            return;

        AppState.wallPlacingEnabled = false;

        scene.remove(AppState.wmouse.planCursor.cursorGroup);
        canvas.style.cursor = 'default';

        AppState.sideBar.isWallPlacingActive = false;

        AppState.wmouse.orbControlOrtho.enabled = false;
        AppState.wmouse.orbControlPersp.enabled = true;

        AppState.wmouse.wTransformControls.switchCamera(cameraPersp);

        ObjectFilter.placedWalls.forEach((wall) => {
            wall.setLengthLabelVisible(false);
        })

        ObjectFilter.placedRooms.forEach((room) => {
            room.setLabelsVisibility(false);
        })

        AppState.toggle3dCursor(true);

        AppState.isPlanModeActive = false;

        AppState.sideBar.updateSidebar();
    }

    static updateWallVisibility() {
        let raycaster = new THREE.Raycaster();
        raycaster.layers.set(3);
        let screenCenter = new THREE.Vector2(0, 0); // center of the screen (normalized device coordinates)

        raycaster.setFromCamera(screenCenter, cameraPersp);

        let intersects = raycaster.intersectObjects(ObjectFilter.placedWalls, true);

        AppState.resetWallsVisibility();

        if (intersects.length > 0) {
            let firstHit = intersects[0].object;

            if (!firstHit.parent.isAttached)
                firstHit.parent.toggleVisibility(false);
        }
    }

    static resetWallsVisibility() {
        ObjectFilter.placedWalls.forEach((wall) => {
            wall.toggleVisibility(true);
        });
    }

    static toggle3dCursor(activeState) {
        activeState ? AppState.wmouse.crosshair.classList.add("crosshair-active") : AppState.wmouse.crosshair.classList.remove("crosshair-active");
    }

    static addToPreviewScene(copy, original) {
        previewScene.add(copy);
        AppState.previewSceneObject = copy;
        AppState.originalObject = original;
    }

    static removeFromPreviewScene() {
        AppState.sideBar.togglePreviewPanel(false)
        AppState.previewSceneObject.onDelete();
        AppState.originalObject = null;
    }

    static isObjectSelected() {
        return AppState.previewSceneObject != null;
    }
}

export class WMouse {
    static instance = null;

    gridHelperGridSizes = {
        cm: 0.01,
        dm: 0.1,
        m: 1
    };

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
        this.wallPlacingStartPoint = null;
        this.startPoint = new THREE.Vector3();
        this.tempWallVisualizer = null;
        this.distanceLabel = null;
        this.newCornerPoints = [];
        this.newWalls = [];

        this.wTransformControls = null;

        this.orbControlOrtho = null;
        this.orbControlPersp = null;

        this.hoveredObject = null;
        this.previewControls = null;

        this.crosshair = document.getElementById("3d_crosshair");

        this.init();

        WMouse.instance = this;
    }

    init() {
        canvas.addEventListener('mousedown', (event) => {
            this.mouseDownPosition = { x: event.clientX, y: event.clientY };
            this.isClickSuppressed = false;
        });

        canvas.addEventListener('mouseup', (event) => {
            const dx = Math.abs(event.clientX - this.mouseDownPosition.x);
            const dy = Math.abs(event.clientY - this.mouseDownPosition.y);

            if (dx > this.movementThreshold || dy > this.movementThreshold )
                this.isClickSuppressed = true;
        });

        this.orbControlOrtho = new OrbitControls(cameraOrtho, renderer.domElement);
        this.orbControlOrtho.enableRotate = false;
        this.orbControlOrtho.addEventListener("change", this.manageZoomInPlanMode.bind(this));

        this.orbControlPersp = new OrbitControls(cameraPersp, renderer.domElement);

        this.previewControls = new OrbitControls(previewCamera, previewCanvas);
        this.previewControls.dampingFactor = 0.3;
        this.previewControls.enableDamping = true;
        this.previewControls.maxPolarAngle = Math.PI / 3;

        this.wTransformControls = new WTransformControl(cameraOrtho, renderer.domElement);

        this.wTransformControls.addEventListener('dragging-changed', (event) => {
            this.orbControlPersp.enabled = !event.value;
            this.wTransformControls.isDragging = event.value;
        });
    }

    onMouseLeftClick(event) {
        if (this.isClickSuppressed)
            return;

        if (AppState.isPlanModeActive && AppState.wallPlacingEnabled) {
            this.wallPlaceClick(event);
        } else if(AppState.wallPaintState) {
            const intersects = this.getIntersects(event, null, 1);

            if (intersects.length > 0) {
                const intersect = intersects[0];
                const wall = intersect.object.userData.root;

                if (wall instanceof Wall) {
                    const worldPos = intersect.point.clone();
                    const hex = document.getElementById("wall-painter").value;
                    const pickedColor = new THREE.Color(hex);

                    // which side of the wall the click was on
                    const signedDistance = wall.wallPlane.distanceToPoint(worldPos);
                    const layerKey = signedDistance >= 0 ? 'insideLayer' : 'outsideLayer';

                    wall.onColorApply(pickedColor, layerKey);
                }
            }
        }
        else {
            let intersects = this.getIntersects(event, null, 1);

            const maxDepth = Math.min(intersects.length, 3);
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
            scene.remove(this.wallPlacingStartPoint);
        } else {
            if(this.wTransformControls.object) {
                this.wTransformControls.detach();
            }
        }
    }

    getIntersects(event, searchObject = null, layer = 0) {
        let mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

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
            // update the wall and its label whiel the moving
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

        if(AppState.debugEnabled)
            console.log(point);

        if (!this.isPlacingWall) { // start placing a wall
            this.startPoint.copy(point);
            this.isPlacingWall = true;

            this.wallPlacingStartPoint = this.planCursor.cornerToPoint(point, AppState.sideBar.wallWidth + 0.05, AppState.sideBar.wallHeight+0.01, 0xFFFF00);
            scene.add(this.wallPlacingStartPoint);
        } else { // finalize wall placement
            const finalizedWall = this.updateWall(this.tempWallVisualizer, this.startPoint, point, true);

            let wallObject = new Wall(finalizedWall, this.startPoint, point, AppState.sideBar.wallWidth, AppState.sideBar.wallHeight, 0x422800, this.distanceLabel);
            this.newWalls.push(wallObject);
            scene.add(wallObject);

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
        this.newWalls.forEach(newWall => {
            ObjectFilter.placedWalls.forEach(placedWall => {
            placedWall.subtractWallGeometry(newWall);
            })
        })

        if (this.newCornerPoints.length < 2) return; // need at least 2 points to form a line

        if (!this.newCornerPoints.at(0).equals(this.newCornerPoints.at(this.newCornerPoints.length-1))) {
            //alert("Start and end points does not matches!");
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

    onPreviewMouseMove(event) {
        const rect = previewCanvas.getBoundingClientRect();
        const mousePos = new THREE.Vector2();
        const raycaster = new THREE.Raycaster();

        raycaster.layers.set(1);

        mousePos.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mousePos.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mousePos, previewCamera);
        const intersects = raycaster.intersectObjects(previewScene.children, true);

        AppState.previewSceneObject.traverse(child => {
            if (child.isMesh && child.material?.emissive) {
                child.material.emissive.set(0x000000);
            }
        });

        if (intersects.length > 0) {
            const first = intersects[0].object;
            if (first.material?.emissive) {
                first.material.emissive.set(0x444444);
            }
            this.hoveredObject = first;
        } else {
            this.hoveredObject = null;
        }
    }

    showColorPicker() {
        if (!this.hoveredObject || !this.hoveredObject.material) return;

        const targetObject = this.hoveredObject;
        const colorPicker = document.getElementById("furniture-painter");
        if (!colorPicker) return;

        if (targetObject.material.color) {
            colorPicker.value = `#${targetObject.material.color.getHexString()}`;
        }

        colorPicker.oninput = () => {
            const hex = colorPicker.value;
            if (targetObject.material?.color) {
                targetObject.material.color.set(hex);
                targetObject.material.needsUpdate = true;

                // Update materialColorMap on the root furniture object
                const root = targetObject.userData?.root;
                if (root) {
                    if (!root.userData.materialColorMap) {
                        root.userData.materialColorMap = {};
                    }

                    root.userData.materialColorMap[targetObject.name] = hex;
                }
            }
        };
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