import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import * as Config from './config.js';
import { checkCollision } from './utils.js';
import { wallBoundingBoxes, treeBoundingBoxes } from './environment.js'; // Import tree boxes too
import { scene } from './sceneSetup.js';
import { activeWaddleDees, startWaddleDeeSuck, spawnWaddleDee } from './waddledee.js'; // Import Waddle Dee functions

// Kirby state variables
export let kirbyGroup;
let kirbyMesh;
let leftHand, rightHand;
let kirbyVelocity = new THREE.Vector3();
let isJumping = false;
let isFloating = false;
let canDoubleJump = false;
let isInhaling = false;
let inhaleTimer = 0;
let inhaledObject = null;
let currentPower = null;
let helmetMesh = null;
let swordMesh = null;
let isDead = false; // Game Over state flag
let isFlying = false; // NEW: Track flight state specifically
let kirbyBBHelper = null; // Variable para el helper

// Animation variables
const walkCycleSpeed = 15;
const walkCycleAmplitude = 0.2;
const armFlapSpeed = 25;
const armFlapAmplitude = Math.PI / 3;
const defaultArmRotation = new THREE.Quaternion();
const kirbyInitialScale = new THREE.Vector3(1, 1, 1); // Store initial scale

// Bounding Box
let kirbyBoundingBox = new THREE.Box3();

// Inhale Particles & State
const NUM_SUCK_PARTICLES = 50;
const suckParticlePositions = new Float32Array(NUM_SUCK_PARTICLES * 3);
const suckParticleVelocities = [];
const suckParticleLife = new Float32Array(NUM_SUCK_PARTICLES);
const SUCK_PARTICLE_SPEED = 8.0;
const SUCK_PARTICLE_SPREAD = 0.8;
const SUCK_PARTICLE_LIFETIME = 0.5;
let suckParticles = null;
let suckedWaddleDeeData = null; // Stores { waddleDee, startTime } for animation
const SUCK_IN_DURATION = 0.35; // Duration of WD flying into mouth
const SUCK_ANGLE_COS_THRESHOLD = Math.cos(Config.KIRBY_INHALE_ANGLE_DEG * Math.PI / 180);
const kirbyForwardDir = new THREE.Vector3(); // Reusable vector for inhale check
const vectorToTarget = new THREE.Vector3(); // Reusable vector for inhale check
const suckTargetOffset = new THREE.Vector3(0, 0, Config.KIRBY_SIZE * 0.5); // Point in front of Kirby for particles/target

// Camera-relative movement variables
const cameraForward = new THREE.Vector3();
const cameraRight = new THREE.Vector3();
const moveDirection = new THREE.Vector3(); // Keep this for final direction

