// Import necessary modules (paths relative to main.js)
// Note: THREE is loaded globally via script tag in index.html,
// but modules can still import it if they need explicit access.
// import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

import { scene, camera, renderer } from './sceneSetup.js';
import { keys, initializeInput } from './input.js';
import { createGround, createBorderWalls, placeTrees } from './environment.js'; // treeBoundingBoxes imported within modules
import { initializeKirby, updateKirby } from './kirby.js';
import { initializeWaddleDees, updateWaddleDees } from './waddledee.js'; // activeWaddleDees imported within modules
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

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // --- Update Game Logic ---
    // Pass only necessary arguments
    updateKirby(deltaTime, elapsedTime, keys, groundMesh, camera);
    updateWaddleDees(deltaTime, scene, groundMesh); // Doesn't need obstacles passed
    updateItems(deltaTime, scene);

    // --- Rendering ---
    renderer.render(scene, camera);
}

// --- Start the Loop ---
animate();
console.log("Modular Three.js Kirby game running with restored features.");