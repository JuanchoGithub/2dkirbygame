import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import * as Config from './config.js';

// Basic AABB collision detection
export function checkCollision(box1, box2) {
    return box1.intersectsBox(box2);
}

// Get a random position on the ground plane within bounds
export function getRandomPositionOnGround(groundMesh, objectRadius = 1) {
    const groundSize = Config.GROUND_SIZE;
    // Calculate boundaries ensuring the object stays fully within the ground plane
    const minX = -groundSize / 2 + objectRadius;
    const maxX = groundSize / 2 - objectRadius;
    const minZ = -groundSize / 2 + objectRadius;
    const maxZ = groundSize / 2 - objectRadius;

    const x = THREE.MathUtils.randFloat(minX, maxX);
    const z = THREE.MathUtils.randFloat(minZ, maxZ);
    // Place object slightly above the ground level
    const y = Config.GROUND_Y + objectRadius;

    return new THREE.Vector3(x, y, z);
}

// Function to create a simple tree
export function createTree(position) {
    const trunkHeight = THREE.MathUtils.randFloat(3, 6);
    const trunkRadius = 0.5;
    const leavesRadius = trunkRadius * 3;
    const leavesHeight = leavesRadius * 2;

    const treeGroup = new THREE.Group();

    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(trunkRadius, trunkRadius, trunkHeight, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: Config.TREE_TRUNK_COLOR });
    const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunkMesh.position.y = trunkHeight / 2; // Position base at y=0
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    treeGroup.add(trunkMesh);

    // Leaves (simple cone)
    const leavesGeometry = new THREE.ConeGeometry(leavesRadius, leavesHeight, 8);
    const leavesMaterial = new THREE.MeshStandardMaterial({ color: Config.TREE_LEAVES_COLOR });
    const leavesMesh = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leavesMesh.position.y = trunkHeight + leavesHeight / 2; // Position above trunk
    leavesMesh.castShadow = true;
    leavesMesh.receiveShadow = true;
    treeGroup.add(leavesMesh);

    treeGroup.position.copy(position);
    treeGroup.position.y = Config.GROUND_Y; // Ensure base is on the ground

    // Calculate bounding box for the whole tree
    const treeBox = new THREE.Box3().setFromObject(treeGroup);

    return { mesh: treeGroup, boundingBox: treeBox };
}

console.log("Utils module loaded.");