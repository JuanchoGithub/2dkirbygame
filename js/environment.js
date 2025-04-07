import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import * as Config from './config.js';
import { createTree, getRandomPositionOnGround } from './utils.js';

export const treeBoundingBoxes = [];
export const wallBoundingBoxes = [];
const wallHelpers = []; // Store helpers
const treeHelpers = []; // Store helpers

// Create Ground
export function createGround(scene) {
    const groundGeometry = new THREE.PlaneGeometry(Config.GROUND_SIZE, Config.GROUND_SIZE);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: Config.GROUND_COLOR,
        side: THREE.DoubleSide // Render both sides
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    groundMesh.position.y = Config.GROUND_Y;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);
    console.log("Ground created.");
    return groundMesh; // Return for reference if needed elsewhere
}

// Create Border Walls
export function createBorderWalls(scene) {
    wallBoundingBoxes.length = 0; // Clear existing
    wallHelpers.forEach(h => scene.remove(h)); // Remove old helpers
    wallHelpers.length = 0;

    const wallThickness = 1;
    const wallHeight = 5;
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, visible: false }); // Walls invisible

    // Wall definitions (position, size)
    const walls = [
        { x: 0, z: -Config.GROUND_SIZE / 2, sx: Config.GROUND_SIZE + wallThickness, sz: wallThickness }, // Back
        { x: 0, z: Config.GROUND_SIZE / 2, sx: Config.GROUND_SIZE + wallThickness, sz: wallThickness }, // Front
        { x: -Config.GROUND_SIZE / 2, z: 0, sx: wallThickness, sz: Config.GROUND_SIZE + wallThickness }, // Left
        { x: Config.GROUND_SIZE / 2, z: 0, sx: wallThickness, sz: Config.GROUND_SIZE + wallThickness }  // Right
    ];

    walls.forEach(wallData => {
        const wallGeometry = new THREE.BoxGeometry(wallData.sx, wallHeight, wallData.sz);
        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
        wallMesh.position.set(wallData.x, Config.GROUND_Y + wallHeight / 2, wallData.z);
        scene.add(wallMesh);

        const wallBox = new THREE.Box3().setFromObject(wallMesh);
        wallBoundingBoxes.push(wallBox);

        // Add BoxHelper for the wall
        const helper = new THREE.BoxHelper(wallMesh, 0xff0000); // Red helpers for walls
        scene.add(helper);
        wallHelpers.push(helper);
    });
    console.log("Border walls and helpers created.");
}

function createTreeMesh() {
    const treeGroup = new THREE.Group();
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.5, 5, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: Config.TREE_TRUNK_COLOR }); // Use config color
    const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunkMesh.position.y = 2.5; // Center trunk vertically
    trunkMesh.castShadow = true; // Trunk casts shadow
    trunkMesh.receiveShadow = true;
    treeGroup.add(trunkMesh);
    // *** Store trunk reference for bounding box ***
    treeGroup.userData.trunkMesh = trunkMesh;

    const foliageGeometry = new THREE.SphereGeometry(2, 8, 8);
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: Config.TREE_LEAVES_COLOR }); // Use config color
    const foliageMesh = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliageMesh.position.y = 5; // Position foliage above trunk
    foliageMesh.castShadow = true; // Foliage casts shadow
    treeGroup.add(foliageMesh);

    return treeGroup;
}

// Place Trees
export function placeTrees(scene, groundMesh) {
    treeBoundingBoxes.length = 0;
    treeHelpers.forEach(h => scene.remove(h));
    treeHelpers.length = 0;
    const treePositions = [
        new THREE.Vector3(-10, 0, -8),
        new THREE.Vector3(8, 0, 5),
        new THREE.Vector3(5, 0, -12),
        new THREE.Vector3(-7, 0, 10),
    ];

    console.log("--- Calculating Tree Bounding Boxes ---"); // Log start

    treePositions.forEach((pos, index) => {
        const treeMeshGroup = createTreeMesh();
        treeMeshGroup.position.set(pos.x, Config.GROUND_Y, pos.z);
        scene.add(treeMeshGroup);

        const trunk = treeMeshGroup.userData.trunkMesh;
        const treeBox = new THREE.Box3(); // Create new box

        if (trunk && trunk.geometry) {
            // Ensure matrices are up-to-date
            treeMeshGroup.updateMatrixWorld(true);
            trunk.updateMatrixWorld(true); // Also update trunk's matrix just in case

            // Calculate world box directly from trunk geometry and world matrix
            trunk.geometry.computeBoundingBox(); // Ensure geometry box is computed
            treeBox.copy(trunk.geometry.boundingBox); // Copy local geometry box
            treeBox.applyMatrix4(trunk.matrixWorld); // Apply trunk's world matrix

            // *** Log the calculated box dimensions ***
            console.log(`Tree ${index} Trunk Box Min:`, treeBox.min.toArray().map(n => n.toFixed(2)));
            console.log(`Tree ${index} Trunk Box Max:`, treeBox.max.toArray().map(n => n.toFixed(2)));

        } else {
            console.warn(`Tree ${index}: Trunk mesh or geometry not found. Falling back to group box.`);
            treeMeshGroup.updateMatrixWorld(true);
            treeBox.setFromObject(treeMeshGroup); // Fallback
        }

        treeBoundingBoxes.push(treeBox); // Add the calculated box

        // Helper still tracks the whole tree visually
        const helper = new THREE.BoxHelper(treeMeshGroup, 0x00ff00);
        scene.add(helper);
        treeHelpers.push(helper);
    });
    console.log("--- Tree Bounding Boxes Calculation Complete ---");
    console.log("Final treeBoundingBoxes array:", treeBoundingBoxes); // Log the final array
}

console.log("Environment module loaded.");