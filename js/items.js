import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import * as Config from './config.js';
import { getRandomPositionOnGround, checkCollision } from './utils.js';
import { getKirbyBoundingBox, givePower } from './kirby.js'; // Import Kirby functions

export let activeItems = []; // Store active items {mesh, type, boundingBox}
const MIN_SPAWN_DIST_FROM_CENTER = 3;
const MIN_DIST_BETWEEN_ITEMS = 5;

function createSwordMesh() {
    const group = new THREE.Group();

    // Blade
    const bladeGeo = new THREE.BoxGeometry(Config.SWORD_SIZE * 0.15, Config.SWORD_SIZE, Config.SWORD_SIZE * 0.05);
    const bladeMat = new THREE.MeshStandardMaterial({ color: Config.SWORD_BLADE_COLOR });
    const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
    bladeMesh.position.y = Config.SWORD_SIZE / 2; // Position base at group origin
    bladeMesh.castShadow = true;
    group.add(bladeMesh);

    // Hilt Guard
    const guardGeo = new THREE.BoxGeometry(Config.SWORD_SIZE * 0.3, Config.SWORD_SIZE * 0.08, Config.SWORD_SIZE * 0.1);
    const guardMat = new THREE.MeshStandardMaterial({ color: Config.SWORD_HILT_COLOR });
    const guardMesh = new THREE.Mesh(guardGeo, guardMat);
    guardMesh.position.y = 0; // At the base of the blade
    guardMesh.castShadow = true;
    group.add(guardMesh);

    // Handle
    const handleGeo = new THREE.CylinderGeometry(Config.SWORD_SIZE * 0.05, Config.SWORD_SIZE * 0.05, Config.SWORD_SIZE * 0.2, 6);
    const handleMat = new THREE.MeshStandardMaterial({ color: Config.SWORD_HILT_COLOR });
    const handleMesh = new THREE.Mesh(handleGeo, handleMat);
    handleMesh.position.y = -Config.SWORD_SIZE * 0.1; // Below the guard
    handleMesh.castShadow = true;
    group.add(handleMesh);

    return group;
}

function createRabbitHelmetMesh() {
    const helmetGroup = new THREE.Group();
    const helmetMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.8, metalness: 0.1 });
    const innerEarMaterial = new THREE.MeshStandardMaterial({ color: 0xFFC0CB, roughness: 0.9, metalness: 0.0, side: THREE.DoubleSide });

    const baseRadius = Config.HELMET_SIZE; // Use config size
    const baseHeight = baseRadius * 0.8; // Proportional height
    const earLength = baseRadius * 2.0;
    const earWidth = baseRadius * 0.35;
    const earThickness = baseRadius * 0.15;

    // Base (open cylinder)
    const baseGeom = new THREE.CylinderGeometry(baseRadius * 0.9, baseRadius, baseHeight, 16, 1, true); // Open ended
    const baseMesh = new THREE.Mesh(baseGeom, helmetMaterial);
    baseMesh.position.y = baseHeight / 2; // Position base at group origin
    baseMesh.castShadow = true;
    helmetGroup.add(baseMesh);

    // Ears (boxes)
    const earGeom = new THREE.BoxGeometry(earWidth, earLength, earThickness);

    const leftEarMesh = new THREE.Mesh(earGeom, helmetMaterial);
    leftEarMesh.position.set(-baseRadius * 0.4, baseHeight + earLength * 0.4, 0); // Position relative to base top
    leftEarMesh.rotation.z = Math.PI / 12; // Slight outward angle
    leftEarMesh.castShadow = true;
    helmetGroup.add(leftEarMesh);

    const rightEarMesh = new THREE.Mesh(earGeom, helmetMaterial);
    rightEarMesh.position.set(baseRadius * 0.4, baseHeight + earLength * 0.4, 0);
    rightEarMesh.rotation.z = -Math.PI / 12;
    rightEarMesh.castShadow = true;
    helmetGroup.add(rightEarMesh);

    // Inner Ear Planes
    const innerEarGeom = new THREE.PlaneGeometry(earWidth * 0.6, earLength * 0.7);

    const leftInnerEarMesh = new THREE.Mesh(innerEarGeom, innerEarMaterial);
    leftInnerEarMesh.position.z = earThickness / 2 + 0.01; // Place slightly in front of ear box
    leftEarMesh.add(leftInnerEarMesh); // Add as child of ear

    const rightInnerEarMesh = new THREE.Mesh(innerEarGeom, innerEarMaterial);
    rightInnerEarMesh.position.z = earThickness / 2 + 0.01;
    rightEarMesh.add(rightInnerEarMesh);

    return helmetGroup;
}

