import { useFrame, useThree } from '@react-three/fiber'
import { useXRInputSourceState } from '@react-three/xr'
import { useRef, type ReactNode } from 'react'
import { WebGLRenderer } from 'three'

interface FlyingState {
    flyingModeEnable: boolean;
    isFlying: boolean;
}

interface FlyPlayerProps {
    xrOrigin?: any | null;
    always?: boolean;
    joystick?: boolean;
}

/**
 * Make the player move on y axe.
 *
 * @param {boolean} always - (true) if flying mode is always on (jump should be disable)
 * @param {boolean} joystick - (true) if flying mode is controlled by y axe on right joystick, otherwise it controlled by A and B buttons
 * @returns void
 */
export function FlyPlayer({ xrOrigin = null, always = true, joystick = true }: FlyPlayerProps): ReactNode {
    const controller = useXRInputSourceState('controller', 'right');
    const { gl } = useThree() as { gl: WebGLRenderer & { xr: any } };

    const flyingState = useRef<FlyingState>({
        flyingModeEnable: true,
        isFlying: false,
    });

    useFrame(() => {
        if (xrOrigin?.current == null || controller == null) {
            return;
        }

        const thumbstickState = controller.gamepad?.['xr-standard-thumbstick'];
        const gamepad = controller.gamepad;

        const buttonA: number = gamepad?.['a-button']?.button ?? 0;
        const buttonB: number = gamepad?.['b-button']?.button ?? 0;
        
        if (!gamepad) {
            return;
        }
        
        if (!flyingState.current.flyingModeEnable 
            || !(flyingState.current.isFlying || always) 
            || !(buttonA || buttonB || thumbstickState?.yAxis)) {
            return;
        }
        
        const referenceSpace = gl.xr.getReferenceSpace();
        if (!referenceSpace) {
            return;
        }

        let speed: number = 0.03; //meter or unite by frame
        
        if (!joystick) {
            if (buttonB) {
                speed = -speed;
            } else if (!buttonA) {
                return;
            }
        } else if (joystick && thumbstickState && Math.abs(thumbstickState.yAxis ?? 0) > 0.95) {
            speed = -speed * (thumbstickState.yAxis ?? 0);
        } else {
            return;
        }

        xrOrigin.current.position.y += speed;
    });

    return
}