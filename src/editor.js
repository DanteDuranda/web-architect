import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';
import CSG from "../THREE-CSGMesh-master/three-csg.js";
import { Wall } from "Wall";

import {FloorGenerator, PlanCursor} from "./planMode.js";
import { SideBar } from "./uiControl.js";

const canvas = document.querySelector('canvas');

let scene, renderer, gridHelperM, gridHelperDm, gridHelperCm;
let cameraOrtho, cameraPersp, orbControlOrtho, orbControlPersp;
const minZoom = 1;
const maxZoom = 100;
const sideBar = new SideBar();
let planCursor;
let crosshair = document.createElement("crosshair");

let wallStartPoint;
let distanceLabel;
let placedWalls = [];
let isPlacingWall = false;
let wallPlacingEnabled = false;
let startPoint = new THREE.Vector3(); // starting point of wall placing
let tempWallVisualizer = null; // temporary wall for real-time visualization
let isPlanModeActive = false;
const aspectRatio = window.innerWidth / window.innerHeight;
const nonCullingLimit = 50;

const debugEnabled = true;

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x4A4848);

    cameraOrtho = new THREE.OrthographicCamera(
        nonCullingLimit * aspectRatio / -2,    // left
        nonCullingLimit * aspectRatio / 2,    // right
        nonCullingLimit / 2,              // top
        nonCullingLimit / -2,          // bottom
        1,                               // near
        1000                              // far
    );

    cameraOrtho.position.set(0, 30, 0);
    cameraOrtho.lookAt(0, 0, 0);

    cameraPersp = new THREE.PerspectiveCamera(60, aspectRatio, 0.1, 1000);
    cameraPersp.position.set(10, 10, 10);
    cameraPersp.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true  });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio * 1.25);

    orbControlOrtho = new OrbitControls(cameraOrtho, renderer.domElement);
    orbControlOrtho.enableRotate = false;

    orbControlPersp = new OrbitControls(cameraPersp, renderer.domElement);

    gridHelperM = new THREE.GridHelper(50, 50, 0x232526, 0xFFFFFF);
    scene.add(gridHelperM);
    gridHelperM.position.y += 0.011;

    gridHelperDm = new THREE.GridHelper(50, 500, 0x232526, 0x556677);
    scene.add(gridHelperDm);
    gridHelperDm.position.y += 0.01;

    gridHelperCm = new THREE.GridHelper(50, 5000, 0x232526, 0x556677);
    // scene.add(gridHelperCm);

    planCursor = new PlanCursor();
    //testingGround();
    createCrosshair();
    activatePlanMode();
    //generatorTesting()
}

function testingGround(){
    let meshA = new THREE.Mesh(new THREE.BoxGeometry(1,1,1));
    let meshB = new THREE.Mesh(new THREE.BoxGeometry(1,1,1));

    meshB.position.add(new THREE.Vector3( 0.5, 0.5, 0.5));

    //to make sure the .matrix of each mesh is current
    meshA.updateMatrix();
    meshB.updateMatrix();

    //create a bsp tree from each of the meshes
    let bspA = CSG.fromMesh( meshA );
    let bspB = CSG.fromMesh( meshB );

    let bspResult = bspA.subtract(bspB);

    let meshResult = CSG.toMesh( bspResult, meshA.matrix, meshA.material );

    scene.add(meshResult);
}

// event listeners
window.addEventListener('resize', onWindowResize, false);
document.getElementById("planModeBt").addEventListener("click", activatePlanMode);
document.getElementById("designModeBt").addEventListener("click", activateDesignMode);
document.getElementById("renderer").addEventListener("click", onMouseClick);
document.getElementById("renderer").addEventListener("mousemove", onMouseMove);
document.getElementById("renderer").addEventListener("contextmenu", onMouseRightClick);
document.addEventListener('wallPlacingToggled', (event) => {
    if (event.detail && isPlanModeActive) {
        wallPlacingEnabled = true;
        scene.add(planCursor.cursorGroup);
    } else {
        wallPlacingEnabled = false;
        scene.remove(planCursor.cursorGroup);
    }
});
orbControlOrtho.addEventListener("change", manageZoomInPlanMode);


