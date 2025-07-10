import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Convert a DOMPointReadOnlyVector3 to a more commun Vector3 structur
 * @param entry
 * @returns Vector3
 */
function DOMPointReadOnlyToVector3(entry: DOMPointReadOnly) {
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