// --- Initialize Kirby (Add Particle System) ---
export function initializeKirby(scene) {
    kirbyGroup = new THREE.Group();

    // Main Body
    const bodyGeometry = new THREE.SphereGeometry(Config.KIRBY_SIZE / 2, 32, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: Config.KIRBY_COLOR });
    kirbyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    kirbyMesh.castShadow = true;
    kirbyMesh.receiveShadow = true;
    kirbyGroup.add(kirbyMesh);

    // Feet
    const feetSize = Config.KIRBY_SIZE * 0.3;
    const feetGeometry = new THREE.SphereGeometry(feetSize / 2, 16, 8);
    const feetMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });

    const leftFoot = new THREE.Mesh(feetGeometry, feetMaterial);
    leftFoot.position.set(-Config.KIRBY_SIZE * 0.25, -Config.KIRBY_SIZE * 0.4, Config.KIRBY_SIZE * 0.1);
    leftFoot.castShadow = true;
    kirbyGroup.add(leftFoot);

    const rightFoot = new THREE.Mesh(feetGeometry, feetMaterial);
    rightFoot.position.set(Config.KIRBY_SIZE * 0.25, -Config.KIRBY_SIZE * 0.4, Config.KIRBY_SIZE * 0.1);
    rightFoot.castShadow = true;
    kirbyGroup.add(rightFoot);

    // Hands
    const handSize = Config.KIRBY_SIZE * 0.25;
    const handGeometry = new THREE.SphereGeometry(handSize / 2, 16, 8);
    const handMaterial = new THREE.MeshStandardMaterial({ color: Config.KIRBY_COLOR });

    leftHand = new THREE.Mesh(handGeometry, handMaterial);
    leftHand.position.set(-Config.KIRBY_SIZE * 0.5, -Config.KIRBY_SIZE * 0.1, Config.KIRBY_SIZE * 0.1);
    leftHand.castShadow = true;
    kirbyGroup.add(leftHand);

    rightHand = new THREE.Mesh(handGeometry, handMaterial);
    rightHand.position.set(Config.KIRBY_SIZE * 0.5, -Config.KIRBY_SIZE * 0.1, Config.KIRBY_SIZE * 0.1);
    rightHand.castShadow = true;
    kirbyGroup.add(rightHand);

    defaultArmRotation.copy(leftHand.quaternion);

    // Eyes
    const eyeSize = Config.KIRBY_SIZE * 0.1;
    const eyeGeometry = new THREE.SphereGeometry(eyeSize / 2, 16, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-Config.KIRBY_SIZE * 0.15, Config.KIRBY_SIZE * 0.1, Config.KIRBY_SIZE * 0.45);
    leftEye.scale.set(0.8, 1.2, 0.8);
    kirbyGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(Config.KIRBY_SIZE * 0.15, Config.KIRBY_SIZE * 0.1, Config.KIRBY_SIZE * 0.45);
    rightEye.scale.set(0.8, 1.2, 0.8);
    kirbyGroup.add(rightEye);

    // Cheeks
    const cheekSize = Config.KIRBY_SIZE * 0.08;
    const cheekGeometry = new THREE.SphereGeometry(cheekSize / 2, 16, 8);
    const cheekMaterial = new THREE.MeshStandardMaterial({ color: 0xff80ab });

    const leftCheek = new THREE.Mesh(cheekGeometry, cheekMaterial);
    leftCheek.position.set(-Config.KIRBY_SIZE * 0.3, -Config.KIRBY_SIZE * 0.05, Config.KIRBY_SIZE * 0.4);
    leftCheek.scale.set(1.5, 1, 1);
    kirbyGroup.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeometry, cheekMaterial);
    rightCheek.position.set(Config.KIRBY_SIZE * 0.3, -Config.KIRBY_SIZE * 0.05, Config.KIRBY_SIZE * 0.4);
    rightCheek.scale.set(1.5, 1, 1);
    kirbyGroup.add(rightCheek);

    // Mouth
    const mouthSize = Config.KIRBY_SIZE * 0.05;
    const mouthGeometry = new THREE.SphereGeometry(mouthSize / 2, 8, 8);
    const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x400000 });

    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, -Config.KIRBY_SIZE * 0.15, Config.KIRBY_SIZE * 0.48);
    mouth.scale.set(2, 1, 1);
    kirbyGroup.add(mouth);

    // --- Create Inhale Particle System ---
    createSuckParticles();

    kirbyGroup.position.set(0, Config.GROUND_Y + Config.KIRBY_SIZE / 2 + 1, 0);
    scene.add(kirbyGroup);

    // *** Create and add Bounding Box Helper TRACKING kirbyGroup ***
    kirbyBBHelper = new THREE.BoxHelper(kirbyGroup, 0xffff00); // Yellow helper, tracks kirbyGroup
    kirbyBBHelper.visible = true; // Make it visible for debugging
    scene.add(kirbyBBHelper); // Add helper to the main scene

    console.log("Kirby initialized with details, particles, and BB helper.");
}

// --- Create Suck Particles Function ---
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
    suckParticles.position.copy(suckTargetOffset);
    kirbyGroup.add(suckParticles);
}

// --- Update Kirby Bounding Box ---
function updateKirbyBoundingBox() {
    if (!kirbyGroup) return; // Only need to check for group now

    try {
        // Calculate the world bounding box based on the ENTIRE group
        kirbyGroup.updateMatrixWorld(true); // Ensure world matrix is up-to-date
        kirbyBoundingBox.setFromObject(kirbyGroup, true); // Get world box from the entire group

        if (isNaN(kirbyBoundingBox.min.x) || !isFinite(kirbyBoundingBox.min.x)) {
             console.error("Kirby bounding box calculation resulted in invalid values.");
             // Reset to a default small box at origin to prevent further errors
             kirbyBoundingBox.makeEmpty();
             return;
        }

    } catch (error) {
        console.error("Error calculating Kirby bounding box:", error);
        // Reset to a default small box at origin
        kirbyBoundingBox.makeEmpty();
        return;
    }
}

