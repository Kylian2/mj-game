import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { useXRInputSourceState, XRControllerState } from "@react-three/xr";
import { getHandPosition, getPosition } from "./handState";

/**
 * Arrow Component
 *
 * Renders a 3D arrow that represents a specific juggling toss direction and siteswap value.
 * Each arrow has a collision detection system that activates when the VR controller intersects
 * with its hitbox, allowing the system to detect when the user performs the correct toss motion.
 *
 * @param origin - 3D position where the arrow starts
 * @param target - 3D position where the arrow points to
 * @param bodyRadius - Radius of the arrow's cylindrical body
 * @param color - Color of the arrow
 * @param detectionIncoming - The siteswap value currently expected (from performance model)
 * @param controller - XR controller state for collision detection
 * @param onCollision - Callback fired when controller collides with this arrow
 * @param siteswap - The siteswap value this arrow represents
 */
function Arrow({
    origin = new THREE.Vector3(0, 0, 0),
    target = new THREE.Vector3(0, 0.3, 0),
    bodyRadius = 0.015,
    color = "orange",
    detectionIncoming,
    controller,
    hand,
    onCollision,
    siteswap
}: {
    origin: THREE.Vector3;
    target: THREE.Vector3;
    bodyRadius?: number;
    color?: string;
    detectionIncoming?: number;
    controller?: XRControllerState;
    hand?: XRHand;
    onCollision?: (distance: number) => void;
    siteswap?: number;
}) {
    const { gl } = useThree() as { gl: THREE.WebGLRenderer & { xr: any } };

    // Calculate arrow direction and length from origin to target
    const direction = new THREE.Vector3().subVectors(target, origin);
    const length = direction.length();

    // Calculate rotation from direction vector
    const rotation = useMemo(() => {
        const rot = new THREE.Euler();
        if (length > 0.001) {
            // Avoid very small lengths
            const normalizedDirection = direction.clone().normalize();

            // Use quaternion for more stable rotation calculation
            const quaternion = new THREE.Quaternion();

            // Default arrow points up (0, 1, 0), we want it to point in direction
            const up = new THREE.Vector3(0, 1, 0);
            quaternion.setFromUnitVectors(up, normalizedDirection);

            rot.setFromQuaternion(quaternion);
        }
        return rot;
    }, [direction.x, direction.y, direction.z, length]);

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
    useFrame((_, __, frame) => {
        if (hitbox.current && (controller || hand) && detectionIncoming) {
            // Get world position of the arrow's hitbox
            const hitboxPosition = new THREE.Vector3();
            hitbox.current.getWorldPosition(hitboxPosition);

            // Get world position of the controller
            let handPosition = new THREE.Vector3();
            if (controller) {
                controller?.object?.getWorldPosition(handPosition);
            } else if (hand) {
                const referenceSpace = gl.xr.getReferenceSpace();
                let pos = getHandPosition(hand, frame, referenceSpace);
                if (pos) handPosition = pos;
            }

            // Calculate distance between controller and hitbox
            const distance = hitboxPosition.distanceTo(handPosition);
            console.log(distance);
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

    return (
        <group position={origin} rotation={rotation}>
            <mesh position={[0, bodyLength / 2, 0]}>
                <cylinderGeometry args={[bodyRadius, bodyRadius, bodyLength, 8]} />
                <meshBasicMaterial color={color} />
            </mesh>

            <mesh position={[0, bodyLength + headLength / 2, 0]}>
                <coneGeometry args={[headRadius, headLength, 8]} />
                <meshBasicMaterial color={color} />
            </mesh>

            <mesh ref={hitbox} position={[0, collisionThreshold, 0]} visible={false}>
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
    hand,
    incomingSiteswap,
    onSuccess,
    onError,
    velocity,
    pos
}: {
    controller: XRControllerState | undefined;
    hand: XRHand | undefined;
    incomingSiteswap: number | undefined;
    onSuccess: Function;
    onError: Function;
    velocity: THREE.Vector3;
    pos: THREE.Vector3;
}) {
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
            <group>
                <Arrow
                    color="yellow"
                    target={pos.clone().add(velocity.clone().multiplyScalar(0.25))}
                    origin={pos}
                    controller={controller}
                    hand={hand}
                    detectionIncoming={incomingSiteswap}
                    siteswap={incomingSiteswap}
                    onCollision={handleCollision}
                />
            </group>
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
