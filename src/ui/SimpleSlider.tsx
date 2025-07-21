import { useRef, useCallback, useState } from "react";
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
 */
export function SimpleSlider({
    clock,
    width = 3,
    position = [0, 0, 0],
    trackColor = "#666666",
    cursorColor = "#ffffff",
    fillColor = "#B10F2E"
}: SimpleSliderProps) {
    const cursorRef = useRef<Mesh>(null!); // The draggable sphere cursor
    const fillRef = useRef<Mesh>(null!); // The progress fill bar
    const groupRef = useRef<Group>(null!); // The container group for coordinate transformations

    // State management for user interactions
    const [isDragging, setIsDragging] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [dragOffset, setDragOffset] = useState<Vector3 | null>(null); // Offset for smooth dragging

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

            // Get time bounds from clock (with fallback defaults)
            let [min, max] = clock.getBounds();
            min ??= 0;
            max ??= 20;

            return min + progress * (max - min);
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
            // Get time bounds from clock (with fallback defaults)
            let [min, max] = clock.getBounds();
            min ??= 0;
            max ??= 20;

            // Convert time to 0-1 progress, then to slider coordinate space
            const progress = Math.max(0, Math.min(1, (time - min) / (max - min)));
            return (progress - 0.5) * width;
        },
        [width, clock]
    );

    /**
     * Setup hover detection for the cursor
     * Changes cursor size when hovered to provide visual feedback
     */
    useHover(cursorRef, (hovered) => {
        setIsHovered(hovered);
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
     * Handles the continuous movement of the cursor while dragging,
     * updating the visual position and the clock time.
     * Also updates the progress fill to match the new position.
     *
     * @param event - Pointer event containing current interaction point
     */
    const handlePointerMove = useCallback(
        (event: any) => {
            if (!isDragging || !dragOffset || !cursorRef.current || !groupRef.current) return;

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
        },
        [isDragging, dragOffset, width, positionToTime, clock]
    );

    /**
     * Cleans up drag state when user releases the cursor.
     */
    const handlePointerUp = useCallback(() => {
        setIsDragging(false);
        setDragOffset(null);
    }, []);

    useFrame(() => {
        if (isDragging || !cursorRef.current || !fillRef.current) return;

        // Get current cursor position based on clock time
        const cursorX = timeToPosition(clock.getTime());
        cursorRef.current.position.x = cursorX;

        // Update progress fill to match
        const progress = (cursorX + width / 2) / width;
        const fillWidth = progress * width;
        fillRef.current.scale.x = Math.max(0.01, fillWidth);
        fillRef.current.position.x = (fillWidth - width) / 2;
    });

    return (
        <group
            ref={groupRef}
            position={position}
            onPointerMove={handlePointerMove}
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
        </group>
    );
}