// --- Main Update Function ---
// *** ADD camera PARAMETER ***
export function updateKirby(deltaTime, elapsedTime, keys, groundMesh, camera) {
    // *** ADD LOGGING AT THE START ***
    console.log(`updateKirby called. DeltaTime: ${deltaTime.toFixed(4)}, Camera valid: ${!!camera}`);
    if (!kirbyGroup || isDead || !camera) {
        console.log("updateKirby exiting early."); // Log if exiting early
        return;
    }

    // --- Drop Power Input ---
    if (keys.KeyC && currentPower) {
        console.log("Throwing power:", currentPower);
        removePower(true); // Call removePower with shouldThrow = true
        keys.KeyC = false; // Consume the key press
    }

    // --- Waddle Dee Suck-In Animation ---
    if (suckedWaddleDeeData) {
        const wd = suckedWaddleDeeData.waddleDee;
        if (!wd || !wd.mesh || wd.isInhaled) {
            suckedWaddleDeeData = null;
        } else {
            const progress = Math.min((elapsedTime - suckedWaddleDeeData.startTime) / SUCK_IN_DURATION, 1.0);
            const targetWorldPos = suckParticles.getWorldPosition(new THREE.Vector3());

            wd.mesh.position.lerpVectors(wd.startPos, targetWorldPos, progress);
            wd.mesh.scale.lerpVectors(wd.startScale, new THREE.Vector3(0.01, 0.01, 0.01), progress);

            if (progress >= 1.0) {
                console.log("Waddle Dee suck animation complete.");
                wd.isInhaled = true;
                wd.isBeingSucked = false;
                scene.remove(wd.mesh);
                inhaledObject = 'waddledee';
                suckedWaddleDeeData = null;
            }
        }
    }

    // --- Movement Input & Direction (Camera Relative) ---
    moveDirection.set(0, 0, 0);
    let isMovingHorizontally = false;
    let targetRotation = kirbyGroup.rotation.y;
    let currentMoveSpeed = Config.KIRBY_SPEED;

    if (!isInhaling && !suckedWaddleDeeData) {
        // Get camera direction projected onto the ground plane
        camera.getWorldDirection(cameraForward);
        cameraForward.y = 0; // Ignore vertical component
        cameraForward.normalize();

        // Calculate the right vector based on the camera forward vector
        cameraRight.crossVectors(cameraForward, camera.up).normalize(); // Use camera.up for correct right vector
        
        // Calculate movement based on camera orientation
        if (keys.ArrowUp) moveDirection.add(cameraForward);
        if (keys.ArrowDown) moveDirection.sub(cameraForward);
        if (keys.ArrowLeft) moveDirection.sub(cameraRight);
        if (keys.ArrowRight) moveDirection.add(cameraRight);

        isMovingHorizontally = moveDirection.lengthSq() > 0;

        // *** Apply flight drag if flying ***
        if (isFlying) {
            currentMoveSpeed *= (1.0 - Config.KIRBY_FLIGHT_HORIZONTAL_DRAG * deltaTime);
        }

        if (isMovingHorizontally) {
            moveDirection.normalize();
            targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
            kirbyVelocity.x = moveDirection.x * currentMoveSpeed;
            kirbyVelocity.z = moveDirection.z * currentMoveSpeed;
            // *** ADD LOGGING FOR VELOCITY ***
            console.log(`Moving: Velocity set to X: ${kirbyVelocity.x.toFixed(2)}, Z: ${kirbyVelocity.z.toFixed(2)}`);
        } else {
            // Apply slight damping
            kirbyVelocity.x *= (1.0 - deltaTime * 5.0);
            kirbyVelocity.z *= (1.0 - deltaTime * 5.0);
            if (Math.abs(kirbyVelocity.x) < 0.1 && Math.abs(kirbyVelocity.z) < 0.1 && (kirbyVelocity.x !== 0 || kirbyVelocity.z !== 0)) {
                 // *** ADD LOGGING FOR DAMPING STOP ***
                 console.log("Damping stopped horizontal velocity.");
                 kirbyVelocity.x = 0;
                 kirbyVelocity.z = 0;
            }
        }
    } else {
        // *** ADD LOGGING IF MOVEMENT IS BLOCKED BY STATE ***
        if (isInhaling) console.log("Movement blocked: Inhaling");
        if (suckedWaddleDeeData) console.log("Movement blocked: Sucking WD");
        kirbyVelocity.x = 0;
        kirbyVelocity.z = 0;
        isMovingHorizontally = false;
    }

    // Smooth Rotation
    let currentAngleY = kirbyGroup.rotation.y;
    let angleDifference = targetRotation - currentAngleY;
    while (angleDifference < -Math.PI) angleDifference += Math.PI * 2;
    while (angleDifference > Math.PI) angleDifference -= Math.PI * 2;
    if (isMovingHorizontally || Math.abs(angleDifference) > 0.01) {
         kirbyGroup.rotation.y += angleDifference * 0.15;
    }

    // --- Jumping & Flight (Replaces old Jump/Float) ---
    const isGrounded = kirbyGroup.position.y <= Config.GROUND_Y + Config.KIRBY_SIZE / 2 + 0.01;

    if (keys.Space && !isInhaling && !suckedWaddleDeeData) {
        if (isGrounded) {
            kirbyVelocity.y = Config.KIRBY_JUMP_VELOCITY;
            isJumping = true;
            isFlying = false;
            canDoubleJump = true;
        } else if (canDoubleJump && kirbyGroup.position.y < Config.KIRBY_MAX_FLIGHT_HEIGHT) {
            kirbyVelocity.y = Config.KIRBY_FLIGHT_BOOST;
            isFlying = true;
            isJumping = false;
        }
        keys.Space = false;
    }

    // --- Apply Gravity ---
    if (isFlying) {
        kirbyVelocity.y += Config.GRAVITY * Config.KIRBY_FLOAT_GRAVITY_SCALE * deltaTime;
        kirbyVelocity.y = Math.max(kirbyVelocity.y, -Config.KIRBY_FLOAT_SPEED);
        if (kirbyGroup.position.y >= Config.KIRBY_MAX_FLIGHT_HEIGHT && kirbyVelocity.y > 0) {
            kirbyVelocity.y = 0;
        }
    } else if (!isGrounded) {
        kirbyVelocity.y += Config.GRAVITY * deltaTime;
        isJumping = true;
    } else {
        kirbyVelocity.y = Math.max(0, kirbyVelocity.y);
        if (isJumping || isFlying) {
            isJumping = false;
            isFlying = false;
            canDoubleJump = false;
        }
    }

    // --- Inhaling ---
    if (keys.KeyX && !isInhaling && !currentPower && !suckedWaddleDeeData && isGrounded) {
        isInhaling = true;
        inhaleTimer = Config.KIRBY_INHALE_DURATION;
        suckedWaddleDeeData = null;
        isFlying = false;
        isJumping = false;
        console.log("Kirby starts inhaling...");
    }

    if (isInhaling) {
        inhaleTimer -= deltaTime;
        if (suckParticles) suckParticles.visible = true;

        if (suckParticles) {
            const positions = suckParticles.geometry.attributes.position.array;
            const worldRotation = kirbyGroup.quaternion;
            for (let i = 0; i < NUM_SUCK_PARTICLES; i++) {
                const i3 = i * 3;
                const localVelocity = suckParticleVelocities[i];
                const worldVelocity = localVelocity.clone().applyQuaternion(worldRotation);

                positions[i3] += worldVelocity.x * deltaTime;
                positions[i3 + 1] += worldVelocity.y * deltaTime;
                positions[i3 + 2] += worldVelocity.z * deltaTime;
                suckParticleLife[i] += deltaTime;

                const distSq = positions[i3]**2 + positions[i3+1]**2 + positions[i3+2]**2;
                if (suckParticleLife[i] > SUCK_PARTICLE_LIFETIME || distSq > (SUCK_PARTICLE_LIFETIME * SUCK_PARTICLE_SPEED)**2 * 1.5) {
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

        if (!suckedWaddleDeeData) {
            kirbyGroup.getWorldDirection(kirbyForwardDir);

            activeWaddleDees.forEach(waddleDee => {
                if (waddleDee.mesh && !waddleDee.isInhaled && !waddleDee.isBeingSucked) {
                    vectorToTarget.subVectors(waddleDee.mesh.position, kirbyGroup.position);
                    const distance = vectorToTarget.length();

                    if (distance < Config.KIRBY_INHALE_RANGE && distance > 0.1) {
                        vectorToTarget.normalize();
                        const dotProduct = kirbyForwardDir.dot(vectorToTarget);

                        if (dotProduct > SUCK_ANGLE_COS_THRESHOLD) {
                            console.log("Kirby targets a Waddle Dee!");
                            suckedWaddleDeeData = { waddleDee: waddleDee, startTime: elapsedTime };
                            startWaddleDeeSuck(waddleDee, suckParticles.position, elapsedTime);
                            isInhaling = false;
                            inhaleTimer = 0;
                            if (suckParticles) suckParticles.visible = false;
                            return;
                        }
                    }
                }
            });
        }

        if (inhaleTimer <= 0 && !suckedWaddleDeeData) {
            isInhaling = false;
            if (suckParticles) suckParticles.visible = false;
            console.log("Kirby stops inhaling (timeout).");
        }
    } else {
        if (suckParticles && suckParticles.visible) {
            suckParticles.visible = false;
        }
    }

    // --- Using Power ---
    if (keys.KeyX && currentPower === 'sword' && !isInhaling && !suckedWaddleDeeData) {
        console.log("Kirby uses Sword Attack!");
        if (swordMesh) {
            console.log("  (Sword attack animation placeholder)");
        }
        keys.KeyX = false;
    }

    // --- Update Position ---
    const deltaPosition = kirbyVelocity.clone().multiplyScalar(deltaTime);
    const targetPosition = kirbyGroup.position.clone().add(deltaPosition);
    // *** ADD LOGGING FOR POSITION CHANGE ATTEMPT ***
    console.log(`Attempting position change: dX: ${deltaPosition.x.toFixed(3)}, dY: ${deltaPosition.y.toFixed(3)}, dZ: ${deltaPosition.z.toFixed(3)}`);

    // --- Collision Detection & Resolution ---
    updateKirbyBoundingBox();

    if (targetPosition.y < Config.GROUND_Y + Config.KIRBY_SIZE / 2) {
        targetPosition.y = Config.GROUND_Y + Config.KIRBY_SIZE / 2;
        kirbyVelocity.y = 0;
        if (isJumping || isFlying) {
            isJumping = false;
            isFlying = false;
            canDoubleJump = false;
        }
    }

    const futureBoundingBox = kirbyBoundingBox.clone().translate(deltaPosition);
    let collisionX = false;
    let collisionZ = false;
    const allObstacles = [...wallBoundingBoxes, ...treeBoundingBoxes];

    allObstacles.forEach((obstacleBox, index) => {
        if (futureBoundingBox.intersectsBox(obstacleBox)) {
            const xOnlyBox = kirbyBoundingBox.clone().translate(new THREE.Vector3(deltaPosition.x, 0, 0));
            if (xOnlyBox.intersectsBox(obstacleBox)) {
                 collisionX = true;
            }
            const zOnlyBox = kirbyBoundingBox.clone().translate(new THREE.Vector3(0, 0, deltaPosition.z));
            if (zOnlyBox.intersectsBox(obstacleBox)) {
                 collisionZ = true;
            }
        }
    });

    // *** ADD LOGGING FOR COLLISION RESULTS ***
    console.log(`Collision check results: collisionX=${collisionX}, collisionZ=${collisionZ}`);

    // Apply position changes based on collision flags
    const originalPosition = kirbyGroup.position.clone(); // Store position before applying changes
    if (!collisionX) kirbyGroup.position.x = targetPosition.x; else kirbyVelocity.x = 0;
    if (!collisionZ) kirbyGroup.position.z = targetPosition.z; else kirbyVelocity.z = 0;
    kirbyGroup.position.y = targetPosition.y;

    // *** ADD LOGGING FOR FINAL POSITION ***
    console.log(`Position updated: Old(${originalPosition.x.toFixed(2)}, ${originalPosition.z.toFixed(2)}) -> New(${kirbyGroup.position.x.toFixed(2)}, ${kirbyGroup.position.z.toFixed(2)})`);

    // *** Update Bounding Box AFTER final position update for interactions ***
    updateKirbyBoundingBox();

    // --- Stomp Check ---
    const isStomping = kirbyVelocity.y < -Config.KIRBY_JUMP_VELOCITY * 0.5 && !isFlying;

    if (isStomping) {
        activeWaddleDees.forEach((waddleDee, index) => {
            if (waddleDee.mesh && !waddleDee.isInhaled && !waddleDee.isBeingSucked) {
                if (kirbyBoundingBox.intersectsBox(waddleDee.boundingBox)) {
                    console.log("Kirby stomped a Waddle Dee!");
                    scene.remove(waddleDee.mesh);
                    if (waddleDee.helper) scene.remove(waddleDee.helper);
                    activeWaddleDees.splice(index, 1);
                    spawnWaddleDee(scene, groundMesh);
                    kirbyVelocity.y = Config.KIRBY_JUMP_VELOCITY * Config.STOMP_BOUNCE_FACTOR;
                    isJumping = true;
                    canDoubleJump = true;
                    isFlying = false;
                    return;
                }
            }
        });
    } else if (!isInhaling && !suckedWaddleDeeData && !isStomping) {
        activeWaddleDees.forEach((waddleDee) => {
            if (waddleDee.mesh && !waddleDee.isInhaled && !waddleDee.isBeingSucked) {
                if (kirbyBoundingBox.intersectsBox(waddleDee.boundingBox)) {
                    console.error("GAME OVER: Kirby touched a Waddle Dee!");
                    isDead = true;
                    alert("Game Over! Kirby touched a Waddle Dee.");
                    window.location.reload();
                    return;
                }
            }
        });
    }

    let targetScale = kirbyInitialScale;
    if (isInhaling) {
        targetScale = Config.KIRBY_INHALE_SCALE;
    } else if (isFlying) {
        targetScale = Config.KIRBY_PUFF_SCALE;
    }
    if (!kirbyGroup.scale.equals(targetScale)) {
        kirbyGroup.scale.lerp(targetScale, 0.15);
        if (kirbyGroup.scale.distanceToSquared(targetScale) < 0.0001) {
            kirbyGroup.scale.copy(targetScale);
        }
    }

    let targetRotationZ = 0;
    if (isMovingHorizontally && isGrounded && !isInhaling && !suckedWaddleDeeData) {
        targetRotationZ = Math.sin(elapsedTime * walkCycleSpeed) * walkCycleAmplitude;
    }
    kirbyGroup.rotation.z = THREE.MathUtils.lerp(kirbyGroup.rotation.z, targetRotationZ, 0.1);

    if (leftHand && rightHand) {
        if (isFlying && kirbyVelocity.y >= -Config.KIRBY_FLOAT_SPEED * 0.5) {
            const flapAngle = Math.sin(elapsedTime * armFlapSpeed) * armFlapAmplitude;
            const flapQuaternionLeft = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), flapAngle);
            leftHand.quaternion.copy(defaultArmRotation).multiply(flapQuaternionLeft);

            const flapQuaternionRight = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -flapAngle);
            rightHand.quaternion.copy(defaultArmRotation).multiply(flapQuaternionRight);
        } else {
            const lerpFactor = 0.15;
            leftHand.quaternion.slerp(defaultArmRotation, lerpFactor);
            rightHand.quaternion.slerp(defaultArmRotation, lerpFactor);
        }
    }

    if (kirbyBBHelper) {
        kirbyBBHelper.update();
    }
}

