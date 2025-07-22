import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { XRControllerState } from "@react-three/xr";

/**
 * Arrow Component
 *
 * Renders a 3D arrow that represents a specific juggling toss direction and siteswap value.
 * Each arrow has a collision detection system that activates when the VR controller intersects
 * with its hitbox, allowing the system to detect when the user performs the correct toss motion.
 *
 * @param origin - 3D position where the arrow is placed
 * @param rotation - Euler rotation defining the arrow's direction
 * @param length - Total length of the arrow
 * @param bodyRadius - Radius of the arrow's cylindrical body
 * @param color - Color of the arrow
 * @param detectionIncoming - The siteswap value currently expected (from performance model)
 * @param controller - XR controller state for collision detection
 * @param onCollision - Callback fired when controller collides with this arrow
 * @param siteswap - The siteswap value this arrow represents
 */
function Arrow({
    origin = new THREE.Vector3(0, 0, 0),
    rotation = new THREE.Euler(0, 0, 0),
    length = 0.3,
    bodyRadius = 0.015,
    color = "orange",
    detectionIncoming,
    controller,
    onCollision,
    siteswap
}: {
    origin: THREE.Vector3;
    rotation?: THREE.Euler;
    length?: number;
    bodyRadius?: number;
    color?: string;
    detectionIncoming?: number;
    controller?: XRControllerState;
    onCollision?: (distance: number) => void;
    siteswap?: number;
}) {
    // Calculate arrow geometry proportions
    const bodyLength = length * 0.8; // 80% of total length for the body
    const headLength = length * 0.2; // 20% of total length for the head
    const headRadius = bodyRadius * 2; // Arrow head is twice the body radius

    // Reference to the collision hitbox mesh
    const hitbox = useRef<THREE.Object3D>(null);

    // State to track collision status to detect entry/exit events
    const [isColliding, setIsColliding] = useState(false);

    // Distance threshold for collision detection (5cm)
    const collisionThreshold = 0.05;

    // Frame Loop - Collision Detection
    useFrame(() => {
        if (hitbox.current && controller && detectionIncoming) {
            // Get world position of the arrow's hitbox
            const hitboxPosition = new THREE.Vector3();
            hitbox.current.getWorldPosition(hitboxPosition);

            // Get world position of the controller
            const controllerPosition = new THREE.Vector3();
            controller?.object?.getWorldPosition(controllerPosition);

            // Calculate distance between controller and hitbox
            const distance = hitboxPosition.distanceTo(controllerPosition);

            // Track collision state changes
            const wasColliding = isColliding;
            const nowColliding = distance < collisionThreshold;

            if (nowColliding && !wasColliding) {
                setIsColliding(true);
                if (onCollision && siteswap) onCollision(siteswap);
            }

            // Update state when exiting collision zone
            else if (!nowColliding && wasColliding) {
                setIsColliding(false);
            }
        }
    });

    // Visual indication: highlight the arrow if it matches the expected siteswap
    const currentOpacity = siteswap === detectionIncoming ? 0.8 : 0.2;
    const currentVisibility = siteswap === detectionIncoming;

    return (
        <group position={origin} rotation={rotation} visible={currentVisibility}>
            {/* Arrow Body */}
            <mesh position={[0, 0, bodyLength - headLength]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[bodyRadius, bodyRadius, bodyLength, 16]} />
                <meshStandardMaterial color={color} transparent opacity={currentOpacity} />
            </mesh>

            {/* Arrow Head */}
            <mesh position={[0, 0, bodyLength + headLength * 1.5]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[headRadius, headLength, 16]} />
                <meshStandardMaterial color={color} transparent opacity={currentOpacity} />
            </mesh>

            {/* Collision Hitbox - Invisible sphere for collision detection */}
            <mesh
                ref={hitbox}
                position={[0, 0, bodyLength + headLength * 1.5]}
                rotation={[Math.PI / 2, 0, 0]}
                visible={false}
            >
                <sphereGeometry args={[collisionThreshold, 16, 16]} />
                <meshStandardMaterial color="white" transparent opacity={0.1} wireframe={true} />
            </mesh>
        </group>
    );
}

/**
 * WayDetector Component
 *
 * This component creates a directional indicator system that helps users learn proper juggling
 * toss motions in VR. It displays multiple arrows representing different siteswap tosss
 * (1, 2, 3) with different directions and visual feedback.
 *
 * The system works by:
 * 1. Tracking button presses to anchor the arrow position
 * 2. Displaying directional arrows for different toss types
 * 3. Detecting when the user moves their controller through the correct arrow
 * 4. Providing success/error feedback based on whether the motion matches expectations
 *
 * @param controller - XR controller state for the hand being monitored
 * @param incomingSiteswap - Expected siteswap value from the performance model
 * @param onSuccess - Callback fired when correct toss motion is detected
 * @param onError - Callback fired when incorrect toss motion is detected
 */
