import { useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from "react";
import { useFrame } from "@react-three/fiber";
import { useXRInputSourceState, type XRControllerState } from "@react-three/xr";
import * as THREE from "three";
import { Clock, PerformanceModel, Alerts, AlertsTimeline } from "musicaljuggling";
import { type AlertEvent } from "musicaljuggling";
import { Box } from "@react-three/drei";

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

    useEffect(() => {
        const alertesTimeline = new AlertsTimeline();
        model.balls.forEach((ball) => {
            alertesTimeline.addTimeline(ball.timeline, 0.2);
        });

        let alertes = new Alerts(alertesTimeline, clock);

        alertes.addEventListener("inf", (e: AlertEvent) => {
            if (e.actionDescription === "caught") {
                listenedEvent.current.push(e);
                // Réinitialiser les flags pour chaque nouvel événement
                if (e.hand.isRightHand()) {
                    hasCatchRight.current = false;
                } else {
                    hasCatchLeft.current = false;
                }
            }
        });

        alertes.addEventListener("sup", (e: AlertEvent) => {
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
        const rightPos = new THREE.Vector3();
        right?.object?.getWorldPosition(rightPos);

        const leftPos = new THREE.Vector3();
        left?.object?.getWorldPosition(leftPos);

        const eventToRemove: number[] = [];

        for (let i = 0; i < listenedEvent.current.length; i++) {
            const event = listenedEvent.current[i];

            if (event.actionDescription === "caught") {
                const ballObject = ballsRef.current?.get(event.ball.id);
                if (!ballObject) continue;

                const radius = (ballObject.children[0] as THREE.Mesh).geometry.parameters.radius;
                const ballWorldPos = new THREE.Vector3();
                ballObject.getWorldPosition(ballWorldPos);

                if (event.hand.isRightHand()) {
                    const distanceRight = rightPos.distanceTo(ballWorldPos);

                    if (distanceRight <= radius) {
                        ballObject.userData.isExplosing = true;
                        hasCatchRight.current = true;
                        vibrateController(right, 1, 50);
                        eventToRemove.push(i);
                    }
                } else {
                    const distanceLeft = leftPos.distanceTo(ballWorldPos);

                    if (distanceLeft <= radius) {
                        ballObject.userData.isExplosing = true;
                        hasCatchLeft.current = true;
                        vibrateController(left, 1, 50);
                        eventToRemove.push(i);
                    }
                }
            }
        }

        // Supprimer les événements traités (en ordre décroissant)
        eventToRemove.sort((a, b) => b - a);
        eventToRemove.forEach((index) => {
            listenedEvent.current.splice(index, 1);
        });
    });

    return <></>;
}
