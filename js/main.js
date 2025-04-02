// REMOVE this line: import * as THREE from 'three';

// The rest of your js/main.js code remains EXACTLY the same!
// All references like 'new THREE.Scene()', 'new THREE.PerspectiveCamera()', etc.
// will now automatically use the global 'THREE' object provided by 'three.min.js'.

// 1. Scene Setup

// ====================================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

// Get canvas element
const canvas = document.getElementById('gameCanvas');

// 2. Camera Setup
// ====================================================================
const camera = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.set(0, 5, 15);
camera.lookAt(0, 0, 0);

// 3. Renderer Setup
// ====================================================================
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// 4. Lighting
// ====================================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
scene.add(directionalLight);

// --- Add Physics Variables ---
const gravity = -30; // Acceleration due to gravity (units per second squared). Negative since it pulls down.
const jumpForce = 14; // Initial upward velocity when jumping (units per second).
let velocityY = 0; // Kirby's current vertical velocity.
let isGrounded = true; // Starts on the ground.
const groundLevel = 0.5; // The Y position of the ground Kirby stands on (calculated from before: bodyRadius(1.0) - groundOffset(0.5))

// Function to create a simple tree model
function createTree() {
    const treeGroup = new THREE.Group();

    // Materials
    const trunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513, // Brown
        roughness: 0.9,
        metalness: 0.1
    });
    const leavesMaterial = new THREE.MeshStandardMaterial({
        color: 0x006400, // Dark Green
        roughness: 0.8,
        metalness: 0.0
    });

    // Dimensions
    const trunkRadius = 0.3;
    const trunkHeight = 2.5;
    const leavesRadius = 1.2; // Using Icosahedron, radius is approximate size

    // Trunk (Cylinder)
    // CylinderGeometry(radiusTop, radiusBottom, height, radialSegments)
    const trunkGeometry = new THREE.CylinderGeometry(trunkRadius * 0.8, trunkRadius, trunkHeight, 8);
    const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
    // Position the trunk so its base is at the group's y=0
    trunkMesh.position.y = trunkHeight / 2;
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true; // Trunk can receive shadow from leaves
    treeGroup.add(trunkMesh);

    // Leaves (Icosahedron - looks a bit more "bushy" than a sphere)
    // IcosahedronGeometry(radius, detail) - detail increases segments (0 is simplest)
    const leavesGeometry = new THREE.IcosahedronGeometry(leavesRadius, 1);
    const leavesMesh = new THREE.Mesh(leavesGeometry, leavesMaterial);
    // Position the leaves on top of the trunk
    leavesMesh.position.y = trunkHeight + leavesRadius * 0.6; // Adjust 0.6 multiplier to sit nicely
    leavesMesh.castShadow = true;
    treeGroup.add(leavesMesh);

    // Set the group's origin to be the base of the trunk for easier placement
    // (Achieved by how we positioned the trunk and leaves above)

    return treeGroup;
}

