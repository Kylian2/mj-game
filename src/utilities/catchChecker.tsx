import { useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useXRInputSourceState, type XRControllerState } from "@react-three/xr";
import * as THREE from "three";
import { Clock, PerformanceModel, Alerts, AlertsTimeline } from "musicaljuggling";
import { type AlertEvent } from "musicaljuggling";
import { Box } from "@react-three/drei";
import { type CallbackFunction } from "musicaljuggling";
import { getHandPosition, getPosition } from "./handState";

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
 * @param makeStop - Optionnal, if true then the figure will stop at catch moments
 */
export function CatchChecker({
    clock,
    ballsRef,
    model,
    errorCount,
    setErrorText,
    makeStop
}: {
    clock: Clock;
    ballsRef: RefObject<Map<string, THREE.Object3D<THREE.Object3DEventMap>>>;
    model: PerformanceModel;
    errorCount?: RefObject<number>;
    setErrorText?: Dispatch<SetStateAction<string>>;
    makeStop?: boolean;
}) {
    const { gl } = useThree() as { gl: THREE.WebGLRenderer & { xr: any } };

    // Array to store catch events that are currently monitored
    const listenedEvent = useRef<Array<AlertEvent>>([]);

    // Flags to track if catches have been performed
    const hasCatchRight = useRef(false);
    const hasCatchLeft = useRef(false);

    // Initializes the alert system for monitoring catch events
    useEffect(() => {
        // Create a timeline that aggregates all ball timelines with a 0.2/0 second interval
        const alertesTimeline = new AlertsTimeline();
        model.balls.forEach((ball) => {
            alertesTimeline.addTimeline(ball.timeline, makeStop ? 0 : 0.2);
        });

        // Create the alerts system that will fire events based on the timeline
        let alertes = new Alerts(alertesTimeline, clock);

        if (!makeStop) {
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
                        setErrorText("Vous n'avez pas rattrape la balle a droite");
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
                        setErrorText("Vous n'avez pas rattrape la balle a gauche");
                    }
                }

                // Remove the processed event from our monitoring list
                const index = listenedEvent.current.indexOf(e);
                if (index > -1) {
                    listenedEvent.current.splice(index, 1);
                }
            });
        }

        // If we make the figure stop at each event then we don't need a window to do our actions
        if (makeStop) {
            /**
             * "instant" Event Handler - Triggered when a ball need to be catched
             */
            alertes.addEventListener("instant", ((e: AlertEvent) => {
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
                    clock.pause();
                }
            }) as CallbackFunction);
        }

        // Cleanup function to remove event listeners when component unmounts
        return () => {
            alertes.removeAllEventListeners();
        };
    }, [model]); // Re-run when the performance model changes

    const leftController = useXRInputSourceState("controller", "left");
    const leftHand = useXRInputSourceState("hand", "left");
    const rightController = useXRInputSourceState("controller", "right");
    const rightHand = useXRInputSourceState("hand", "right");

    const getWorldPosition = (
        side: "left" | "right",
        frame: XRFrame | undefined
    ): THREE.Vector3 | null => {
        if (!frame) return null;
        const position = new THREE.Vector3();

        let hand = undefined;
        let controller = undefined;
        if (side === "right") {
            hand = rightHand;
            controller = rightController;
        } else if (side === "left") {
            hand = leftHand;
            controller = leftController;
        }

        if (controller) {
            controller?.object?.getWorldPosition(position);
            return position;
        }
        if (hand) {
            const source = hand.inputSource.hand;
            const referenceSpace = gl.xr.getReferenceSpace();
            if (source && frame && frame.getJointPose) {
                return getHandPosition(source, frame, referenceSpace);
            }
        }

        return null;
    };

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
            console.warn("Impossible to vibrate on controller" + controller);
            return;
        }
        const gamepad = controller.inputSource.gamepad;
        if (gamepad.hapticActuators.length > 0) {
            gamepad.hapticActuators[0].pulse(intensity, duration);
        } else {
            console.warn(
                "Haptic Actuators are not available on controller " +
                    controller.inputSource.handedness
            );
        }
    };

    /**
     * Main Frame Loop
     * This runs every frame to check for collisions between controllers and balls
     * that need to be caught according to the current events being monitored
     */
    useFrame((_, __, frame) => {
        // Get current world positions of both controllers
        const rightPos = getWorldPosition("right", frame);

        const leftPos = getWorldPosition("left", frame);

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
                console.log("balle");
                console.log(ballWorldPos);
                if (event.hand.isRightHand()) {
                    // Check collision with right controller
                    const distanceRight = rightPos?.distanceTo(ballWorldPos);
                    console.log(distanceRight);
                    console.log(radius);

                    if (distanceRight && distanceRight <= radius) {
                        // Successful catch
                        ballObject.userData.isExplosing = true; // Mark ball for visual effect
                        hasCatchRight.current = true; // Set success flag
                        vibrateController(rightController, 1, 50); // Provide haptic feedback
                        eventToRemove.push(i); // Mark event for removal
                        if (makeStop) clock.play();
                    }
                } else {
                    // Check collision with left controller
                    const distanceLeft = leftPos?.distanceTo(ballWorldPos);
                    console.log(distanceLeft);
                    if (distanceLeft && distanceLeft <= radius) {
                        // Successful catch
                        ballObject.userData.isExplosing = true; // Mark ball for visual effect
                        hasCatchLeft.current = true; // Set success flag
                        vibrateController(leftController, 1, 50); // Provide haptic feedback
                        eventToRemove.push(i); // Mark event for removal
                        if (makeStop) clock.play();
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
