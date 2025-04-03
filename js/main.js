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
camera.position.set(0, 10, 20); // Adjusted camera slightly for better view
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
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Slightly brighter ambient
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2); // Slightly brighter directional
directionalLight.position.set(8, 15, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048; // Higher shadow resolution
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 60; // Increased far plane for shadow
directionalLight.shadow.camera.left = -30; // Adjusted shadow camera bounds
directionalLight.shadow.camera.right = 30;
directionalLight.shadow.camera.top = 30;
directionalLight.shadow.camera.bottom = -30;
scene.add(directionalLight);
// const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera); // Optional: Helper to visualize shadow frustum
// scene.add(shadowHelper);


// --- Add Physics Variables ---
const gravity = -30;
const jumpForce = 14;
let velocityY = 0;
let isGrounded = true;
const groundLevel = 0.5;

// --- NEW: Flight Variables ---
let isFlying = false;
const flightBoostForce = 10;
const maxFlightHeight = groundLevel + (jumpForce / Math.sqrt(Math.abs(gravity) * 2)) * 2.5;
const flightMaxFallSpeed = -5;
const flightHorizontalDrag = 0.5;
const flightScale = new THREE.Vector3(1.25, 1.25, 1.25);
const armFlapSpeed = 25;
const armFlapAmplitude = Math.PI / 3;
let leftArmMesh = null;
let rightArmMesh = null;
const defaultArmRotation = new THREE.Quaternion();

// --- NEW: Border and Falling Variables ---
const groundSize = 50;
const boundaryLimit = groundSize / 2; // The edge X/Z coordinate
let isFallingOffEdge = false;
let resetTimerId = null; // To store the setTimeout ID
const fallResetDelay = 1000; // 1 second delay before reset
const fallGravity = -150; // Faster gravity when falling off edge

// Function to create a simple tree model
function createTree() {
    const treeGroup = new THREE.Group();
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9, metalness: 0.1 });
    const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x006400, roughness: 0.8, metalness: 0.0 });
    const trunkRadius = 0.3;
    const trunkHeight = 2.5;
    const leavesRadius = 1.2;
    const trunkGeometry = new THREE.CylinderGeometry(trunkRadius * 0.8, trunkRadius, trunkHeight, 8);
    const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunkMesh.position.y = trunkHeight / 2;
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    treeGroup.add(trunkMesh);
    const leavesGeometry = new THREE.IcosahedronGeometry(leavesRadius, 1);
    const leavesMesh = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leavesMesh.position.y = trunkHeight + leavesRadius * 0.6;
    leavesMesh.castShadow = true;
    treeGroup.add(leavesMesh);
    return treeGroup;
}

// Function to create Kirby
function createSimpleKirby() {
    const kirbyGroup = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFFC0CB, roughness: 0.6, metalness: 0.1 });
    const feetMaterial = new THREE.MeshStandardMaterial({ color: 0xDA2C43, roughness: 0.7, metalness: 0.1 });
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.2, metalness: 0.0 });
    const cheekMaterial = new THREE.MeshStandardMaterial({ color: 0xFF8FAF, roughness: 0.8, metalness: 0.0, side: THREE.DoubleSide });
    const bodyRadius = 1.0;
    const footRadius = 0.4;
    const eyeRadius = 0.1;
    const armRadius = 0.25;
    const armLengthScale = 1.3;
    const cheekRadius = 0.18;
    const cheekThicknessScale = 0.05;
    const bodyGeometry = new THREE.SphereGeometry(bodyRadius, 32, 16);
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.castShadow = true;
    kirbyGroup.add(bodyMesh);
    const footGeometry = new THREE.SphereGeometry(footRadius, 16, 8);
    const leftFootMesh = new THREE.Mesh(footGeometry, feetMaterial);
    leftFootMesh.position.set(-bodyRadius * 0.6, -bodyRadius * 0.8, bodyRadius * 0.2);
    leftFootMesh.castShadow = true;
    kirbyGroup.add(leftFootMesh);
    const rightFootMesh = new THREE.Mesh(footGeometry, feetMaterial);
    rightFootMesh.position.set(bodyRadius * 0.6, -bodyRadius * 0.8, bodyRadius * 0.2);
    rightFootMesh.castShadow = true;
    kirbyGroup.add(rightFootMesh);
    const eyeGeometry = new THREE.SphereGeometry(eyeRadius, 12, 8);
    const leftEyeMesh = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEyeMesh.position.set(-bodyRadius * 0.35, bodyRadius * 0.2, bodyRadius * 0.85);
    kirbyGroup.add(leftEyeMesh);
    const rightEyeMesh = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEyeMesh.position.set(bodyRadius * 0.35, bodyRadius * 0.2, bodyRadius * 0.85);
    kirbyGroup.add(rightEyeMesh);
    const armGeometry = new THREE.SphereGeometry(armRadius, 12, 8);
    const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
    leftArm.position.set(-bodyRadius * 0.85, -bodyRadius * 0.2, bodyRadius * 0.3);
    leftArm.scale.set(1, armLengthScale, 1);
    leftArm.castShadow = true;
    kirbyGroup.add(leftArm);
    const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
    rightArm.position.set(bodyRadius * 0.85, -bodyRadius * 0.2, bodyRadius * 0.3);
    rightArm.scale.set(1, armLengthScale, 1);
    rightArm.castShadow = true;
    kirbyGroup.add(rightArm);
    kirbyGroup.userData.leftArmMesh = leftArm;
    kirbyGroup.userData.rightArmMesh = rightArm;
    defaultArmRotation.copy(leftArm.quaternion);
    const cheekGeometry = new THREE.SphereGeometry(cheekRadius, 16, 8);
    const leftCheekMesh = new THREE.Mesh(cheekGeometry, cheekMaterial);
    leftCheekMesh.position.set(-bodyRadius * 0.55, bodyRadius * 0.0, bodyRadius * 0.80);
    leftCheekMesh.scale.set(1, 1, cheekThicknessScale);
    kirbyGroup.add(leftCheekMesh);
    const rightCheekMesh = new THREE.Mesh(cheekGeometry, cheekMaterial);
    rightCheekMesh.position.set(bodyRadius * 0.55, bodyRadius * 0.0, bodyRadius * 0.80);
    rightCheekMesh.scale.set(1, 1, cheekThicknessScale);
    kirbyGroup.add(rightCheekMesh);
    const mouthGeometry = new THREE.SphereGeometry(0.1, 12, 8);
    const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.2, metalness: 0.0 });
    const mouthMesh = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouthMesh.position.set(0, bodyRadius * 0.00, bodyRadius * 0.95);
    kirbyGroup.userData.mouthMesh = mouthMesh;
    kirbyGroup.add(mouthMesh);
    return kirbyGroup;
}

