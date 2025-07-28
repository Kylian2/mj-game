import {
    useEffect,
    useRef,
    useState,
    type Dispatch,
    type RefObject,
    type SetStateAction
} from "react";
import { useFrame } from "@react-three/fiber";
import { useXRInputSourceState, type XRControllerState } from "@react-three/xr";
import * as THREE from "three";
import {
    Clock,
    PerformanceModel,
    Alerts,
    AlertsTimeline,
    TossCatchEvent,
    ballVelocity
} from "musicaljuggling";
import { type AlertEvent } from "musicaljuggling";
import { WayDetector } from "./wayDetector";
import { velocity } from "three/tsl";

/**
 * TossChecker Component
 *
 * This component is responsible for monitoring and validating toss events.
 *
 * @param clock - Time management system for synchronization
 * @param ballsRef - Reference to a Map containing all ball objects in the scene
 * @param model - Performance model containing juggling patterns and timelines
 * @param errorCount - Optional reference to track the number of failed tosses
 * @param setErrorText - Optional function to display error messages to the user
 * @param makeStop - Optionnal, if true then figure will stop at toss moments
 */
export function TossChecker({
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
    // State to track the expected siteswap height for the left hand's next toss
    // undefined means no toss is currently expected for this hand
    const [incomingSiteswapLeft, setIncomingSiteswapLeft] = useState<number | undefined>(undefined);

    // State to track the expected siteswap height for the right hand's next toss
    // undefined means no toss is currently expected for this hand
    const [incomingSiteswapRight, setIncomingSiteswapRight] = useState<number | undefined>(
        undefined
    );

    const [velocityLeft, setVelocityLeft] = useState<THREE.Vector3 | null | undefined>(null);
    const [velocityRight, setVelocityRight] = useState<THREE.Vector3 | null | undefined>(null);

    const [ballPosLeft, setBallPosLeft] = useState<THREE.Vector3 | null | undefined>(null);
    const [ballPosRight, setBallPosRight] = useState<THREE.Vector3 | null | undefined>(null);
    //Initialize alert system
    useEffect(() => {
        // Create a timeline that aggregates all ball timelines with a 0/0.2 second interval
        const alertesTimeline = new AlertsTimeline();
        model.balls.forEach((ball) => {
            alertesTimeline.addTimeline(ball.timeline, makeStop ? 0 : 0.2);
        });

        // Create the alerts system that will fire events based on the timeline
        let alertes = new Alerts(alertesTimeline, clock);

        if (!makeStop) {
            /**
             * "inf" Event Handler - Triggered when a toss window begins
             *
             * This event fires slightly before the actual toss should happen,
             * activating the motion detection system for the appropriate hand.
             * The siteswap height determines the expected throw trajectory.
             */
            alertes.addEventListener("inf", (e: AlertEvent) => {
                if (e.actionDescription === "tossed") {
                    // Set up right hand toss detection
                    if (e.hand.isRightHand()) {
                        setIncomingSiteswapRight(e.siteswapHeight);
                        setVelocityRight(e.ball.position(clock.getTime() + 0.2));
                    }

                    // Set up left hand toss detection
                    if (!e.hand.isRightHand()) {
                        setIncomingSiteswapLeft(e.siteswapHeight);
                        setVelocityLeft(e.ball.position(clock.getTime() + 0.2));
                    }
                }
            });
        }

        // If we make the figure stop at each event then we don't need a window to do our actions
        if (makeStop) {
            /**
             * "instant" Event Handler - Triggered when a ball need to be tossed
             */
            alertes.addEventListener("instant", (e: AlertEvent) => {
                if (e.actionDescription === "tossed") {
                    const tossStartPos = e.ball.positionAtEvent(e);
                    const tossEndPos = e.ball.positionAtEvent(e.nextBallEvent()[1]);
                    const flightTime = e.unitTime * e.siteswapHeight;
                    const velocity = ballVelocity(tossStartPos, 0, tossEndPos, flightTime, 0);
                    const normalizedVelocity = velocity.normalize();

                    if (e.hand.isRightHand()) {
                        setIncomingSiteswapRight(e.siteswapHeight);
                        setVelocityRight(normalizedVelocity);

                        // BE CAREFUL : behavior can be unexpected because of absolute / relative position
                        setBallPosRight(tossStartPos);
                    }

                    if (!e.hand.isRightHand()) {
                        setIncomingSiteswapLeft(e.siteswapHeight);
                        setVelocityLeft(normalizedVelocity);

                        // BE CAREFUL : behavior can be unexpected because of absolute / relative position
                        setBallPosLeft(tossStartPos);
                    }

                    clock.pause();
                }
            });
        }

        // Cleanup function to remove event listeners when component unmounts
        return () => {
            alertes.removeAllEventListeners();
        };
    }, [model]);

    const left = useXRInputSourceState("controller", "left");
    const right = useXRInputSourceState("controller", "right");

    /**
     * Vibrate Controller Function
     *
     * Provides haptic feedback to the user. Currently unused in this component
     * but available for future enhancements (e.g., feedback on successful tosses).
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
     * Success Callback for Left Hand
     *
     * Called by the left WayDetector when a successful toss motion is detected.
     * Resets the expected siteswap to undefined, indicating no toss is currently expected.
     */
    const successLeft = () => {
        setIncomingSiteswapLeft(undefined);
        setVelocityLeft(null);
        setBallPosLeft(null);
        if (makeStop) clock.play();
    };

    /**
     * Success Callback for Right Hand
     *
     * Called by the right WayDetector when a successful toss motion is detected.
     * Resets the expected siteswap to undefined, indicating no toss is currently expected.
     */
    const successRight = () => {
        setIncomingSiteswapRight(undefined);
        setVelocityRight(null);
        setBallPosRight(null);
        if (makeStop) clock.play();
    };

    /**
     * Error Callback
     *
     * Called by either WayDetector when a toss motion fails validation.
     * Increments the error counter if available.
     */
    const error = () => {
        if (errorCount) errorCount.current++;
    };

    return (
        <>
            {/* Right Hand Motion Detection */}
            {right && velocityRight && ballPosRight && (
                <WayDetector
                    controller={right}
                    incomingSiteswap={incomingSiteswapRight}
                    onSuccess={successRight}
                    onError={error}
                    velocity={velocityRight}
                    pos={ballPosRight}
                />
            )}

            {/* Left Hand Motion Detection */}
            {left && velocityLeft && ballPosLeft && (
                <WayDetector
                    controller={left}
                    incomingSiteswap={incomingSiteswapLeft}
                    onSuccess={successLeft}
                    onError={error}
                    velocity={velocityLeft}
                    pos={ballPosLeft}
                />
            )}
        </>
    );
}