function generateFloor() {
    if (newCornerPoints.length < 2) return; // need at least 2 points to form a line

    if (!newCornerPoints.at(0).equals(newCornerPoints.at(newCornerPoints.length-1))) {
        let start = newCornerPoints.at(0);
        let end = newCornerPoints.at(newCornerPoints.length-1);
        let pathBetween = FloorGenerator.findShortestPathOnWalls(start, end, placedWalls);
        pathBetween.pop(); // remove last and
        pathBetween.shift(); // remove first, because those are already in the newCornerPoints

        if(pathBetween.size !== 0){
            newCornerPoints.unshift(...pathBetween);
        }
    }

    let floorGenerator = new FloorGenerator(debugEnabled);

    scene.add(floorGenerator.generateFloor(newCornerPoints));
    newCornerPoints = [];
    placedWalls.push(...newWalls);// reset the point list

    newWalls = [];
}


function activatePlanMode() {
    orbControlOrtho.enabled = true;
    orbControlPersp.enabled = false;

    placedWalls.forEach((wall) => {
        wall.visible = true;
    });

    crosshair.style.opacity = 0;

    isPlanModeActive = true;

    sideBar.updateSidebar(isPlanModeActive);
}


function activateDesignMode() {
    crosshair.style.opacity = 0.2;
    scene.remove(planCursor.cursorGroup);
    canvas.style.cursor = 'default';
    sideBar.isWallPlacingActive = false;
    orbControlOrtho.enabled = false;
    orbControlPersp.enabled = true;

    isPlanModeActive = false;

    sideBar.updateSidebar(isPlanModeActive);
}


function onMouseClick(event) {
    if (isPlanModeActive && wallPlacingEnabled) {
        wallPlaceClick(event);
    }
}


function onMouseRightClick(event) {
    if (isPlanModeActive) {
        exitWallPlacement();
        generateFloor();
        startPoint = new THREE.Vector3();
        scene.remove(wallStartPoint);
    }
}


function exitWallPlacement() {
    if (isPlacingWall) {
        isPlacingWall = false;
        resetTempWall();
    }
}


function onMouseMove(event) {
    if (isPlanModeActive){
        if(isPlacingWall)
            wallPlacerMouseMove(event);

        planCursor.updateCursorIndicator(scene, debugEnabled, canvas, sideBar.wallHeight, sideBar.isWallPlacingActive, getIntersects(event, gridHelperM));
    }
}

let newCornerPoints = [];
let newWalls = [];
function wallPlaceClick(event) {
    let point = new THREE.Vector3();

    point.y = 0;
    point.x = planCursor.cursorGroup.position.x;
    point.z = planCursor.cursorGroup.position.z;

    newCornerPoints.push(point);
    //console.log(cornerPoints);
    if (!isPlacingWall) {
        // start placing a wall
        startPoint.copy(point);
        isPlacingWall = true;

        wallStartPoint = PlanCursor.cornerToPoint(point, sideBar.wallWidth + 0.05, sideBar.wallHeight+0.01, 0xFFFF00);
        scene.add(wallStartPoint);
    } else {
        // finalize the wall placement
        const finalizedWall = updateWall(tempWallVisualizer, startPoint, point, true);

        let testWall = new Wall(finalizedWall, startPoint, point, sideBar.wallWidth, sideBar.wallHeight, 0x422800);
        scene.add(testWall);

        //scene.add(finalizedWall);
        //placedWalls.push(finalizedWall);
        //placedWalls.push(testWall);
        newWalls.push(testWall);

        // reset state for next wall placement
        resetTempWall();
        startPoint = point;

        //isPlacingWall = false; // disbld bc i have impl contins wall placement
    }
}


function resetTempWall() {
    if (tempWallVisualizer) {
        scene.remove(tempWallVisualizer);
        tempWallVisualizer.geometry.dispose();
        tempWallVisualizer = null;
    }
    if (distanceLabel) {
        scene.remove(distanceLabel.sprite);
        distanceLabel = null;
    }
}


