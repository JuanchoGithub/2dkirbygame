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



// --- NEW: Create Sword Function ---
function createSword() {
    const swordGroup = new THREE.Group();

    const bladeMaterial = new THREE.MeshStandardMaterial({
        color: 0xC0C0C0, // Silver
        metalness: 0.9,
        roughness: 0.3
    });
    const hiltMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513, // Brown
        metalness: 0.2,
        roughness: 0.8
    });
    const pommelMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700, // Gold
        metalness: 0.8,
        roughness: 0.4
    });

    // Dimensions
    const bladeLength = 1.8;
    const bladeRadius = 0.08;
    const guardWidth = 0.5;
    const guardThickness = 0.15;
    const gripLength = 0.4;
    const gripRadius = 0.09;
    const pommelRadius = 0.15;

    // Blade (Cylinder) - Tip at top
    const bladeGeom = new THREE.CylinderGeometry(bladeRadius * 0.5, bladeRadius, bladeLength, 8);
    const bladeMesh = new THREE.Mesh(bladeGeom, bladeMaterial);
    bladeMesh.position.y = gripLength / 2 + bladeLength / 2; // Position above grip
    bladeMesh.castShadow = true;
    swordGroup.add(bladeMesh);

    // Guard (Box) - Centered at top of grip
    const guardGeom = new THREE.BoxGeometry(guardWidth, guardThickness, guardThickness * 1.2);
    const guardMesh = new THREE.Mesh(guardGeom, hiltMaterial);
    guardMesh.position.y = gripLength / 2 + guardThickness / 2; // Slightly overlap grip top
    guardMesh.castShadow = true;
    swordGroup.add(guardMesh);

    // Grip (Cylinder) - Centered at origin
    const gripGeom = new THREE.CylinderGeometry(gripRadius, gripRadius, gripLength, 8);
    const gripMesh = new THREE.Mesh(gripGeom, hiltMaterial);
    // gripMesh.position.y is 0 (centered)
    gripMesh.castShadow = true;
    swordGroup.add(gripMesh);

    // Pommel (Sphere) - Below grip
    const pommelGeom = new THREE.SphereGeometry(pommelRadius, 8, 6);
    const pommelMesh = new THREE.Mesh(pommelGeom, pommelMaterial);
    pommelMesh.position.y = -gripLength / 2 - pommelRadius * 0.5; // Below grip
    pommelMesh.castShadow = true;
    swordGroup.add(pommelMesh);

    // Set group origin (conceptually) at the center of the grip
    // We'll rotate the whole group when placing it on the ground or Kirby

    return swordGroup;
}

// --- NEW: Create Rabbit Helmet Function ---
function createRabbitHelmet() {
    const helmetGroup = new THREE.Group();

    const helmetMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF, // White
        roughness: 0.8,
        metalness: 0.1
    });
    const innerEarMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFC0CB, // Pink
        roughness: 0.9,
        metalness: 0.0,
        side: THREE.DoubleSide // Good for flat shapes
    });

    // Dimensions
    const baseRadius = 0.7;
    const baseHeight = 0.6;
    const earLength = 1.5;
    const earWidth = 0.25;
    const earThickness = 0.1;

    // Helmet Base (Short Cylinder or Cut Sphere)
    // Using Cylinder: CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded)
    const baseGeom = new THREE.CylinderGeometry(baseRadius * 0.9, baseRadius, baseHeight, 16, 1, true); // Open ended bottom
    const baseMesh = new THREE.Mesh(baseGeom, helmetMaterial);
    baseMesh.position.y = baseHeight / 2; // Position base at origin
    baseMesh.castShadow = true;
    helmetGroup.add(baseMesh);

    // Ears (Flattened Boxes or Cylinders) - Using Boxes
    const earGeom = new THREE.BoxGeometry(earWidth, earLength, earThickness);

    // Left Ear
    const leftEarMesh = new THREE.Mesh(earGeom, helmetMaterial);
    leftEarMesh.position.set(-baseRadius * 0.4, baseHeight + earLength * 0.4, 0); // Position on top-left of base
    leftEarMesh.rotation.z = Math.PI / 12; // Slight outward tilt
    leftEarMesh.castShadow = true;
    helmetGroup.add(leftEarMesh);

    // Right Ear
    const rightEarMesh = new THREE.Mesh(earGeom, helmetMaterial);
    rightEarMesh.position.set(baseRadius * 0.4, baseHeight + earLength * 0.4, 0); // Position on top-right of base
    rightEarMesh.rotation.z = -Math.PI / 12; // Slight outward tilt
    rightEarMesh.castShadow = true;
    helmetGroup.add(rightEarMesh);

    // Optional: Inner Ear Detail (Flattened shapes inside ears)
    const innerEarGeom = new THREE.PlaneGeometry(earWidth * 0.6, earLength * 0.7); // Smaller plane
    const leftInnerEarMesh = new THREE.Mesh(innerEarGeom, innerEarMaterial);
    // Position slightly in front of the main ear mesh along its local Z
    leftInnerEarMesh.position.z = earThickness / 2 + 0.01;
    leftEarMesh.add(leftInnerEarMesh); // Add as child of the ear

    const rightInnerEarMesh = new THREE.Mesh(innerEarGeom, innerEarMaterial);
    rightInnerEarMesh.position.z = earThickness / 2 + 0.01;
    rightEarMesh.add(rightInnerEarMesh); // Add as child of the ear

    // Group origin is at the base center of the helmet

    return helmetGroup;
}

