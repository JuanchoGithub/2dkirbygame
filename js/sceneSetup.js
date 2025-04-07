import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// Scene
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

// Canvas (Get it from the DOM)
const canvas = document.getElementById('gameCanvas');
if (!canvas) {
    console.error("Canvas element with ID 'gameCanvas' not found!");
}

// Camera
export const camera = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.set(0, 10, 25); // Adjusted for better view
camera.lookAt(0, 5, 0); // Look slightly higher than origin

// Renderer
export const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Resize Listener
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Lighting
export const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Slightly brighter ambient
scene.add(ambientLight);

export const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Slightly stronger directional
directionalLight.position.set(10, 20, 15);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 60;
// Adjust shadow camera frustum to better fit the scene
directionalLight.shadow.camera.left = -35;
directionalLight.shadow.camera.right = 35;
directionalLight.shadow.camera.top = 35;
directionalLight.shadow.camera.bottom = -35;
scene.add(directionalLight);
scene.add(directionalLight.target); // Add target to scene if needed for positioning
directionalLight.target.position.set(0, 0, 0); // Target the center

// Optional: Helper to visualize shadow frustum
// const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
// scene.add(shadowHelper);
// const lightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
// scene.add(lightHelper);

console.log("Scene setup module loaded.");