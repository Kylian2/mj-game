import { Box, Cone, Octahedron, Sphere } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useXRInputSourceState } from "@react-three/xr";
import { useState } from "react";
import * as THREE from "three";
import { isCloseHand, isOpenHand, isPinching, isPinchingMiddle } from "../utilities/handState";

export function HandStateDemo() {
    const { gl } = useThree() as { gl: THREE.WebGLRenderer & { xr: any } };
    const referenceSpace = gl.xr.getReferenceSpace();

    const [pinchIndex, setPinchIndex] = useState(false);
    const [pinchMajor, setPinchMajor] = useState(false);
    const [handOpen, setHandOpen] = useState(false);
    const [handClose, setHandClose] = useState(false);

    const handSource = useXRInputSourceState("hand", "right");
    const hand = handSource?.inputSource?.hand;

    useFrame((_, __, frame) => {
        setPinchIndex(isPinching(hand, frame, referenceSpace));
        setPinchMajor(isPinchingMiddle(hand, frame, referenceSpace));
        setHandOpen(isOpenHand(hand, frame, referenceSpace));
        setHandClose(isCloseHand(hand, frame, referenceSpace));
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
        </>
    );
}