// Function to create suck particles
const NUM_SUCK_PARTICLES = 50;
const suckParticlePositions = new Float32Array(NUM_SUCK_PARTICLES * 3);
const suckParticleVelocities = [];
const suckParticleLife = new Float32Array(NUM_SUCK_PARTICLES);
const SUCK_PARTICLE_SPEED = 8.0;
const SUCK_PARTICLE_SPREAD = 0.8;
const SUCK_PARTICLE_LIFETIME = 0.5;
let suckParticles = null;
const SUCK_DURATION = 0.6;
let suckTimer = 0;
const suckTargetScale = new THREE.Vector3(1.4, 0.7, 1.4);
const mouthSuckScale = new THREE.Vector3(2.5, 2.5, 2.5);
const mouthInitialScale = new THREE.Vector3(1, 1, 1);
let suckedWaddleDeeData = null;
const SUCK_IN_DURATION = 0.35;
const suckTargetPosition = new THREE.Vector3();

function createSuckParticles() {
    const geometry = new THREE.BufferGeometry();
    for (let i = 0; i < NUM_SUCK_PARTICLES; i++) {
        const i3 = i * 3;
        suckParticlePositions[i3] = (Math.random() - 0.5) * SUCK_PARTICLE_SPREAD * 0.1;
        suckParticlePositions[i3 + 1] = (Math.random() - 0.5) * SUCK_PARTICLE_SPREAD * 0.1;
        suckParticlePositions[i3 + 2] = Math.random() * 0.2;
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * SUCK_PARTICLE_SPREAD * 0.5,
            (Math.random() - 0.5) * SUCK_PARTICLE_SPREAD * 0.5,
            SUCK_PARTICLE_SPEED * (0.8 + Math.random() * 0.4)
        );
        suckParticleVelocities.push(velocity);
        suckParticleLife[i] = Math.random() * SUCK_PARTICLE_LIFETIME;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(suckParticlePositions, 3));
    const material = new THREE.PointsMaterial({
        color: 0xFFFFFF, size: 0.08, sizeAttenuation: true,
        transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    suckParticles = new THREE.Points(geometry, material);
    suckParticles.visible = false;
    const mouthMesh = kirbyGroup.userData.mouthMesh; // Assume kirbyGroup exists globally
    if (mouthMesh) {
        suckParticles.position.copy(mouthMesh.position);
        suckParticles.position.z += 0.1;
    } else {
        suckParticles.position.set(0, 0.0, 1.0);
    }
    kirbyGroup.add(suckParticles);
}

// Function to create Waddle Dee
function createWaddleDee() {
    const waddleDeeGroup = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFF8C00, roughness: 0.8, metalness: 0.1 });
    const faceMaterial = new THREE.MeshStandardMaterial({ color: 0xFFE4B5, roughness: 0.8, metalness: 0.0, side: THREE.DoubleSide });
    const feetMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.6, metalness: 0.1 });
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.4, metalness: 0.0 });
    const bodyRadius = 0.8;
    const footRadius = 0.3;
    const eyeRadius = 0.09;
    const facePatchScale = 0.6;
    const facePatchFlattenScale = 0.1;
    const armRadius = 0.20;
    const armScaleY = 1.2;
    const bodyGeometry = new THREE.SphereGeometry(bodyRadius, 32, 16);
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.castShadow = true;
    bodyMesh.position.y = bodyRadius;
    waddleDeeGroup.add(bodyMesh);
    const faceGeometry = new THREE.SphereGeometry(bodyRadius * facePatchScale, 16, 8);
    const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
    faceMesh.position.set(0, bodyRadius * 1.15, bodyRadius * 0.70);
    faceMesh.scale.set(1.1, 1, facePatchFlattenScale);
    faceMesh.rotation.x = Math.PI / 12;
    waddleDeeGroup.add(faceMesh);
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

