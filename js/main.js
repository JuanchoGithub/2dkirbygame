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

// --- NEW: Flight Variables ---
let isFlying = false;           // Is Kirby currently in the flying state?
const flightBoostForce = 10;    // Upward velocity applied per flap (Space press)
const maxFlightHeight = groundLevel + (jumpForce / Math.sqrt(Math.abs(gravity) * 2)) * 2.5; // Approx 2.5x jump height
const flightMaxFallSpeed = -5;  // Limit downward speed while puff-falling
const flightHorizontalDrag = 0.5; // Slow down horizontal movement slightly while flying/falling
const flightScale = new THREE.Vector3(1.25, 1.25, 1.25); // How much Kirby puffs up
const armFlapSpeed = 25;        // How fast the arms flap
const armFlapAmplitude = Math.PI / 3; // How far the arms flap (radians)
let leftArmMesh = null;         // Reference to left arm mesh
let rightArmMesh = null;        // Reference to right arm mesh
const defaultArmRotation = new THREE.Quaternion(); // Store default rotation

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
    const trunkGeometry = new THREE.CylinderGeometry(trunkRadius * 0.8, trunkRadius, trunkHeight, 8);
    const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunkMesh.position.y = trunkHeight / 2;
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    treeGroup.add(trunkMesh);

    // Leaves (Icosahedron)
    const leavesGeometry = new THREE.IcosahedronGeometry(leavesRadius, 1);
    const leavesMesh = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leavesMesh.position.y = trunkHeight + leavesRadius * 0.6;
    leavesMesh.castShadow = true;
    treeGroup.add(leavesMesh);

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
    const cheekMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF8FAF, // Lighter/brighter pink for cheeks
        roughness: 0.8,
        metalness: 0.0,
        side: THREE.DoubleSide
    });

    // Dimensions
    const bodyRadius = 1.0;
    const footRadius = 0.4;
    const eyeRadius = 0.1;
    const armRadius = 0.25;
    const armLengthScale = 1.3;
    const cheekRadius = 0.18;
    const cheekThicknessScale = 0.05;

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

    // Arms (Scaled Spheres)
    const armGeometry = new THREE.SphereGeometry(armRadius, 12, 8);
    const leftArm = new THREE.Mesh(armGeometry, bodyMaterial); // Rename variable for clarity
    leftArm.position.set(-bodyRadius * 0.85, -bodyRadius * 0.2, bodyRadius * 0.3);
    leftArm.scale.set(1, armLengthScale, 1);
    leftArm.castShadow = true;
    kirbyGroup.add(leftArm);
    const rightArm = new THREE.Mesh(armGeometry, bodyMaterial); // Rename variable for clarity
    rightArm.position.set(bodyRadius * 0.85, -bodyRadius * 0.2, bodyRadius * 0.3);
    rightArm.scale.set(1, armLengthScale, 1);
    rightArm.castShadow = true;
    kirbyGroup.add(rightArm);

    // --- Store Arm References ---
    kirbyGroup.userData.leftArmMesh = leftArm;  // Store reference
    kirbyGroup.userData.rightArmMesh = rightArm; // Store reference
    // --- Store Default Arm Rotation ---
    // (Capture the initial rotation - which is likely identity quaternion)
    defaultArmRotation.copy(leftArm.quaternion); // Assuming both start same

    // Cheeks (Scaled Spheres)
    const cheekGeometry = new THREE.SphereGeometry(cheekRadius, 16, 8);
    const leftCheekMesh = new THREE.Mesh(cheekGeometry, cheekMaterial);
    leftCheekMesh.position.set(-bodyRadius * 0.55, bodyRadius * 0.0, bodyRadius * 0.80);
    leftCheekMesh.scale.set(1, 1, cheekThicknessScale);
    kirbyGroup.add(leftCheekMesh);
    const rightCheekMesh = new THREE.Mesh(cheekGeometry, cheekMaterial);
    rightCheekMesh.position.set(bodyRadius * 0.55, bodyRadius * 0.0, bodyRadius * 0.80);
    rightCheekMesh.scale.set(1, 1, cheekThicknessScale);
    kirbyGroup.add(rightCheekMesh);

     // --- CHIN --- // <-- This seems like a mouth, renaming
     const mouthGeometry = new THREE.SphereGeometry(0.1, 12, 8);
     const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.2, metalness: 0.0 });
     const mouthMesh = new THREE.Mesh(mouthGeometry, mouthMaterial);
     mouthMesh.position.set(0, bodyRadius * 0.00, bodyRadius * 0.95); // Adjust Z for position on the face
     // --- Store reference to mouth mesh for animation ---
     kirbyGroup.userData.mouthMesh = mouthMesh; // Store reference
     kirbyGroup.add(mouthMesh);

    return kirbyGroup;
}

// --- NEW: Create Suck Particle Effect ---
function createSuckParticles() {
    const geometry = new THREE.BufferGeometry();
    const NUM_SUCK_PARTICLES = 50;

    // Initialize positions randomly near mouth origin, and store velocities/life
    for (let i = 0; i < NUM_SUCK_PARTICLES; i++) {
        const i3 = i * 3;
        suckParticlePositions[i3    ] = (Math.random() - 0.5) * SUCK_PARTICLE_SPREAD * 0.1; // Start very close
        suckParticlePositions[i3 + 1] = (Math.random() - 0.5) * SUCK_PARTICLE_SPREAD * 0.1;
        suckParticlePositions[i3 + 2] = Math.random() * 0.2; // Start slightly in front

        // Initial velocity (mostly forward, some spread) - relative to Kirby's forward Z
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * SUCK_PARTICLE_SPREAD * 0.5,
            (Math.random() - 0.5) * SUCK_PARTICLE_SPREAD * 0.5,
            SUCK_PARTICLE_SPEED * (0.8 + Math.random() * 0.4) // Vary speed slightly
        );
        suckParticleVelocities.push(velocity);

        suckParticleLife[i] = Math.random() * SUCK_PARTICLE_LIFETIME; // Start with random life
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(suckParticlePositions, 3));

    const material = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.08,
        sizeAttenuation: true, // Shrink with distance
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending, // Brighter where overlap
        depthWrite: false // Prevent particles obscuring Kirby too much
    });

    suckParticles = new THREE.Points(geometry, material);
    suckParticles.visible = false; // Start hidden

    // Position particles relative to Kirby's mouth area
    // The particles' positions are relative to the suckParticles object's origin.
    // Let's place this origin slightly in front of Kirby's visual mouth.
    const mouthMesh = kirbyGroup.userData.mouthMesh;
    if (mouthMesh) {
         // Use mouth position as a guide, but push Z slightly more forward
         suckParticles.position.copy(mouthMesh.position);
         suckParticles.position.z += 0.1; // Adjust this offset as needed
    } else {
        // Fallback position if mouth mesh isn't found (shouldn't happen)
        suckParticles.position.set(0, 0.0, 1.0); // Approx front center
    }


    kirbyGroup.add(suckParticles); // Add particles as a child of Kirby
}

