import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';

let scene, cameraOrtho, cameraPersp, orbitControls, renderer, gridHelper;
let wallWidth = 0.2;
let wallHeight = 2.5;
let placedWalls = [];
let isPlacingWall = false;
let startPoint = new THREE.Vector3(); // starting point of wall placing
let tempWallVisualizer = null; // temporary wall for real-time visualization
let isPlanModeActive = true;
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

    const geometry = new THREE.BoxGeometry(0.2, 2.5, 4); // 1x1x1 cube
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Green material
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 0.5, 0); // Position at the center (x=0, y=0.5, z=0)
    scene.add(cube);

    cameraPersp = new THREE.PerspectiveCamera(90, aspectRatio, 1, 1000);
    cameraOrtho.position.set(0, 30, 0);
    cameraOrtho.lookAt(0, 0, 0);
    cameraPersp.position.set(10, 10, 10);
    cameraPersp.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('canvas'), antialias: true  });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio * 1.25);

    gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    orbitControls = new OrbitControls(cameraOrtho, renderer.domElement);
    orbitControls.enableRotate = false;

    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    document.getElementById("planModeBt").addEventListener("click", activatePlanMode);
    document.getElementById("designModeBt").addEventListener("click", activateDesignMode);
}

function activatePlanMode() {
    switchToOrthoCam();
    isPlanModeActive = true;
}

function activateDesignMode() {
    switchToPerspCam();
    isPlanModeActive = false;
}

function switchToOrthoCam() {
    if (!isPlanModeActive) {
        orbitControls.dispose();
        orbitControls = new OrbitControls(cameraOrtho, renderer.domElement);
        orbitControls.enableRotate = false;
        console.log('Switched to Orthographic Camera - Plan Mode');
    }
}

function switchToPerspCam() {
    if (isPlanModeActive) {
        orbitControls.dispose();
        orbitControls = new OrbitControls(cameraPersp, renderer.domElement);
        console.log('Switched to Perspective Camera - Design Mode');
    }
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