// Function to create Sword
function createSword() {
    const swordGroup = new THREE.Group();
    const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0xC0C0C0, metalness: 0.9, roughness: 0.3 });
    const hiltMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, metalness: 0.2, roughness: 0.8 });
    const pommelMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8, roughness: 0.4 });
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

// Function to create Rabbit Helmet
function createRabbitHelmet() {
    const helmetGroup = new THREE.Group();
    const helmetMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.8, metalness: 0.1 });
    const innerEarMaterial = new THREE.MeshStandardMaterial({ color: 0xFFC0CB, roughness: 0.9, metalness: 0.0, side: THREE.DoubleSide });
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

// --- NEW: Create Border Walls Function ---
function createBorderWalls() {
    const wallHeight = 1.0;
    const wallThickness = 0.5;
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x5C4033, // Dark Brown
        roughness: 0.9,
        metalness: 0.1
    });
    wallMaterial.map = groundMaterial.map; // Use same texture if ground has one

    const wallGroup = new THREE.Group();

    // Wall North
    const wallNGeom = new THREE.BoxGeometry(groundSize + wallThickness, wallHeight, wallThickness);
    const wallN = new THREE.Mesh(wallNGeom, wallMaterial);
    wallN.position.set(0, wallHeight / 2 - 0.5, -boundaryLimit - wallThickness / 2);
    wallN.receiveShadow = true;
    wallGroup.add(wallN);

    // Wall South
    const wallSGeom = new THREE.BoxGeometry(groundSize + wallThickness, wallHeight, wallThickness);
    const wallS = new THREE.Mesh(wallSGeom, wallMaterial);
    wallS.position.set(0, wallHeight / 2 - 0.5, boundaryLimit + wallThickness / 2);
    wallS.receiveShadow = true;
    wallGroup.add(wallS);

    // Wall West
    const wallWGeom = new THREE.BoxGeometry(wallThickness, wallHeight, groundSize + wallThickness);
    const wallW = new THREE.Mesh(wallWGeom, wallMaterial);
    wallW.position.set(-boundaryLimit - wallThickness / 2, wallHeight / 2 - 0.5, 0);
    wallW.receiveShadow = true;
    wallGroup.add(wallW);

    // Wall East
    const wallEGeom = new THREE.BoxGeometry(wallThickness, wallHeight, groundSize + wallThickness);
    const wallE = new THREE.Mesh(wallEGeom, wallMaterial);
    wallE.position.set(boundaryLimit + wallThickness / 2, wallHeight / 2 - 0.5, 0);
    wallE.receiveShadow = true;
    wallGroup.add(wallE);

    scene.add(wallGroup);
}


// --- Item State Variables ---
let swordGroup = null;
let swordBox = null;
let isSwordOnGround = false;
let isKirbyHoldingSword = false;
const swordBoundingBoxSize = { x: 0.6, y: 2.5, z: 0.6 };

let rabbitHelmetGroup = null;
let rabbitHelmetBox = null;
let isHelmetOnGround = false;
let isKirbyWearingHelmet = false;
const helmetBoundingBoxSize = { x: 1.5, y: 2.0, z: 1.0 };

const placementAreaSize = groundSize - 5; // Keep items away from the very edge
const minSpawnDist = 3;