function createSimpleKirby() {
    const kirbyGroup = new THREE.Group();

    // Materials
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFC0CB, // Pink
        roughness: 0.6,
        metalness: 0.1
    });
    const feetMaterial = new THREE.MeshStandardMaterial({
        color: 0xDA2C43, // Reddish-pink for feet
        roughness: 0.7,
        metalness: 0.1
    });
    const eyeMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000, // Black
        roughness: 0.2,
        metalness: 0.0
    });
    // --- NEW: Cheek Material ---
    const cheekMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF8FAF, // Lighter/brighter pink for cheeks
        roughness: 0.8,
        metalness: 0.0,
        side: THREE.DoubleSide // Good practice for flat-ish shapes
    });

    // Dimensions
    const bodyRadius = 1.0;
    const footRadius = 0.4;
    const eyeRadius = 0.1;
    // --- NEW: Arm and Cheek Dimensions ---
    const armRadius = 0.25;
    const armLengthScale = 1.3; // Make arms slightly oval
    const cheekRadius = 0.18;
    const cheekThicknessScale = 0.05; // Make cheeks very thin

    // Body (Sphere)
    const bodyGeometry = new THREE.SphereGeometry(bodyRadius, 32, 16);
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.castShadow = true;
    kirbyGroup.add(bodyMesh);

    // Feet (Spheres)
    const footGeometry = new THREE.SphereGeometry(footRadius, 16, 8);
    const leftFootMesh = new THREE.Mesh(footGeometry, feetMaterial);
    leftFootMesh.position.set(-bodyRadius * 0.6, -bodyRadius * 0.8, bodyRadius * 0.2);
    leftFootMesh.castShadow = true;
    kirbyGroup.add(leftFootMesh);
    const rightFootMesh = new THREE.Mesh(footGeometry, feetMaterial);
    rightFootMesh.position.set(bodyRadius * 0.6, -bodyRadius * 0.8, bodyRadius * 0.2);
    rightFootMesh.castShadow = true;
    kirbyGroup.add(rightFootMesh);

    // Eyes (Spheres)
    const eyeGeometry = new THREE.SphereGeometry(eyeRadius, 12, 8);
    const leftEyeMesh = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEyeMesh.position.set(-bodyRadius * 0.35, bodyRadius * 0.2, bodyRadius * 0.85);
    kirbyGroup.add(leftEyeMesh);
    const rightEyeMesh = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEyeMesh.position.set(bodyRadius * 0.35, bodyRadius * 0.2, bodyRadius * 0.85);
    kirbyGroup.add(rightEyeMesh);

    // --- NEW: Arms (Scaled Spheres) ---
    const armGeometry = new THREE.SphereGeometry(armRadius, 12, 8);

    const leftArmMesh = new THREE.Mesh(armGeometry, bodyMaterial); // Use body material
    // Position slightly out, down, and forward from the body center
    leftArmMesh.position.set(-bodyRadius * 0.85, -bodyRadius * 0.2, bodyRadius * 0.3);
    // Scale slightly on the Y axis to make them look longer, less spherical
    leftArmMesh.scale.set(1, armLengthScale, 1);
    leftArmMesh.castShadow = true;
    kirbyGroup.add(leftArmMesh);

    const rightArmMesh = new THREE.Mesh(armGeometry, bodyMaterial); // Use body material
    rightArmMesh.position.set(bodyRadius * 0.85, -bodyRadius * 0.2, bodyRadius * 0.3);
    rightArmMesh.scale.set(1, armLengthScale, 1);
    rightArmMesh.castShadow = true;
    kirbyGroup.add(rightArmMesh);

    // --- NEW: Cheeks (Scaled Spheres to look like flat circles) ---
    const cheekGeometry = new THREE.SphereGeometry(cheekRadius, 16, 8);

    const leftCheekMesh = new THREE.Mesh(cheekGeometry, cheekMaterial);
    // Position on the front surface, slightly outside and below the eyes
    leftCheekMesh.position.set(-bodyRadius * 0.55, bodyRadius * 0.0, bodyRadius * 0.80);
    // Scale drastically on Z axis to make it flat
    leftCheekMesh.scale.set(1, 1, cheekThicknessScale);
    // Cheeks likely don't need to cast shadows
    // leftCheekMesh.castShadow = false;
    kirbyGroup.add(leftCheekMesh);

    const rightCheekMesh = new THREE.Mesh(cheekGeometry, cheekMaterial);
    rightCheekMesh.position.set(bodyRadius * 0.55, bodyRadius * 0.0, bodyRadius * 0.80);
    rightCheekMesh.scale.set(1, 1, cheekThicknessScale);
    // rightCheekMesh.castShadow = false;
    kirbyGroup.add(rightCheekMesh);

     // --- CHIN --- //
     const chinGeometry = new THREE.SphereGeometry(0.1, 12, 8);
     const chinMaterial = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.2, metalness: 0.0 });
     const chinMesh = new THREE.Mesh(chinGeometry, chinMaterial);
     chinMesh.position.set(0, bodyRadius * 0.00, bodyRadius * 0.95); // Adjust Z for position on the face
     kirbyGroup.add(chinMesh);


    // Return the complete group
    return kirbyGroup;
}