// --- NEW: Sword State Variables ---
let swordGroup = null; // Holds the THREE.Group for the sword object
let swordBox = null;   // Holds the THREE.Box3 for collision on the ground
let isSwordOnGround = false; // Is the sword currently in the scene?
let isKirbyHoldingSword = false; // Does Kirby have the sword?
const swordBoundingBoxSize = { x: 0.6, y: 2.5, z: 0.6 }; // Approx. collision size of sword on ground

// --- NEW: Rabbit Helmet State Variables ---
let rabbitHelmetGroup = null;
let rabbitHelmetBox = null;
let isHelmetOnGround = false;
let isKirbyWearingHelmet = false;
const helmetBoundingBoxSize = { x: 1.5, y: 2.0, z: 1.0 }; // Approx collision size (base + ears)

// --- NEW: Spawn Sword Function ---
function spawnSword() {
    // Only spawn if there isn't one already on the ground and Kirby isn't holding it
    if (isSwordOnGround || isKirbyHoldingSword || swordGroup) return;

    swordGroup = createSword();

    // --- Determine Spawn Position ---
    let spawnX, spawnZ;
    const minSpawnDist = 3; // Don't spawn right on top of Kirby start
    const maxSpawnDist = placementAreaSize / 2 - 2; // Keep away from edges

    do {
        spawnX = (Math.random() - 0.5) * placementAreaSize;
        spawnZ = (Math.random() - 0.5) * placementAreaSize;
    } while (Math.sqrt(spawnX*spawnX + spawnZ*spawnZ) < minSpawnDist ||
             Math.abs(spawnX) > maxSpawnDist || Math.abs(spawnZ) > maxSpawnDist);

    // Position slightly above ground, maybe tilted
    const swordGroundLevel = groundMesh.position.y + 0.1; // Slightly elevated
    swordGroup.position.set(spawnX, swordGroundLevel, spawnZ);
    swordGroup.rotation.z = Math.PI / 6; // Tilt slightly
    swordGroup.rotation.y = Math.random() * Math.PI * 2; // Random facing direction

    // --- Calculate and Store World Bounding Box for Sword ---
    swordBox = new THREE.Box3();
    // Define box relative to sword's origin (center of grip), considering tilt later might be complex
    // Using a simpler axis-aligned box around the position for now
    const min = new THREE.Vector3(
        -swordBoundingBoxSize.x / 2,
        0, // Base near ground level
        -swordBoundingBoxSize.z / 2
    );
    const max = new THREE.Vector3(
        swordBoundingBoxSize.x / 2,
        swordBoundingBoxSize.y, // Height of the sword
        swordBoundingBoxSize.z / 2
    );
    // Since the sword is slightly tilted, this box is an approximation
    min.add(swordGroup.position);
    max.add(swordGroup.position);
    swordBox.set(min, max);

    scene.add(swordGroup);
    isSwordOnGround = true;

    // Optional: Visualize Bounding Box
    // const helper = new THREE.Box3Helper(swordBox, 0xff00ff); // Magenta box
    // scene.add(helper);
    // swordGroup.userData.helper = helper; // Store helper reference if needed
}

