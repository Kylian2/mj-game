import {
    useEffect,
    useRef,
    type Dispatch,
    type Ref,
    type RefObject,
    type SetStateAction
} from "react";
import { useFrame } from "@react-three/fiber";
import { useXRInputSourceState, type XRControllerState } from "@react-three/xr";
import * as THREE from "three";
import { Clock, PerformanceModel, Alerts, AlertsTimeline } from "musicaljuggling";
import { type AlertEvent } from "musicaljuggling";
import { Box } from "@react-three/drei";

export function TossProgress({
    clock,
    ballsRef,
    model,
    errorCount,
    setErrorText,
    indicatorPosition = [0.5, 1.1, 0], // Position générale des indicateurs [x, y, z]
    indicatorSpacing = 0.8 // Écart entre les deux indicateurs (distance sur l'axe Z)
}: {
    clock: Clock;
    ballsRef: RefObject<Map<string, THREE.Object3D<THREE.Object3DEventMap>>>;
    model: PerformanceModel;
    errorCount?: RefObject<number>;
    setErrorText?: Dispatch<SetStateAction<string>>;
    indicatorPosition?: [number, number, number];
    indicatorSpacing?: number;
}) {
    const lastInfEvent = useRef<AlertEvent>(null);
    const listenedEvent = useRef<Array<AlertEvent>>([]);

    const Aclick = useRef(false);
    const Xclick = useRef(false);

    const indicatorSize: [number, number, number] = [0.1, 0.6, 0.1];

    const leftIndicatorPosition: [number, number, number] = [
        indicatorPosition[0],
        indicatorPosition[1],
        indicatorPosition[2] - indicatorSpacing / 2
    ];

    const rightIndicatorPosition: [number, number, number] = [
        indicatorPosition[0],
        indicatorPosition[1],
        indicatorPosition[2] + indicatorSpacing / 2
    ];

    const leftFillPosition: [number, number, number] = [
        leftIndicatorPosition[0],
        leftIndicatorPosition[1] - indicatorSize[1] / 2,
        leftIndicatorPosition[2]
    ];

    const rightFillPosition: [number, number, number] = [
        rightIndicatorPosition[0],
        rightIndicatorPosition[1] - indicatorSize[1] / 2,
        rightIndicatorPosition[2]
    ];

    useEffect(() => {
        const alertesTimeline = new AlertsTimeline();
        model.balls.forEach((ball) => {
            alertesTimeline.addTimeline(ball.timeline, 0.2);
        });

        let alertes = new Alerts(alertesTimeline, clock);

        alertes.addEventListener("inf", (e: AlertEvent, time: number) => {
            const ball = ballsRef.current.get(e.ball.id);
            const color = (ball?.children[0].material as THREE.MeshBasicMaterial).color;

            if (e.actionDescription === "tossed") {
                if (e.hand.isRightHand()) {
                    if (!rightRefToss.current) return;
                    rightRefToss.current.visible = true;
                    (rightRefToss.current.material as THREE.MeshBasicMaterial).color.set(color);
                    rightRefToss.current.userData.isScalingY = true;
                    rightRefToss.current.userData.startScalingTime = time;
                    rightRefToss.current.scale.y = 0;
                } else {
                    if (!leftRefToss.current) return;
                    leftRefToss.current.visible = true;
                    (leftRefToss.current.material as THREE.MeshBasicMaterial).color.set(color);
                    leftRefToss.current.userData.isScalingY = true;
                    leftRefToss.current.userData.startScalingTime = time;
                    leftRefToss.current.scale.y = 0;
                }
            }

            listenedEvent.current.push(e);
            lastInfEvent.current = e;
        });

        alertes.addEventListener("sup", (e: AlertEvent) => {
            if (e === lastInfEvent.current) {
                if (e.actionDescription === "tossed") {
                    if (e.hand.isRightHand()) {
                        if (!rightRefToss.current) return;
                        (rightRefToss.current.material as THREE.MeshBasicMaterial).color.set(
                            "white"
                        );
                        rightRefToss.current.visible = false;
                    } else {
                        if (!leftRefToss.current) return;
                        (leftRefToss.current.material as THREE.MeshBasicMaterial).color.set(
                            "white"
                        );
                        leftRefToss.current.visible = false;
                    }
                }
            }

            if (e.actionDescription === "tossed" && e.hand.isRightHand() && !Aclick.current) {
                if (errorCount) errorCount.current++;
                if (setErrorText) {
                    setErrorText("Vous n'avez pas lance la balle a droite");
                }
            }

            if (e.actionDescription === "tossed" && !e.hand.isRightHand() && !Xclick.current) {
                if (errorCount) errorCount.current++;
                if (setErrorText) {
                    setErrorText("Vous n'avez pas lance la balle a gauche");
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

    let score = 0;

    useFrame(() => {
        let leftX = left?.gamepad?.["x-button"]?.button;
        let rightA = right?.gamepad?.["a-button"]?.button;

        let eventToRemove = [];

        for (let i = 0; i < listenedEvent.current.length; i++) {
            const event = listenedEvent.current[i];

            if (event.actionDescription === "tossed") {
                if (event.hand.isRightHand() && rightA) {
                    score++;
                    eventToRemove.push(i);
                    const ballObject = ballsRef.current.get(event.ball.id);
                    if (!ballObject) return;
                    ballObject.userData.isExplosing = true;
                    if (rightRefToss.current) {
                        rightRefToss.current.visible = false;
                    }
                    Aclick.current = true;
                }
                if (!event.hand.isRightHand() && leftX) {
                    score++;
                    eventToRemove.push(i);
                    const ballObject = ballsRef.current.get(event.ball.id);
                    if (!ballObject) return;
                    ballObject.userData.isExplosing = true;
                    if (leftRefToss.current) {
                        leftRefToss.current.visible = false;
                    }
                    Xclick.current = true;
                }
            }
        }

        const A = listenedEvent.current.filter(
            (e) => e.actionDescription === "tossed" && e.hand.isRightHand()
        );
        const X = listenedEvent.current.filter(
            (e) => e.actionDescription === "tossed" && !e.hand.isRightHand()
        );

        if (rightA && A.length === 0) {
            vibrateController(right, 3, 100);
            if (errorCount) errorCount.current++;
            if (setErrorText) {
                setErrorText("Mauvais timing");
            }
        }

        if (leftX && X.length === 0) {
            vibrateController(left, 3, 100);
            if (errorCount) errorCount.current++;
            if (setErrorText) {
                setErrorText("Mauvais timing");
            }
        }

        for (let i = eventToRemove.length - 1; i > 0; i--) {
            listenedEvent.current.splice(i, 1);
        }

        scaleY(leftRefToss.current as THREE.Object3D, clock);
        scaleY(rightRefToss.current as THREE.Object3D, clock);
        //console.log(score);
    });

    const leftRefToss = useRef<THREE.Mesh>(null);
    const rightRefToss = useRef<THREE.Mesh>(null);

    useEffect(() => {
        if (leftRefToss.current) {
            leftRefToss.current.visible = false;
            leftRefToss.current.geometry.translate(0, 0.6 / 2, 0);
        }
        if (rightRefToss.current) {
            rightRefToss.current.visible = false;
            rightRefToss.current.geometry.translate(0, 0.6 / 2, 0);
        }
    }, []);

    return (
        <>
            {/* Indicateur gauche (fixe) */}
            <Box args={indicatorSize} position={leftIndicatorPosition}>
                <meshBasicMaterial alphaHash={true} opacity={0.1}></meshBasicMaterial>
            </Box>
            {/* Indicateur gauche (animé) */}
            <Box ref={leftRefToss} args={indicatorSize} position={leftFillPosition}>
                <meshBasicMaterial></meshBasicMaterial>
            </Box>

            {/* Indicateur droit (fixe) */}
            <Box args={indicatorSize} position={rightIndicatorPosition}>
                <meshBasicMaterial alphaHash={true} opacity={0.1}></meshBasicMaterial>
            </Box>
            {/* Indicateur droit (animé) */}
            <Box ref={rightRefToss} args={indicatorSize} position={rightFillPosition}>
                <meshBasicMaterial opacity={1}></meshBasicMaterial>
            </Box>
        </>
    );
}

export function scaleY(obj: THREE.Object3D, clock: Clock) {
    if (!obj.userData.isScalingY) {
        return;
    }

    const scaleDuration = 0.2;
    const scaleAvencement = (clock.getTime() - obj.userData.startScalingTime) / scaleDuration;

    const startScale = 0;
    const targetScale = 1;

    const currentScale = startScale + (targetScale - startScale) * scaleAvencement;
    if (currentScale >= targetScale) {
        obj.userData.isScalingY = false;
        obj.visible = false;
        return;
    }
    obj.scale.y = currentScale;
}
