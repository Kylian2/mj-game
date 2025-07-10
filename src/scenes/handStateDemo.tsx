import { Box, Cone, Octahedron, Sphere } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useXRInputSourceState } from "@react-three/xr";
import { useEffect, useState } from "react";
import * as THREE from "three";
import {
    HandState,
    isCloseHand,
    isOpenHand,
    isPinching,
    isPinchingMiddle,
    type HandActionEvent
} from "../utilities/handState";
import { Root } from "@react-three/uikit";
import { Text } from "@react-three/uikit";

export function HandStateDemo() {
    const { gl } = useThree() as { gl: THREE.WebGLRenderer & { xr: any } };
    const referenceSpace = gl.xr.getReferenceSpace();

    const [pinchIndex, setPinchIndex] = useState(false);
    const [pinchMajor, setPinchMajor] = useState(false);
    const [handOpen, setHandOpen] = useState(false);
    const [handClose, setHandClose] = useState(false);

    const handSourceRight = useXRInputSourceState("hand", "right");
    const right = handSourceRight?.inputSource?.hand;

    const handSourceLeft = useXRInputSourceState("hand", "left");
    const left = handSourceLeft?.inputSource?.hand;

    const [text, setText] = useState<string>();

    const [handState, setHandState] = useState<HandState>();

    useEffect(() => {
        if (left && right) {
            setHandState(new HandState({ leftHand: left, rightHand: right }));
        } else if (left) {
            setHandState(new HandState({ leftHand: left }));
        } else if (right) {
            setHandState(new HandState({ rightHand: right }));
        }
    }, [left, right]);

    useEffect(() => {
        if (!handState) return;

        handState?.addEventListener("pinch", (e: HandActionEvent) => {
            setText("La main " + (e.side === "left" ? "gauche" : "droite") + " a pinche");
        });

        handState?.addEventListener("pinch-middle", (e: HandActionEvent) => {
            setText(
                "La main " + (e.side === "left" ? "gauche" : "droite") + " a pinche avec le majeur"
            );
        });

        handState?.addEventListener("opened", (e: HandActionEvent) => {
            setText("La main " + (e.side === "left" ? "gauche" : "droite") + " s'est ouverte");
        });

        handState?.addEventListener("closed", (e: HandActionEvent) => {
            setText("La main " + (e.side === "left" ? "gauche" : "droite") + " s'est fermee");
        });

        return () => {
            handState?.removeAllEventListeners();
        };
    }, [handState]);

    useFrame((_, __, frame) => {
        handState?.update(frame, referenceSpace);

        setPinchIndex(isPinching(right, frame, referenceSpace));
        setPinchMajor(isPinchingMiddle(right, frame, referenceSpace));
        setHandOpen(isOpenHand(right, frame, referenceSpace));
        setHandClose(isCloseHand(right, frame, referenceSpace));
    });

    return (
        <>
            <Box args={[0.5, 0.5, 0.5]} position={[4, 1, -0.5]}>
                <meshBasicMaterial color={pinchIndex ? "red" : "grey"}></meshBasicMaterial>
            </Box>
            <Sphere args={[0.3, 32, 16]} position={[4, 1, -1.5]}>
                <meshBasicMaterial color={pinchMajor ? "blue" : "grey"}></meshBasicMaterial>
            </Sphere>
            <Cone args={[0.3, 0.5, 16]} position={[4, 1, 0.5]}>
                <meshBasicMaterial color={handOpen ? "purple" : "grey"}></meshBasicMaterial>
            </Cone>
            <Octahedron args={[0.3, 0]} position={[4, 1, 1.5]}>
                <meshBasicMaterial color={handClose ? "green" : "grey"}></meshBasicMaterial>
            </Octahedron>

            <group position={[4.3, 1.7, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <Root>
                    <Text backgroundColor={"white"} padding={2}>
                        Dernier evenement : {text ? text : "aucun"}
                    </Text>
                </Root>
            </group>
        </>
    );
}
