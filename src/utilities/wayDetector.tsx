import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { XRControllerState } from "@react-three/xr";

function Arrow({
    origin = new THREE.Vector3(0, 0, 0),
    rotation = new THREE.Euler(0, 0, 0),
    length = 0.3,
    bodyRadius = 0.015,
    color = "orange",
    detectionIncoming,
    controller,
    onCollision,
    siteswap
}: {
    origin: THREE.Vector3;
    rotation?: THREE.Euler;
    length?: number;
    bodyRadius?: number;
    color?: string;
    detectionIncoming?: number;
    controller?: XRControllerState;
    onCollision?: (distance: number) => void;
    siteswap?: number;
}) {
    const bodyLength = length * 0.8;
    const headLength = length * 0.2;
    const headRadius = bodyRadius * 2;

    const hitbox = useRef<THREE.Object3D>(null);
    const [isColliding, setIsColliding] = useState(false);

    const collisionThreshold = 0.05;

    useFrame(() => {
        if (hitbox.current && controller && detectionIncoming) {
            const hitboxPosition = new THREE.Vector3();
            hitbox.current.getWorldPosition(hitboxPosition);

            const controllerPosition = new THREE.Vector3();
            controller?.object?.getWorldPosition(controllerPosition);

            const distance = hitboxPosition.distanceTo(controllerPosition);

            const wasColliding = isColliding;
            const nowColliding = distance < collisionThreshold;

            if (nowColliding && !wasColliding) {
                setIsColliding(true);
                if (onCollision && siteswap) onCollision(siteswap);
            } else if (!nowColliding && wasColliding) {
                setIsColliding(false);
            }
        }
    });

    const currentOpacity = siteswap === detectionIncoming ? 0.8 : 0.2;

    return (
        <group position={origin} rotation={rotation}>
            <mesh position={[0, 0, bodyLength - headLength]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[bodyRadius, bodyRadius, bodyLength, 16]} />
                <meshStandardMaterial color={color} transparent opacity={currentOpacity} />
            </mesh>
            <mesh position={[0, 0, bodyLength + headLength * 1.5]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[headRadius, headLength, 16]} />
                <meshStandardMaterial color={color} transparent opacity={currentOpacity} />
            </mesh>

            <mesh
                ref={hitbox}
                position={[0, 0, bodyLength + headLength * 1.5]}
                rotation={[Math.PI / 2, 0, 0]}
            >
                <sphereGeometry args={[collisionThreshold, 16, 16]} />
                <meshStandardMaterial color="white" transparent opacity={0.1} wireframe={true} />
            </mesh>
        </group>
    );
}

export function WayDetector({
    controller,
    incomingSiteswap,
    onSuccess,
    onError
}: {
    controller: XRControllerState;
    incomingSiteswap: number | undefined;
    onSuccess: Function;
    onError: Function;
}) {
    const [pos, setPos] = useState(new THREE.Vector3(0, 2, 0));
    const [button, setButton] = useState(true);

    const [hand, setHand] = useState(controller.inputSource.handedness);

    useEffect(() => {
        setHand(controller.inputSource.handedness);
    }, [controller]);

    useFrame(() => {
        if (controller) {
            const buttonIsPressed =
                hand === "right"
                    ? controller.gamepad?.["a-button"]?.button
                    : controller.gamepad?.["x-button"]?.button;

            if (button) {
                if (!buttonIsPressed) {
                    setButton(false);
                }
            } else {
                if (buttonIsPressed) {
                    const position = new THREE.Vector3();
                    controller?.object?.getWorldPosition(position);
                    setPos(position);
                    setButton(true);
                }
            }
        }
    });

    const handleCollision = (siteswap: number) => {
        if (siteswap === incomingSiteswap) {
            onSuccess();
            vibrateController(controller, 1, 50);
        } else {
            onError();
            vibrateController(controller, 1, 200);
        }
    };

    return (
        <>
            {button && (
                <>
                    <Arrow
                        color="yellow"
                        length={0.15}
                        origin={pos}
                        rotation={new THREE.Euler((hand === "right" ? 1 : 2) * Math.PI, 0, 0)}
                        controller={controller}
                        detectionIncoming={incomingSiteswap}
                        siteswap={1}
                        onCollision={handleCollision}
                    />
                    <Arrow
                        color="lightblue"
                        length={0.15}
                        origin={pos}
                        rotation={
                            new THREE.Euler(((hand === "right" ? -3 : -1) * Math.PI) / 4, 0, 0)
                        }
                        controller={controller}
                        detectionIncoming={incomingSiteswap}
                        siteswap={3}
                        onCollision={handleCollision}
                    />
                    <Arrow
                        color="lightgreen"
                        length={0.15}
                        origin={pos}
                        rotation={new THREE.Euler(-Math.PI / 2, 0, 0)}
                        controller={controller}
                        detectionIncoming={incomingSiteswap}
                        siteswap={2}
                        onCollision={handleCollision}
                    />
                </>
            )}
        </>
    );
}

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