export function WayDetector({
    controller,
    incomingSiteswap,
    onSuccess,
    onError
}: {
    controller: XRControllerState;
    incomingSiteswap: number | undefined;
    onSuccess: Function;
    onError: Function;
}) {
    // Position where the arrows are anchored (updated on button press)
    const [pos, setPos] = useState(new THREE.Vector3(0, 2, 0));

    // Button state tracking (true = pressed, false = released)
    const [button, setButton] = useState(true);

    // Track which hand this detector is for (left/right)
    const [hand, setHand] = useState(controller.inputSource.handedness);

    /**
     * Update hand tracking when controller changes
     */
    useEffect(() => {
        setHand(controller.inputSource.handedness);
    }, [controller]);

    /**
     * Frame Loop - Button State Management
     *
     * Tracks button presses to determine when to update the arrow anchor position.
     * Uses different buttons for different hands:
     * - Right hand: A button
     * - Left hand: X button
     *
     * The arrows are repositioned each time the user presses the button,
     * allowing them to set up the toss guidance at their current hand position.
     */
    useFrame(() => {
        if (controller) {
            // Get appropriate button state based on hand
            const buttonIsPressed =
                hand === "right"
                    ? controller.gamepad?.["a-button"]?.button
                    : controller.gamepad?.["x-button"]?.button;

            if (button) {
                // If button was pressed in the last frame and it's not pressed on this frame then set is to false

                // FIX NEEDED : Why not doing this setButton(buttonIsPressed)
                if (!buttonIsPressed) {
                    setButton(false);
                }
            } else {
                // If button wasn't pressed in the last frame and now it pressed then it just pressed and we can set the arrows positions
                if (buttonIsPressed) {
                    // Button just pressed - update arrow position to current controller position
                    const position = new THREE.Vector3();
                    controller?.object?.getWorldPosition(position);
                    setPos(position);
                    setButton(true);
                }
            }
        }
    });

    /**
     * Collision Handler
     *
     * Called when the controller collides with any arrow. Validates whether
     * the collision was with the correct arrow (matching expected siteswap)
     * and triggers appropriate success/error callbacks with haptic feedback.
     *
     * @param siteswap - The siteswap value of the arrow that was hit
     */
    const handleCollision = (siteswap: number) => {
        if (siteswap === incomingSiteswap) {
            // Correct toss motion detected
            onSuccess();
            vibrateController(controller, 1, 50); // Short success vibration
        } else {
            // Incorrect toss motion detected
            onError();
            vibrateController(controller, 1, 200); // Long error vibration
        }
    };

    return (
        <>
            {/* Only render arrows when button is pressed */}
            {button && (
                <>
                    {/* Siteswap 1 Arrow - Horizontal toss (hand to hand) */}
                    <Arrow
                        color="yellow"
                        length={0.15}
                        origin={pos}
                        rotation={new THREE.Euler((hand === "right" ? 1 : 2) * Math.PI, 0, 0)}
                        controller={controller}
                        detectionIncoming={incomingSiteswap}
                        siteswap={1}
                        onCollision={handleCollision}
                    />

                    {/* Siteswap 3 Arrow - Cross toss (to opposite hand) */}
                    <Arrow
                        color="lightblue"
                        length={0.15}
                        origin={pos}
                        rotation={
                            new THREE.Euler(((hand === "right" ? -3 : -1) * Math.PI) / 4, 0, 0)
                        }
                        controller={controller}
                        detectionIncoming={incomingSiteswap}
                        siteswap={3}
                        onCollision={handleCollision}
                    />

                    {/* Siteswap 2 Arrow - Vertical toss */}
                    <Arrow
                        color="lightgreen"
                        length={0.15}
                        origin={pos}
                        rotation={new THREE.Euler(-Math.PI / 2, 0, 0)}
                        controller={controller}
                        detectionIncoming={incomingSiteswap}
                        siteswap={2}
                        onCollision={handleCollision}
                    />
                </>
            )}
        </>
    );
}

/**
 * Vibrate Controller Function
 *
 * Provides haptic feedback through the VR controller's vibration system.
 * Used to give tactile feedback for successful or failed toss motions.
 *
 * @param controller - The XR controller state object
 * @param intensity - Vibration intensity (0.0 to 1.0)
 * @param duration - Vibration duration in milliseconds
 */
const vibrateController = (
    controller: XRControllerState | undefined,
    intensity = 1.0,
    duration = 100
) => {
    // Validate controller and gamepad availability
    if (!controller || !controller.inputSource || !controller.inputSource.gamepad) {
        console.log("exit");
        return;
    }

    const gamepad = controller.inputSource.gamepad;

    // Trigger haptic feedback if available
    if (gamepad.hapticActuators.length > 0) {
        gamepad.hapticActuators[0].pulse(intensity, duration);
    }
};
