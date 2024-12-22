import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';

const canvas = document.querySelector('canvas');

let scene, cameraOrtho, cameraPersp, orbitControls, renderer, gridHelper;
let planCursor;
let wallWidth = 0.2;
let wallHeight = 2.1;
let placedWalls = [];
let isPlacingWall = false;
let startPoint = new THREE.Vector3(); // starting point of wall placing
let tempWallVisualizer = null; // temporary wall for real-time visualization
let isPlanModeActive = false;
const aspectRatio = window.innerWidth / window.innerHeight;
const nonCullingLimit = 50;

init();
animate();

function init() {
    scene = new THREE.Scene();

    cameraOrtho = new THREE.OrthographicCamera(
        nonCullingLimit * aspectRatio / -2,    // left
        nonCullingLimit * aspectRatio / 2,    // right
        nonCullingLimit / 2,              // top
        nonCullingLimit / -2,          // bottom
        1,                               // near
        1000                              // far
    );

    cameraPersp = new THREE.PerspectiveCamera(90, aspectRatio, 1, 1000);
    cameraOrtho.position.set(0, 30, 0);
    cameraOrtho.lookAt(0, 0, 0);
    cameraPersp.position.set(10, 10, 10);
    cameraPersp.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true  });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio * 1.25);

    gridHelper = new THREE.GridHelper(100, 100);
    scene.add(gridHelper);



    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    document.getElementById("planModeBt").addEventListener("click", activatePlanMode);
    document.getElementById("designModeBt").addEventListener("click", activateDesignMode);
    document.getElementById("designModeBt").addEventListener("click", activateDesignMode);
    document.getElementById("renderer").addEventListener("click", onMouseClick);
    document.getElementById("renderer").addEventListener("mousemove", onMouseMove);

    planCursor = createPlanCursor();
    activatePlanMode();
}


function activatePlanMode() {
    switchToOrthoCam();
    scene.add(planCursor);
    canvas.style.cursor = 'none';

    isPlanModeActive = true;
}


function activateDesignMode() {
    switchToPerspCam();
    scene.remove(planCursor);
    canvas.style.cursor = 'default';

    isPlanModeActive = false;
}


function switchToOrthoCam() {
    if (!isPlanModeActive) {
        if (typeof orbitControls !== 'undefined') {
            orbitControls.dispose();
        }
        orbitControls = new OrbitControls(cameraOrtho, renderer.domElement);
        orbitControls.enableRotate = false;
        console.log('Switched to Orthographic Camera - Plan Mode');
    }
}


function switchToPerspCam() {
    if (isPlanModeActive) {
        if (typeof orbitControls !== 'undefined' && orbitControls) {
            orbitControls.dispose();
        }
        orbitControls = new OrbitControls(cameraPersp, renderer.domElement);
        console.log('Switched to Perspective Camera - Design Mode');
    }
}


function onMouseClick(event) {
    if (isPlanModeActive) {
        editorClick(event);
    }
}


function onMouseMove(event) {
    if (isPlanModeActive){
        editorMouseMove(event);
        updateWallPlacementIndicator(event)
    }
}

function updateWallPlacementIndicator(event) { //TODO: nem oda illeszkedik a fuggoleges tengelyen ahova kene
    const gridIntersects = getGridIntersects(event);
    if (gridIntersects.length > 0) {
        const point = gridIntersects[0].point;

        // Snap to grid logic
        const gridSize = 1; // Define your grid size
        point.x = Math.round(point.x / gridSize) * gridSize;
        point.z = Math.round(point.z / gridSize) * gridSize;
        point.y = 0; // Keep the circle on the ground

        // Update the circle's position
        planCursor.position.set(point.x, point.y, point.z);
    }
}


function editorClick(event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, isPlanModeActive ? cameraOrtho : cameraPersp);

    const intersects = raycaster.intersectObjects(placedWalls);

    if (intersects.length > 0) {
        console.log("Wall selected:", intersects[0].object);
    } //else { // TODO: ezt atvarialni
    const gridIntersects = getGridIntersects(event);
    if (gridIntersects.length > 0) {
        const point = gridIntersects[0].point;
        point.y = 0;
        point.x = Math.round(point.x);
        point.z = Math.round(point.z);

        if (!isPlacingWall) {
            startPoint.copy(point);
            isPlacingWall = true;
        } else {
            const wall = createWall(startPoint, point);
            scene.add(wall);
            placedWalls.push(wall);
            resetTempWall();
            isPlacingWall = false;
        }
    }
    //}
}


function resetTempWall() {
    if (tempWallVisualizer) {
        scene.remove(tempWallVisualizer);
        tempWallVisualizer.geometry.dispose();
        tempWallVisualizer = null;
    }
}


function editorMouseMove(event) {
    if (!isPlacingWall){
        return;
    }

    const intersects = getGridIntersects(event);

    if (intersects.length > 0) {
        const point = intersects[0].point;
        point.y = 0; // placed at the grid height
        point.x = Math.round(point.x);

        if (isPlacingWall) {
            if (!tempWallVisualizer) {
                tempWallVisualizer = createWall(startPoint, point); // create a temporary wall
                scene.add(tempWallVisualizer);
            } else {
                updateWall(tempWallVisualizer, startPoint, point);
            }
        }
    }
}


function updateWall(wall, start, end) {
    const wallLength = start.distanceTo(end);
    wall.geometry.dispose();
    wall.geometry = new THREE.BoxGeometry(wallLength, wallHeight, wallWidth);

    wall.position.set((start.x + end.x) / 2, wallHeight / 2, (start.z + end.z) / 2);
    wall.rotation.y = -Math.atan2(end.z - start.z, end.x - start.x);
}


function createWall(start, end) {
    const wallLength = start.distanceTo(end);
    const wallGeometry = new THREE.BoxGeometry(wallLength, wallHeight, wallWidth);
    const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x999900 });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);

    wall.position.set((start.x + end.x) / 2, wallHeight/2, (start.z + end.z) / 2);
    wall.rotation.y = -Math.atan2(end.z - start.z, end.x - start.x);

    return wall;
}


function getGridIntersects(event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / (window.innerHeight+5)) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, isPlanModeActive ? cameraOrtho : cameraPersp);

    return raycaster.intersectObject(gridHelper);
}


function createPlanCursor(radius = 0.2, crossThickness = 0.03, crossLengthFactor = 15) {
    const segments = 20; // Number of segments for the circle

    // center circle
    const circleGeometry = new THREE.CircleGeometry(radius, segments);
    const circleMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
    const planCursor = new THREE.Mesh(circleGeometry, circleMaterial);
    planCursor.rotation.x = -Math.PI / 2; // Align with XZ plane
    // cross
    const crossLength = radius * crossLengthFactor; // Cross line length
    // horizontal line
    const horizontalGeometry = new THREE.BoxGeometry(crossLength, crossThickness, crossThickness);
    const horizontalMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
    const horizontalLine = new THREE.Mesh(horizontalGeometry, horizontalMaterial);
    // vertical line
    const verticalGeometry = new THREE.BoxGeometry(crossThickness, crossLength, crossThickness);
    const verticalMaterial = new THREE.MeshBasicMaterial({ color: 0x0000FF });
    const verticalLine = new THREE.Mesh(verticalGeometry, verticalMaterial);
    verticalLine.rotation.x = -Math.PI / 2;

    const cursorGroup = new THREE.Group();
    cursorGroup.add(planCursor);
    cursorGroup.add(horizontalLine);
    cursorGroup.add(verticalLine);

    return cursorGroup;
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