// js/main.js (Modify createWaddleDee function)
function createWaddleDee() {
    const waddleDeeGroup = new THREE.Group();

    // Materials (Keep materials as defined before)
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF8C00, // Orange/Peach color
        roughness: 0.8,
        metalness: 0.1
    });
    const faceMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFE4B5, // Lighter Moccasin color for face patch
        roughness: 0.8,
        metalness: 0.0,
        side: THREE.DoubleSide
    });
    const feetMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700, // Gold/Yellow for feet
        roughness: 0.6,
        metalness: 0.1
    });
    const eyeMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000, // Black
        roughness: 0.4,
        metalness: 0.0
    });

    // Dimensions
    const bodyRadius = 0.8;
    const footRadius = 0.3;
    const eyeRadius = 0.09; // Slightly smaller eyes might look better
    const facePatchScale = 0.6;
    const facePatchFlattenScale = 0.1;
    const armRadius = 0.20; // Arm size
    const armScaleY = 1.2; // Slight vertical stretch for arms

    // Body (Sphere)
    const bodyGeometry = new THREE.SphereGeometry(bodyRadius, 32, 16);
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.castShadow = true;
    bodyMesh.position.y = bodyRadius; // Body center at bodyRadius height
    waddleDeeGroup.add(bodyMesh);

    // Face Patch (Flattened Sphere)
    const faceGeometry = new THREE.SphereGeometry(bodyRadius * facePatchScale, 16, 8);
    const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
    // Position slightly higher on the body and forward
    faceMesh.position.set(0, bodyRadius * 1.15, bodyRadius * 0.70);
    faceMesh.scale.set(1.1, 1, facePatchFlattenScale);
    faceMesh.rotation.x = Math.PI / 12;
    waddleDeeGroup.add(faceMesh);

    // --- Eyes (Positioned more carefully on the face patch) ---
    const eyeGeometry = new THREE.SphereGeometry(eyeRadius, 12, 8);
    // Calculate Y and Z relative to the face patch center, then add a tiny offset outward
    const eyeYOffset = 0.02; // How much higher than face patch center
    const eyeZOffset = facePatchFlattenScale * bodyRadius * facePatchScale * 0.5 + 0.02; // Half patch thickness + tiny forward offset
    const eyeXSeparation = bodyRadius * 0.28; // How far apart eyes are

    const eyeY = faceMesh.position.y + eyeYOffset;
    const eyeZ = faceMesh.position.z + eyeZOffset;

    const leftEyeMesh = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEyeMesh.position.set(-eyeXSeparation, eyeY, eyeZ);
    waddleDeeGroup.add(leftEyeMesh);

    const rightEyeMesh = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEyeMesh.position.set(eyeXSeparation, eyeY, eyeZ);
    waddleDeeGroup.add(rightEyeMesh);

    // Feet (Spheres) - Position relative to the group origin (base)
    const footGeometry = new THREE.SphereGeometry(footRadius, 16, 8);
    const footY = footRadius * 0.8; // Keep feet slightly above the absolute ground

    const leftFootMesh = new THREE.Mesh(footGeometry, feetMaterial);
    leftFootMesh.position.set(-bodyRadius * 0.5, footY, bodyRadius * 0.1); // Slightly forward
    leftFootMesh.castShadow = true;
    waddleDeeGroup.add(leftFootMesh);

    const rightFootMesh = new THREE.Mesh(footGeometry, feetMaterial);
    rightFootMesh.position.set(bodyRadius * 0.5, footY, bodyRadius * 0.1); // Slightly forward
    rightFootMesh.castShadow = true;
    waddleDeeGroup.add(rightFootMesh);

    // --- NEW: Arms (Scaled Spheres) ---
    const armGeometry = new THREE.SphereGeometry(armRadius, 12, 8);

    const leftArmMesh = new THREE.Mesh(armGeometry, bodyMaterial); // Use body material
    // Position lower on the body than Kirby's arms, slightly forward
    const armY = bodyRadius * 0.8; // Y position relative to base
    const armX = bodyRadius * 0.75; // How far out to the side
    const armZ = bodyRadius * 0.2;  // How far forward

    leftArmMesh.position.set(-armX, armY, armZ);
    leftArmMesh.scale.set(1, armScaleY, 1); // Slightly stretched vertically
    leftArmMesh.castShadow = true;
    waddleDeeGroup.add(leftArmMesh);

    const rightArmMesh = new THREE.Mesh(armGeometry, bodyMaterial);
    rightArmMesh.position.set(armX, armY, armZ);
    rightArmMesh.scale.set(1, armScaleY, 1);
    rightArmMesh.castShadow = true;
    waddleDeeGroup.add(rightArmMesh);


    return waddleDeeGroup;
}

