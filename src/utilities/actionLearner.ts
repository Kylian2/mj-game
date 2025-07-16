import * as THREE from "three";

/**
 * Represents raw motion data captured during juggling actions
 */
interface ActionData {
    siteswapp: number; // Siteswap notation (juggling pattern)
    hand: string; // Which hand performed the action (left/right)
    action: string; // Type of action (throw, catch, etc.)
    positions: { t: number; position: THREE.Vector3 }[]; // Time-stamped 3D positions
}

/**
 * Represents a learned pattern template for recognition
 */
interface Recognition {
    siteswapp: number;
    hand: string;
    action: string;
    positions: THREE.Vector3[]; // Averaged relative positions forming the pattern template
}

/**
 * Machine learning system for juggling motion pattern recognition
 * Learns from multiple examples of the same action to create averaged pattern templates
 */
export class ActionLearner {
    data: ActionData[];
    recognition: Recognition[];

    /**
     * Creates a new ActionLearner instance
     * @param data - Optional initial training data
     */
    constructor(data: ActionData[] = []) {
        this.data = data;
        this.recognition = [];
    }

    /**
     * Adds new training data to the learner
     * @param data - Array of ActionData to add to training set
     */
    addData(data: ActionData[]): void {
        this.data.push(...data);
    }

    /**
     * Processes all training data to learn motion patterns
     * Groups similar actions and creates averaged pattern templates
     */
    computeData(): void {
        this.data.forEach((currentAction) => {
            // Skip if we already have a pattern for this action type
            if (
                this.recognition.filter((recognitionPattern) =>
                    this.compareActionData(currentAction, recognitionPattern)
                ).length > 0
            )
                return;

            // Find all similar actions in training data
            let similarActions = this.data.filter((action) =>
                this.compareActionData(currentAction, action)
            );

            let maxTrajectoryLength = 0;
            let normalizedTrajectories: THREE.Vector3[][] = [];

            // Convert absolute positions to relative positions and find max trajectory length
            similarActions.forEach((actionData) => {
                const startingPosition = actionData.positions[0];
                maxTrajectoryLength = Math.max(maxTrajectoryLength, actionData.positions.length);

                let relativePositions: THREE.Vector3[] = [];
                actionData.positions.forEach((timestampedPosition) => {
                    const relativePosition = timestampedPosition.position
                        .clone()
                        .sub(startingPosition.position);
                    relativePositions.push(relativePosition);
                });
                normalizedTrajectories.push(relativePositions);
            });
            console.log(normalizedTrajectories);
            let averagedPattern: THREE.Vector3[] = [];

            // Calculate averaged pattern template for each step
            for (let step = 0; step < maxTrajectoryLength; step++) {
                //get element a step index -> cant do normalizedTrajectories[step] because index can be over limit
                let positionsAtstep = normalizedTrajectories
                    .map((trajectory) => trajectory[step])
                    .filter((position) => position !== undefined);

                if (positionsAtstep.length === 0) continue;

                const averagePosition = new THREE.Vector3();

                positionsAtstep.forEach((vector) => {
                    averagePosition.add(vector);
                });

                averagePosition.divideScalar(positionsAtstep.length);
                averagedPattern.push(averagePosition);
            }

            // Store the learned pattern
            if (similarActions.length > 0) {
                this.recognition.push({
                    siteswapp: currentAction.siteswapp,
                    hand: currentAction.hand,
                    action: currentAction.action,
                    positions: averagedPattern
                });
            }
        });

        console.log(this.recognition);
    }

    /**
     * Compares two actions to determine if they represent the same action type
     * @param a - First action to compare
     * @param b - Second action to compare (can be ActionData or Recognition)
     * @returns True if actions have the same signature (action, hand, siteswapp)
     */
    compareActionData(a: ActionData, b: ActionData | Recognition): boolean {
        return a.action === b.action && a.hand === b.hand && a.siteswapp === b.siteswapp;
    }

    /**
     * Check if input is related to a learned pattern
     * @param input List of THREE.Vector3
     * @returns Recognition
     */
    check(input: THREE.Vector3[], hand: "left" | "right"): Recognition | undefined {
        if (input.length === 0) return undefined;

        const origin = input[0];
        //make positions relative to the first position
        const normalizedInput = input.map((v) => v.clone().sub(origin));

        let bestMatch: Recognition | undefined = undefined;
        let minDistance = Infinity;

        for (const rec of this.recognition) {
            if (rec.hand !== hand) continue;
            const len = Math.min(normalizedInput.length, rec.positions.length);
            let totalDist = 0;

            for (let i = 0; i < len; i++) {
                const dist = normalizedInput[i].distanceTo(rec.positions[i]);
                totalDist += dist;
            }

            const avgDist = totalDist / len;

            if (avgDist < minDistance && avgDist < 0.1) {
                //threshold
                minDistance = avgDist;
                bestMatch = rec;
            }
        }

        return bestMatch;
    }
}