// js/main.js (Modify createWaddleDee function)
function createWaddleDee() {
    const waddleDeeGroup = new THREE.Group();

    // Materials
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
    const eyeRadius = 0.09;
    const facePatchScale = 0.6;
    const facePatchFlattenScale = 0.1;
    const armRadius = 0.20;
    const armScaleY = 1.2;

    // Body (Sphere)
    const bodyGeometry = new THREE.SphereGeometry(bodyRadius, 32, 16);
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.castShadow = true;
    bodyMesh.position.y = bodyRadius;
    waddleDeeGroup.add(bodyMesh);

    // Face Patch (Flattened Sphere)
    const faceGeometry = new THREE.SphereGeometry(bodyRadius * facePatchScale, 16, 8);
    const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
    faceMesh.position.set(0, bodyRadius * 1.15, bodyRadius * 0.70);
    faceMesh.scale.set(1.1, 1, facePatchFlattenScale);
    faceMesh.rotation.x = Math.PI / 12;
    waddleDeeGroup.add(faceMesh);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(eyeRadius, 12, 8);
    const eyeYOffset = 0.02;
    const eyeZOffset = facePatchFlattenScale * bodyRadius * facePatchScale * 0.5 + 0.02;
    const eyeXSeparation = bodyRadius * 0.28;
    const eyeY = faceMesh.position.y + eyeYOffset;
    const eyeZ = faceMesh.position.z + eyeZOffset;

    const leftEyeMesh = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEyeMesh.position.set(-eyeXSeparation, eyeY, eyeZ);
    waddleDeeGroup.add(leftEyeMesh);
    const rightEyeMesh = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEyeMesh.position.set(eyeXSeparation, eyeY, eyeZ);
    waddleDeeGroup.add(rightEyeMesh);

    // Feet
    const footGeometry = new THREE.SphereGeometry(footRadius, 16, 8);
    const footY = footRadius * 0.8;
    const leftFootMesh = new THREE.Mesh(footGeometry, feetMaterial);
    leftFootMesh.position.set(-bodyRadius * 0.5, footY, bodyRadius * 0.1);
    leftFootMesh.castShadow = true;
    waddleDeeGroup.add(leftFootMesh);
    const rightFootMesh = new THREE.Mesh(footGeometry, feetMaterial);
    rightFootMesh.position.set(bodyRadius * 0.5, footY, bodyRadius * 0.1);
    rightFootMesh.castShadow = true;
    waddleDeeGroup.add(rightFootMesh);

    // Arms
    const armGeometry = new THREE.SphereGeometry(armRadius, 12, 8);
    const armY = bodyRadius * 0.8;
    const armX = bodyRadius * 0.75;
    const armZ = bodyRadius * 0.2;
    const leftArmMesh = new THREE.Mesh(armGeometry, bodyMaterial);
    leftArmMesh.position.set(-armX, armY, armZ);
    leftArmMesh.scale.set(1, armScaleY, 1);
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
        color: 0xC0C0C0, metalness: 0.9, roughness: 0.3
    });
    const hiltMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513, metalness: 0.2, roughness: 0.8
    });
    const pommelMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700, metalness: 0.8, roughness: 0.4
    });

    const bladeLength = 1.8;
    const bladeRadius = 0.08;
    const guardWidth = 0.5;
    const guardThickness = 0.15;
    const gripLength = 0.4;
    const gripRadius = 0.09;
    const pommelRadius = 0.15;

    const bladeGeom = new THREE.CylinderGeometry(bladeRadius * 0.5, bladeRadius, bladeLength, 8);
    const bladeMesh = new THREE.Mesh(bladeGeom, bladeMaterial);
    bladeMesh.position.y = gripLength / 2 + bladeLength / 2;
    bladeMesh.castShadow = true;
    swordGroup.add(bladeMesh);

    const guardGeom = new THREE.BoxGeometry(guardWidth, guardThickness, guardThickness * 1.2);
    const guardMesh = new THREE.Mesh(guardGeom, hiltMaterial);
    guardMesh.position.y = gripLength / 2 + guardThickness / 2;
    guardMesh.castShadow = true;
    swordGroup.add(guardMesh);

    const gripGeom = new THREE.CylinderGeometry(gripRadius, gripRadius, gripLength, 8);
    const gripMesh = new THREE.Mesh(gripGeom, hiltMaterial);
    gripMesh.castShadow = true;
    swordGroup.add(gripMesh);

    const pommelGeom = new THREE.SphereGeometry(pommelRadius, 8, 6);
    const pommelMesh = new THREE.Mesh(pommelGeom, pommelMaterial);
    pommelMesh.position.y = -gripLength / 2 - pommelRadius * 0.5;
    pommelMesh.castShadow = true;
    swordGroup.add(pommelMesh);

    return swordGroup;
}