function spawnWaddleDee() {
    if (activeWaddleDees.length >= MAX_WADDLE_DEES) {
        return;
    }

    const waddleDeeGroup = createWaddleDee();

    // --- Determine Spawn Position (as before) ---
    let spawnX, spawnZ;
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) {
        spawnX = spawnArea;
        spawnZ = (Math.random() - 0.5) * placementAreaSize;
    } else if (edge === 1) {
        spawnX = -spawnArea;
        spawnZ = (Math.random() - 0.5) * placementAreaSize;
    } else if (edge === 2) {
        spawnX = (Math.random() - 0.5) * placementAreaSize;
        spawnZ = spawnArea;
    } else {
        spawnX = (Math.random() - 0.5) * placementAreaSize;
        spawnZ = -spawnArea;
    }
    waddleDeeGroup.position.set(spawnX, WADDLE_DEE_GROUND_LEVEL, spawnZ);
    const initialVelocity = new THREE.Vector3(-spawnX, 0, -spawnZ).normalize();
    waddleDeeGroup.rotation.y = Math.atan2(initialVelocity.x, initialVelocity.z);

    // --- Calculate and Store World Bounding Box for Waddle Dee ---
    const waddleDeeBox = new THREE.Box3();

    // Approximate Waddle Dee BBox size - adjust as needed
    const waddleDeeBoundingBoxSize = { x: 1.4, y: 2.0, z: 1.4 }; // Slightly smaller than Kirby
    const waddleDeeScale = 1.0; // Currently no scale variation, but could add later
    const min = new THREE.Vector3(
        -waddleDeeBoundingBoxSize.x / 2 * waddleDeeScale,
        0, // Base at y=0 in its group
        -waddleDeeBoundingBoxSize.z / 2 * waddleDeeScale
    );
    const max = new THREE.Vector3(
        waddleDeeBoundingBoxSize.x / 2 * waddleDeeScale,
        waddleDeeBoundingBoxSize.y * waddleDeeScale,
        waddleDeeBoundingBoxSize.z / 2 * waddleDeeScale
    );
    min.add(waddleDeeGroup.position);
    max.add(waddleDeeGroup.position);
    waddleDeeBox.set(min, max);

    // --- Add to Scene and Active List (now includes bbox) ---
    scene.add(waddleDeeGroup);
    activeWaddleDees.push({
        group: waddleDeeGroup,
        velocity: initialVelocity,
        changeDirTimer: MIN_DIR_CHANGE_TIME + Math.random() * (MAX_DIR_CHANGE_TIME - MIN_DIR_CHANGE_TIME),
        bbox: waddleDeeBox // Store the bounding box
    });

    // --- Optional: Visualize Waddle Dee Bounding Box (debugging) ---
    // const helper = new THREE.Box3Helper(waddleDeeBox, 0x00ff00); // Green box
    // scene.add(helper);
    // ---
}

