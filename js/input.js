export const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false, // Could be used for ducking or fast falling
    Space: false,     // Jump
    KeyX: false,      // Inhale / Use Power
    KeyC: false       // Float / Cancel Float
};

export function initializeInput() {
    window.addEventListener('keydown', (event) => {
        if (event.code in keys) {
            keys[event.code] = true;
        }
    });

    window.addEventListener('keyup', (event) => {
        if (event.code in keys) {
            keys[event.code] = false;
        }
    });
    console.log("Input module initialized.");
}