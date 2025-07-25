import { useThree } from "@react-three/fiber";
import { EventDispatcher } from "musicaljuggling";
import * as THREE from "three";

/**
 * Convert a DOMPointReadOnlyVector3 to a more commun Vector3 structur
 * @param entry
 * @returns Vector3
 */
export function DOMPointReadOnlyToVector3(entry: DOMPointReadOnly) {
    return new THREE.Vector3(entry.x, entry.y, entry.z);
}

/**
 * Detect if the hand make a pinch
 * @param hand - XRHand
 * @param frame - XRFrame
 * @param referenceSpace - ReferenceSpace
 * @param threshold under this distance (in meter) it's detected. Default = 0.025 (2.5 cm)
 * @returns boolean
 */
export function isPinching(
    hand: XRHand | undefined,
    frame: XRFrame | undefined,
    referenceSpace: XRReferenceSpace | undefined,
    threshold: number = 0.025
): boolean {
    if (!(hand && frame && frame.getJointPose && referenceSpace)) return false;

    const thumbTip = hand.get("thumb-tip");
    const indexTip = hand.get("index-finger-tip");

    if (!thumbTip || !indexTip) {
        return false;
    }

    const thumbPose = frame.getJointPose(thumbTip, referenceSpace);
    const indexPose = frame.getJointPose(indexTip, referenceSpace);

    if (!thumbPose || !indexPose) {
        return false;
    }

    const thumbPos = DOMPointReadOnlyToVector3(thumbPose.transform.position);
    const indexPos = DOMPointReadOnlyToVector3(indexPose.transform.position);

    const distance = thumbPos.distanceTo(indexPos);
    return distance < threshold;
}

/**
 * Detect if hand make a pinch between thumb and middle finger.
 * @param hand - XRHand
 * @param frame - XRFrame
 * @param referenceSpace - ReferenceSpace
 * @param threshold - under this distance (in meter) it's detected. Default = 0.025 (2.5 cm)
 * @returns boolean
 */
export function isPinchingMiddle(
    hand: XRHand | undefined,
    frame: XRFrame | undefined,
    referenceSpace: XRReferenceSpace,
    threshold: number = 0.025
): boolean {
    if (!(hand && frame && frame.getJointPose && referenceSpace)) return false;

    const thumbTip = hand.get("thumb-tip");
    const middleTip = hand.get("middle-finger-tip");

    if (!thumbTip || !middleTip) {
        return false;
    }

    const thumbPose = frame.getJointPose(thumbTip, referenceSpace);
    const middlePose = frame.getJointPose(middleTip, referenceSpace);

    if (!thumbPose || !middlePose) {
        return false;
    }

    const thumbPos = DOMPointReadOnlyToVector3(thumbPose.transform.position);
    const middlePos = DOMPointReadOnlyToVector3(middlePose.transform.position);

    const distance = thumbPos.distanceTo(middlePos);
    return distance < threshold;
}

/**
 * Detect if hand is open
 * @param hand - XRHand
 * @param frame - XRFrame
 * @param referenceSpace - ReferenceSpace
 * @param threshold - over this distance (in meter) it's detected. Default = 0.08 (8 cm)
 * @returns boolean
 */
export function isOpenHand(
    hand: XRHand | undefined,
    frame: XRFrame | undefined,
    referenceSpace: XRReferenceSpace | undefined,
    threshold: number = 0.08
): boolean {
    if (!(hand && frame && frame.getJointPose && referenceSpace)) return false;

    const palm = hand.get("middle-finger-metacarpal"); // Hand's center
    const indexTip = hand.get("index-finger-tip");
    const middleTip = hand.get("middle-finger-tip");
    const ringTip = hand.get("ring-finger-tip");
    const pinkyTip = hand.get("pinky-finger-tip");

    if (!palm || !indexTip || !middleTip || !ringTip || !pinkyTip) {
        return false;
    }

    const palmPose = frame.getJointPose(palm, referenceSpace);
    const indexPose = frame.getJointPose(indexTip, referenceSpace);
    const middlePose = frame.getJointPose(middleTip, referenceSpace);
    const ringPose = frame.getJointPose(ringTip, referenceSpace);
    const pinkyPose = frame.getJointPose(pinkyTip, referenceSpace);

    if (!palmPose || !indexPose || !middlePose || !ringPose || !pinkyPose) {
        return false;
    }

    const palmPos = DOMPointReadOnlyToVector3(palmPose.transform.position);
    const indexPos = DOMPointReadOnlyToVector3(indexPose.transform.position);
    const middlePos = DOMPointReadOnlyToVector3(middlePose.transform.position);
    const ringPos = DOMPointReadOnlyToVector3(ringPose.transform.position);
    const pinkyPos = DOMPointReadOnlyToVector3(pinkyPose.transform.position);

    const distances = [
        palmPos.distanceTo(indexPos),
        palmPos.distanceTo(middlePos),
        palmPos.distanceTo(ringPos),
        palmPos.distanceTo(pinkyPos)
    ];

    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;

    //if average distance is over threshold then the hand is open
    return avgDistance > threshold;
}

