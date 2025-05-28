import { useFrame, useThree } from '@react-three/fiber'
import { useXRInputSourceState } from '@react-three/xr'
import { useRef, type ReactNode } from 'react'
import { WebGLRenderer } from 'three'

interface RotationState {
    isLeftTriggered: boolean;
    isRightTriggered: boolean;
    lastRotationTime: number;
    lastJoystickValue: number;
    currentRotationSpeed: number;
    targetRotationSpeed: number;
    rotationDirection: number;
    rotationInProgress: boolean;
}

interface RotatePlayerProps {
    discrete?: boolean;
}

/**
 * Make rotation when left or right joystick is pushed
 * 
 * @param discrete true if discrete rotation mode is enabled (30 degrees rotation)
 * 
 * @returns void
 */
export function RotatePlayer({ discrete = false }: RotatePlayerProps): ReactNode {
    const controller = useXRInputSourceState('controller', 'right');
    const { gl } = useThree() as { gl: WebGLRenderer & { xr: any } }; // gl is the renderer
    
    const rotationState = useRef<RotationState>({
        isLeftTriggered: false,
        isRightTriggered: false,
        lastRotationTime: 0,
        lastJoystickValue: 0,
        currentRotationSpeed: 0,
        targetRotationSpeed: 0,
        rotationDirection: 0,
        rotationInProgress: false
    });

    useFrame(() => {
        if (controller == null) {
            return;
        }

        const thumbStickState = controller.gamepad?.['xr-standard-thumbstick'];
        if (thumbStickState == null) {
            return;
        }
        
        const referenceSpace = gl.xr.getReferenceSpace();
        if (!referenceSpace) {
            return;
        }

        const joystickX: number = thumbStickState.xAxis ?? 0;
        
        if (!rotationState.current) {
            rotationState.current = {
                isLeftTriggered: false,
                isRightTriggered: false,
                lastRotationTime: 0,
                lastJoystickValue: 0,
                currentRotationSpeed: 0,
                targetRotationSpeed: 0,
                rotationDirection: 0,
                rotationInProgress: false
            };
        }
        
        let rotationAngle: number = 0;

        if (discrete) {
            const threshold: number = 0.7;
            rotationAngle = Math.PI / 6; // 30 degrees
            const rotationDelay: number = 250; // 250 ms
            
            const currentTime: number = Date.now();
            if (currentTime - rotationState.current.lastRotationTime < rotationDelay) {
                return;
            }
            
            if (Math.abs(joystickX) < threshold) {
                return;
            }

            rotationAngle = Math.sign(joystickX) * rotationAngle;
        } else {
            const accelerationFactor: number = 0.05;  // small = slow
            const decelerationFactor: number = 0.1;   // small = slow
            const maxRotationSpeed: number = Math.PI / 160;  
            
            if (Math.abs(joystickX) > 0.05) {
                rotationState.current.rotationDirection = Math.sign(joystickX);
                rotationState.current.targetRotationSpeed = Math.pow(Math.abs(joystickX), 2) * maxRotationSpeed;
                rotationState.current.rotationInProgress = true;
            } else {
                rotationState.current.targetRotationSpeed = 0;
            }
            
            if (rotationState.current.currentRotationSpeed < rotationState.current.targetRotationSpeed) {
                // acceleration
                rotationState.current.currentRotationSpeed += (rotationState.current.targetRotationSpeed - rotationState.current.currentRotationSpeed) * accelerationFactor;
            } else if (rotationState.current.currentRotationSpeed > rotationState.current.targetRotationSpeed) {
                // deceleration
                rotationState.current.currentRotationSpeed -= (rotationState.current.currentRotationSpeed - rotationState.current.targetRotationSpeed) * decelerationFactor;
            }
            
            rotationAngle = rotationState.current.currentRotationSpeed * rotationState.current.rotationDirection;
        }

        const viewerPose = gl.xr.getFrame().getViewerPose(referenceSpace);
        const position = viewerPose.transform.position;

        const applyRotation = (angle: number): void => {
            const rotationQuaternion = {
                x: 0,
                y: Math.sin(angle / 2),
                z: 0,
                w: Math.cos(angle / 2)
            };
            
            try {
                // Step 1: move to center
                const moveToOrigin = new XRRigidTransform(
                    { x: position.x, y: 0, z: position.z },
                    { x: 0, y: 0, z: 0, w: 1 }
                );
                let newReferenceSpace = referenceSpace.getOffsetReferenceSpace(moveToOrigin);
                
                // Step 2: apply rotation
                const rotate = new XRRigidTransform(
                    { x: 0, y: 0, z: 0 },
                    rotationQuaternion
                );
                newReferenceSpace = newReferenceSpace.getOffsetReferenceSpace(rotate);
                
                // Step 3: back to initial position
                const moveBack = new XRRigidTransform(
                    { x: -position.x, y: 0, z: -position.z },
                    { x: 0, y: 0, z: 0, w: 1 }
                );
                newReferenceSpace = newReferenceSpace.getOffsetReferenceSpace(moveBack);
                
                gl.xr.setReferenceSpace(newReferenceSpace);
            } catch (e) {
                console.error("Error while rotating", e);
            }
        };
        
        applyRotation(rotationAngle);
        rotationState.current.lastRotationTime = Date.now();
        rotationState.current.lastJoystickValue = joystickX;
    });

    return
}