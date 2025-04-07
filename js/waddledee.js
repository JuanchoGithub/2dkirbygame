import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import * as Config from './config.js';
import { checkCollision, getRandomPositionOnGround } from './utils.js';
import { wallBoundingBoxes, treeBoundingBoxes } from './environment.js'; // Import tree boxes too

export let activeWaddleDees = [];
let lastSpawnTime = 0;
const vector3Temp = new THREE.Vector3(); // Reusable vector

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

export function spawnWaddleDee(scene, groundMesh) {
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

    // Create and add helper
    waddleDee.helper = new THREE.BoxHelper(waddleDee.mesh, 0x0000ff); // Blue helpers for Waddle Dees
    scene.add(waddleDee.helper);

    scene.add(waddleDee.mesh);
    activeWaddleDees.push(waddleDee);

    console.log("Spawned Waddle Dee at", position.toArray().map(n => n.toFixed(2)));
}

export function initializeWaddleDees(scene, groundMesh) {
    // Remove old helpers when clearing
    activeWaddleDees.forEach(wd => { if (wd.helper) scene.remove(wd.helper); });
    activeWaddleDees = []; // Clear existing
    for (let i = 0; i < Config.MAX_WADDLEDEES; i++) {
        spawnWaddleDee(scene, groundMesh);
    }
    lastSpawnTime = Date.now(); // Set initial time
    console.log("Waddle Dees initialized.");
}

export function updateWaddleDees(deltaTime, scene, groundMesh) {
    const now = Date.now();

    if (activeWaddleDees.length < Config.MAX_WADDLEDEES && now - lastSpawnTime > Config.WADDLEDEE_SPAWN_INTERVAL) {
        spawnWaddleDee(scene, groundMesh);
        lastSpawnTime = now;
    }

    activeWaddleDees.forEach((waddleDee, index) => {
        // Remove helper if WD is removed
        if (!waddleDee.mesh || waddleDee.isInhaled || waddleDee.isBeingSucked) {
            if (waddleDee.helper) scene.remove(waddleDee.helper);
            if (waddleDee.isInhaled && !waddleDee.isBeingSucked) {
                activeWaddleDees.splice(index, 1);
                console.log("Removed inhaled Waddle Dee from active list.");
            }
            return;
        }

        const group = waddleDee.mesh;
        const velocity = waddleDee.velocity;

        waddleDee.changeDirTimer -= deltaTime;
        if (waddleDee.changeDirTimer <= 0) {
            const newAngle = Math.random() * Math.PI * 2;
            velocity.set(Math.sin(newAngle), 0, Math.cos(newAngle));
            waddleDee.changeDirTimer = Config.WADDLEDEE_MIN_DIR_CHANGE_TIME + Math.random() * (Config.WADDLEDEE_MAX_DIR_CHANGE_TIME - Config.WADDLEDEE_MIN_DIR_CHANGE_TIME);
        }

        let adjustedVelocity = velocity.clone();
        let pushForce = new THREE.Vector3();
        let avoiding = false;
        const allObstacles = [...wallBoundingBoxes, ...treeBoundingBoxes];

        for (const obstacleBox of allObstacles) {
            if (waddleDee.boundingBox.intersectsBox(obstacleBox)) {
                pushForce.subVectors(group.position, obstacleBox.getCenter(vector3Temp)).setY(0).normalize();
                adjustedVelocity.add(pushForce.multiplyScalar(0.5));
                avoiding = true;
            }
        }

        for (let j = 0; j < activeWaddleDees.length; j++) {
            if (index === j) continue;
            const otherWd = activeWaddleDees[j];
            if (!otherWd.mesh || otherWd.isInhaled || otherWd.isBeingSucked) continue;
            if (waddleDee.boundingBox.intersectsBox(otherWd.boundingBox)) {
                pushForce.subVectors(group.position, otherWd.mesh.position).setY(0).normalize();
                adjustedVelocity.add(pushForce.multiplyScalar(0.3));
                avoiding = true;
            }
        }

        if (avoiding) {
            adjustedVelocity.normalize();
            waddleDee.changeDirTimer = Math.min(waddleDee.changeDirTimer, 0.5);
        }

        group.position.y = Config.GROUND_Y + Config.WADDLEDEE_SIZE / 2;

        const moveDelta = adjustedVelocity.clone().multiplyScalar(Config.WADDLEDEE_SPEED * deltaTime);
        group.position.add(moveDelta);

        const targetAngleY_wd = Math.atan2(adjustedVelocity.x, adjustedVelocity.z);
        let currentAngleY_wd = group.rotation.y;
        let angleDifference_wd = targetAngleY_wd - currentAngleY_wd;
        while (angleDifference_wd < -Math.PI) angleDifference_wd += Math.PI * 2;
        while (angleDifference_wd > Math.PI) angleDifference_wd -= Math.PI * 2;
        group.rotation.y += angleDifference_wd * Config.WADDLEDEE_TURN_SPEED;

        // Update bounding box AND helper
        waddleDee.boundingBox.setFromObject(waddleDee.mesh);
        if (waddleDee.helper) {
            waddleDee.helper.update(); // Update helper based on mesh's world matrix
        }
    });
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