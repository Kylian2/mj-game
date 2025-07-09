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

    const squeezeRightClick = useRef(false);
    const squeezeLeftClick = useRef(false);
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
                !squeezeRightClick.current
            ) {
                if (errorCount) errorCount.current++;
                if (setErrorText) {
                    setErrorText("Vous n'avez pas rattrape la balle a droite");
                }
            }

            if (
                e.actionDescription === "caught" &&
                !e.hand.isRightHand() &&
                !squeezeLeftClick.current
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

        let eventToRemove = [];

        for (let i = 0; i < listenedEvent.current.length; i++) {
            const event = listenedEvent.current[i];

            if (event.actionDescription === "caught") {
                if (event.hand.isRightHand() && rightSqueeze) {
                    eventToRemove.push(i);
                    const ballObject = ballsRef.current.get(event.ball.id);
                    if (!ballObject) return;
                    ballObject.userData.isExplosing = true;
                    squeezeRightClick.current = true;
                }
                if (!event.hand.isRightHand() && leftSqueeze) {
                    eventToRemove.push(i);
                    const ballObject = ballsRef.current.get(event.ball.id);
                    if (!ballObject) return;
                    ballObject.userData.isExplosing = true;
                    squeezeLeftClick.current = true;
                }
            }
        }
        const rightSqueezeList = listenedEvent.current.filter(
            (e) => e.actionDescription === "caught" && e.hand.isRightHand()
        );
        const leftSqueezeList = listenedEvent.current.filter(
            (e) => e.actionDescription === "caught" && !e.hand.isRightHand()
        );

        if (rightSqueeze && rightSqueezeList.length === 0) {
            vibrateController(right, 3, 100);
            if (errorCount) errorCount.current++;
            if (setErrorText) {
                setErrorText("Mauvais timing !");
            }
        }

        if (leftSqueeze && leftSqueezeList.length === 0) {
            vibrateController(left, 3, 100);
            if (errorCount) errorCount.current++;
            if (setErrorText) {
                setErrorText("Mauvais timing !");
            }
        }

        for (let i = eventToRemove.length - 1; i > 0; i--) {
            listenedEvent.current.splice(i, 1);
        }
    });

    return <></>;
}