// 5. Objects (Ground and Kirby Placeholder)
// ====================================================================
const groundGeometry = new THREE.PlaneGeometry(50, 50);
const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x228B22, side: THREE.DoubleSide
});
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.position.y = -0.5;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

// --- Create Kirby using the function ---
const kirbyGroup = createSimpleKirby(); // Call the function
// --- Animation Parameters ---
const walkCycleSpeed = 15;     // How fast the waddle cycle is (higher is faster)
const walkCycleAmplitude = 0.2; // How far Kirby leans side-to-side (in radians)
const turnSpeedFactor = 0.15; // How quickly Kirby turns to face movement direction (0 to 1)
// --- Collision Detection ---
const kirbyBoundingBoxSize = { x: 1.8, y: 2.4, z: 1.8 }; // Approximate size (width, height, depth) - Adjust as needed!
const treeBoundingBoxes = []; // Array to hold THREE.Box3 objects for trees
const treeData = [];          // Optional: Store tree group along with its bbox

// --- Position the Kirby Group ---
kirbyGroup.position.set(0, 1.0 - 0.5, 0); // Body radius - ground offset = 0.5
const kirbyGroundLevel = 1.0 - 0.5; // Body radius - ground offset
kirbyGroup.position.set(0, kirbyGroundLevel, 0);
scene.add(kirbyGroup); // Add the entire group to the scene
const physicsGroundLevel = kirbyGroundLevel; // Kirby lands at his 

// --- Add Trees ---
const numTrees = 25; // How many trees to create
const placementAreaSize = 45; // Place trees within a slightly smaller area than the ground plane (e.g., -22.5 to 22.5)
const minimumDistanceToCenter = 5; // Don't place trees too close to Kirby's start

// --- Tree BBox Calculation Helper ---
// Define approximate dimensions of the tree's collision box relative to its base origin
const treeCollisionBoxSize = { x: 2.0, y: 4.0, z: 2.0 }; // Approx. width/depth based on leaves, height total
const treeCollisionBoxOffset = { x: 0, y: treeCollisionBoxSize.y / 2, z: 0 }; // Center offset from base

// --- Waddle Dee Management ---
const MAX_WADDLE_DEES = 4;
const WADDLE_DEE_SPEED = 2.0; // Units per second
const WADDLE_DEE_TURN_SPEED = 0.08; // Similar to Kirby's turn speed factor
const activeWaddleDees = []; // Array to hold { group, velocity, changeDirTimer }
const WADDLE_DEE_GROUND_LEVEL = -0.5; // Waddle Dee base Y position (adjust if needed based on model)
const SPAWN_MARGIN = 5; // How far outside the main area to spawn/despawn
const despawnBoundary = placementAreaSize / 2 + SPAWN_MARGIN; // Max distance from center
const spawnArea = placementAreaSize / 2 + SPAWN_MARGIN * 0.5; // Spawn slightly inside despawn boundary
const MIN_DIR_CHANGE_TIME = 3.0; // Minimum seconds before changing direction
const MAX_DIR_CHANGE_TIME = 8.0; // Maximum seconds