// --- NEW: Create Rabbit Helmet Function ---
function createRabbitHelmet() {
    const helmetGroup = new THREE.Group();

    const helmetMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF, roughness: 0.8, metalness: 0.1
    });
    const innerEarMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFC0CB, roughness: 0.9, metalness: 0.0, side: THREE.DoubleSide
    });

    const baseRadius = 0.7;
    const baseHeight = 0.6;
    const earLength = 1.5;
    const earWidth = 0.25;
    const earThickness = 0.1;

    const baseGeom = new THREE.CylinderGeometry(baseRadius * 0.9, baseRadius, baseHeight, 16, 1, true);
    const baseMesh = new THREE.Mesh(baseGeom, helmetMaterial);
    baseMesh.position.y = baseHeight / 2;
    baseMesh.castShadow = true;
    helmetGroup.add(baseMesh);

    const earGeom = new THREE.BoxGeometry(earWidth, earLength, earThickness);

    const leftEarMesh = new THREE.Mesh(earGeom, helmetMaterial);
    leftEarMesh.position.set(-baseRadius * 0.4, baseHeight + earLength * 0.4, 0);
    leftEarMesh.rotation.z = Math.PI / 12;
    leftEarMesh.castShadow = true;
    helmetGroup.add(leftEarMesh);

    const rightEarMesh = new THREE.Mesh(earGeom, helmetMaterial);
    rightEarMesh.position.set(baseRadius * 0.4, baseHeight + earLength * 0.4, 0);
    rightEarMesh.rotation.z = -Math.PI / 12;
    rightEarMesh.castShadow = true;
    helmetGroup.add(rightEarMesh);

    const innerEarGeom = new THREE.PlaneGeometry(earWidth * 0.6, earLength * 0.7);
    const leftInnerEarMesh = new THREE.Mesh(innerEarGeom, innerEarMaterial);
    leftInnerEarMesh.position.z = earThickness / 2 + 0.01;
    leftEarMesh.add(leftInnerEarMesh);

    const rightInnerEarMesh = new THREE.Mesh(innerEarGeom, innerEarMaterial);
    rightInnerEarMesh.position.z = earThickness / 2 + 0.01;
    rightEarMesh.add(rightInnerEarMesh);

    return helmetGroup;
}

// --- NEW: Sword State Variables ---
let swordGroup = null;
let swordBox = null;
let isSwordOnGround = false;
let isKirbyHoldingSword = false;
const swordBoundingBoxSize = { x: 0.6, y: 2.5, z: 0.6 };

// --- NEW: Rabbit Helmet State Variables ---
let rabbitHelmetGroup = null;
let rabbitHelmetBox = null;
let isHelmetOnGround = false;
let isKirbyWearingHelmet = false;
const helmetBoundingBoxSize = { x: 1.5, y: 2.0, z: 1.0 };

// --- NEW: Spawn Sword Function ---
function spawnSword() {
    if (isSwordOnGround || isKirbyHoldingSword || swordGroup) return;
    swordGroup = createSword();
    let spawnX, spawnZ;
    const minSpawnDist = 3;
    const maxSpawnDist = placementAreaSize / 2 - 2;
    do {
        spawnX = (Math.random() - 0.5) * placementAreaSize;
        spawnZ = (Math.random() - 0.5) * placementAreaSize;
    } while (Math.sqrt(spawnX*spawnX + spawnZ*spawnZ) < minSpawnDist ||
             Math.abs(spawnX) > maxSpawnDist || Math.abs(spawnZ) > maxSpawnDist);

    const swordGroundLevel = groundMesh.position.y + 0.1;
    swordGroup.position.set(spawnX, swordGroundLevel, spawnZ);
    swordGroup.rotation.z = Math.PI / 6;
    swordGroup.rotation.y = Math.random() * Math.PI * 2;

    swordBox = new THREE.Box3();
    const min = new THREE.Vector3(-swordBoundingBoxSize.x / 2, 0, -swordBoundingBoxSize.z / 2);
    const max = new THREE.Vector3(swordBoundingBoxSize.x / 2, swordBoundingBoxSize.y, swordBoundingBoxSize.z / 2);
    min.add(swordGroup.position);
    max.add(swordGroup.position);
    swordBox.set(min, max);

    scene.add(swordGroup);
    isSwordOnGround = true;
}

// --- NEW: Spawn Rabbit Helmet Function ---
function spawnRabbitHelmet() {
    if (isHelmetOnGround || isKirbyWearingHelmet || rabbitHelmetGroup) return;
    rabbitHelmetGroup = createRabbitHelmet();
    let spawnX, spawnZ, tooCloseToSword;
    const minSpawnDist = 4;
    const maxSpawnDist = placementAreaSize / 2 - 3;
    const minDistBetweenItems = 5;
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

    const helmetGroundLevel = groundMesh.position.y + 0.1;
    rabbitHelmetGroup.position.set(spawnX, helmetGroundLevel, spawnZ);

    rabbitHelmetBox = new THREE.Box3();
    const min = new THREE.Vector3(-helmetBoundingBoxSize.x / 2, 0, -helmetBoundingBoxSize.z / 2);
    const max = new THREE.Vector3(helmetBoundingBoxSize.x / 2, helmetBoundingBoxSize.y, helmetBoundingBoxSize.z / 2);
    min.add(rabbitHelmetGroup.position);
    max.add(rabbitHelmetGroup.position);
    rabbitHelmetBox.set(min, max);

    scene.add(rabbitHelmetGroup);
    isHelmetOnGround = true;
}

function spawnWaddleDee() {
    if (activeWaddleDees.length >= MAX_WADDLE_DEES) {
        return;
    }
    const waddleDeeGroup = createWaddleDee();
    let spawnX, spawnZ;
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) { spawnX = spawnArea; spawnZ = (Math.random() - 0.5) * placementAreaSize; }
    else if (edge === 1) { spawnX = -spawnArea; spawnZ = (Math.random() - 0.5) * placementAreaSize; }
    else if (edge === 2) { spawnX = (Math.random() - 0.5) * placementAreaSize; spawnZ = spawnArea; }
    else { spawnX = (Math.random() - 0.5) * placementAreaSize; spawnZ = -spawnArea; }

    waddleDeeGroup.position.set(spawnX, WADDLE_DEE_GROUND_LEVEL, spawnZ);
    const initialVelocity = new THREE.Vector3(-spawnX, 0, -spawnZ).normalize();
    waddleDeeGroup.rotation.y = Math.atan2(initialVelocity.x, initialVelocity.z);

    const waddleDeeBox = new THREE.Box3();
    const waddleDeeBoundingBoxSize = { x: 1.4, y: 2.0, z: 1.4 };
    const waddleDeeScale = 1.0;
    const min = new THREE.Vector3(-waddleDeeBoundingBoxSize.x / 2 * waddleDeeScale, 0, -waddleDeeBoundingBoxSize.z / 2 * waddleDeeScale);
    const max = new THREE.Vector3(waddleDeeBoundingBoxSize.x / 2 * waddleDeeScale, waddleDeeBoundingBoxSize.y * waddleDeeScale, waddleDeeBoundingBoxSize.z / 2 * waddleDeeScale);
    min.add(waddleDeeGroup.position);
    max.add(waddleDeeGroup.position);
    waddleDeeBox.set(min, max);

    scene.add(waddleDeeGroup);
    activeWaddleDees.push({
        group: waddleDeeGroup,
        velocity: initialVelocity,
        changeDirTimer: MIN_DIR_CHANGE_TIME + Math.random() * (MAX_DIR_CHANGE_TIME - MIN_DIR_CHANGE_TIME),
        bbox: waddleDeeBox
    });
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

