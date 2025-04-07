// Import necessary modules (paths relative to main.js)
// Note: THREE is loaded globally via script tag in index.html,
// but modules can still import it if they need explicit access.
import * as THREE from 'three';
import * as Config from './config.js'; // Add this import

import { scene, camera, renderer, controls } from './sceneSetup.js'; // Import controls
import { keys, initializeInput } from './input.js';
import { createGround, createBorderWalls, placeTrees } from './environment.js';
import { initializeKirby, updateKirby, getKirbyPosition } from './kirby.js'; // Import getKirbyPosition
import { initializeWaddleDees, updateWaddleDees } from './waddledee.js';
import { initializeItems, updateItems } from './items.js';

// --- Initialization ---
console.log("Starting initialization...");
initializeInput();
const groundMesh = createGround(scene);
createBorderWalls(scene);
placeTrees(scene, groundMesh);
initializeKirby(scene);
initializeWaddleDees(scene, groundMesh);
initializeItems(scene, groundMesh);
console.log("Initialization complete. Starting game loop...");

// --- Game Loop ---
const clock = new THREE.Clock();
const kirbyTargetPosition = new THREE.Vector3(); // Reusable vector for target

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // --- Update Game Logic ---
    // Update Kirby first to get his position
    updateKirby(deltaTime, elapsedTime, keys, groundMesh, null); // Pass null for camera, controls handle it
    updateWaddleDees(deltaTime, scene, groundMesh);
    updateItems(deltaTime, scene);

    // --- Update Controls ---
    const kirbyPos = getKirbyPosition();
    // Smoothly move the control target towards Kirby's position
    kirbyTargetPosition.set(kirbyPos.x, kirbyPos.y + Config.KIRBY_SIZE * 0.5, kirbyPos.z); // Target slightly above Kirby's base
    controls.target.lerp(kirbyTargetPosition, 0.1); // Adjust lerp factor (0.1) for camera follow speed
    controls.update(); // Update controls AFTER updating the target

    // --- Rendering ---
    renderer.render(scene, camera);
}

// --- Start the Loop ---
animate();
console.log("Modular Three.js Kirby game running with OrbitControls.");