// --- Helper to get Kirby's Box at a specific position (used for stomp check) ---
function getKirbyWorldBox(position) {
    const tempBox = new THREE.Box3();
    tempBox.setFromObject(kirbyMesh);
    tempBox.applyMatrix4(new THREE.Matrix4().makeTranslation(position.x, position.y, position.z));
    return tempBox;
}

// --- Give Power ---
export function givePower(powerName, itemMesh) {
    if (currentPower) {
        console.log("Kirby already has a power, cannot pick up", powerName);
        return false;
    }
    if (!itemMesh) {
        console.error("givePower called with invalid itemMesh for", powerName);
        return false;
    }

    removePower();

    currentPower = powerName;
    console.log(`Kirby gained ${powerName} power!`);

    if (powerName === 'sword') {
        const helmetGeometry = new THREE.ConeGeometry(Config.HELMET_SIZE * 0.8, Config.HELMET_SIZE * 1.2, 4);
        const helmetMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        helmetMesh = new THREE.Mesh(helmetGeometry, helmetMaterial);
        helmetMesh.position.y = Config.KIRBY_SIZE * 0.45;
        helmetMesh.rotation.y = Math.PI / 4;
        helmetMesh.castShadow = true;
        kirbyGroup.add(helmetMesh);

        swordMesh = itemMesh;
        kirbyGroup.add(swordMesh);
        swordMesh.position.set(Config.KIRBY_SIZE * 0.35, -Config.KIRBY_SIZE * 0.1, Config.KIRBY_SIZE * 0.3);
        swordMesh.rotation.set(Math.PI / 2.2, Math.PI / 4, -Math.PI / 2);
        swordMesh.scale.set(0.6, 0.6, 0.6);
        swordMesh.castShadow = true;

    } else if (powerName === 'helmet') {
        helmetMesh = itemMesh;
        kirbyGroup.add(helmetMesh);
        const kirbyHeadY = Config.KIRBY_SIZE * 0.4;
        helmetMesh.position.set(0, kirbyHeadY, 0.1);
        helmetMesh.rotation.set(0, 0, 0);
        helmetMesh.scale.set(0.9, 0.9, 0.9);
        helmetMesh.castShadow = true;
    }

    return true;
}