const kirbyGroup = createSimpleKirby();
const walkCycleSpeed = 15;
const walkCycleAmplitude = 0.2;
const turnSpeedFactor = 0.15;
const kirbyBoundingBoxSize = { x: 1.8, y: 2.4, z: 1.8 };
const treeBoundingBoxes = [];
const treeData = [];
const kirbyGroundLevel = 1.0 - 0.5;
kirbyGroup.position.set(0, kirbyGroundLevel, 0);
scene.add(kirbyGroup);
const physicsGroundLevel = kirbyGroundLevel;

const numTrees = 25;
const placementAreaSize = 45;
const minimumDistanceToCenter = 5;
const treeCollisionBoxSize = { x: 2.0, y: 4.0, z: 2.0 };
const treeCollisionBoxOffset = { x: 0, y: treeCollisionBoxSize.y / 2, z: 0 };

const MAX_WADDLE_DEES = 4;
const WADDLE_DEE_SPEED = 2.0;
const WADDLE_DEE_TURN_SPEED = 0.08;
const activeWaddleDees = [];
const WADDLE_DEE_GROUND_LEVEL = - 0.5; // Centered body radius - ground offset
const SPAWN_MARGIN = 5;
const despawnBoundary = placementAreaSize / 2 + SPAWN_MARGIN;
const spawnArea = placementAreaSize / 2 + SPAWN_MARGIN * 0.5;
const MIN_DIR_CHANGE_TIME = 3.0;
const MAX_DIR_CHANGE_TIME = 8.0;
const minSpawnDist = 3; // Renamed from spawnSword context

// --- Kirby State Variables ---
const kirbyInitialScale = new THREE.Vector3(1, 1, 1); // Store initial scale
let isSucking = false; // Is Kirby currently inhaling?
let suckTimer = 0;     // How long the suck action lasts
const SUCK_DURATION = 0.6; // Seconds the suck animation plays
const SUCK_RANGE = 4.0;    // Max distance Kirby can suck from
const SUCK_ANGLE_DEGREES = 35; // Angle range (degrees) in front of Kirby
const SUCK_ANGLE_COS_THRESHOLD = Math.cos(SUCK_ANGLE_DEGREES * Math.PI / 180); // Cosine for dot product check
let didSuckThisAction = false; // Flag to ensure only one WD per suck action
const suckTargetScale = new THREE.Vector3(1.4, 0.7, 1.4); // How Kirby looks when sucking
const mouthSuckScale = new THREE.Vector3(2.5, 2.5, 2.5); // How big the mouth gets
const mouthInitialScale = new THREE.Vector3(1, 1, 1); // Initial mouth scale
// --- NEW: Suck Visual Effect Variables ---
let suckParticles = null;             // THREE.Points object for the whirlwind
const NUM_SUCK_PARTICLES = 50;
const SUCK_PARTICLE_SPEED = 8.0;
const SUCK_PARTICLE_SPREAD = 0.8;    // How wide the particle stream is at the mouth
const SUCK_PARTICLE_LIFETIME = 0.5; // How far particles travel before resetting (related to SUCK_DURATION)
let suckedWaddleDeeData = null;       // Stores info of the WD being sucked { group, startTime, startPos, startScale }
const SUCK_IN_DURATION = 0.35;       // How long the WD takes to shrink and move into mouth (must be < SUCK_DURATION)
const suckTargetPosition = new THREE.Vector3(); // Reusable vector for WD target
const suckParticlePositions = new Float32Array(NUM_SUCK_PARTICLES * 3); // Particle geometry data
const suckParticleVelocities = [];   // Array to store velocity vectors for particles
const suckParticleLife = new Float32Array(NUM_SUCK_PARTICLES); // Track lifetime

// --- Initialize Suck Particles ---
createSuckParticles(); // <<< ADD THIS LINE



for (let i = 0; i < numTrees; i++) {
    const tree = createTree();
    let x, z, positionValid;
    do {
        x = (Math.random() - 0.5) * placementAreaSize;
        z = (Math.random() - 0.5) * placementAreaSize;
        const distanceSq = x*x + z*z;
        positionValid = (distanceSq > minimumDistanceToCenter * minimumDistanceToCenter) &&
                        (distanceSq > (minSpawnDist + 1) * (minSpawnDist + 1));
    } while (!positionValid);

    tree.position.set(x, groundMesh.position.y, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    const scaleVariation = 0.8 + Math.random() * 0.4;
    tree.scale.set(scaleVariation, scaleVariation, scaleVariation);
    scene.add(tree);

    const treeBox = new THREE.Box3();
    const min = new THREE.Vector3(-treeCollisionBoxSize.x / 2 * scaleVariation, 0, -treeCollisionBoxSize.z / 2 * scaleVariation);
    const max = new THREE.Vector3(treeCollisionBoxSize.x / 2 * scaleVariation, treeCollisionBoxSize.y * scaleVariation, treeCollisionBoxSize.z / 2 * scaleVariation);
    min.add(tree.position);
    max.add(tree.position);
    treeBox.set(min, max);
    treeBoundingBoxes.push(treeBox);
}

spawnSword();
spawnRabbitHelmet();
for (let i = 0; i < MAX_WADDLE_DEES; i++) {
    spawnWaddleDee();
}

// 6. Keyboard Input State & Handling
// ====================================================================
const keys = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
    z: false // Track 'z' key press
};