for (let i = 0; i < numTrees; i++) {
    const tree = createTree(); // Tree group origin is at the base center

    // ... (Random position generation logic remains the same) ...
    let x, z, positionValid;
    do {
        x = (Math.random() - 0.5) * placementAreaSize;
        z = (Math.random() - 0.5) * placementAreaSize;
        const distanceSq = x*x + z*z;
        positionValid = (distanceSq > minimumDistanceToCenter * minimumDistanceToCenter);
    } while (!positionValid);

    tree.position.set(x, groundMesh.position.y, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    const scaleVariation = 0.8 + Math.random() * 0.4;
    tree.scale.set(scaleVariation, scaleVariation, scaleVariation);

    scene.add(tree);

    // --- Calculate and Store World Bounding Box for the Tree ---
    const treeBox = new THREE.Box3();

    // Define the box corners relative to the tree's base origin, adjusted for scale
    const min = new THREE.Vector3(
        -treeCollisionBoxSize.x / 2 * scaleVariation, // Half width left
        0,                                           // Base is at y=0
        -treeCollisionBoxSize.z / 2 * scaleVariation  // Half depth back
    );
    const max = new THREE.Vector3(
        treeCollisionBoxSize.x / 2 * scaleVariation,  // Half width right
        treeCollisionBoxSize.y * scaleVariation,      // Full height up
        treeCollisionBoxSize.z / 2 * scaleVariation   // Half depth forward
    );

    // Apply the tree's world position to the relative min/max points
    min.add(tree.position);
    max.add(tree.position);

    // Set the Box3 bounds
    treeBox.set(min, max);

    treeBoundingBoxes.push(treeBox); // Store the calculated world box
    // Optional: treeData.push({ tree: tree, bbox: treeBox });

    // --- Optional: Visualize the bounding box (for debugging) ---
    // const helper = new THREE.Box3Helper(treeBox, 0xffff00); // Yellow box
    // scene.add(helper);
    // ---
}


// 6. Keyboard Input State & Handling <--- Changed Section Title slightly
// ====================================================================
const keys = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
    // No need to track spacebar state continuously here, we trigger on press
};

document.addEventListener('keydown', (event) => {
    // --- Jump Handling ---
    // Use event.code === 'Space' for layout independence, or event.key === ' '
    if (event.code === 'Space' && isGrounded) {
        velocityY = jumpForce; // Apply jump force immediately
        isGrounded = false;    // Kirby is now in the air
        // console.log("Jump!"); // Optional: for debugging
    }
    // --- Movement Handling (as before) ---
    else if (keys.hasOwnProperty(event.key)) {
        keys[event.key] = true;
    }
});

document.addEventListener('keyup', (event) => {
    // --- Movement Handling (as before) ---
    if (keys.hasOwnProperty(event.key)) {
        keys[event.key] = false;
    }
    // No specific action needed for spacebar keyup in this simple setup
});

// 7. Game Loop (Animation)
// ====================================================================
const clock = new THREE.Clock();

// --- Collision Check Helper Function ---
function checkCollision(kirbyPotentialBox, collisionType = 'tree') { // Added collisionType parameter
    if (collisionType === 'tree') {
        for (const treeBox of treeBoundingBoxes) {
            if (kirbyPotentialBox.intersectsBox(treeBox)) {
                return true; // Collision with tree detected
            }
        }
    } else if (collisionType === 'waddledee') { // New check for Waddle Dees
        for (const wdData of activeWaddleDees) {
            if (kirbyPotentialBox.intersectsBox(wdData.bbox)) {
                return true; // Collision with Waddle Dee detected
            }
        }
    }
    return false; // No collision of the specified type
}

// --- Kirby BBox Helper ---
const kirbyRelativeBox = new THREE.Box3(
    new THREE.Vector3(-kirbyBoundingBoxSize.x / 2, -kirbyBoundingBoxSize.y / 2, -kirbyBoundingBoxSize.z / 2),
    new THREE.Vector3(kirbyBoundingBoxSize.x / 2, kirbyBoundingBoxSize.y / 2, kirbyBoundingBoxSize.z / 2)
);
const currentKirbyBox = new THREE.Box3(); // Reusable Box3 for Kirby

