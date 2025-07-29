import { useFrame, useThree } from "@react-three/fiber";
import { Quaternion, Vector3, WebGLRenderer } from "three";
import { useXRInputSourceState } from "@react-three/xr";
import type { ReactNode } from "react";

interface MovePlayerProps {
    xrOrigin?: any | null;
}

/**
 * Make the player move horizontaly
 *
 * ISSUE : Currently using xrOrigin to move the player, it's better to use XRReferenceSpace translation instead to prevent
 * in game coordinate system / referenceSpace system desynchronisation. This desynchronisation make hand colision detection impossible
 * because hand use referenceSpace coordinates system.
 *
 * @param xrOrigin
 * @returns
 */
export function MovePlayer({ xrOrigin = null }: MovePlayerProps): ReactNode {
    const controller = useXRInputSourceState("controller", "left");
    const { gl } = useThree() as { gl: WebGLRenderer & { xr: any } }; // gl is the renderer

    useFrame(() => {
        if (xrOrigin?.current == null || controller == null) {
            return;
        }

        const thumbstickState = controller.gamepad?.["xr-standard-thumbstick"];
        if (thumbstickState == null) {
            return;
        }

        const referenceSpace = gl.xr.getReferenceSpace();
        if (!referenceSpace) {
            return;
        }

        const moveX: number = thumbstickState.xAxis ?? 0;
        const moveZ: number = thumbstickState.yAxis ?? 0;

        const speed: number = 0.03; // meter or unit per frame

        /* --- Claim headset orientation --- */
        const frame = gl.xr.getFrame();
        if (!frame) return;

        const viewerPose = frame.getViewerPose(referenceSpace);
        if (!viewerPose) return;

        const headQuaternion = new Quaternion(
            viewerPose.transform.orientation.x,
            viewerPose.transform.orientation.y,
            viewerPose.transform.orientation.z,
            viewerPose.transform.orientation.w
        );
        /* ----------------------------------------- */

        const forward = new Vector3();
        forward.set(0, 0, -1).applyQuaternion(headQuaternion);
        forward.y = 0;
        forward.normalize();

        const right = new Vector3();
        right.set(1, 0, 0).applyQuaternion(headQuaternion);
        right.y = 0;
        right.normalize();

        const moveDirection = new Vector3();
        moveDirection.addScaledVector(forward, -moveZ);
        moveDirection.addScaledVector(right, moveX);

        xrOrigin.current.position.x += moveDirection.x * speed;
        xrOrigin.current.position.z += moveDirection.z * speed;
    });

    return;
}