function spawnItem(scene, groundMesh, itemType) {
    let itemMesh;
    let itemSize;
    let itemYOffset = 0.1; // Default offset from ground

    if (itemType === 'sword') {
        itemMesh = createSwordMesh();
        itemSize = Config.SWORD_SIZE * 1.5; // Use a slightly larger radius for placement spacing
        itemYOffset = Config.SWORD_SIZE * 0.1; // Specific offset for sword base
    } else if (itemType === 'helmet') {
        itemMesh = createRabbitHelmetMesh();
        itemSize = Config.HELMET_SIZE * 1.5; // Use a slightly larger radius for placement spacing
        itemYOffset = Config.HELMET_SIZE * 0.1; // Adjust if needed based on helmet base
    } else {
        console.warn("Tried to spawn unknown item type:", itemType);
        return;
    }

    // Find a valid position away from center and other items
    let position;
    let tooClose;
    let attempts = 0;
    const maxAttempts = 50;
    do {
        position = getRandomPositionOnGround(groundMesh, itemSize / 2);
        tooClose = position.length() < MIN_SPAWN_DIST_FROM_CENTER; // Check distance from center
        if (!tooClose) {
            // Check distance from other active items
            for (const existingItem of activeItems) {
                if (existingItem.mesh.position.distanceTo(position) < MIN_DIST_BETWEEN_ITEMS) {
                    tooClose = true;
                    break;
                }
            }
        }
        attempts++;
    } while (tooClose && attempts < maxAttempts);

    if (tooClose) {
        console.warn(`Could not find suitable spawn location for ${itemType} after ${maxAttempts} attempts.`);
        // Optionally spawn at default location or skip
        position = new THREE.Vector3(MIN_SPAWN_DIST_FROM_CENTER + Math.random(), Config.GROUND_Y + itemYOffset, 0);
    }

    position.y = Config.GROUND_Y + itemYOffset; // Set Y position based on offset
    itemMesh.position.copy(position);

    // Set initial rotation for items on ground
    if (itemType === 'sword') {
        itemMesh.rotation.z = Math.PI / 1.5; // Lie somewhat flat
        itemMesh.rotation.y = Math.random() * Math.PI * 2; // Random facing direction
    } else if (itemType === 'helmet') {
        // Helmet sits upright
        itemMesh.rotation.y = Math.random() * Math.PI * 2;
    }

    const item = {
        mesh: itemMesh,
        type: itemType,
        boundingBox: new THREE.Box3(),
    };
    // Calculate bounding box AFTER setting position and rotation
    item.boundingBox.setFromObject(item.mesh);
    scene.add(item.mesh);
    activeItems.push(item);
    console.log(`Spawned ${itemType} at`, position.toArray().map(n => n.toFixed(2)));
}

export function initializeItems(scene, groundMesh) {
    activeItems = []; // Clear existing
    // Spawn initial items
    spawnItem(scene, groundMesh, 'sword');
    spawnItem(scene, groundMesh, 'helmet'); // Spawn the helmet
    console.log("Items initialized.");
}

export function updateItems(deltaTime, scene) {
    if (!activeItems.length) return;

    const kirbyBoxRaw = getKirbyBoundingBox(); // Get Kirby's latest bounding box
    if (!kirbyBoxRaw) return; // Exit if Kirby box not ready

    const pickupLeniency = 0.2; // Increase this value if pickup is still difficult
    const kirbyPickupBox = kirbyBoxRaw.clone().expandByScalar(pickupLeniency);

    for (let i = activeItems.length - 1; i >= 0; i--) {
        const item = activeItems[i];
        if (!item || !item.mesh) {
            activeItems.splice(i, 1);
            continue;
        }

        item.boundingBox.setFromObject(item.mesh);

        if (item.boundingBox.intersectsBox(kirbyPickupBox)) {
            console.log(`Collision detected between Kirby and ${item.type}!`);

            const powerGiven = givePower(item.type, item.mesh);
            console.log(`givePower('${item.type}') returned: ${powerGiven}`);

            if (powerGiven) {
                console.log(`Removing ${item.type} from activeItems list.`);
                activeItems.splice(i, 1);
            } else {
                console.log(`Kirby could not pick up ${item.type} (already has power?).`);
            }
            break;
        } else {
            item.mesh.position.y += Math.sin(Date.now() * 0.002 + i) * 0.005;
            item.mesh.rotation.y += 0.01;
        }
    }

    // --- Update Thrown Items ---
    scene.children.forEach(child => {
        if (child.userData && child.userData.isThrowable) {
            // Apply gravity
            if (!child.userData.velocity) {
                child.userData.velocity = new THREE.Vector3();
            }
            child.userData.velocity.y += Config.GRAVITY * deltaTime;
            child.position.add(child.userData.velocity.clone().multiplyScalar(deltaTime));

            // Ground collision check
            if (child.position.y <= Config.GROUND_Y + 0.2) {
                child.position.y = Config.GROUND_Y + 0.2;

                // *** BOUNCE EFFECT ***
                if (child.userData.velocity.y < -2) { // Only bounce if falling with significant speed
                    child.userData.velocity.y = -child.userData.velocity.y * 0.5; // Reverse and dampen velocity
                } else {
                    child.userData.velocity.set(0, 0, 0); // Stop movement
                    child.userData.isThrowable = false; // No longer throwable
                }
            }
        }
    });
}

console.log("Items module loaded.");