function getKirbyWorldBox(position) {
    currentKirbyBox.copy(kirbyRelativeBox); // Start with relative box
    currentKirbyBox.translate(position); // Move it to the world position
    return currentKirbyBox;
}
// --- Optional: BBox Helper for Kirby (Debugging) ---
// let kirbyBoxHelper = null;
// ---

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // --- Horizontal Movement ---
    const moveSpeed = 5 * deltaTime;
    const moveDirection = new THREE.Vector3();
    if (keys.w || keys.ArrowUp) moveDirection.z -= 1;
    if (keys.s || keys.ArrowDown) moveDirection.z += 1;
    if (keys.a || keys.ArrowLeft) moveDirection.x -= 1;
    if (keys.d || keys.ArrowRight) moveDirection.x += 1;

    const isMovingHorizontally = moveDirection.lengthSq() > 0;
    let targetAngleY = kirbyGroup.rotation.y; // Keep current angle if not moving

    if (isMovingHorizontally) {
        targetAngleY = Math.atan2(moveDirection.x, moveDirection.z);
        moveDirection.normalize(); // Normalize for speed calculation

        // --- Collision Detection Logic ---
        const currentPos = kirbyGroup.position;
        const moveDelta = moveDirection.clone().multiplyScalar(moveSpeed);

        // 1. Check potential X movement (against trees and Waddle Dees)
        let potentialPosX = currentPos.clone().add(new THREE.Vector3(moveDelta.x, 0, 0));
        let kirbyPotentialBoxX = getKirbyWorldBox(potentialPosX);
        let collisionX_tree = checkCollision(kirbyPotentialBoxX, 'tree'); // Tree collision check
        let collisionX_wd = checkCollision(kirbyPotentialBoxX, 'waddledee'); // Waddle Dee collision check
        let collisionX = collisionX_tree || collisionX_wd; // Combine tree and WD collisions for X

        // 2. Check potential Z movement (against trees and Waddle Dees)
        let potentialPosZ = currentPos.clone().add(new THREE.Vector3(0, 0, moveDelta.z));
        let kirbyPotentialBoxZ = getKirbyWorldBox(potentialPosZ);
        let collisionZ_tree = checkCollision(kirbyPotentialBoxZ, 'tree'); // Tree collision check
        let collisionZ_wd = checkCollision(kirbyPotentialBoxZ, 'waddledee'); // Waddle Dee collision check
        console.log(collisionZ_wd);
        let collisionZ = collisionZ_tree || collisionZ_wd; // Combine tree and WD collisions for Z

        // --- Apply Movement Based on Collision ---
        if (!collisionX) {
            kirbyGroup.position.x += moveDelta.x;
        }
        if (!collisionZ) {
            kirbyGroup.position.z += moveDelta.z;
        }
        // --- End Collision Detection Logic ---

        // --- Apply Y Rotation (Turning) ---
        // (Angle calculation and interpolation logic remains the same)
        let currentAngleY = kirbyGroup.rotation.y;
        let angleDifference = targetAngleY - currentAngleY;
        while (angleDifference < -Math.PI) angleDifference += Math.PI * 2;
        while (angleDifference > Math.PI) angleDifference -= Math.PI * 2;
        kirbyGroup.rotation.y += angleDifference * turnSpeedFactor;

    } // End of horizontal movement + collision logic

    // (Remains the same, no vertical collision check yet)
    // --- Waddle Dee Death Check ---
    if (!isGrounded) { // ONLY check for WD death when Kirby is jumping
        const currentPos = kirbyGroup.position;
        const moveDelta = moveDirection.clone().multiplyScalar(moveSpeed);
        let potentialPosZ = currentPos.clone().add(new THREE.Vector3(0, 0, moveDelta.z));
        let kirbyPotentialBoxZ = getKirbyWorldBox(potentialPosZ);
        let collisionZ_tree = checkCollision(kirbyPotentialBoxZ, 'tree'); // Tree collision check
        let collisionZ_wd = checkCollision(kirbyPotentialBoxZ, 'waddledee'); // Waddle Dee collision check
        let collisionZ = collisionZ_tree || collisionZ_wd; // Combine tree and WD collisions for Z
        velocityY += gravity * deltaTime;
        let currentKirbyWorldBox = getKirbyWorldBox(kirbyGroup.position);
        for (let i = activeWaddleDees.length - 1; i >= 0; i--) {
            const wdData = activeWaddleDees[i];
            console.log(collisionZ_wd);
            if (currentKirbyWorldBox.intersectsBox(wdData.bbox)) {
                // Remove from scene
                scene.remove(wdData.group);
                console.log("Waddle Dee Killed!");

                // Remove from active list
                activeWaddleDees.splice(i, 1);
                // console.log("Waddle Dee Killed!"); // Debug

                // Respawn a new Waddle Dee immediately to replace it
                spawnWaddleDee();

                // No need to check other Waddle Dees once one is hit this frame (optional optimization)
                break; // Exit the Waddle Dee loop after one collision is handled
            }
        }
    } // End Waddle Dee death check (if jumping)

    // Apply potential vertical move
    let potentialPosY = kirbyGroup.position.y + velocityY * deltaTime;

    // Basic ground collision (vertical)
    if (potentialPosY <= physicsGroundLevel) {
        kirbyGroup.position.y = physicsGroundLevel;
        velocityY = 0;
        isGrounded = true;
    } else {
        kirbyGroup.position.y = potentialPosY; // Apply vertical move if not hitting ground
    }


    // --- Walk Animation (Z Rotation Waddle) ---
    // (Remains the same)
    let targetRotationZ = 0;
    if (isMovingHorizontally && isGrounded) {
        targetRotationZ = Math.sin(elapsedTime * walkCycleSpeed) * walkCycleAmplitude;
    }
    kirbyGroup.rotation.z = THREE.MathUtils.lerp(kirbyGroup.rotation.z, targetRotationZ, 0.1);


    // --- Update Waddle Dees ---
    // Iterate backwards using index to safely remove elements with splice
    for (let i = activeWaddleDees.length - 1; i >= 0; i--) {
        const wd = activeWaddleDees[i];
        const group = wd.group;
        const velocity = wd.velocity;

        // -- Random Direction Change --
        wd.changeDirTimer -= deltaTime;
        if (wd.changeDirTimer <= 0) {
            // New random direction (on XZ plane)
            velocity.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
            wd.changeDirTimer = MIN_DIR_CHANGE_TIME + Math.random() * (MAX_DIR_CHANGE_TIME - MIN_DIR_CHANGE_TIME);
            // console.log("Waddle Dee changed direction"); // Debug
        }

        // -- Update Position --
        group.position.addScaledVector(velocity, WADDLE_DEE_SPEED * deltaTime);

        // -- Update Rotation (Face Movement Direction) --
        const targetAngleY = Math.atan2(velocity.x, velocity.z);
        let currentAngleY = group.rotation.y;
        let angleDifference = targetAngleY - currentAngleY;
        while (angleDifference < -Math.PI) angleDifference += Math.PI * 2;
        while (angleDifference > Math.PI) angleDifference -= Math.PI * 2;
        group.rotation.y += angleDifference * WADDLE_DEE_TURN_SPEED;

        // -- Ground Clamping --
        group.position.y = WADDLE_DEE_GROUND_LEVEL; // Ensure they stay on ground

        // -- Check Despawn Boundaries --
        if (Math.abs(group.position.x) > despawnBoundary || Math.abs(group.position.z) > despawnBoundary) {
            // Remove from scene
            scene.remove(group);

           // Remove from active list
            activeWaddleDees.splice(i, 1);
            // console.log("Waddle Dee despawned"); // Debug
        }
    } // End Waddle Dee update loop

    spawnWaddleDee();


    // --- Rendering ---
    renderer.render(scene, camera);
}

animate();



console.log("Three.js Kirby setup complete! (UMD version - no server needed)");