import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';

const canvas = document.querySelector('canvas');

let scene, cameraOrtho, cameraPersp, orbitControls, renderer, gridHelperM, gridHelperDm, gridHelperCm;
let planCursor;
let distanceLabel;
let lastZoomLevel = 1;
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

    cameraOrtho.position.set(0, 30, 0);
    cameraOrtho.lookAt(0, 0, 0);

    cameraPersp = new THREE.PerspectiveCamera(90, aspectRatio, 1, 1000);
    cameraPersp.position.set(10, 10, 10);
    cameraPersp.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true  });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio * 1.25);

    gridHelperM = new THREE.GridHelper(50, 50, 0x00FF00,0xFFFFFF);
    scene.add(gridHelperM);
    gridHelperM.position.y += 0.02;

    gridHelperDm = new THREE.GridHelper(50, 500, 0x00FF00, 0x556677);
    scene.add(gridHelperDm);
    gridHelperDm.position.y += 0.01;

    // gridHelperCm = new THREE.GridHelper(50, 5000, 0x00FF00, 0xFFFFFF);
    // scene.add(gridHelperCm);

    planCursor = createPlanCursor();
    activatePlanMode();

    // event listeners
    window.addEventListener('resize', onWindowResize, false);
    document.getElementById("planModeBt").addEventListener("click", activatePlanMode);
    document.getElementById("designModeBt").addEventListener("click", activateDesignMode);
    document.getElementById("designModeBt").addEventListener("click", activateDesignMode);
    document.getElementById("renderer").addEventListener("click", onMouseClick);
    document.getElementById("renderer").addEventListener("mousemove", onMouseMove);
    orbitControls.addEventListener("change", resizePlanCursor);
}


function resizePlanCursor(){
    console.log(`Zoom level: ${cameraOrtho.zoom}`);

    const zoom = cameraOrtho.zoom;

    if (cameraOrtho.isOrthographicCamera) {
        if (lastZoomLevel <= zoom) {
            // in
            if (zoom > 9) {
                planCursor.scale.setScalar(Math.max(0.1, planCursor.scale.x * 0.98));
            } else if (zoom > 4) {
                planCursor.scale.setScalar(Math.max(0.1, planCursor.scale.x * 0.97));
            } else {
                planCursor.scale.setScalar(1);
            }
        } else {
            // out
            if (zoom > 9) {
                planCursor.scale.setScalar(Math.min(2, planCursor.scale.x * 1.03));
            } else if (zoom > 4) {
                planCursor.scale.setScalar(Math.min(2, planCursor.scale.x * 1.02));
            } else {
                planCursor.scale.setScalar(1);
            }
        }

        lastZoomLevel = zoom;
    }
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

        // grid snap
        const gridSize = 1;
        point.x = Math.round(point.x / gridSize) * gridSize;
        point.z = Math.round(point.z / gridSize) * gridSize;

        // update circle position
        planCursor.position.set(point.x, wallHeight, point.z);
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
            distanceLabel = null;
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
    if (!isPlacingWall) {
        return;
    }

    const intersects = getGridIntersects(event);

    if (intersects.length > 0) {
        const point = intersects[0].point;
        point.y = 0; // grid height
        point.x = Math.round(point.x);

        // calculate euclidean distance startPoint - actual point
        const distance = startPoint ? startPoint.distanceTo(point) : 0;

        if (isPlacingWall) {
            if (!tempWallVisualizer) {
                tempWallVisualizer = createWall(startPoint, point); // Create a temporary wall
                scene.add(tempWallVisualizer);

                if (!distanceLabel) {
                    distanceLabel = createDistanceLabel();
                    scene.add(distanceLabel.sprite);
                }
            } else {
                updateWall(tempWallVisualizer, startPoint, point);
            }

            if (distanceLabel) {
                const { context, texture, sprite } = distanceLabel;

                // update label
                context.clearRect(0, 0, 256, 64);
                context.fillText(`${distance.toFixed(2)} m`, 128, 32); // center text
                // TODO: 0,00 kiirasra kerul
                texture.needsUpdate = true;

                // position to the cursor
                sprite.position.set(tempWallVisualizer.position.x, wallHeight + 1, tempWallVisualizer.position.z);
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


function addWallProperties(wall, start, end) {  // TODO: bekötni
    wall.position.set((start.x + end.x) / 2, wallHeight/2, (start.z + end.z) / 2);
    wall.rotation.y = -Math.atan2(end.z - start.z, end.x - start.x);
}


function getGridIntersects(event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / (window.innerHeight+5)) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, isPlanModeActive ? cameraOrtho : cameraPersp);

    return raycaster.intersectObject(gridHelperM); // TODO: mértékenységekre szabás
}


function createPlanCursor(radius = 0.2, crossThickness = 0.03, crossLengthFactor = 15) {
    const segments = 20; // Number of segments for the circle

    // center circle
    const circleGeometry = new THREE.CircleGeometry(radius, segments);
    const circleMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
    const planCursor = new THREE.Mesh(circleGeometry, circleMaterial);
    planCursor.rotation.x = -Math.PI / 2; // Align with XZ plane
    planCursor.position.y += 1;
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