// --- NEW: Spawn Rabbit Helmet Function ---
function spawnRabbitHelmet() {
    // Only spawn if there isn't one on the ground and Kirby isn't wearing it
    if (isHelmetOnGround || isKirbyWearingHelmet || rabbitHelmetGroup) return;

    rabbitHelmetGroup = createRabbitHelmet();

    // --- Determine Spawn Position (avoiding center, edges, maybe sword too) ---
    let spawnX, spawnZ, tooCloseToSword;
    const minSpawnDist = 4; // Minimum distance from center (0,0)
    const maxSpawnDist = placementAreaSize / 2 - 3; // Keep away from edges
    const minDistBetweenItems = 5; // Min distance between helmet and sword spawn

    do {
        spawnX = (Math.random() - 0.5) * placementAreaSize;
        spawnZ = (Math.random() - 0.5) * placementAreaSize;
        tooCloseToSword = false;
        if (isSwordOnGround && swordGroup) {
            const distSq = (spawnX - swordGroup.position.x)**2 + (spawnZ - swordGroup.position.z)**2;
            tooCloseToSword = distSq < minDistBetweenItems**2;
        }
    } while (Math.sqrt(spawnX*spawnX + spawnZ*spawnZ) < minSpawnDist ||
             Math.abs(spawnX) > maxSpawnDist || Math.abs(spawnZ) > maxSpawnDist ||
             tooCloseToSword);

    // Position slightly above ground
    const helmetGroundLevel = groundMesh.position.y + 0.1;
    rabbitHelmetGroup.position.set(spawnX, helmetGroundLevel, spawnZ);
    // rabbitHelmetGroup.rotation.y = Math.random() * Math.PI * 2; // Random facing

    // --- Calculate and Store World Bounding Box ---
    rabbitHelmetBox = new THREE.Box3();
    const min = new THREE.Vector3(
        -helmetBoundingBoxSize.x / 2,
        0, // Base near ground level
        -helmetBoundingBoxSize.z / 2
    );
    const max = new THREE.Vector3(
        helmetBoundingBoxSize.x / 2,
        helmetBoundingBoxSize.y, // Height including ears
        helmetBoundingBoxSize.z / 2
    );
    min.add(rabbitHelmetGroup.position);
    max.add(rabbitHelmetGroup.position);
    rabbitHelmetBox.set(min, max);

    scene.add(rabbitHelmetGroup);
    isHelmetOnGround = true;

    // Optional: Visualize Bounding Box
    // const helper = new THREE.Box3Helper(rabbitHelmetBox, 0x00ffff); // Cyan box
    // scene.add(helper);
    // rabbitHelmetGroup.userData.helper = helper;
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
    // waddleDeeGroup.userData.helper = helper; // Store helper if needed
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
// kirbyGroup.position.set(0, 1.0 - 0.5, 0); // Body radius - ground offset = 0.5 <-- redundant calc
const kirbyGroundLevel = 1.0 - 0.5; // Body radius - ground offset
kirbyGroup.position.set(0, kirbyGroundLevel, 0);
scene.add(kirbyGroup); // Add the entire group to the scene
const physicsGroundLevel = kirbyGroundLevel; // Kirby lands at his base height

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
const activeWaddleDees = []; // Array to hold { group, velocity, changeDirTimer, bbox }
const WADDLE_DEE_GROUND_LEVEL = -0.5; // Waddle Dee body radius - ground offset
const SPAWN_MARGIN = 5; // How far outside the main area to spawn/despawn
const despawnBoundary = placementAreaSize / 2 + SPAWN_MARGIN; // Max distance from center
const spawnArea = placementAreaSize / 2 + SPAWN_MARGIN * 0.5; // Spawn slightly inside despawn boundary
const MIN_DIR_CHANGE_TIME = 3.0; // Minimum seconds before changing direction
const MAX_DIR_CHANGE_TIME = 8.0; // Maximum seconds
const minSpawnDist = 3; // Don't spawn right on top of Kirby start


for (let i = 0; i < numTrees; i++) {
    const tree = createTree(); // Tree group origin is at the base center

    // ... (Random position generation logic remains the same) ...
    let x, z, positionValid;
    do {
        x = (Math.random() - 0.5) * placementAreaSize;
        z = (Math.random() - 0.5) * placementAreaSize;
        const distanceSq = x*x + z*z;
        // Ensure not too close to center AND not too close to where sword might spawn
        positionValid = (distanceSq > minimumDistanceToCenter * minimumDistanceToCenter) &&
                        (distanceSq > (minSpawnDist + 1) * (minSpawnDist + 1)); // Avoid sword spawn area slightly
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

// --- Spawn Initial Objects ---
spawnSword(); // Spawn the sword initially
spawnRabbitHelmet(); // Spawn the helmet initially // <<< ADD THIS LINE
for (let i = 0; i < MAX_WADDLE_DEES; i++) { // Spawn initial Waddle Dees
    spawnWaddleDee();
}


// 6. Keyboard Input State & Handling
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
function checkCollision(kirbyPotentialBox, collisionType = 'tree') {
    if (collisionType === 'tree') {
        for (const treeBox of treeBoundingBoxes) {
            if (kirbyPotentialBox.intersectsBox(treeBox)) {
                return true; // Collision with tree detected
            }
        }
    } else if (collisionType === 'waddledee') {
        for (const wdData of activeWaddleDees) {
             // Make sure wdData and its bbox exist before checking intersection
            if (wdData && wdData.bbox && kirbyPotentialBox.intersectsBox(wdData.bbox)) {
                return true; // Collision with Waddle Dee detected
            }
        }
    }
    // Removed sword check from here, handle separately as item pickup
    return false; // No collision of the specified type
}

// --- Kirby BBox Helper ---
const kirbyBodyCenterOffset = new THREE.Vector3(0, 1.0, 0); // Approx center of Kirby's sphere relative to group origin
const kirbyRelativeBox = new THREE.Box3(
    // Adjust relative box to be centered around Kirby's visual center
    new THREE.Vector3(-kirbyBoundingBoxSize.x / 2, -kirbyBoundingBoxSize.y / 2 + kirbyBodyCenterOffset.y, -kirbyBoundingBoxSize.z / 2),
    new THREE.Vector3(kirbyBoundingBoxSize.x / 2, kirbyBoundingBoxSize.y / 2 + kirbyBodyCenterOffset.y, kirbyBoundingBoxSize.z / 2)
);
const currentKirbyBox = new THREE.Box3(); // Reusable Box3 for Kirby

function getKirbyWorldBox(position) {
    currentKirbyBox.copy(kirbyRelativeBox); // Start with relative box
    currentKirbyBox.translate(position); // Move it to the world position
    return currentKirbyBox;
}
// --- Optional: BBox Helper for Kirby (Debugging) ---
// let kirbyBoxHelper = new THREE.Box3Helper(currentKirbyBox, 0xff0000); // Red box
// scene.add(kirbyBoxHelper); // Add helper to scene
// ---

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // --- Update Kirby's World BBox ---
    getKirbyWorldBox(kirbyGroup.position); // Update currentKirbyBox position
    // --- Optional: Update Kirby Helper ---
    // if (kirbyBoxHelper) kirbyBoxHelper.box = currentKirbyBox;
    // ---

    // --- Sword Pickup Check ---
    if (isSwordOnGround && !isKirbyHoldingSword && swordGroup && swordBox) {
        if (currentKirbyBox.intersectsBox(swordBox)) {
            console.log("Kirby picked up the sword!");
            isSwordOnGround = false;
            isKirbyHoldingSword = true;

            // Remove sword from scene's top level
            scene.remove(swordGroup);
            // Optional: remove helper too
            // if (swordGroup.userData.helper) scene.remove(swordGroup.userData.helper);


            // Attach sword to Kirby
            kirbyGroup.add(swordGroup);

            // --- Position and Rotate Sword Relative to Kirby ---
            // This requires tweaking based on Kirby's model and desired look
            swordGroup.position.set(0.8, 0.3, 0.5); // Position near right hand (adjust X, Y, Z)
            swordGroup.rotation.set(0, Math.PI / 4, -Math.PI / 2.5); // Point forward-ish and slightly up (adjust X, Y, Z angles)
            swordGroup.scale.set(0.7, 0.7, 0.7); // Optionally make it slightly smaller when held
        }
    }

    // --- NEW: Rabbit Helmet Pickup Check ---
    if (isHelmetOnGround && !isKirbyWearingHelmet && rabbitHelmetGroup && rabbitHelmetBox) {
        if (currentKirbyBox.intersectsBox(rabbitHelmetBox)) {
            console.log("Kirby put on the rabbit helmet!");
            isHelmetOnGround = false;
            isKirbyWearingHelmet = true;

            // Remove helmet from scene's top level
            scene.remove(rabbitHelmetGroup);
            // Optional: remove helper
            // if (rabbitHelmetGroup.userData.helper) scene.remove(rabbitHelmetGroup.userData.helper);

            // Attach helmet to Kirby
            kirbyGroup.add(rabbitHelmetGroup);

            // --- Position and Rotate Helmet Relative to Kirby ---
            // Tweak these values to place it correctly on Kirby's "head"
            // Y position should be roughly Kirby's body radius + helmet base height/2
            const kirbyHeadY = 1.0; // Kirby's body radius, approx head height
            rabbitHelmetGroup.position.set(0, kirbyHeadY + 0.1, 0.1); // Centered X, above body, slightly forward Z
            rabbitHelmetGroup.rotation.set(0, 0, 0); // No rotation relative to Kirby initially
            rabbitHelmetGroup.scale.set(1, 1, 1); // Keep original scale for now
        }
    }

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
        // console.log("Checking Z collision WD:", collisionZ_wd); // DEBUG
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


    // --- Vertical Movement (Physics) ---
    if (!isGrounded) {
        velocityY += gravity * deltaTime; // Apply gravity

        // --- Waddle Dee Death Check ---
        // Check collision using Kirby's *current* updated bounding box
        getKirbyWorldBox(kirbyGroup.position); // Make sure box is current

        for (let i = activeWaddleDees.length - 1; i >= 0; i--) {
            const wdData = activeWaddleDees[i];
             // Check intersection only if WD data and bbox are valid
            if (wdData && wdData.bbox && currentKirbyBox.intersectsBox(wdData.bbox)) {
                // Remove Waddle Dee if hit from above (basic check: Kirby moving down)
                if (velocityY < 0) { // Check if Kirby is descending
                    // Remove from scene
                    scene.remove(wdData.group);
                     // Optional: remove helper
                    // if (wdData.group.userData.helper) scene.remove(wdData.group.userData.helper);

                    // Remove from active list
                    activeWaddleDees.splice(i, 1);
                    console.log("Waddle Dee Defeated!");

                    // Respawn a new Waddle Dee immediately
                    spawnWaddleDee();

                    // Optional: Give Kirby a small bounce
                    velocityY = jumpForce * 0.5;

                    break; // Only defeat one per frame/check
                }
            }
        } // End Waddle Dee death check loop
    } // End vertical physics check (if not grounded)

    // Apply potential vertical move
    let potentialPosY = kirbyGroup.position.y + velocityY * deltaTime;

    // Basic ground collision (vertical)
    if (potentialPosY <= physicsGroundLevel) {
        kirbyGroup.position.y = physicsGroundLevel;
        velocityY = 0;
        isGrounded = true;
    } else {
        kirbyGroup.position.y = potentialPosY; // Apply vertical move if not hitting ground
        isGrounded = false; // Make sure isGrounded is false if in the air
    }


    // --- Walk Animation (Z Rotation Waddle) ---
    // (Remains the same)
    let targetRotationZ = 0;
    if (isMovingHorizontally && isGrounded) {
        targetRotationZ = Math.sin(elapsedTime * walkCycleSpeed) * walkCycleAmplitude;
    }
    // If holding sword, reduce or disable waddle? Optional tweak.
    let currentWaddleLerp = (isKirbyHoldingSword || isKirbyWearingHelmet) ? 0.03 : 0.1; // Slower/less waddle with items
    kirbyGroup.rotation.z = THREE.MathUtils.lerp(kirbyGroup.rotation.z, targetRotationZ, currentWaddleLerp);


    // --- Update Waddle Dees ---
    // Iterate backwards using index to safely remove elements with splice
    for (let i = activeWaddleDees.length - 1; i >= 0; i--) {
        const wd = activeWaddleDees[i];
        // Ensure wd exists before trying to access properties
        if (!wd || !wd.group || !wd.velocity || !wd.bbox) {
             console.warn("Invalid Waddle Dee data found at index", i);
             // Optionally remove the invalid entry
             // activeWaddleDees.splice(i, 1);
            continue; // Skip this iteration
        }

        const group = wd.group;
        const velocity = wd.velocity;

        // -- Random Direction Change --
        wd.changeDirTimer -= deltaTime;
        if (wd.changeDirTimer <= 0) {
            // New random direction (on XZ plane)
            velocity.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
            wd.changeDirTimer = MIN_DIR_CHANGE_TIME + Math.random() * (MAX_DIR_CHANGE_TIME - MIN_DIR_CHANGE_TIME);
        }

        // -- Update Position --
        group.position.addScaledVector(velocity, WADDLE_DEE_SPEED * deltaTime);

        // -- Update Rotation (Face Movement Direction) --
        const targetAngleY_wd = Math.atan2(velocity.x, velocity.z);
        let currentAngleY_wd = group.rotation.y;
        let angleDifference_wd = targetAngleY_wd - currentAngleY_wd;
        while (angleDifference_wd < -Math.PI) angleDifference_wd += Math.PI * 2;
        while (angleDifference_wd > Math.PI) angleDifference_wd -= Math.PI * 2;
        group.rotation.y += angleDifference_wd * WADDLE_DEE_TURN_SPEED;

        // -- Ground Clamping --
        group.position.y = WADDLE_DEE_GROUND_LEVEL; // Ensure they stay on ground

        // -- Update Bounding Box --
        // Recalculate the world bounding box based on the new position
        const wdBox = wd.bbox;
        const waddleDeeBoundingBoxSize = { x: 1.4, y: 2.0, z: 1.4 }; // Slightly smaller than Kirby

        const wdSize = waddleDeeBoundingBoxSize; // Use defined size
        const wdScale = 1.0; // Use defined scale
        const min = new THREE.Vector3( -wdSize.x/2 * wdScale, 0, -wdSize.z/2 * wdScale );
        const max = new THREE.Vector3( wdSize.x/2 * wdScale, wdSize.y * wdScale, wdSize.z/2 * wdScale );
        min.add(group.position);
        max.add(group.position);
        wdBox.set(min, max);
        // Optional: Update helper
        // if (group.userData.helper) group.userData.helper.box = wdBox;


        // -- Check Despawn Boundaries --
        if (Math.abs(group.position.x) > despawnBoundary || Math.abs(group.position.z) > despawnBoundary) {
            // Remove from scene
            scene.remove(group);
             // Optional: remove helper
            // if (group.userData.helper) scene.remove(group.userData.helper);

           // Remove from active list
            activeWaddleDees.splice(i, 1);
            // console.log("Waddle Dee despawned"); // Debug

            // Spawn a replacement immediately
            spawnWaddleDee();
        }
    } // End Waddle Dee update loop

    // --- Rendering ---
    renderer.render(scene, camera);
}

animate(); // Start the loop

console.log("Three.js Kirby setup complete! Added Sword and Rabbit Helmet.");