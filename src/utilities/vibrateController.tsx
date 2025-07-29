import type { XRControllerState } from "@react-three/xr";

/**
 * Vibrate Controller Function
 * Provides haptic feedback to the user when they successfully catch a ball
 *
 * @param controller - The XR controller state object
 * @param intensity - Vibration intensity
 * @param duration - Vibration duration in milliseconds
 */
export function vibrateController(
    controller: XRControllerState | undefined,
    intensity = 1.0,
    duration = 100
) {
    // Check if controller and gamepad are available
    if (!controller || !controller.inputSource || !controller.inputSource.gamepad) {
        console.warn("Impossible to vibrate on controller" + controller);
        return;
    }
    const gamepad = controller.inputSource.gamepad;
    if (gamepad.hapticActuators.length > 0) {
        gamepad.hapticActuators[0].pulse(intensity, duration);
    } else {
        console.warn(
            "Haptic Actuators are not available on controller " + controller.inputSource.handedness
        );
    }
}
