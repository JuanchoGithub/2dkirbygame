import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import * as Config from './config.js';
import { checkCollision, getRandomPositionOnGround } from './utils.js';
import { wallBoundingBoxes, treeBoundingBoxes } from './environment.js';
import { scene } from './sceneSetup.js'; // Import scene from sceneSetup.js

export let activeWaddleDees = [];
let lastSpawnTime = 0;
const vector3Temp = new THREE.Vector3(); // Reusable vector

// Store waddle dee state like target position, speed etc.
const waddleDeeState = new Map();

function createWaddleDeeMesh() {
    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.SphereGeometry(Config.WADDLEDEE_SIZE / 2, 16, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: Config.WADDLEDEE_BODY_COLOR });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // Feet (simple cylinders)
    const feetGeo = new THREE.CylinderGeometry(Config.WADDLEDEE_SIZE / 6, Config.WADDLEDEE_SIZE / 6, Config.WADDLEDEE_SIZE / 4, 6);
    const feetMat = new THREE.MeshStandardMaterial({ color: Config.WADDLEDEE_FEET_COLOR });

    const leftFoot = new THREE.Mesh(feetGeo, feetMat);
    leftFoot.position.set(-Config.WADDLEDEE_SIZE / 4, -Config.WADDLEDEE_SIZE / 2.5, 0);
    leftFoot.castShadow = true;
    group.add(leftFoot);

    const rightFoot = new THREE.Mesh(feetGeo, feetMat);
    rightFoot.position.set(Config.WADDLEDEE_SIZE / 4, -Config.WADDLEDEE_SIZE / 2.5, 0);
    rightFoot.castShadow = true;
    group.add(rightFoot);

    // Eyes (simple small black spheres)
    const eyeGeo = new THREE.SphereGeometry(Config.WADDLEDEE_SIZE / 10, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 }); // Black

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    // Position eyes forward and slightly spaced out
    leftEye.position.set(-Config.WADDLEDEE_SIZE / 5, Config.WADDLEDEE_SIZE / 8, Config.WADDLEDEE_SIZE / 2.5);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(Config.WADDLEDEE_SIZE / 5, Config.WADDLEDEE_SIZE / 8, Config.WADDLEDEE_SIZE / 2.5);
    group.add(rightEye);

    return group;
}

export function spawnWaddleDee(groundMesh) {
    if (activeWaddleDees.length >= Config.MAX_WADDLEDEES) return; // Don't spawn if max reached

    const mesh = createWaddleDeeMesh();
    const position = getRandomPositionOnGround(groundMesh, Config.WADDLEDEE_SIZE / 2);
    position.y = Config.GROUND_Y + Config.WADDLEDEE_SIZE / 2; // Ensure on ground
    mesh.position.copy(position);

    const initialAngle = Math.random() * Math.PI * 2;
    const initialVelocity = new THREE.Vector3(Math.sin(initialAngle), 0, Math.cos(initialAngle));

    const waddleDee = {
        mesh: mesh,
        velocity: initialVelocity, // Start moving in a random direction
        boundingBox: new THREE.Box3(),
        isJumping: false,
        isInhaled: false, // Track if inhaled by Kirby
        changeDirTimer: Config.WADDLEDEE_MIN_DIR_CHANGE_TIME + Math.random() * (Config.WADDLEDEE_MAX_DIR_CHANGE_TIME - Config.WADDLEDEE_MIN_DIR_CHANGE_TIME),
        isBeingSucked: false, // Flag for suck animation control
        suckTargetPosition: new THREE.Vector3(),
        suckStartTime: 0,
        startPos: mesh.position.clone(), // Add startPos for suck animation
        startScale: mesh.scale.clone(), // Add startScale for suck animation
        helper: null // Add property for helper
    };
    waddleDee.boundingBox.setFromObject(waddleDee.mesh); // Initial bounding box
    mesh.rotation.y = Math.atan2(initialVelocity.x, initialVelocity.z); // Face initial direction

    // Create helper but don't add it or make it invisible
    waddleDee.helper = new THREE.BoxHelper(waddleDee.mesh, 0x0000ff); // Blue helpers for Waddle Dees
    waddleDee.helper.visible = false;

    scene.add(waddleDee.mesh);
    activeWaddleDees.push(waddleDee);

    // Initialize state for the new waddle dee
    waddleDeeState.set(waddleDee.mesh.uuid, {
        targetPosition: getRandomPositionOnGround(groundMesh, Config.WADDLEDEE_RADIUS),
        speed: Config.WADDLEDEE_SPEED * (0.8 + Math.random() * 0.4) // Add some variation
    });

    console.log("Spawned Waddle Dee at", position.toArray().map(n => n.toFixed(2)));
    return waddleDee;
}

export function initializeWaddleDees(scene, groundMesh) {
    activeWaddleDees = []; // Clear existing
    for (let i = 0; i < Config.MAX_WADDLEDEES; i++) {
        spawnWaddleDee(groundMesh);
    }
    lastSpawnTime = Date.now(); // Set initial time
    console.log("Waddle Dees initialized.");
}

