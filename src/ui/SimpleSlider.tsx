import { useCallback, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Clock } from "musicaljuggling";
import { useHover } from "@react-three/xr";
import { Vector3, Mesh, Group, Plane } from "three";

/**
 * Props interface for the SimpleSlider component
 */
interface SimpleSliderProps {
    clock: Clock; // Clock instance for time management
    width?: number; // Width of the slider track (default: 3)
    position?: [number, number, number]; // 3D position of the slider
    trackColor?: string; // Color of the slider track
    cursorColor?: string; // Color of the draggable cursor
    fillColor?: string; // Color of the fill area (progress indicator)
    infColor?: string; // Color of the inf bound marker
    supColor?: string; // Color of the sup bound marker
}

/**
 * SimpleSlider Component
 *
 * @param clock - Clock instance that manages the juggling performance timeline
 * @param width - Total width of the slider
 * @param position - 3D coordinates where the slider should be positioned
 * @param trackColor - Hex color for the background track
 * @param cursorColor - Hex color for the draggable cursor sphere
 * @param fillColor - Hex color for the progress fill area
 * @param infColor - Hex color for the inf bound marker
 * @param supColor - Hex color for the sup bound marker
 */
export function SimpleSlider({
    clock,
    width = 3,
    position = [0, 0, 0],
    trackColor = "#666666",
    cursorColor = "#ffffff",
    fillColor = "#B10F2E",
    infColor = "#90EE90",
    supColor = "#FF6B6B"
}: SimpleSliderProps) {
    const cursorRef = useRef<Mesh>(null!); // The draggable sphere cursor
    const fillRef = useRef<Mesh>(null!); // The progress fill bar
    const groupRef = useRef<Group>(null!); // The container group for coordinate transformations
    const infRef = useRef<Mesh>(null!); // The inf bound marker
    const supRef = useRef<Mesh>(null!); // The sup bound marker

    // Store local positions for inf and sup markers
    const infPositionRef = useRef<number>(-width / 4); // Position initiale à 25% de la barre
    const supPositionRef = useRef<number>(width / 4); // Position initiale à 75% de la barre

    // State management for user interactions
    const [isDragging, setIsDragging] = useState(false);
    const [isDraggingInf, setIsDraggingInf] = useState(false);
    const [isDraggingSup, setIsDraggingSup] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isInfHovered, setIsInfHovered] = useState(false);
    const [isSupHovered, setIsSupHovered] = useState(false);
    const [dragOffset, setDragOffset] = useState<Vector3 | null>(null); // Offset for smooth dragging

    const infTime = useRef(0);
    const supTime = useRef(0);

    /**
     * Converts a local X position on the slider to a time value
     *
     * Maps the slider's physical width to the clock's time bounds.
     *
     * @param positionX - X coordinate in local slider space (-width/2 to +width/2)
     * @returns Time value corresponding to the position
     */
    const positionToTime = useCallback(
        (positionX: number) => {
            // Clamp position to slider bounds
            const clampedX = Math.max(-width / 2, Math.min(width / 2, positionX));

            // Convert to 0-1 progress value
            const progress = (clampedX + width / 2) / width;

            // Use clock bounds for time conversion
            const [min, max] = clock.getBounds();
            const minTime = min ?? 0;
            const maxTime = max ?? 20;

            return minTime + progress * (maxTime - minTime);
        },
        [width, clock]
    );

    /**
     * Converts a time value to a local X position on the slider
     *
     * Inverse of positionToTime - maps time values back to slider coordinates
     * for updating the visual position of the cursor.
     *
     * @param time - Time value to convert
     * @returns X coordinate in local slider space
     */
    const timeToPosition = useCallback(
        (time: number) => {
            // Use clock bounds for position conversion
            const [min, max] = clock.getBounds();
            const minTime = min ?? 0;
            const maxTime = max ?? 20;

            // Convert time to 0-1 progress, then to slider coordinate space
            const progress = Math.max(0, Math.min(1, (time - minTime) / (maxTime - minTime)));
            return (progress - 0.5) * width;
        },
        [width, clock]
    );

    /**
     * Create virtual bounds for the clock
     */
    const handleBornePassing = useCallback(() => {
        const time = clock.getTime();
        if (time > supTime.current) {
            clock.setTime(infTime.current);
            if (!clock.getLoop()) {
                clock.pause();
            }
        }
        if (time < infTime.current) {
            clock.setTime(infTime.current);
        }
    }, []);

    //Set initial interval bounds and add eventListener to check when time is updated
    useEffect(() => {
        supPositionRef.current = width / 2;
        infPositionRef.current = -width / 2;

        clock.addEventListener("timeUpdate", () => {
            handleBornePassing();
        });

        return clock.removeEventListener("timeUpdate", () => {
            handleBornePassing();
        });
    }, [clock]);

    //Update sup time bound to reflect his new position
    useEffect(() => {
        supTime.current = positionToTime(supPositionRef.current);
    }, [supPositionRef.current]);

    //Update inf time bound to reflect his new position
    useEffect(() => {
        infTime.current = positionToTime(infPositionRef.current);
        if (clock.getTime() < infTime.current) {
            clock.setTime(infTime.current);
        }
    }, [infPositionRef.current]);

    /**
     * Setup hover detection for the cursor
     * Changes cursor size when hovered to provide visual feedback
     */
    useHover(cursorRef, (hovered) => {
        setIsHovered(hovered);
    });

    useHover(infRef, (hovered) => {
        setIsInfHovered(hovered);
    });

    useHover(supRef, (hovered) => {
        setIsSupHovered(hovered);
    });

    /**
     * Pointer Down Handler - Initiates dragging
     *
     * Calculates the offset between the pointer position and cursor center
     * to maintain smooth dragging without sudden jumps.
     *
     * @param event - Pointer event containing interaction point
     */
    const handlePointerDown = useCallback((event: any) => {
        setIsDragging(true);

        if (cursorRef.current && groupRef.current) {
            // Get pointer position in world space
            let pointerWorldPos = event.point.clone();

            // Get current cursor position in world space
            const cursorWorldPos = new Vector3();
            cursorRef.current.getWorldPosition(cursorWorldPos);

            // Calculate offset for smooth dragging
            const offset = cursorWorldPos.sub(pointerWorldPos);
            setDragOffset(offset);
        }
    }, []);

    /**
     * Pointer Down Handler for Inf marker
     */
    const handleInfPointerDown = useCallback((event: any) => {
        setIsDraggingInf(true);

        if (infRef.current && groupRef.current) {
            let pointerWorldPos = event.point.clone();
            const infWorldPos = new Vector3();
            infRef.current.getWorldPosition(infWorldPos);
            const offset = infWorldPos.sub(pointerWorldPos);
            setDragOffset(offset);
        }
    }, []);

    /**
     * Pointer Down Handler for Sup marker
     */
    const handleSupPointerDown = useCallback((event: any) => {
        setIsDraggingSup(true);

        if (supRef.current && groupRef.current) {
            let pointerWorldPos = event.point.clone();
            const supWorldPos = new Vector3();
            supRef.current.getWorldPosition(supWorldPos);
            const offset = supWorldPos.sub(pointerWorldPos);
            setDragOffset(offset);
        }
    }, []);

    /**
     * Handles the continuous movement of the cursor while dragging,
     * updating the visual position and the clock time.
     * Also updates the progress fill to match the new position.
     *
     * @param event - Pointer event containing current interaction point
     */
    const handlePointerMove = useCallback(
        (event: any) => {
            if (!dragOffset || !groupRef.current) return;

            // Handle main cursor dragging
            if (isDragging && cursorRef.current) {
                // Calculate new cursor position with drag offset
                let pointerWorldPos = event.point.clone();
                const newBallWorldPos = pointerWorldPos.add(dragOffset);

                // Convert to local coordinates for the slider
                const newBallLocalPos = groupRef.current.worldToLocal(newBallWorldPos.clone());

                // Clamp to slider bounds
                const clampedX = Math.max(-width / 2, Math.min(width / 2, newBallLocalPos.x));

                // Update cursor position (slightly elevated for visibility)
                cursorRef.current.position.x = clampedX;
                cursorRef.current.position.y = 0;
                cursorRef.current.position.z = 0.01;

                // Update clock time based on new position
                const newTime = positionToTime(clampedX);
                clock.setTime(newTime);

                // Update progress fill visualization
                if (fillRef.current) {
                    const progress = (clampedX + width / 2) / width;
                    const fillWidth = progress * width;
                    fillRef.current.scale.x = Math.max(0.01, fillWidth); // Prevent zero-scale issues
                    fillRef.current.position.x = (fillWidth - width) / 2; // Center the fill
                }
            }

            // Handle inf marker dragging
            if (isDraggingInf && infRef.current) {
                let pointerWorldPos = event.point.clone();
                const newInfWorldPos = pointerWorldPos.add(dragOffset);
                const newInfLocalPos = groupRef.current.worldToLocal(newInfWorldPos.clone());

                // Clamp to slider bounds
                const clampedX = Math.max(-width / 2, Math.min(width / 2, newInfLocalPos.x));

                // Update inf marker position
                infPositionRef.current = clampedX;
                infRef.current.position.x = clampedX;
            }

            // Handle sup marker dragging
            if (isDraggingSup && supRef.current) {
                let pointerWorldPos = event.point.clone();
                const newSupWorldPos = pointerWorldPos.add(dragOffset);
                const newSupLocalPos = groupRef.current.worldToLocal(newSupWorldPos.clone());

                // Clamp to slider bounds
                const clampedX = Math.max(-width / 2, Math.min(width / 2, newSupLocalPos.x));

                // Update sup marker position
                supPositionRef.current = clampedX;
                supRef.current.position.x = clampedX;
            }
        },
        [isDragging, isDraggingInf, isDraggingSup, dragOffset, width, positionToTime, clock]
    );

    /**
     * Cleans up drag state when user releases the cursor.
     */
    const handlePointerUp = useCallback(() => {
        setIsDragging(false);
        setIsDraggingInf(false);
        setIsDraggingSup(false);
        setDragOffset(null);
    }, []);

    useFrame(() => {
        if (isDragging || isDraggingInf || isDraggingSup) return;

        // Update main cursor
        if (cursorRef.current && fillRef.current) {
            // Get current cursor position based on clock time
            const cursorX = timeToPosition(clock.getTime());
            cursorRef.current.position.x = cursorX;

            // Update progress fill to match
            const progress = (cursorX + width / 2) / width;
            const fillWidth = progress * width;
            fillRef.current.scale.x = Math.max(0.01, fillWidth);
            fillRef.current.position.x = (fillWidth - width) / 2;
        }

        // Keep inf and sup markers at their stored positions (they don't follow the clock)
        if (infRef.current) {
            infRef.current.position.x = infPositionRef.current;
        }

        if (supRef.current) {
            supRef.current.position.x = supPositionRef.current;
        }
    });

    return (
        <group
            ref={groupRef}
            position={position}
            onPointerMove={(event) => {
                // Only handle pointer move if we're dragging something
                if (isDragging || isDraggingInf || isDraggingSup) {
                    handlePointerMove(event);
                }
            }}
            onPointerUp={handlePointerUp}
        >
            {/* Background track */}
            <mesh>
                <boxGeometry args={[width, 0.1, 0]} />
                <meshBasicMaterial color={trackColor} />
            </mesh>

            {/* Progress fill*/}
            <mesh ref={fillRef} position={[0, 0, 0.005]}>
                <boxGeometry args={[1, 0.1, 0.01]} />
                <meshBasicMaterial color={fillColor} />
            </mesh>

            {/* Cursor */}
            <mesh ref={cursorRef} position={[0, 0, 0.01]} onPointerDown={handlePointerDown}>
                <sphereGeometry args={[isHovered || isDragging ? 0.18 : 0.15, 8, 8]} />
                <meshStandardMaterial color={cursorColor} />
            </mesh>

            {/* Invisible click area */}
            <mesh
                position={[0, 0, 0.015]}
                onClick={(event) => {
                    // Only allow clicks on the track if we're not dragging markers
                    if (isDraggingInf || isDraggingSup) return;

                    // Convert click position to local coordinates
                    const localPos = groupRef.current?.worldToLocal(event.point.clone());
                    if (localPos) {
                        // Clamp to slider bounds
                        const clampedX = Math.max(-width / 2, Math.min(width / 2, localPos.x));

                        // Jump cursor to clicked position
                        if (cursorRef.current) {
                            cursorRef.current.position.x = clampedX;
                        }

                        // Update clock time to match clicked position
                        const newTime = positionToTime(clampedX);
                        clock.setTime(newTime);
                    }
                }}
            >
                {/* Larger invisible area for easier clicking */}
                <boxGeometry args={[width, 0.3, 0.02]} />
                <meshBasicMaterial transparent opacity={0} color={"blue"} />
            </mesh>

            {/* Inf marker - draggable element on the bar */}
            <mesh
                ref={infRef}
                position={[infPositionRef.current, 0, 0.01]}
                onPointerDown={handleInfPointerDown}
            >
                <boxGeometry args={[0.05, isInfHovered || isDraggingInf ? 0.3 : 0.25, 0.15]} />
                <meshStandardMaterial color={infColor} />
            </mesh>

            {/* Sup marker - draggable element on the bar */}
            <mesh
                ref={supRef}
                position={[supPositionRef.current, 0, 0.01]}
                onPointerDown={handleSupPointerDown}
            >
                <boxGeometry args={[0.05, isSupHovered || isDraggingSup ? 0.3 : 0.25, 0.15]} />
                <meshStandardMaterial color={supColor} />
            </mesh>
        </group>
    );
}
