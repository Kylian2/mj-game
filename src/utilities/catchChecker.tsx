import { useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from "react";
import { useFrame } from "@react-three/fiber";
import { useXRInputSourceState, type XRControllerState } from "@react-three/xr";
import * as THREE from "three";
import { Clock, PerformanceModel, Alerts, AlertsTimeline } from "musicaljuggling";
import { type AlertEvent } from "musicaljuggling";
import { Box } from "@react-three/drei";
import { bool } from "three/tsl";

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
    const listenedEvent = useRef<Array<AlertEvent>>([]);

    const hasCatchRight = useRef(false);
    const hasCatchLeft = useRef(false);
    const Aclick = useRef(false);
    const Xclick = useRef(false);

    useEffect(() => {
        const alertesTimeline = new AlertsTimeline();
        model.balls.forEach((ball) => {
            alertesTimeline.addTimeline(ball.timeline, 0.2);
        });

        let alertes = new Alerts(alertesTimeline, clock);

        alertes.addEventListener("inf", (e: AlertEvent) => {
            if (e.actionDescription === "caught") listenedEvent.current.push(e);
        });

        alertes.addEventListener("sup", (e: AlertEvent) => {
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

            const index = listenedEvent.current.indexOf(e);
            if (index > -1) {
                listenedEvent.current.splice(index, 1);
            }
        });

        return () => {
            alertes.removeAllEventListeners();
        };
    }, [model]);

    const left = useXRInputSourceState("controller", "left");
    const right = useXRInputSourceState("controller", "right");

    const vibrateController = (
        controller: XRControllerState | undefined,
        intensity = 1.0,
        duration = 100
    ) => {
        if (!controller || !controller.inputSource || !controller.inputSource.gamepad) {
            console.log("exit");
            return;
        }
        const gamepad = controller.inputSource.gamepad;
        if (gamepad.hapticActuators.length > 0) {
            gamepad.hapticActuators[0].pulse(intensity, duration);
        }
    };

    useFrame(() => {
        let leftSqueeze = left?.gamepad?.["xr-standard-squeeze"]?.button;
        let rightSqueeze = right?.gamepad?.["xr-standard-squeeze"]?.button;

        const rightPos = new THREE.Vector3();
        right?.object?.getWorldPosition(rightPos);

        const leftPos = new THREE.Vector3();
        left?.object?.getWorldPosition(leftPos);

        let eventToRemove = [];

        for (let i = 0; i < listenedEvent.current.length; i++) {
            const event = listenedEvent.current[i];

            if (event.actionDescription === "caught") {
                if (event.hand.isRightHand()) {
                    eventToRemove.push(i);
                    const ballObject = ballsRef.current.get(event.ball.id);
                    if (!ballObject) return;
                    const radius = (ballObject.children[0] as THREE.Mesh).geometry.parameters
                        .radius;
                    const ballWorldPos = new THREE.Vector3();
                    ballObject.getWorldPosition(ballWorldPos);
                    const distanceRight = rightPos.distanceTo(ballWorldPos);
                    console.log("radiusright = " + radius);
                    console.log("distanceright = " + distanceRight);
                    if (distanceRight <= radius) {
                        console.log("catchright");
                        ballObject.userData.isExplosing = true;
                        hasCatchRight.current = true;
                    }
                }
                if (!event.hand.isRightHand()) {
                    eventToRemove.push(i);
                    const ballObject = ballsRef.current.get(event.ball.id);
                    if (!ballObject) return;
                    const radius = (ballObject.children[0] as THREE.Mesh).geometry.parameters
                        .radius;
                    const ballWorldPos = new THREE.Vector3();
                    ballObject.getWorldPosition(ballWorldPos);
                    const distanceLeft = leftPos.distanceTo(ballWorldPos);
                    console.log("radiusleft = " + radius);
                    console.log("distanceleft = " + distanceLeft);
                    if (distanceLeft <= radius) {
                        console.log("catchleft");
                        ballObject.userData.isExplosing = true;
                        hasCatchLeft.current = true;
                    }
                }
            }
        }
        const rightSqueezeList = listenedEvent.current.filter(
            (e) => e.actionDescription === "caught" && e.hand.isRightHand()
        );
        const leftSqueezeList = listenedEvent.current.filter(
            (e) => e.actionDescription === "caught" && !e.hand.isRightHand()
        );

        for (let i = eventToRemove.length - 1; i > 0; i--) {
            listenedEvent.current.splice(i, 1);
        }
    });

    return <></>;
}