function wallPlacerMouseMove(event) {
    let point = new THREE.Vector3();

    point.y = 0; // stay on gridHeight
    point.x = planCursor.cursorGroup.position.x;
    point.z = planCursor.cursorGroup.position.z;

    const distance = startPoint ? startPoint.distanceTo(point) : 0;

    if (!tempWallVisualizer) {
        // initialize the wall on the first interaction
        tempWallVisualizer = updateWall(null, startPoint, point, true);
        scene.add(tempWallVisualizer);

        if (!distanceLabel) {
            distanceLabel = createDistanceLabel();
            scene.add(distanceLabel.sprite);
        }
    } else {
        // update the wall and its label while the mouse moves
        updateWall(tempWallVisualizer, startPoint, point, false);
        updateDistanceLabel(distanceLabel, distance);
    }
}


function updateDistanceLabel({ context, texture, sprite }, distance) {
    context.clearRect(0, 0, 256, 64);
    context.fillText(`${distance.toFixed(2)} m`, 128, 32); // Center text
    texture.needsUpdate = true;

    sprite.position.set(
        tempWallVisualizer.position.x,
        sideBar.wallHeight + 1,
        tempWallVisualizer.position.z
    );
}


function updateWall(wall, start, end, click = false) {
    const wallLength = start.distanceTo(end);

    if (click) {
        // create a new wall
        const wallGeometry = new THREE.BoxGeometry(wallLength, sideBar.wallHeight, sideBar.wallWidth);
        const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x422800 });
        wall = new THREE.Mesh(wallGeometry, wallMaterial);
    } else /*if (move)*/{
        // update the existing wall
        wall.geometry.dispose();
        wall.geometry = new THREE.BoxGeometry(wallLength, sideBar.wallHeight, sideBar.wallWidth);
    }

    wall.position.set((start.x + end.x) / 2, sideBar.wallHeight/2, (start.z + end.z) / 2);
    wall.rotation.y = -Math.atan2(end.z - start.z, end.x - start.x);

    return wall;
}


function createDistanceLabel() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;

    const context = canvas.getContext('2d');
    context.font = '30px Arial';
    context.fillStyle = '#FAE8DE';
    context.textAlign = 'center';
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.fillText('0.0 m', canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(4, 1, 4); // Adjust scale based on your scene
    return { sprite, canvas, context, texture };
}


function getIntersects(event, searchObject=null) {
    let mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / (window.innerHeight+5)) * 2 + 1;

    let raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, isPlanModeActive ? cameraOrtho : cameraPersp);

    if (searchObject === null) {
        return raycaster.intersect();
    }
    return raycaster.intersectObject(searchObject);
     // TODO: mértékenységekre szabás - searchObject
}


function manageZoomInPlanMode() {
    clampZoom();
    planCursor.resizeCursor(cameraOrtho.zoom);
    if (cameraOrtho.zoom >= 40) {
        scene.add(gridHelperCm);
    } else {
        scene.remove(gridHelperCm);
    }
}


function clampZoom() {
    cameraOrtho.zoom = Math.max(minZoom, Math.min(cameraOrtho.zoom, maxZoom));
    cameraOrtho.updateProjectionMatrix();
}


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
}


function createCrosshair() {
    crosshair.style.position = "absolute";
    crosshair.style.width = "8px";
    crosshair.style.height = "8px";
    crosshair.style.background = "white";
    crosshair.style.opacity = 0.2;
    crosshair.style.borderRadius = "50%";
    crosshair.style.top = "50%";
    crosshair.style.left = "50%";
    crosshair.style.transform = "translate(-50%, -50%)";
    crosshair.style.zIndex = "1000";
    document.body.appendChild(crosshair);
}

function updateWallVisibility() {
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2(0, 0); // Center of the screen (normalized device coordinates)

    raycaster.setFromCamera(mouse, cameraPersp);

    let intersects = raycaster.intersectObjects(placedWalls, true);

    placedWalls.forEach((wall) => {
        wall.visible = true;
    });

    if (intersects.length > 0) {
        let firstHit = intersects[0].object; // Get the first wall hit by the crosshair
        firstHit.parent.visible = false; // Make it invisible
    }
}

function animate() {
    requestAnimationFrame(animate);
    if (isPlanModeActive) {
        renderer.render(scene, cameraOrtho);
    } else {
        updateWallVisibility();
        renderer.render(scene, cameraPersp);
    }
}