document.addEventListener('keydown', (event) => {
    // --- Modified Space Handling ---
    if (event.code === 'Space' && !isSucking) { // Can't jump/fly while sucking
        if (isGrounded) {
            // Standard Jump
            velocityY = jumpForce;
            isGrounded = false;
            isFlying = false; // Ensure not flying when jumping from ground
        } else if (kirbyGroup.position.y < maxFlightHeight) {
            // Initiate or Continue Flight (Flap)
            velocityY = flightBoostForce; // Apply upward boost
            isFlying = true;              // Set flying state
        }
        // If already at max height, space does nothing mid-air
    }
    // --- Rest of keydown logic (sucking, movement) ---
    else if (event.key.toLowerCase() === 'z' && !isSucking && isGrounded && !suckedWaddleDeeData) {
        isSucking = true;             // Set the sucking state to true
        suckTimer = SUCK_DURATION;    // Reset the timer for how long the suck lasts
        didSuckThisAction = false;    // Reset the flag for whether a WD has been targeted *this* suck
    } else if (keys.hasOwnProperty(event.key)) {
         // --- Prevent movement input while flying? (Optional, Kirby can drift) ---
         // if (!isFlying) { // Uncomment this block to prevent controlling movement while flying
             if (!isSucking) {
                keys[event.key] = true;
             }
         // }
    }
});

document.addEventListener('keyup', (event) => {
    if (keys.hasOwnProperty(event.key.toLowerCase())) {
        keys[event.key.toLowerCase()] = false;
    } else if (keys.hasOwnProperty(event.key)) { // Handle Arrow keys
        keys[event.key] = false;
    }
});

// 7. Game Loop (Animation)
// ====================================================================
const clock = new THREE.Clock();
const vector3Temp = new THREE.Vector3(); // Reusable vector

// --- Collision Check Helper Function ---
function checkCollision(kirbyPotentialBox, collisionType = 'tree') {
    if (collisionType === 'tree') {
        for (const treeBox of treeBoundingBoxes) {
            if (kirbyPotentialBox.intersectsBox(treeBox)) {
                return true;
            }
        }
    } else if (collisionType === 'waddledee') {
        for (const wdData of activeWaddleDees) {
            if (wdData && wdData.bbox && kirbyPotentialBox.intersectsBox(wdData.bbox)) {
                return true;
            }
        }
    }
    return false;
}

const kirbyBodyCenterOffset = new THREE.Vector3(0, 1.0, 0);
const kirbyRelativeBox = new THREE.Box3(
    new THREE.Vector3(-kirbyBoundingBoxSize.x / 2, -kirbyBoundingBoxSize.y / 2 + kirbyBodyCenterOffset.y, -kirbyBoundingBoxSize.z / 2),
    new THREE.Vector3(kirbyBoundingBoxSize.x / 2, kirbyBoundingBoxSize.y / 2 + kirbyBodyCenterOffset.y, kirbyBoundingBoxSize.z / 2)
);
const currentKirbyBox = new THREE.Box3(); // Reusable Box3 for Kirby

function getKirbyWorldBox(position) {
    currentKirbyBox.copy(kirbyRelativeBox);
    currentKirbyBox.translate(position);
    return currentKirbyBox;
}

// Reusable vectors for suck calculation
const kirbyForwardDir = new THREE.Vector3();
const vectorToWd = new THREE.Vector3();

// ANIMATE function
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    // --- Sucking State Update & Animation ---
    const mouthMesh = kirbyGroup.userData.mouthMesh; // Get mouth reference

    // --- Get Arm References (once after creation) ---
    if (!leftArmMesh) leftArmMesh = kirbyGroup.userData.leftArmMesh;
    if (!rightArmMesh) rightArmMesh = kirbyGroup.userData.rightArmMesh;

    getKirbyWorldBox(kirbyGroup.position);

    // --- Item Pickup Checks (Sword & Helmet) ---
    if (isSwordOnGround && !isKirbyHoldingSword && swordGroup && swordBox && !isSucking) { // Prevent pickup while sucking
        if (currentKirbyBox.intersectsBox(swordBox)) {
            // console.log("Kirby picked up the sword!"); // Less console noise
            isSwordOnGround = false;
            isKirbyHoldingSword = true;
            scene.remove(swordGroup);
            kirbyGroup.add(swordGroup);
            swordGroup.position.set(0.8, 0.3, 0.5);
            swordGroup.rotation.set(0, Math.PI / 4, -Math.PI / 2.5);
            swordGroup.scale.set(0.7, 0.7, 0.7);
        }
    }
    if (isHelmetOnGround && !isKirbyWearingHelmet && rabbitHelmetGroup && rabbitHelmetBox && !isSucking) { // Prevent pickup while sucking
        if (currentKirbyBox.intersectsBox(rabbitHelmetBox)) {
            // console.log("Kirby put on the rabbit helmet!"); // Less console noise
            isHelmetOnGround = false;
            isKirbyWearingHelmet = true;
            scene.remove(rabbitHelmetGroup);
            kirbyGroup.add(rabbitHelmetGroup);
            const kirbyHeadY = 1.0;
            rabbitHelmetGroup.position.set(0, kirbyHeadY + 0.1, 0.1);
            rabbitHelmetGroup.rotation.set(0, 0, 0);
            rabbitHelmetGroup.scale.set(1, 1, 1);
        }
    }

