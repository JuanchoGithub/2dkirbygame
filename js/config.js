import * as THREE from 'three';

// Game constants
export const GRAVITY = -30;
export const GROUND_Y = 0; // Assuming ground is at y=0

// Kirby constants
export const KIRBY_SIZE = 1.5;
export const KIRBY_SPEED = 5.0; // Adjusted speed to match old_main
export const KIRBY_JUMP_VELOCITY = 14; // Adjusted jump to match old_main
export const KIRBY_INHALE_DURATION = 0.6; // seconds, adjusted
export const KIRBY_INHALE_RANGE = 4.0; // Adjusted
export const KIRBY_INHALE_ANGLE_DEG = 35; // Angle for inhale check
export const KIRBY_FLOAT_SPEED = 2; // Keep simple float speed for now
export const KIRBY_FLOAT_GRAVITY_SCALE = 0.1;
// *** Add Flight Constants ***
export const KIRBY_FLIGHT_BOOST = 10; // Upward force when pressing Space mid-air
export const KIRBY_MAX_FLIGHT_HEIGHT = 15; // Max height Kirby can reach by flying
export const KIRBY_FLIGHT_HORIZONTAL_DRAG = 0.1; // Slow down horizontal speed slightly when flying
export const KIRBY_PUFF_SCALE = new THREE.Vector3(1.25, 1.25, 1.25); // Scale when floating/puffing
export const KIRBY_INHALE_SCALE = new THREE.Vector3(1.4, 0.7, 1.4); // Scale when inhaling

// Waddle Dee constants
export const WADDLEDEE_SIZE = 1.2; // Keep visual size
export const WADDLEDEE_SPEED = 2.0; // Adjusted speed
export const WADDLEDEE_TURN_SPEED = 0.08; // Rotation speed
export const MAX_WADDLEDEES = 4; // Adjusted count
export const WADDLEDEE_SPAWN_INTERVAL = 3000; // Faster spawn? Or handle via count check
export const WADDLEDEE_MIN_DIR_CHANGE_TIME = 3.0; // Min time before changing direction
export const WADDLEDEE_MAX_DIR_CHANGE_TIME = 8.0; // Max time

// Item constants
export const SWORD_SIZE = 1; // Base visual size
export const HELMET_SIZE = 0.7; // Base visual size for helmet parts

// Environment constants
export const TREE_COUNT = 15;
export const GROUND_SIZE = 50;
export const WALL_HEIGHT = 20;
export const WALL_THICKNESS = 1;

// Interaction Constants
export const STOMP_BOUNCE_FACTOR = 0.6; // How much jump force Kirby gets after a stomp

// Colors
export const KIRBY_COLOR = 0xffc0cb; // Pink
export const WADDLEDEE_BODY_COLOR = 0xffa500; // Orange
export const WADDLEDEE_FEET_COLOR = 0xffff00; // Yellow
export const SWORD_BLADE_COLOR = 0xc0c0c0; // Silver
export const SWORD_HILT_COLOR = 0x8b4513; // Brown
export const HELMET_COLOR = 0x808080; // Gray
export const GROUND_COLOR = 0x228B22; // ForestGreen
export const TREE_TRUNK_COLOR = 0x8B4513; // SaddleBrown
export const TREE_LEAVES_COLOR = 0x006400; // DarkGreen
export const WALL_COLOR = 0x808080; // Gray

console.log("Config module loaded.");