// Spawn Sword Function
function spawnSword() {
    if (isSwordOnGround || isKirbyHoldingSword || swordGroup) return;
    swordGroup = createSword();
    let spawnX, spawnZ;
    const maxSpawnDist = placementAreaSize / 2 - 2;
    do {
        spawnX = (Math.random() - 0.5) * placementAreaSize;
        spawnZ = (Math.random() - 0.5) * placementAreaSize;
    } while (Math.sqrt(spawnX * spawnX + spawnZ * spawnZ) < minSpawnDist ||
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

// Spawn Rabbit Helmet Function
function spawnRabbitHelmet() {
    if (isHelmetOnGround || isKirbyWearingHelmet || rabbitHelmetGroup) return;
    rabbitHelmetGroup = createRabbitHelmet();
    let spawnX, spawnZ, tooCloseToSword;
    const maxSpawnDist = placementAreaSize / 2 - 3;
    const minDistBetweenItems = 5;
    do {
        spawnX = (Math.random() - 0.5) * placementAreaSize;
        spawnZ = (Math.random() - 0.5) * placementAreaSize;
        tooCloseToSword = false;
        if (isSwordOnGround && swordGroup) {
            const distSq = (spawnX - swordGroup.position.x) ** 2 + (spawnZ - swordGroup.position.z) ** 2;
            tooCloseToSword = distSq < minDistBetweenItems ** 2;
        }
    } while (Math.sqrt(spawnX * spawnX + spawnZ * spawnZ) < minSpawnDist ||
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

// Spawn Waddle Dee Function
const MAX_WADDLE_DEES = 4;
const WADDLE_DEE_SPEED = 2.0;
const WADDLE_DEE_TURN_SPEED = 0.08;
const activeWaddleDees = [];
const WADDLE_DEE_GROUND_LEVEL = groundLevel - 0.5; // Adjust based on groundLevel
const SPAWN_MARGIN = 5;
const despawnBoundary = boundaryLimit + SPAWN_MARGIN; // Despawn outside ground + margin
const spawnArea = boundaryLimit + SPAWN_MARGIN * 0.5; // Spawn just outside boundary
const MIN_DIR_CHANGE_TIME = 3.0;
const MAX_DIR_CHANGE_TIME = 8.0;
const waddleDeeBoundingBoxSize = { x: 1.4, y: 2.0, z: 1.4 };

function spawnWaddleDee() {
    if (activeWaddleDees.length >= MAX_WADDLE_DEES) return;
    const waddleDeeGroup = createWaddleDee();
    let spawnX, spawnZ;
    const edge = Math.floor(Math.random() * 4);
    const spawnDistFromEdge = boundaryLimit + Math.random() * SPAWN_MARGIN;
    if (edge === 0) { spawnX = spawnDistFromEdge; spawnZ = (Math.random() - 0.5) * groundSize; }
    else if (edge === 1) { spawnX = -spawnDistFromEdge; spawnZ = (Math.random() - 0.5) * groundSize; }
    else if (edge === 2) { spawnX = (Math.random() - 0.5) * groundSize; spawnZ = spawnDistFromEdge; }
    else { spawnX = (Math.random() - 0.5) * groundSize; spawnZ = -spawnDistFromEdge; }

    waddleDeeGroup.position.set(spawnX, WADDLE_DEE_GROUND_LEVEL, spawnZ);
    const initialVelocity = new THREE.Vector3(-spawnX, 0, -spawnZ).normalize(); // Head towards center initially
    waddleDeeGroup.rotation.y = Math.atan2(initialVelocity.x, initialVelocity.z);
    const waddleDeeBox = new THREE.Box3();
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

// 5. Objects (Ground, Kirby, Trees, Items, Waddle Dees)
// ====================================================================
const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x228B22, side: THREE.DoubleSide
});
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.position.y = -0.5; // Keep ground base at -0.5
groundMesh.receiveShadow = true;
scene.add(groundMesh);

createBorderWalls(); // Add the border walls

const kirbyGroup = createSimpleKirby();
const walkCycleSpeed = 15;
const walkCycleAmplitude = 0.2;
const turnSpeedFactor = 0.15;
const kirbyBoundingBoxSize = { x: 1.8, y: 2.4, z: 1.8 };
const treeBoundingBoxes = [];
const physicsGroundLevel = groundLevel; // Kirby's feet Y level when grounded
kirbyGroup.position.set(0, physicsGroundLevel, 0); // Start Kirby at physics ground level
scene.add(kirbyGroup);

const numTrees = 25;
const minimumDistanceToCenter = 5;
const treeCollisionBoxSize = { x: 2.0, y: 4.0, z: 2.0 };

for (let i = 0; i < numTrees; i++) {
    const tree = createTree();
    let x, z, positionValid;
    do {
        x = (Math.random() - 0.5) * placementAreaSize; // Place trees within the inner area
        z = (Math.random() - 0.5) * placementAreaSize;
        const distanceSq = x * x + z * z;
        positionValid = (distanceSq > minimumDistanceToCenter * minimumDistanceToCenter);
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

createSuckParticles(); // Initialize suck particles AFTER kirbyGroup exists

// --- Kirby State Variables ---
const kirbyInitialScale = new THREE.Vector3(1, 1, 1);
let isSucking = false;
const SUCK_RANGE = 4.0;
const SUCK_ANGLE_DEGREES = 35;
const SUCK_ANGLE_COS_THRESHOLD = Math.cos(SUCK_ANGLE_DEGREES * Math.PI / 180);
let didSuckThisAction = false;

// 6. Keyboard Input State & Handling
// ====================================================================
const keys = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
    ' ': false, // Track Space explicitly for jump/fly
    z: false
};

document.addEventListener('keydown', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key; // Handle Space, Arrows, etc.

    if (isFallingOffEdge) return; // Disable input if falling

    if (key === ' ' && !isSucking) {
        if (isGrounded) {
            velocityY = jumpForce;
            isGrounded = false;
            isFlying = false;
        } else if (kirbyGroup.position.y < maxFlightHeight) {
            velocityY = flightBoostForce;
            isFlying = true;
        }
        keys[' '] = true; // Mark space as pressed
    } else if (key === 'z' && !isSucking && isGrounded && !suckedWaddleDeeData) {
        isSucking = true;
        suckTimer = SUCK_DURATION;
        didSuckThisAction = false;
        keys.z = true;
    } else if (keys.hasOwnProperty(key)) {
         if (!isSucking) { // Allow movement input even if flying, but not while sucking
            keys[key] = true;
         }
    }
});

document.addEventListener('keyup', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (keys.hasOwnProperty(key)) {
        keys[key] = false;
    }
});

// 7. Game Loop (Animation)
// ====================================================================
const clock = new THREE.Clock();
const vector3Temp = new THREE.Vector3();

// Collision Check Helper Function
function checkCollision(kirbyPotentialBox, collisionType = 'tree') {
    if (collisionType === 'tree') {
        for (const treeBox of treeBoundingBoxes) {
            if (kirbyPotentialBox.intersectsBox(treeBox)) return true;
        }
    } else if (collisionType === 'waddledee') {
        for (const wdData of activeWaddleDees) {
            // Don't collide with the WD being sucked in
            if (suckedWaddleDeeData && wdData.group === suckedWaddleDeeData.group) continue;
            if (wdData && wdData.bbox && kirbyPotentialBox.intersectsBox(wdData.bbox)) return true;
        }
    }
    return false;
}

// Kirby Bounding Box Calculation
const kirbyBodyCenterOffset = new THREE.Vector3(0, 1.0, 0);
const kirbyRelativeBox = new THREE.Box3(
    new THREE.Vector3(-kirbyBoundingBoxSize.x / 2, -kirbyBoundingBoxSize.y / 2 + kirbyBodyCenterOffset.y, -kirbyBoundingBoxSize.z / 2),
    new THREE.Vector3(kirbyBoundingBoxSize.x / 2, kirbyBoundingBoxSize.y / 2 + kirbyBodyCenterOffset.y, kirbyBoundingBoxSize.z / 2)
);
const currentKirbyBox = new THREE.Box3();

function getKirbyWorldBox(position) {
    currentKirbyBox.copy(kirbyRelativeBox);
    currentKirbyBox.translate(position);
    return currentKirbyBox;
}

// Reusable vectors for calculations
const kirbyForwardDir = new THREE.Vector3();
const vectorToWd = new THREE.Vector3();

// ANIMATE function
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // --- 1. FALLING OFF EDGE STATE ---
    if (isFallingOffEdge) {
        velocityY += fallGravity * deltaTime; // Apply rapid fall gravity
        kirbyGroup.position.y += velocityY * deltaTime;
        // Simple rotation maybe?
        kirbyGroup.rotation.x += 5 * deltaTime;
        kirbyGroup.rotation.z += 3 * deltaTime;

        // Keep rendering while falling
        renderer.render(scene, camera);
        return; // Skip the rest of the game logic
    }

    // --- 2. BOUNDARY CHECK (Check BEFORE movement calculation) ---
    if (!isFallingOffEdge) {
        const kx = kirbyGroup.position.x;
        const kz = kirbyGroup.position.z;
        if (Math.abs(kx) > boundaryLimit || Math.abs(kz) > boundaryLimit) {
            console.log("Kirby fell off the edge!");
            isFallingOffEdge = true;
            isSucking = false; // Stop sucking if falling
            isFlying = false; // Stop flying
            if(suckParticles) suckParticles.visible = false; // Hide suck particles
            // Start the reset timer only once
            if (resetTimerId === null) {
                resetTimerId = setTimeout(() => {
                    console.log("Resetting game...");
                    window.location.reload();
                }, fallResetDelay);
            }
            // No need for further updates in this frame if falling started
             renderer.render(scene, camera);
             return;
        }
    }


    // --- 3. NORMAL GAME LOGIC ---

    // Get Arm References if needed
    if (!leftArmMesh) leftArmMesh = kirbyGroup.userData.leftArmMesh;
    if (!rightArmMesh) rightArmMesh = kirbyGroup.userData.rightArmMesh;

    // Update Kirby's BBox
    getKirbyWorldBox(kirbyGroup.position);
    const mouthMesh = kirbyGroup.userData.mouthMesh;

    // Item Pickup Checks
    if (isSwordOnGround && !isKirbyHoldingSword && swordGroup && swordBox && !isSucking) {
        if (currentKirbyBox.intersectsBox(swordBox)) {
            isSwordOnGround = false;
            isKirbyHoldingSword = true;
            scene.remove(swordGroup);
            kirbyGroup.add(swordGroup);
            swordGroup.position.set(0.8, 0.3, 0.5);
            swordGroup.rotation.set(0, Math.PI / 4, -Math.PI / 2.5);
            swordGroup.scale.set(0.7, 0.7, 0.7);
        }
    }
    if (isHelmetOnGround && !isKirbyWearingHelmet && rabbitHelmetGroup && rabbitHelmetBox && !isSucking) {
        if (currentKirbyBox.intersectsBox(rabbitHelmetBox)) {
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

    // Waddle Dee Suck-In Animation
    if (suckedWaddleDeeData) {
        const wdGroup = suckedWaddleDeeData.group;
        const progress = Math.min((elapsedTime - suckedWaddleDeeData.startTime) / SUCK_IN_DURATION, 1.0);
        suckParticles.getWorldPosition(suckTargetPosition); // Get world pos of particle origin
        wdGroup.position.lerpVectors(suckedWaddleDeeData.startPos, suckTargetPosition, progress);
        wdGroup.scale.lerpVectors(suckedWaddleDeeData.startScale, vector3Temp.set(0.01, 0.01, 0.01), progress);
        if (progress >= 1.0) {
            scene.remove(wdGroup);
            const indexToRemove = activeWaddleDees.findIndex(wd => wd.group === wdGroup);
            if (indexToRemove !== -1) activeWaddleDees.splice(indexToRemove, 1);
            else console.warn("Could not find sucked Waddle Dee in active list to remove.");
            spawnWaddleDee();
            suckedWaddleDeeData = null;
        }
    }

    // Sucking State Update & Animation
    if (isSucking) {
        isFlying = false;
        suckTimer -= deltaTime;
        kirbyGroup.scale.lerp(suckTargetScale, 0.2);
        if (mouthMesh) mouthMesh.scale.lerp(mouthSuckScale, 0.25);
        if (suckParticles) {
            suckParticles.visible = true;
            const positions = suckParticles.geometry.attributes.position.array;
            const kirbyWorldRotation = kirbyGroup.quaternion;
            for (let i = 0; i < NUM_SUCK_PARTICLES; i++) {
                const i3 = i * 3;
                const velocity = suckParticleVelocities[i].clone().applyQuaternion(kirbyWorldRotation);
                positions[i3] += velocity.x * deltaTime;
                positions[i3 + 1] += velocity.y * deltaTime;
                positions[i3 + 2] += velocity.z * deltaTime;
                suckParticleLife[i] += deltaTime;
                const distanceSq = positions[i3] * positions[i3] + positions[i3 + 1] * positions[i3 + 1] + positions[i3 + 2] * positions[i3 + 2];
                if (suckParticleLife[i] > SUCK_PARTICLE_LIFETIME || distanceSq > SUCK_PARTICLE_LIFETIME * SUCK_PARTICLE_SPEED * 0.8) {
                    positions[i3] = (Math.random() - 0.5) * SUCK_PARTICLE_SPREAD * 0.1;
                    positions[i3 + 1] = (Math.random() - 0.5) * SUCK_PARTICLE_SPREAD * 0.1;
                    positions[i3 + 2] = Math.random() * 0.1;
                    suckParticleLife[i] = 0;
                    suckParticleVelocities[i].set(
                        (Math.random() - 0.5) * SUCK_PARTICLE_SPREAD * 0.5,
                        (Math.random() - 0.5) * SUCK_PARTICLE_SPREAD * 0.5,
                        SUCK_PARTICLE_SPEED * (0.8 + Math.random() * 0.4)
                    );
                }
            }
            suckParticles.geometry.attributes.position.needsUpdate = true;
        }
        // Waddle Dee Suck Targeting
        if (!didSuckThisAction && !suckedWaddleDeeData) {
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
                        suckedWaddleDeeData = {
                            group: wdData.group, startTime: elapsedTime,
                            startPos: wdData.group.position.clone(), startScale: wdData.group.scale.clone()
                        };
                        didSuckThisAction = true;
                        break;
                    }
                }
            }
        }
        // End suck timer
        if (suckTimer <= 0 && !suckedWaddleDeeData) {
            isSucking = false;
            if (suckParticles) suckParticles.visible = false;
        }
    } else { // --- If NOT Sucking ---
        // Return Kirby scale to normal
        if (!kirbyGroup.scale.equals(kirbyInitialScale) && !isFlying) { // Don't shrink if flying
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
         if (suckParticles && suckParticles.visible) {
             suckParticles.visible = false;
         }
    }

    // Horizontal Movement
    let isMovingHorizontally = false;
    let targetAngleY = kirbyGroup.rotation.y;
    const moveSpeedBase = 5.0;
    let currentMoveSpeed = moveSpeedBase;

    if (!isSucking && !suckedWaddleDeeData) { // Allow movement if not sucking/animating suck
        if (isFlying || (!isGrounded && velocityY < 0)) {
            currentMoveSpeed *= (1.0 - flightHorizontalDrag * deltaTime); // Apply flight drag
        }
        const moveDeltaFactor = currentMoveSpeed * deltaTime;
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
            const moveDelta = moveDirection.clone().multiplyScalar(moveDeltaFactor); // Use factor here

            // Simplified Collision check (move axis by axis)
            let potentialPosX = currentPos.clone().add(new THREE.Vector3(moveDelta.x, 0, 0));
            let kirbyPotentialBoxX = getKirbyWorldBox(potentialPosX);
            let collisionX = checkCollision(kirbyPotentialBoxX, 'tree') || checkCollision(kirbyPotentialBoxX, 'waddledee');

            let potentialPosZ = currentPos.clone().add(new THREE.Vector3(0, 0, moveDelta.z));
            let kirbyPotentialBoxZ = getKirbyWorldBox(potentialPosZ);
            let collisionZ = checkCollision(kirbyPotentialBoxZ, 'tree') || checkCollision(kirbyPotentialBoxZ, 'waddledee');

            if (!collisionX) kirbyGroup.position.x += moveDelta.x;
            if (!collisionZ) kirbyGroup.position.z += moveDelta.z;

            // Smooth Rotation
            let currentAngleY = kirbyGroup.rotation.y;
            let angleDifference = targetAngleY - currentAngleY;
            while (angleDifference < -Math.PI) angleDifference += Math.PI * 2;
            while (angleDifference > Math.PI) angleDifference -= Math.PI * 2;
            kirbyGroup.rotation.y += angleDifference * turnSpeedFactor;
        }
    }

    // Vertical Movement (Physics)
    if (!isGrounded) {
        velocityY += gravity * deltaTime;
        if (isFlying && velocityY < flightMaxFallSpeed) {
            velocityY = flightMaxFallSpeed; // Limit puff-fall speed
        }
        if (isFlying && kirbyGroup.position.y >= maxFlightHeight && velocityY > 0) {
            velocityY = 0; // Hit flight ceiling
        }
        // Stomp Check
        if (velocityY < -1.0) { // Only check stomp when falling reasonably fast
            getKirbyWorldBox(kirbyGroup.position); // Update box before stomp check
            for (let i = activeWaddleDees.length - 1; i >= 0; i--) {
                const wdData = activeWaddleDees[i];
                if (suckedWaddleDeeData && wdData.group === suckedWaddleDeeData.group) continue; // Don't stomp sucked WD
                if (wdData && wdData.bbox && currentKirbyBox.intersectsBox(wdData.bbox)) {
                    scene.remove(wdData.group);
                    activeWaddleDees.splice(i, 1);
                    spawnWaddleDee();
                    velocityY = jumpForce * 0.6; // Bounce after stomp
                    isFlying = false; // Stomping cancels flight
                    break;
                }
            }
        }
    }

    let potentialPosY = kirbyGroup.position.y + velocityY * deltaTime;

    // Ground Collision
    if (potentialPosY <= physicsGroundLevel) {
        kirbyGroup.position.y = physicsGroundLevel;
        velocityY = 0;
        isGrounded = true;
        isFlying = false; // Stop flying when landed
    } else {
        kirbyGroup.position.y = potentialPosY;
        isGrounded = false;
    }

    // Kirby Death Check (Touch Waddle Dee when not stomping/sucking)
    if (!isSucking && !suckedWaddleDeeData && velocityY >= -1.0) { // Check if not falling fast (not stomping)
        getKirbyWorldBox(kirbyGroup.position); // Update box after final position update
        for (const wdData of activeWaddleDees) {
            if (suckedWaddleDeeData && wdData.group === suckedWaddleDeeData.group) continue; // Skip sucked WD
            if (wdData && wdData.bbox && currentKirbyBox.intersectsBox(wdData.bbox)) {
                console.log("GAME OVER: Kirby touched a Waddle Dee!");
                 isFallingOffEdge = true; // Use the falling state for visual
                 if (resetTimerId === null) {
                     resetTimerId = setTimeout(() => window.location.reload(), fallResetDelay);
                 }
                 renderer.render(scene, camera);
                 return; // Exit loop
            }
        }
    }

    // Kirby Scale Animation (Puffing up)
    let targetScale = kirbyInitialScale;
    if (isSucking) {
        targetScale = suckTargetScale;
    } else if (isFlying || (!isGrounded && velocityY < flightBoostForce * 0.5 && velocityY >= flightMaxFallSpeed)) { // Puff up if flying OR falling gently
        targetScale = flightScale;
    }

    if (!kirbyGroup.scale.equals(targetScale)) {
        kirbyGroup.scale.lerp(targetScale, 0.15);
         if (kirbyGroup.scale.distanceToSquared(targetScale) < 0.0001) {
             kirbyGroup.scale.copy(targetScale);
         }
    }

    // Walk Animation (Waddle)
    let targetRotationZ = 0;
    if (isMovingHorizontally && isGrounded && !isSucking && !suckedWaddleDeeData) {
        targetRotationZ = Math.sin(elapsedTime * walkCycleSpeed) * walkCycleAmplitude;
    }
    let currentWaddleLerp = (isKirbyHoldingSword || isKirbyWearingHelmet) ? 0.03 : 0.1;
    kirbyGroup.rotation.z = THREE.MathUtils.lerp(kirbyGroup.rotation.z, targetRotationZ, currentWaddleLerp);

    // Arm Flapping Animation
    if (leftArmMesh && rightArmMesh) {
        if (isFlying) {
            const flapAngle = Math.sin(elapsedTime * armFlapSpeed) * armFlapAmplitude;
            const flapQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), flapAngle);
            leftArmMesh.quaternion.copy(defaultArmRotation).multiply(flapQuaternion);
            const flapQuaternionRight = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -flapAngle);
            rightArmMesh.quaternion.copy(defaultArmRotation).multiply(flapQuaternionRight);
        } else {
            const lerpFactor = 0.15;
            leftArmMesh.quaternion.slerp(defaultArmRotation, lerpFactor);
            rightArmMesh.quaternion.slerp(defaultArmRotation, lerpFactor);
        }
    }

    // Update Waddle Dees
    for (let i = activeWaddleDees.length - 1; i >= 0; i--) {
        const wd = activeWaddleDees[i];
        if (!wd || !wd.group || !wd.velocity || !wd.bbox) continue;
        if (suckedWaddleDeeData && wd.group === suckedWaddleDeeData.group) continue; // Skip update for sucked WD

        const group = wd.group;
        const velocity = wd.velocity;

        // Direction Change Logic
        wd.changeDirTimer -= deltaTime;
        if (wd.changeDirTimer <= 0) {
             let newVelX, newVelZ;
             // Prevent immediate reversal (optional, but makes movement less erratic)
             do {
                 newVelX = Math.random() - 0.5;
                 newVelZ = Math.random() - 0.5;
             } while (Math.sign(newVelX) === -Math.sign(velocity.x) && Math.sign(newVelZ) === -Math.sign(velocity.z) && Math.random() < 0.7); // 70% chance to avoid exact reversal

            velocity.set(newVelX, 0, newVelZ).normalize();
            wd.changeDirTimer = MIN_DIR_CHANGE_TIME + Math.random() * (MAX_DIR_CHANGE_TIME - MIN_DIR_CHANGE_TIME);
        }

        // --- Waddle Dee Collision Avoidance (Simple) ---
        let adjustedVelocity = velocity.clone();
        let pushForce = new THREE.Vector3();
        let avoiding = false;

        // Avoid Trees
        for(const treeBox of treeBoundingBoxes) {
            if(wd.bbox.intersectsBox(treeBox)) {
                pushForce.subVectors(group.position, treeBox.getCenter(vector3Temp)).setY(0).normalize();
                adjustedVelocity.add(pushForce.multiplyScalar(0.5)); // Push away slightly
                avoiding = true;
            }
        }
        // Avoid Other Waddle Dees
        for (let j = 0; j < activeWaddleDees.length; j++) {
            if (i === j) continue; // Don't check self
            const otherWd = activeWaddleDees[j];
             if (suckedWaddleDeeData && otherWd.group === suckedWaddleDeeData.group) continue; // Skip sucked WD
            if (wd.bbox.intersectsBox(otherWd.bbox)) {
                 pushForce.subVectors(group.position, otherWd.group.position).setY(0).normalize();
                 adjustedVelocity.add(pushForce.multiplyScalar(0.3)); // Push away less strongly
                 avoiding = true;
            }
        }

        if(avoiding) {
            adjustedVelocity.normalize();
            // Optional: Briefly override random direction change if avoiding
             // wd.changeDirTimer = 0.5; // Force new direction soon after avoidance
        }


        // Apply final velocity
        group.position.addScaledVector(adjustedVelocity, WADDLE_DEE_SPEED * deltaTime);

        // Rotation
        const targetAngleY_wd = Math.atan2(adjustedVelocity.x, adjustedVelocity.z); // Use adjusted velocity for rotation
        let currentAngleY_wd = group.rotation.y;
        let angleDifference_wd = targetAngleY_wd - currentAngleY_wd;
        while (angleDifference_wd < -Math.PI) angleDifference_wd += Math.PI * 2;
        while (angleDifference_wd > Math.PI) angleDifference_wd -= Math.PI * 2;
        group.rotation.y += angleDifference_wd * WADDLE_DEE_TURN_SPEED;

        // Ground Clamp
        group.position.y = WADDLE_DEE_GROUND_LEVEL;

        // Update Bounding Box
        const wdBox = wd.bbox;
        const wdSize = waddleDeeBoundingBoxSize;
        const wdScale = group.scale.x;
        const min = vector3Temp.set(-wdSize.x / 2 * wdScale, 0, -wdSize.z / 2 * wdScale);
        const max = new THREE.Vector3(wdSize.x / 2 * wdScale, wdSize.y * wdScale, wdSize.z / 2 * wdScale);
        min.add(group.position);
        max.add(group.position);
        wdBox.set(min, max);

        // Check Despawn Boundaries
        if (Math.abs(group.position.x) > despawnBoundary || Math.abs(group.position.z) > despawnBoundary) {
            scene.remove(group);
            activeWaddleDees.splice(i, 1);
            spawnWaddleDee();
        }
    }

    // Rendering
    renderer.render(scene, camera);
}

// Start the loop
animate();

console.log("Three.js Kirby setup complete! Added Border, Falling, Sword, Helmet, Suck (Z), and Flight (Space mid-air).");