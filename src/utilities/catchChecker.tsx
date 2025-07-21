import { useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from "react";
import { useFrame } from "@react-three/fiber";
import { useXRInputSourceState, type XRControllerState } from "@react-three/xr";
import * as THREE from "three";
import { Clock, PerformanceModel, Alerts, AlertsTimeline } from "musicaljuggling";
import { type AlertEvent } from "musicaljuggling";
import { Box } from "@react-three/drei";

/**
 * CatchChecker Component
 *
 * This component is responsible for monitoring and validating catch events.
 *
 * @param clock - Time management system for synchronization
 * @param ballsRef - Reference to a Map containing all ball objects in the scene
 * @param model - Performance model containing juggling patterns and timelines
 * @param errorCount - Optional reference to track the number of missed catches
 * @param setErrorText - Optional function to display error messages to the user
 */
export function CatchChecker({
    clock,
    ballsRef,
    model,
    errorCount,
    setErrorText
}: {
    clock: Clock;
    ballsRef: RefObject<Map<string, THREE.Object3D<THREE.Object3DEventMap>>>;
    model: PerformanceModel;
    errorCount?: RefObject<number>;
    setErrorText?: Dispatch<SetStateAction<string>>;
}) {
    // Array to store catch events that are currently monitored
    const listenedEvent = useRef<Array<AlertEvent>>([]);

    // Flags to track if catches have been performed
    const hasCatchRight = useRef(false);
    const hasCatchLeft = useRef(false);

    // Initializes the alert system for monitoring catch events
    useEffect(() => {
        // Create a timeline that aggregates all ball timelines with a 0.2 second interval
        const alertesTimeline = new AlertsTimeline();
        model.balls.forEach((ball) => {
            alertesTimeline.addTimeline(ball.timeline, 0.2);
        });

        // Create the alerts system that will fire events based on the timeline
        let alertes = new Alerts(alertesTimeline, clock);

        /**
         * "inf" Event Handler - Triggered when a catch window begins
         * This event fires slightly before the actual catch should happen,
         * giving the system time to prepare for validation
         */
        alertes.addEventListener("inf", (e: AlertEvent) => {
            if (e.actionDescription === "caught") {
                // Add this catch event to our monitoring list
                listenedEvent.current.push(e);

                // Reset the catch flag for the appropriate hand
                // This ensures we don't carry over success from previous catches
                if (e.hand.isRightHand()) {
                    hasCatchRight.current = false;
                } else {
                    hasCatchLeft.current = false;
                }
            }
        });

        /**
         * "sup" Event Handler - Triggered when a catch window ends
         * This event fires when the catch should have been completed.
         * If the catch flag is still false, it means the user missed the catch.
         */
        alertes.addEventListener("sup", (e: AlertEvent) => {
            // Check if right hand catch was missed
            if (
                e.actionDescription === "caught" &&
                e.hand.isRightHand() &&
                !hasCatchRight.current
            ) {
                if (errorCount) errorCount.current++;
                if (setErrorText) {
                    setErrorText("Vous n'avez pas rattrapé la balle à droite");
                }
            }

            // Check if left hand catch was missed
            if (
                e.actionDescription === "caught" &&
                !e.hand.isRightHand() &&
                !hasCatchLeft.current
            ) {
                if (errorCount) errorCount.current++;
                if (setErrorText) {
                    setErrorText("Vous n'avez pas rattrapé la balle à gauche");
                }
            }

            // Remove the processed event from our monitoring list
            const index = listenedEvent.current.indexOf(e);
            if (index > -1) {
                listenedEvent.current.splice(index, 1);
            }
        });

        // Cleanup function to remove event listeners when component unmounts
        return () => {
            alertes.removeAllEventListeners();
        };
    }, [model]); // Re-run when the performance model changes

    const left = useXRInputSourceState("controller", "left");
    const right = useXRInputSourceState("controller", "right");

    /**
     * Vibrate Controller Function
     * Provides haptic feedback to the user when they successfully catch a ball
     *
     * @param controller - The XR controller state object
     * @param intensity - Vibration intensity
     * @param duration - Vibration duration in milliseconds
     */
    const vibrateController = (
        controller: XRControllerState | undefined,
        intensity = 1.0,
        duration = 100
    ) => {
        // Check if controller and gamepad are available
        if (!controller || !controller.inputSource || !controller.inputSource.gamepad) {
            console.log("exit");
            return;
        }
        const gamepad = controller.inputSource.gamepad;
        if (gamepad.hapticActuators.length > 0) {
            gamepad.hapticActuators[0].pulse(intensity, duration);
        }
    };

    /**
     * Main Frame Loop
     * This runs every frame to check for collisions between controllers and balls
     * that need to be caught according to the current events being monitored
     */
    useFrame(() => {
        // Get current world positions of both controllers
        const rightPos = new THREE.Vector3();
        right?.object?.getWorldPosition(rightPos);

        const leftPos = new THREE.Vector3();
        left?.object?.getWorldPosition(leftPos);

        // Array to track which events should be removed after processing
        const eventToRemove: number[] = [];

        // Check each monitored catch event
        for (let i = 0; i < listenedEvent.current.length; i++) {
            const event = listenedEvent.current[i];

            if (event.actionDescription === "caught") {
                // Get the ball object that should be caught
                const ballObject = ballsRef.current?.get(event.ball.id);
                if (!ballObject) continue;

                // Get the ball's radius for collision detection
                const radius = (ballObject.children[0] as THREE.Mesh).geometry.parameters.radius;

                // Get the ball's current world position
                const ballWorldPos = new THREE.Vector3();
                ballObject.getWorldPosition(ballWorldPos);

                if (event.hand.isRightHand()) {
                    // Check collision with right controller
                    const distanceRight = rightPos.distanceTo(ballWorldPos);

                    if (distanceRight <= radius) {
                        // Successful catch
                        ballObject.userData.isExplosing = true; // Mark ball for visual effect
                        hasCatchRight.current = true; // Set success flag
                        vibrateController(right, 1, 50); // Provide haptic feedback
                        eventToRemove.push(i); // Mark event for removal
                    }
                } else {
                    // Check collision with left controller
                    const distanceLeft = leftPos.distanceTo(ballWorldPos);

                    if (distanceLeft <= radius) {
                        // Successful catch
                        ballObject.userData.isExplosing = true; // Mark ball for visual effect
                        hasCatchLeft.current = true; // Set success flag
                        vibrateController(left, 1, 50); // Provide haptic feedback
                        eventToRemove.push(i); // Mark event for removal
                    }
                }
            }
        }

        // Remove processed events from the monitoring list
        // Sort in descending order to avoid index shifting issues during removal
        eventToRemove.sort((a, b) => b - a);
        eventToRemove.forEach((index) => {
            listenedEvent.current.splice(index, 1);
        });
    });

    return <></>;
}
