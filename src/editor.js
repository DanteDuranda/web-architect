import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';
import { PlanCursor } from "./planMode.js";
import { SideBar } from "./uiControl.js";

const canvas = document.querySelector('canvas');

let scene, renderer, gridHelperM, gridHelperDm, gridHelperCm;
let cameraOrtho, cameraPersp, orbControlOrtho, orbControlPersp;
const minZoom = 1;
const maxZoom = 100;
const sideBar = new SideBar();
let planCursor;
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

    cameraPersp = new THREE.PerspectiveCamera(90, aspectRatio, 1, 1000);
    cameraPersp.position.set(10, 10, 10);
    cameraPersp.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true  });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio * 1.25);

    orbControlOrtho = new OrbitControls(cameraOrtho, renderer.domElement);
    orbControlOrtho.enableRotate = false;

    orbControlPersp = new OrbitControls(cameraPersp, renderer.domElement);

    gridHelperM = new THREE.GridHelper(50, 50, 0x422800, 0xFFFFFF);
    scene.add(gridHelperM);
    gridHelperM.position.y += 0.02;

    gridHelperDm = new THREE.GridHelper(50, 500, 0x00FF00, 0x556677);
    scene.add(gridHelperDm);
    gridHelperDm.position.y += 0.01;

    gridHelperCm = new THREE.GridHelper(50, 5000, 0x00FF00, 0xFFFFFF);
    // scene.add(gridHelperCm);

    planCursor = new PlanCursor();

    activatePlanMode();
    //generatorTesting()
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

function generatorTesting() {
    // create a buffered geometry and add the vertices (points)
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(points.length * 3);

    // fill the array with vertex positions
    for (let i = 0; i < points.length; i++) {
        vertices[i * 3] = points[i].x;
        vertices[i * 3 + 1] = points[i].y;
        vertices[i * 3 + 2] = points[i].z;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    // create faces (triangles) from the points | have to adjust for more complex geometries
    const indices = [
        0, 1, 2,  // triangle 1
        0, 2, 3,  // triangle 2
        4, 5, 6,  // triangle 3
        4, 6, 7,  // triangle 4
        6, 7, 8,  // triangle 5
        6, 8, 9   // triangle 6
    ];

    geometry.setIndex(indices);  // set the index array for the geometry

    const material = new THREE.MeshBasicMaterial({ color: 0xf1f792, side: THREE.DoubleSide, wireframe: false });

    const planeMesh = new THREE.Mesh(geometry, material);
    planeMesh.position.y = 0.1;

    scene.add(planeMesh);
    points = [];
}


function activatePlanMode() {


    orbControlOrtho.enabled = true;
    orbControlPersp.enabled = false;

    isPlanModeActive = true;

    sideBar.updateSidebar(isPlanModeActive);
}


function activateDesignMode() {
    scene.remove(planCursor.cursorGroup);
    canvas.style.cursor = 'default';

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
        exitWallPlacement(event);
        generatorTesting();
    }
}


function exitWallPlacement(event) {
    if (isPlacingWall) {
        isPlacingWall = false;
        resetTempWall();
    }
}


function onMouseMove(event) {
    if (isPlanModeActive){
        editorMouseMove(event);
        updateCursorIndicator(event)
    }
}


function updateCursorIndicator(event) {
    const gridIntersects = getIntersects(event, gridHelperM);
    if (gridIntersects.length > 0 && sideBar.isWallPlacingActive) {
        canvas.style.cursor = 'none';
        const point = gridIntersects[0].point;
        const point2 = gridIntersects[1].point; // specific objects wich has "holes in it", i should use two points instead one

        // grid snap
        const gridSize = 1;
        point.x = Math.round(point.x / gridSize) * gridSize;
        point.z = Math.round(point2.z / gridSize) * gridSize;

        planCursor.cursorGroup.position.set(point.x, sideBar.wallHeight, point.z);

        // debug circle position update
        if (debugEnabled) {
            drawDebugMarker(point.x, 0, point.z);
        }
    }else{
        canvas.style.cursor = 'default';
    }
}


function drawDebugMarker(x, y, z) {
    // Create a sphere geometry for the marker
    const markerGeometry = new THREE.SphereGeometry(0.1, 16, 16); // Small sphere
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red color

    // Create the marker mesh
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);

    // Set the marker position
    marker.position.set(x, y, z);

    // Add the marker to the scene
    scene.add(marker);

    // Optional: Remove the marker after a short delay (for debugging purposes)
    setTimeout(() => {
        scene.remove(marker);
        marker.geometry.dispose();
        marker.material.dispose();
    }, 2000); // Removes marker after 2 seconds
}


let points = [];
function wallPlaceClick(event) {
    let point = new THREE.Vector3();

    point.y = 0;
    point.x = planCursor.cursorGroup.position.x;
    point.z = planCursor.cursorGroup.position.z;

    points.push(point);
    console.log(points);
    if (!isPlacingWall) {
        // start placing a wall
        startPoint.copy(point);
        isPlacingWall = true;
    } else {
        // finalize the wall placement
        const finalizedWall = updateWall(tempWallVisualizer, startPoint, point, true);
        scene.add(finalizedWall);
        placedWalls.push(finalizedWall);

        // reset state for next wall placement
        resetTempWall();
        startPoint = point;

        //isPlacingWall = false; // disbld bc i have impl contins wall plcment
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


function editorMouseMove(event) {
    if (!isPlacingWall) return;

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

function updateWall(wall, start, end, secondClick = false) {
    const wallLength = start.distanceTo(end);

    if (secondClick) {
        // create a new wall
        const wallGeometry = new THREE.BoxGeometry(wallLength, sideBar.wallHeight, sideBar.wallWidth);
        const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x999900 });
        wall = new THREE.Mesh(wallGeometry, wallMaterial);
    } else {
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
    context.font = '24px Arial';
    context.fillStyle = 'white';
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


function animate() {
    requestAnimationFrame(animate);
    if (isPlanModeActive) {
        renderer.render(scene, cameraOrtho);
    } else {
        renderer.render(scene, cameraPersp);
    }
}