// --- Waddle Dee Suck-In Animation ---
    if (suckedWaddleDeeData) {
        const wdGroup = suckedWaddleDeeData.group;
        const progress = Math.min((elapsedTime - suckedWaddleDeeData.startTime) / SUCK_IN_DURATION, 1.0);

        // Calculate target position (Kirby's mouth world position)
        // We need the world position of the particle system origin as the target point
        suckParticles.getWorldPosition(suckTargetPosition); // Get world position of particle origin

        // Interpolate position
        wdGroup.position.lerpVectors(suckedWaddleDeeData.startPos, suckTargetPosition, progress);

        // Interpolate scale
        wdGroup.scale.lerpVectors(suckedWaddleDeeData.startScale, vector3Temp.set(0.01, 0.01, 0.01), progress); // Shrink to almost nothing

        // Check for completion
        if (progress >= 1.0) {
            console.log("Waddle Dee fully sucked in!");
            // Remove COMPLETELY now
            scene.remove(wdGroup);
            // if (wdGroup.userData.helper) scene.remove(wdGroup.userData.helper); // Optional helper remove

            // Remove from active list (find the correct one, might not be the last!)
            const indexToRemove = activeWaddleDees.findIndex(wd => wd.group === wdGroup);
            if (indexToRemove !== -1) {
                 activeWaddleDees.splice(indexToRemove, 1);
            } else {
                console.warn("Could not find sucked Waddle Dee in active list to remove.");
            }


            // Spawn replacement
            spawnWaddleDee();

            // Reset state
            suckedWaddleDeeData = null;
            // No need to set didSuckThisAction = true here, it was set when targeting started
        }
    }

    // --- Waddle Dee Suck-In Animation ---
    if (suckedWaddleDeeData) {
        const wdGroup = suckedWaddleDeeData.group;
        const progress = Math.min((elapsedTime - suckedWaddleDeeData.startTime) / SUCK_IN_DURATION, 1.0);

        // Calculate target position (Kirby's mouth world position)
        // We need the world position of the particle system origin as the target point
        suckParticles.getWorldPosition(suckTargetPosition); // Get world position of particle origin

        // Interpolate position
        wdGroup.position.lerpVectors(suckedWaddleDeeData.startPos, suckTargetPosition, progress);

        // Interpolate scale
        wdGroup.scale.lerpVectors(suckedWaddleDeeData.startScale, vector3Temp.set(0.01, 0.01, 0.01), progress); // Shrink to almost nothing

        // Check for completion
        if (progress >= 1.0) {
            console.log("Waddle Dee fully sucked in!");
            // Remove COMPLETELY now
            scene.remove(wdGroup);
            // if (wdGroup.userData.helper) scene.remove(wdGroup.userData.helper); // Optional helper remove

            // Remove from active list (find the correct one, might not be the last!)
            const indexToRemove = activeWaddleDees.findIndex(wd => wd.group === wdGroup);
            if (indexToRemove !== -1) {
                 activeWaddleDees.splice(indexToRemove, 1);
            } else {
                console.warn("Could not find sucked Waddle Dee in active list to remove.");
            }


            // Spawn replacement
            spawnWaddleDee();

            // Reset state
            suckedWaddleDeeData = null;
            // No need to set didSuckThisAction = true here, it was set when targeting started
        }
    }


    if (isSucking) {
        isFlying = false; // Cannot fly while sucking
        suckTimer -= deltaTime;

        // Apply sucking scale animation (Lerp towards target)
        kirbyGroup.scale.lerp(suckTargetScale, 0.2);
        if(mouthMesh) mouthMesh.scale.lerp(mouthSuckScale, 0.25);

        // --- Make Particles Visible & Animate ---
        if (suckParticles) {
            suckParticles.visible = true;
            const positions = suckParticles.geometry.attributes.position.array;
            const kirbyWorldRotation = kirbyGroup.quaternion; // Use quaternion for rotation

            for (let i = 0; i < NUM_SUCK_PARTICLES; i++) {
                const i3 = i * 3;

                // Apply velocity rotated by Kirby's orientation
                const velocity = suckParticleVelocities[i].clone().applyQuaternion(kirbyWorldRotation);
                positions[i3    ] += velocity.x * deltaTime;
                positions[i3 + 1] += velocity.y * deltaTime;
                positions[i3 + 2] += velocity.z * deltaTime; // Move relative to particle system origin

                // Check lifetime/distance
                suckParticleLife[i] += deltaTime;
                const distanceSq = positions[i3]*positions[i3] + positions[i3+1]*positions[i3+1] + positions[i3+2]*positions[i3+2];

                // Reset particle if lifetime exceeded or too far (adjust threshold as needed)
                // Using distanceSq is cheaper than sqrt(distance)
                if (suckParticleLife[i] > SUCK_PARTICLE_LIFETIME || distanceSq > SUCK_PARTICLE_LIFETIME * SUCK_PARTICLE_SPEED * 0.8) { // Check distance squared approx
                    // Reset near mouth origin
                    positions[i3    ] = (Math.random() - 0.5) * SUCK_PARTICLE_SPREAD * 0.1;
                    positions[i3 + 1] = (Math.random() - 0.5) * SUCK_PARTICLE_SPREAD * 0.1;
                    positions[i3 + 2] = Math.random() * 0.1; // Start slightly in front of origin

                    suckParticleLife[i] = 0; // Reset life timer

                    // Optionally slightly randomize velocity again on reset
                    suckParticleVelocities[i].set(
                        (Math.random() - 0.5) * SUCK_PARTICLE_SPREAD * 0.5,
                        (Math.random() - 0.5) * SUCK_PARTICLE_SPREAD * 0.5,
                        SUCK_PARTICLE_SPEED * (0.8 + Math.random() * 0.4)
                    );
                }
            }
            suckParticles.geometry.attributes.position.needsUpdate = true; // IMPORTANT!
        }

         // --- Waddle Dee Suck Detection (Targeting) ---
        // Only target if NOT currently animating another WD
        if (!didSuckThisAction && !suckedWaddleDeeData) { // <<< Check !suckedWaddleDeeData
            const angle = kirbyGroup.rotation.y;
            kirbyForwardDir.set(Math.sin(angle), 0, Math.cos(angle)).normalize();

            for (let i = activeWaddleDees.length - 1; i >= 0; i--) {
                const wdData = activeWaddleDees[i];
                if (!wdData || !wdData.group) continue;

                vectorToWd.subVectors(wdData.group.position, kirbyGroup.position);
                const distance = vectorToWd.length();

                if (distance < SUCK_RANGE && distance > 0.1) {
                    vectorToWd.normalize();
                    const dotProduct = kirbyForwardDir.dot(vectorToWd);

                    if (dotProduct > SUCK_ANGLE_COS_THRESHOLD) {
                        console.log("Targeting Waddle Dee for sucking!");

                        // *** START Suck-In Animation ***
                        suckedWaddleDeeData = {
                            group: wdData.group,
                            startTime: elapsedTime,
                            startPos: wdData.group.position.clone(), // Store starting position
                            startScale: wdData.group.scale.clone()  // Store starting scale
                        };

                        didSuckThisAction = true; // Mark that we've targeted one this action

                        // *** DO NOT REMOVE WD FROM SCENE/ARRAY YET ***

                        break; // Stop checking after targeting one WD
                    }
                }
            }
        } // End of targeting check

        // Check if suck timer finished
        if (suckTimer <= 0 && !suckedWaddleDeeData) { // Only stop if not currently sucking in a WD
            isSucking = false;
            console.log("Kirby stops sucking.");
             if (suckParticles) suckParticles.visible = false; // Hide particles immediately
        }
    } else { // --- If NOT Sucking ---
        // Return Kirby scale to normal
        if (!kirbyGroup.scale.equals(kirbyInitialScale)) {
            kirbyGroup.scale.lerp(kirbyInitialScale, 0.15);
             if (kirbyGroup.scale.distanceToSquared(kirbyInitialScale) < 0.001) {
                 kirbyGroup.scale.copy(kirbyInitialScale);
             }
        }
         if (mouthMesh && !mouthMesh.scale.equals(mouthInitialScale)) {
            mouthMesh.scale.lerp(mouthInitialScale, 0.2);
             if (mouthMesh.scale.distanceToSquared(mouthInitialScale) < 0.001) {
                 mouthMesh.scale.copy(mouthInitialScale);
             }
         }
         // Ensure particles are hidden if not sucking
         if (suckParticles && suckParticles.visible) {
             suckParticles.visible = false;
         }
    }


    // --- Horizontal Movement ---
    let isMovingHorizontally = false;
    let targetAngleY = kirbyGroup.rotation.y;
    const moveSpeedBase = 5.0; // Base speed
    let currentMoveSpeed = moveSpeedBase;
 
     // Allow movement only if not sucking *and* no WD is being animated
     if (!isSucking && !suckedWaddleDeeData) {
        // --- Apply Flight Drag ---
        if (isFlying || (!isGrounded && velocityY < 0)) { // Apply drag if flying OR puff-falling
            currentMoveSpeed *= (1.0 - flightHorizontalDrag * deltaTime); // Simple drag application
        }
        const moveDeltaFactor = currentMoveSpeed * deltaTime; // Use potentially reduced speed
        // ... (rest of horizontal movement logic remains the same) ...
        const moveSpeed = 5 * deltaTime;
        const moveDirection = vector3Temp.set(0, 0, 0);
        if (keys.w || keys.ArrowUp) moveDirection.z -= 1;
        if (keys.s || keys.ArrowDown) moveDirection.z += 1;
        if (keys.a || keys.ArrowLeft) moveDirection.x -= 1;
        if (keys.d || keys.ArrowRight) moveDirection.x += 1;

        isMovingHorizontally = moveDirection.lengthSq() > 0;

        if (isMovingHorizontally) {
            targetAngleY = Math.atan2(moveDirection.x, moveDirection.z);
            moveDirection.normalize();

            const currentPos = kirbyGroup.position;
            const moveDelta = moveDirection.clone().multiplyScalar(moveSpeed);

            let potentialPosX = currentPos.clone().add(new THREE.Vector3(moveDelta.x, 0, 0));
            let kirbyPotentialBoxX = getKirbyWorldBox(potentialPosX);
            let collisionX = checkCollision(kirbyPotentialBoxX, 'tree') || checkCollision(kirbyPotentialBoxX, 'waddledee');

            let potentialPosZ = currentPos.clone().add(new THREE.Vector3(0, 0, moveDelta.z));
            let kirbyPotentialBoxZ = getKirbyWorldBox(potentialPosZ);
            let collisionZ = checkCollision(kirbyPotentialBoxZ, 'tree') || checkCollision(kirbyPotentialBoxZ, 'waddledee');

            if (!collisionX) kirbyGroup.position.x += moveDelta.x;
            if (!collisionZ) kirbyGroup.position.z += moveDelta.z;


            let currentAngleY = kirbyGroup.rotation.y;
            let angleDifference = targetAngleY - currentAngleY;
            while (angleDifference < -Math.PI) angleDifference += Math.PI * 2;
            while (angleDifference > Math.PI) angleDifference -= Math.PI * 2;
            kirbyGroup.rotation.y += angleDifference * turnSpeedFactor;
        }
     }
     
   // --- Vertical Movement (Physics) ---
    // ... (Jump stomp logic remains the same) ...
    if (!isGrounded) {
        velocityY += gravity * deltaTime;
        // --- Limit fall speed when puff-falling ---
        if (isFlying && velocityY < flightMaxFallSpeed) {
            velocityY = flightMaxFallSpeed;
            // Check if we should stop "flying" state if falling too fast/long?
            // Maybe add a timer or check if space hasn't been pressed recently?
            // For now, isFlying remains true until landing or hitting ceiling.
        }
        // --- Check Max Flight Height ---
        if (isFlying && kirbyGroup.position.y >= maxFlightHeight && velocityY > 0) {
            velocityY = 0; // Stop upward movement at ceiling
            console.log("Reached max flight height!");
            // isFlying = false; // Optionally stop flight state immediately at ceiling
        }

        // --- Stomp Check (remains the same, but check !isFlying maybe?) ---
        // Kirby probably shouldn't stomp while actively flapping up.
        // Only check stomp if falling (velocityY < 0) and maybe not isFlying?
        // Let's keep it simple for now: stomp works even while "puff falling".
        if (velocityY < 0) {
            getKirbyWorldBox(kirbyGroup.position);
            for (let i = activeWaddleDees.length - 1; i >= 0; i--) {
                const wdData = activeWaddleDees[i];
                 // *** Add check: Don't stomp the WD being sucked in! ***
                if (suckedWaddleDeeData && wdData.group === suckedWaddleDeeData.group) {
                    continue;
                }
                if (wdData && wdData.bbox && currentKirbyBox.intersectsBox(wdData.bbox)) {
                    scene.remove(wdData.group);
                    activeWaddleDees.splice(i, 1);
                    console.log("Waddle Dee Defeated (Stomp)!");
                    spawnWaddleDee();
                    velocityY = jumpForce * 0.5;
                    break;
                }
            }
        }
    }

    let potentialPosY = kirbyGroup.position.y + velocityY * deltaTime;

    if (potentialPosY <= physicsGroundLevel) {
        kirbyGroup.position.y = physicsGroundLevel;
        velocityY = 0;
        isGrounded = true;
        isFlying = false; // <<< *** IMPORTANT: Stop flying when landed ***
    } else {
        kirbyGroup.position.y = potentialPosY;
        isGrounded = false;
        // isFlying state is managed by input and ceiling/landing checks
    }

    // --->>> NEW: KIRBY DEATH CHECK <<<---
    // Check only if NOT sucking and NOT currently in the process of stomping (velocityY >= 0)
    if (!isSucking && velocityY >= 0) {
        getKirbyWorldBox(kirbyGroup.position); // Ensure Kirby's box is up-to-date *after* final position update

        for (const wdData of activeWaddleDees) {
            // Skip the check if this WD is the one being sucked (shouldn't happen if !isSucking, but safe)
            if (suckedWaddleDeeData && wdData.group === suckedWaddleDeeData.group) {
                continue;
            }

            // Check intersection
            if (wdData && wdData.bbox && currentKirbyBox.intersectsBox(wdData.bbox)) {
                // Collision detected under death conditions!
                console.log("GAME OVER: Kirby touched a Waddle Dee!");
                // Reload the page to restart the game
                window.location.reload();
                return; // Exit the animate function immediately after reload call
            }
        }
    }
    // --->>> END OF DEATH CHECK <<<---
    
    // Target Scale
    let targetScale = kirbyInitialScale;
    if (isSucking) {
        targetScale = suckTargetScale;
    } else if (isFlying || (!isGrounded && velocityY < flightBoostForce * 0.5)) { // Puff up if flying OR falling gently
        targetScale = flightScale;
    }

    // Lerp Kirby's overall scale
    if (!kirbyGroup.scale.equals(targetScale)) {
        kirbyGroup.scale.lerp(targetScale, 0.15);
         // Snap to target if very close to prevent tiny lerps forever
         if (kirbyGroup.scale.distanceToSquared(targetScale) < 0.0001) {
             kirbyGroup.scale.copy(targetScale);
         }
    }

    // Mouth Scale (handle sucking case)
    const targetMouthScale = isSucking ? mouthSuckScale : mouthInitialScale;
     if (mouthMesh && !mouthMesh.scale.equals(targetMouthScale)) {
        mouthMesh.scale.lerp(targetMouthScale, 0.2);
         if (mouthMesh.scale.distanceToSquared(targetMouthScale) < 0.001) {
             mouthMesh.scale.copy(targetMouthScale);
         }
     }

    // --- Walk Animation (Z Rotation Waddle) ---
    let targetRotationZ = 0;
    // Only waddle if moving, grounded, NOT sucking, AND not animating a WD suck-in
    if (isMovingHorizontally && isGrounded && !isSucking && !suckedWaddleDeeData) {
        targetRotationZ = Math.sin(elapsedTime * walkCycleSpeed) * walkCycleAmplitude;
    }
    let currentWaddleLerp = (isKirbyHoldingSword || isKirbyWearingHelmet) ? 0.03 : 0.1;
    kirbyGroup.rotation.z = THREE.MathUtils.lerp(kirbyGroup.rotation.z, targetRotationZ, currentWaddleLerp);

    // --- NEW: Arm Flapping Animation ---
    if (leftArmMesh && rightArmMesh) {
        let targetArmRotation = defaultArmRotation; // Default rotation if not flying

        if (isFlying) {
            // Calculate flap angle based on time
            const flapAngle = Math.sin(elapsedTime * armFlapSpeed) * armFlapAmplitude;

            // Create a quaternion for the flap rotation (around X-axis for up/down)
            // We apply it relative to the default rotation
            const flapQuaternion = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(1, 0, 0), // Flap around local X axis
                flapAngle
            );

            // Apply to both arms (one might need negation depending on initial setup, but often not)
            leftArmMesh.quaternion.copy(defaultArmRotation).multiply(flapQuaternion);
            // Right arm flaps the opposite way relative to body
            const flapQuaternionRight = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(1, 0, 0),
               -flapAngle // Use negative angle for the other arm
            );
            rightArmMesh.quaternion.copy(defaultArmRotation).multiply(flapQuaternionRight);

        } else {
            // If not flying, smoothly return arms to default position
            const lerpFactor = 0.15;
            leftArmMesh.quaternion.slerp(defaultArmRotation, lerpFactor);
            rightArmMesh.quaternion.slerp(defaultArmRotation, lerpFactor);
        }
    }

    // --- Update Waddle Dees ---
    for (let i = activeWaddleDees.length - 1; i >= 0; i--) {
        const wd = activeWaddleDees[i];
        if (!wd || !wd.group || !wd.velocity || !wd.bbox) {
            continue;
        }
        // *** IMPORTANT: Skip update for the Waddle Dee being sucked in! ***
        if (suckedWaddleDeeData && wd.group === suckedWaddleDeeData.group) {
            continue; // Skip position, rotation, bbox, and despawn checks
        }


        const group = wd.group;
        const velocity = wd.velocity;

         // ... (Rest of Waddle Dee update logic: direction change, position, rotation, ground clamp) ...
        wd.changeDirTimer -= deltaTime;
        if (wd.changeDirTimer <= 0) {
            velocity.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
            wd.changeDirTimer = MIN_DIR_CHANGE_TIME + Math.random() * (MAX_DIR_CHANGE_TIME - MIN_DIR_CHANGE_TIME);
        }

        group.position.addScaledVector(velocity, WADDLE_DEE_SPEED * deltaTime);

        const targetAngleY_wd = Math.atan2(velocity.x, velocity.z);
        let currentAngleY_wd = group.rotation.y;
        let angleDifference_wd = targetAngleY_wd - currentAngleY_wd;
        while (angleDifference_wd < -Math.PI) angleDifference_wd += Math.PI * 2;
        while (angleDifference_wd > Math.PI) angleDifference_wd -= Math.PI * 2;
        group.rotation.y += angleDifference_wd * WADDLE_DEE_TURN_SPEED;
        group.position.y = WADDLE_DEE_GROUND_LEVEL;

        // Update Bounding Box (only if not being sucked)
        const wdBox = wd.bbox;
        const waddleDeeBoundingBoxSize = { x: 1.4, y: 2.0, z: 1.4 };
        const wdSize = waddleDeeBoundingBoxSize;
        const wdScale = group.scale.x; // Use current scale in case it changes later
        const min = vector3Temp.set( -wdSize.x/2 * wdScale, 0, -wdSize.z/2 * wdScale );
        const max = new THREE.Vector3( wdSize.x/2 * wdScale, wdSize.y * wdScale, wdSize.z/2 * wdScale );
        min.add(group.position);
        max.add(group.position);
        wdBox.set(min, max);

        // Check Despawn Boundaries (only if not being sucked)
        if (Math.abs(group.position.x) > despawnBoundary || Math.abs(group.position.z) > despawnBoundary) {
            scene.remove(group);
            activeWaddleDees.splice(i, 1);
            spawnWaddleDee();
        }
    }


    // --- Rendering ---
    renderer.render(scene, camera);
}

animate(); // Start the loop

// Modify the console log message slightly
console.log("Three.js Kirby setup complete! Added Sword, Helmet, Suck (Z), and Flight (Space mid-air).");