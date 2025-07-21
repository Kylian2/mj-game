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
import { Clock, PerformanceModel, Alerts, AlertsTimeline } from "musicaljuggling";
import { type AlertEvent } from "musicaljuggling";
import { WayDetector } from "./wayDetector";

export function TossChecker({
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
    const [incomingSiteswapLeft, setIncomingSiteswapLeft] = useState<number | undefined>(undefined);
    const [incomingSiteswapRight, setIncomingSiteswapRight] = useState<number | undefined>(
        undefined
    );

    useEffect(() => {
        const alertesTimeline = new AlertsTimeline();
        model.balls.forEach((ball) => {
            alertesTimeline.addTimeline(ball.timeline, 0.2);
        });

        let alertes = new Alerts(alertesTimeline, clock);

        alertes.addEventListener("inf", (e: AlertEvent) => {
            if (e.actionDescription === "tossed") {
                if (e.hand.isRightHand()) {
                    setIncomingSiteswapRight(e.siteswapHeight);
                }

                if (!e.hand.isRightHand()) {
                    setIncomingSiteswapLeft(e.siteswapHeight);
                }
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

    useFrame(() => {});

    const successLeft = () => {
        setIncomingSiteswapLeft(undefined);
    };

    const successRight = () => {
        setIncomingSiteswapRight(undefined);
    };

    const error = () => {
        if (errorCount) errorCount.current++;
    };

    return (
        <>
            {right && (
                <WayDetector
                    controller={right}
                    incomingSiteswap={incomingSiteswapRight}
                    onSuccess={successRight}
                    onError={error}
                />
            )}
            {left && (
                <WayDetector
                    controller={left}
                    incomingSiteswap={incomingSiteswapLeft}
                    onSuccess={successLeft}
                    onError={error}
                />
            )}
        </>
    );
}