// --- Remove Power ---
export function removePower(shouldThrow = false) {
    if (!currentPower) return;

    console.log(`Kirby lost ${currentPower} power.`);
    let itemToRespawn = null; // Keep track of the mesh to potentially respawn

    if (currentPower === 'sword') {
        if (helmetMesh) kirbyGroup.remove(helmetMesh);
        if (swordMesh) {
            itemToRespawn = swordMesh; // Store the sword mesh
            kirbyGroup.remove(swordMesh);
        }
        helmetMesh = null;
        swordMesh = null;
    } else if (currentPower === 'helmet') {
        if (helmetMesh) {
            itemToRespawn = helmetMesh; // Store the helmet mesh
            kirbyGroup.remove(helmetMesh);
        }
        helmetMesh = null;
    }

    // *** Item Throwing Logic ***
    if (shouldThrow && itemToRespawn) {
        // Get Kirby's forward direction
        const throwDirection = new THREE.Vector3();
        kirbyGroup.getWorldDirection(throwDirection);
        throwDirection.y = 0.3; // Give it some upward lift
        throwDirection.normalize();

        // Calculate throw position slightly in front of Kirby
        const throwPosition = kirbyGroup.position.clone()
            .add(throwDirection.clone().multiplyScalar(Config.KIRBY_SIZE * 1.5)); // Throw 1.5 Kirby sizes away
        throwPosition.y = Config.GROUND_Y + 0.2; // Place slightly above ground

        itemToRespawn.position.copy(throwPosition);
        // Reset rotation/scale if needed (depends on how items.js handles spawning)
        itemToRespawn.rotation.set(0, Math.random() * Math.PI * 2, Math.PI / 1.5); // Example reset
        itemToRespawn.scale.set(1, 1, 1); // Reset scale

        // Apply initial velocity to the item
        const throwVelocity = throwDirection.multiplyScalar(10); // Adjust throw strength
        itemToRespawn.userData.velocity = throwVelocity; // Store velocity in userData for per-frame updates
        itemToRespawn.userData.isThrowable = true; // Flag to indicate it's being thrown

        scene.add(itemToRespawn); // Add back to the main scene

        // Add to items array so it can be picked up again
        // activeItems.push(itemToRespawn); // Add back to the active items array
        // console.log(`Respawned ${currentPower} item visually near Kirby.`);
    }


    currentPower = null;
    inhaledObject = null; // Clear inhaled object too when power is lost
}

export function getKirbyBoundingBox() {
    updateKirbyBoundingBox();
    return kirbyBoundingBox;
}

export function getKirbyPosition() {
    return kirbyGroup ? kirbyGroup.position : new THREE.Vector3();
}

console.log("Kirby module loaded.");