export function updateWaddleDee(waddleDee, delta, playerPosition) {
    const state = waddleDeeState.get(waddleDee.mesh.uuid);
    if (!state || !waddleDee.mesh) return; // Added check for mesh existence

    const currentPosition = waddleDee.mesh.position;
    const targetPosition = state.targetPosition;

    // Move towards target
    const direction = new THREE.Vector3().subVectors(targetPosition, currentPosition);
    let distanceSq = direction.lengthSq(); // Calculate distance squared

    // If close enough to the target, pick a new random target
    if (distanceSq < 1) { // Threshold distance squared (1*1)
        state.targetPosition = getRandomPositionOnGround(null, Config.WADDLEDEE_SIZE / 2); // Use WADDLEDEE_SIZE
        // Recalculate direction for this frame
        direction.subVectors(state.targetPosition, currentPosition);
        // Recalculate distanceSq after getting new target
        distanceSq = direction.lengthSq(); // Reassignment requires 'let'
    }

    // --- Check for near-zero direction before normalizing ---
    if (distanceSq > 0.0001) { // Only normalize and move if direction is significant
        direction.normalize();
        const moveDistance = state.speed * delta;
        waddleDee.mesh.position.addScaledVector(direction, moveDistance);

        // Optional: Make Waddle Dee face the direction it's moving
        const angle = Math.atan2(direction.x, direction.z);
        waddleDee.mesh.rotation.y = angle;

    } else {
        // If direction is too small, don't move this frame
        // This prevents potential NaN from normalizing a zero vector
    }

    // --- Boundary Clamping ---
    const halfGround = Config.GROUND_SIZE / 2;
    const radius = Config.WADDLEDEE_SIZE / 2; // Use the actual radius

    waddleDee.mesh.position.x = Math.max(-halfGround + radius, Math.min(halfGround - radius, waddleDee.mesh.position.x));
    waddleDee.mesh.position.z = Math.max(-halfGround + radius, Math.min(halfGround - radius, waddleDee.mesh.position.z));
    // Keep Y fixed on the ground
    waddleDee.mesh.position.y = Config.GROUND_Y + radius;
    // --- End Boundary Clamping ---

    // --- Validate Position before updating BBox ---
    if (isNaN(waddleDee.mesh.position.x) || isNaN(waddleDee.mesh.position.y) || isNaN(waddleDee.mesh.position.z)) {
        console.error("Waddle Dee position became NaN! Resetting position.", waddleDee.mesh.uuid);
        // Reset to a safe position (e.g., center or previous valid position)
        waddleDee.mesh.position.set(0, Config.GROUND_Y + radius, 0);
        // Optionally, give it a new target immediately
        state.targetPosition = getRandomPositionOnGround(null, radius);
    }

    // Update bounding box
    waddleDee.boundingBox.setFromObject(waddleDee.mesh);

    // --- Validate Bounding Box ---
    if (isNaN(waddleDee.boundingBox.min.x) || isNaN(waddleDee.boundingBox.max.x)) {
         console.error("Waddle Dee bounding box became NaN after update!", waddleDee.mesh.uuid);
         // Attempt to recalculate or reset
         waddleDee.boundingBox.setFromObject(waddleDee.mesh); // Try again
         if (isNaN(waddleDee.boundingBox.min.x)) {
             // If still NaN, make it empty to avoid collision issues
             waddleDee.boundingBox.makeEmpty();
             console.error(" -> Bounding box reset to empty.");
         }
    }
}

export function updateWaddleDees(deltaTime, scene, groundMesh) {
    const now = Date.now();

    if (activeWaddleDees.length < Config.MAX_WADDLEDEES && now - lastSpawnTime > Config.WADDLEDEE_SPAWN_INTERVAL) {
        spawnWaddleDee(groundMesh);
        lastSpawnTime = now;
    }

    // Iterate backwards to safely remove elements
    for (let i = activeWaddleDees.length - 1; i >= 0; i--) {
        const waddleDee = activeWaddleDees[i];

        // Check if Waddle Dee should be removed
        if (!waddleDee.mesh || waddleDee.isInhaled || waddleDee.isBeingSucked) {
            if (waddleDee.mesh) scene.remove(waddleDee.mesh); // Also remove mesh
            waddleDeeState.delete(waddleDee.mesh?.uuid); // Clean up state map
            activeWaddleDees.splice(i, 1); // Remove from array
            console.log("Removed Waddle Dee.");
            continue; // Skip update for this removed Waddle Dee
        }

        // Update the Waddle Dee if it's still active
        updateWaddleDee(waddleDee, deltaTime, null); // Pass null for playerPosition if not needed here
    }
}

export function startWaddleDeeSuck(waddleDee, targetPos, startTime) {
    if (!waddleDee) return;
    waddleDee.isBeingSucked = true;
    waddleDee.suckTargetPosition.copy(targetPos);
    waddleDee.suckStartTime = startTime;
    waddleDee.startPos = waddleDee.mesh.position.clone(); // Ensure startPos is set
    waddleDee.startScale = waddleDee.mesh.scale.clone(); // Ensure startScale is set
}

console.log("Waddle Dee module loaded.");