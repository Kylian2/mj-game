import { useFrame, useThree } from "@react-three/fiber";
import { useXRInputSourceState } from "@react-three/xr";
import { useRef, type ReactNode } from "react";
import { WebGLRenderer } from "three";

interface JumpState {
    isJumping: boolean;
    jumpStartTime: number | undefined;
    jumpHeight: number;
    jumpDuration: number;
    currentJumpHeight: number;
    isFlying: boolean;
    lastButtonATrigger?: number;
}

interface JumpPlayerProps {
    xrOrigin?: any | null;
    enable?: boolean;
    alwaysFly?: boolean;
}

/**
 * Entry point of a a jump, this method init a jump which will be handle by updateJump()
 * If a double press on button A is detected, it toggle the flying mode.
 *
 * ISSUE : Currently using xrOrigin to move the player, it's better to use XRReferenceSpace translation instead to prevent
 * in game coordinate system / referenceSpace system desynchronisation. This desynchronisation make hand colision detection impossible
 * because hand use referenceSpace coordinates system.
 *
 * @returns void
 */
export function JumpPlayer({
    xrOrigin = null,
    enable = true,
    alwaysFly = false
}: JumpPlayerProps): ReactNode {
    const controller = useXRInputSourceState("controller", "right");
    const { gl } = useThree() as { gl: WebGLRenderer & { xr: any } };

    const jumpState = useRef<JumpState>({
        isJumping: false,
        jumpStartTime: undefined,
        jumpHeight: 0.5, //in meter or unit
        jumpDuration: 0.8, // second
        currentJumpHeight: 0,
        isFlying: false
    });

    useFrame(() => {
        if (xrOrigin == null || controller == null) {
            return;
        }

        const referenceSpace = gl.xr.getReferenceSpace();
        if (!referenceSpace) {
            return;
        }

        const buttonA = controller.gamepad?.["a-button"]?.button;

        if (enable && !jumpState.current.isJumping && !jumpState.current.isFlying && buttonA) {
            jumpState.current.isJumping = true;
            jumpState.current.jumpStartTime = Date.now();
            jumpState.current.jumpHeight = 0.5; //in meter or unit
            jumpState.current.jumpDuration = 0.8; // second
            jumpState.current.currentJumpHeight = 0;
            jumpState.current.isFlying = false;
        } else {
            if (
                !alwaysFly &&
                jumpState.current.lastButtonATrigger &&
                50 < Date.now() - jumpState.current.lastButtonATrigger &&
                Date.now() - jumpState.current.lastButtonATrigger < 400
            ) {
                //jumpState.current.isFlying = !jumpState.current.isFlying;
                //jumpState.current.isJumping = false;
            }
        }

        jumpState.current.lastButtonATrigger = Date.now();

        if (!jumpState.current.isJumping || !enable) {
            return;
        }

        // Compute jump progression
        const elapsedTime = (Date.now() - (jumpState.current.jumpStartTime || 0)) / 1000;
        const jumpProgress = Math.min(elapsedTime / jumpState.current.jumpDuration, 1.0);

        // y = 4 * h * t * (1 - t) with h is max height, t is progress (0-1)
        const newHeight = jumpState.current.jumpHeight * 4 * jumpProgress * (1 - jumpProgress);

        const deltaY = newHeight - jumpState.current.currentJumpHeight;
        jumpState.current.currentJumpHeight = newHeight;

        xrOrigin.current.position.y += deltaY;

        if (jumpProgress >= 1.0) {
            jumpState.current.isJumping = false;
        }
    });

    return;
}
