import { useFrame } from "@react-three/fiber";
import {
    Alerts,
    AlertsTimeline,
    BallModel,
    Clock,
    type AlertEvent,
    type PerformanceModel
} from "musicaljuggling";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { vibrateController } from "./vibrateController";
import { useXRInputSourceState } from "@react-three/xr";

/**
 * This component make the controllers vibrate when balls are in the hands (only if controllers are close of the
 * optimal balls trajectory)
 *
 * **WARNING : When using with other component that also use clock (catchChecker & tossChecker), declare this component before
 * to avoid no throwed events problems**
 *
 * @param model - The performance model
 * @param clock - The clock
 * @param reset - Increment to send a reset signal
 * @returns
 */
export function FollowTrajectory({
    model,
    clock,
    reset = 0,
    active = true
}: {
    model: PerformanceModel;
    clock: Clock;
    reset?: number;
    active?: boolean;
}) {
    // List containing balls in the left and right hand
    const ballToFollowLeft = useRef<BallModel[]>([]);
    const ballToFollowRight = useRef<BallModel[]>([]);

    useEffect(() => {
        // Creating an alert system to be alerted when balls are tossed or caught
        const alertsTimeline = new AlertsTimeline();
        model.balls.forEach((ball) => {
            alertsTimeline.addTimeline(ball.timeline);
        });
        const alerts = new Alerts(alertsTimeline, clock);

        // We want to be warn on each event
        alerts.addEventListener("instant", (e: AlertEvent) => {
            // If a ball is caught then we add it to our hands
            if (e.actionDescription === "caught" && active) {
                if (e.hand.isRightHand()) {
                    ballToFollowRight.current.push(e.ball);
                }
                if (!e.hand.isRightHand()) {
                    ballToFollowLeft.current.push(e.ball);
                }
            }

            //If a ball is tossed we remove it from the hand
            if (e.actionDescription === "tossed" && active) {
                const indexRight = ballToFollowRight.current.indexOf(e.ball);
                const indexLeft = ballToFollowLeft.current.indexOf(e.ball);
                if (indexRight > -1) {
                    ballToFollowRight.current.splice(indexRight, 1);
                }
                if (indexLeft > -1) {
                    ballToFollowLeft.current.splice(indexLeft, 1);
                }
            }
        });

        return () => {
            alerts.removeAllEventListeners();
        };
    }, [model, clock]);

    useEffect(() => {
        // Empty both hand
        ballToFollowLeft.current = [];
        ballToFollowRight.current = [];
    }, [reset]);

    const leftController = useXRInputSourceState("controller", "left");
    const rightController = useXRInputSourceState("controller", "right");

    //At each frame we check if controllers are closed of the perfect trajectory
    useFrame(() => {
        if (!active) return;
        // For each ball we have in hand
        ballToFollowRight.current.forEach((ball) => {
            let position: THREE.Vector3 = new THREE.Vector3();
            // Retrieve controller position
            if (rightController) {
                rightController?.object?.getWorldPosition(position);
            }
            // If controller position is closed of perfect ball trajectory then it vibrate
            if (arePositionsClose(position, ball.position(clock.getTime()))) {
                vibrateController(rightController, 0.05, 20);
            }
        });

        // Same for left side
        ballToFollowLeft.current.forEach((ball) => {
            let position: THREE.Vector3 = new THREE.Vector3();
            if (leftController) {
                leftController?.object?.getWorldPosition(position);
            }
            if (arePositionsClose(position, ball.position(clock.getTime()))) {
                vibrateController(leftController, 0.05, 20);
            }
        });
    });

    return <></>;
}

/**
 * Compare to position and check if they are close or not
 * @param pos1 - First position to be compared
 * @param pos2 - Second position to be compared
 * @param threshold - threshold used to know if positions are close
 * @returns - true if close, false otherwise
 */
function arePositionsClose(
    pos1: THREE.Vector3,
    pos2: THREE.Vector3,
    threshold: number = 0.05
): boolean {
    const deltaX = pos1.x - pos2.x;
    const deltaY = pos1.y - pos2.y;
    const deltaZ = pos1.z - pos2.z;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);

    return distance <= threshold;
}