/**
 * /**
 * Detect if hand is close. Not just a not isOpenHand(), it check if hand is defined to prevent
 * falsy true.
 * @param hand - XRHand
 * @param frame - XRFrame
 * @param referenceSpace - ReferenceSpace
 * @param threshold - under this distance (in meter) it's detected. Default = 0.08 (8 cm)
 * @returns boolean
 */
export function isCloseHand(
    hand: XRHand | undefined,
    frame: XRFrame | undefined,
    referenceSpace: XRReferenceSpace | undefined,
    threshold: number = 0.08
): boolean {
    if (!(hand && frame && frame.getJointPose && referenceSpace)) return false;
    return !isOpenHand(hand, frame, referenceSpace, threshold);
}

type HandActionEvents = "pinch" | "pinch-middle" | "opened" | "closed";

export interface HandActionEvent {
    hand: XRHand;
    side: "left" | "right";
}

export class HandState extends EventDispatcher<HandActionEvents> {
    wasPinching = { left: false, right: false };
    wasPinchingMiddle = { left: false, right: false };
    wasOpenHand = { left: false, right: false };
    wasCloseHand = { left: false, right: false };

    pinchThreshold = 0.025;
    pinchMiddleThreshold = 0.025;
    openHandThreshold = 0.08;

    rightHand: XRHand | undefined;
    leftHand: XRHand | undefined;

    constructor({
        rightHand,
        leftHand,
        pinchThreshold = 0.025,
        pinchMiddleThreshold = 0.025,
        openHandThreshold = 0.08
    }: {
        rightHand?: XRHand;
        leftHand?: XRHand;
        pinchThreshold?: number;
        pinchMiddleThreshold?: number;
        openHandThreshold?: number;
    }) {
        super();
        this.pinchThreshold = pinchThreshold;
        this.pinchMiddleThreshold = pinchMiddleThreshold;
        this.openHandThreshold = openHandThreshold;

        if (rightHand) this.rightHand = rightHand;
        if (leftHand) this.leftHand = leftHand;
    }

    update(frame: XRFrame | undefined, referenceSpace: XRReferenceSpace | undefined) {
        if (!frame || !referenceSpace) return;

        if (isPinching(this.rightHand, frame, referenceSpace)) {
            if (!this.wasPinching.right) {
                this.dispatchEvent("pinch", { hand: this.rightHand, side: "right" });
            }
            this.wasPinching.right = true;
        } else {
            this.wasPinching.right = false;
        }

        if (isPinching(this.leftHand, frame, referenceSpace)) {
            if (!this.wasPinching.left) {
                this.dispatchEvent("pinch", { hand: this.leftHand, side: "left" });
            }
            this.wasPinching.left = true;
        } else {
            this.wasPinching.left = false;
        }

        if (isPinchingMiddle(this.rightHand, frame, referenceSpace)) {
            if (!this.wasPinchingMiddle.right) {
                this.dispatchEvent("pinch-middle", { hand: this.rightHand, side: "right" });
            }
            this.wasPinchingMiddle.right = true;
        } else {
            this.wasPinchingMiddle.right = false;
        }

        if (isPinchingMiddle(this.leftHand, frame, referenceSpace)) {
            if (!this.wasPinchingMiddle.left) {
                this.dispatchEvent("pinch-middle", { hand: this.leftHand, side: "left" });
            }
            this.wasPinchingMiddle.left = true;
        } else {
            this.wasPinchingMiddle.left = false;
        }

        if (isOpenHand(this.rightHand, frame, referenceSpace)) {
            if (!this.wasOpenHand.right) {
                this.dispatchEvent("opened", { hand: this.rightHand, side: "right" });
            }
            this.wasOpenHand.right = true;
        } else {
            this.wasOpenHand.right = false;
        }

        if (isOpenHand(this.leftHand, frame, referenceSpace)) {
            if (!this.wasOpenHand.left) {
                this.dispatchEvent("opened", { hand: this.leftHand, side: "left" });
            }
            this.wasOpenHand.left = true;
        } else {
            this.wasOpenHand.left = false;
        }

        if (isCloseHand(this.rightHand, frame, referenceSpace)) {
            if (!this.wasCloseHand.right) {
                this.dispatchEvent("closed", { hand: this.rightHand, side: "right" });
            }
            this.wasCloseHand.right = true;
        } else {
            this.wasCloseHand.right = false;
        }

        if (isCloseHand(this.leftHand, frame, referenceSpace)) {
            if (!this.wasCloseHand.left) {
                this.dispatchEvent("closed", { hand: this.leftHand, side: "left" });
            }
            this.wasCloseHand.left = true;
        } else {
            this.wasCloseHand.left = false;
        }
    }
}

export function getPosition(
    hand: XRHand,
    fingerName: XRHandJoint,
    frame: XRFrame,
    referenceSpace: XRReferenceSpace
): THREE.Vector3 | null {
    const finger = hand.get(fingerName);

    if (!finger || !frame.getJointPose) return null;
    console.log(finger);

    const fingerPose = frame.getJointPose(finger, referenceSpace);

    if (!fingerPose) return null;

    const fingerPos = DOMPointReadOnlyToVector3(fingerPose.transform.position);

    return fingerPos;
}
