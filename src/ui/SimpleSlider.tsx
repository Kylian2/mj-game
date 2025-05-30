import { useRef, useCallback, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { TimeConductor } from "musicaljuggling";
import { useHover } from "@react-three/xr";
import { Vector3, Mesh, Group, Plane } from "three";

interface SimpleSliderProps {
    clock: TimeConductor;
    width?: number;
    position?: [number, number, number];
    trackColor?: string;
    cursorColor?: string;
    fillColor?: string;
}

export function SimpleSlider({
    clock,
    width = 3,
    position = [0, 0, 0],
    trackColor = "#666666",
    cursorColor = "#ffffff",
    fillColor = "#B10F2E"
}: SimpleSliderProps) {
    const cursorRef = useRef<Mesh>(null!);
    const fillRef = useRef<Mesh>(null!);
    const groupRef = useRef<Group>(null!);

    const [isDragging, setIsDragging] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [dragOffset, setDragOffset] = useState<Vector3 | null>(null);

    const positionToTime = useCallback(
        (positionX: number) => {
            const clampedX = Math.max(-width / 2, Math.min(width / 2, positionX));
            const progress = (clampedX + width / 2) / width;

            let [min, max] = clock.getBounds();
            min ??= 0;
            max ??= 20;

            return min + progress * (max - min);
        },
        [width, clock]
    );

    const timeToPosition = useCallback(
        (time: number) => {
            let [min, max] = clock.getBounds();
            min ??= 0;
            max ??= 20;

            const progress = Math.max(0, Math.min(1, (time - min) / (max - min)));
            return (progress - 0.5) * width;
        },
        [width, clock]
    );

    useHover(cursorRef, (hovered) => {
        setIsHovered(hovered);
    });

    const handlePointerDown = useCallback((event: any) => {
        setIsDragging(true);

        if (cursorRef.current && groupRef.current) {
            let pointerWorldPos = event.point.clone();

            const ballWorldPos = new Vector3();
            cursorRef.current.getWorldPosition(ballWorldPos);

            const offset = ballWorldPos.sub(pointerWorldPos);
            setDragOffset(offset);
        }
    }, []);

    const handlePointerMove = useCallback(
        (event: any) => {
            if (!isDragging || !dragOffset || !cursorRef.current || !groupRef.current) return;

            let pointerWorldPos = event.point.clone();

            const newBallWorldPos = pointerWorldPos.add(dragOffset);

            //convert coordinates to slider local coordonates
            const newBallLocalPos = groupRef.current.worldToLocal(newBallWorldPos.clone());

            const clampedX = Math.max(-width / 2, Math.min(width / 2, newBallLocalPos.x));

            cursorRef.current.position.x = clampedX;
            cursorRef.current.position.y = 0;
            cursorRef.current.position.z = 0.01;

            const newTime = positionToTime(clampedX);
            clock.setTime(newTime);

            if (fillRef.current) {
                const progress = (clampedX + width / 2) / width;
                const fillWidth = progress * width;
                fillRef.current.scale.x = Math.max(0.01, fillWidth);
                fillRef.current.position.x = (fillWidth - width) / 2;
            }
        },
        [isDragging, dragOffset, width, positionToTime, clock]
    );

    const handlePointerUp = useCallback(() => {
        setIsDragging(false);
        setDragOffset(null);
    }, []);

    useFrame(() => {
        if (isDragging || !cursorRef.current || !fillRef.current) return;

        const cursorX = timeToPosition(clock.getTime());
        cursorRef.current.position.x = cursorX;

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
            onPointerUp={handlePointerUp}>
            <mesh>
                <boxGeometry args={[width, 0.1, 0]} />
                <meshBasicMaterial color={trackColor} />
            </mesh>

            <mesh ref={fillRef} position={[0, 0, 0.005]}>
                <boxGeometry args={[1, 0.1, 0.01]} />
                <meshBasicMaterial color={fillColor} />
            </mesh>

            <mesh ref={cursorRef} position={[0, 0, 0.01]} onPointerDown={handlePointerDown}>
                <sphereGeometry args={[isHovered || isDragging ? 0.18 : 0.15, 8, 8]} />
                <meshStandardMaterial color={cursorColor} />
            </mesh>

            <mesh position={[0, 0, 0.015]}
                // click on the bar makes to cursor move
                onClick={(event) => {
                    const localPos = groupRef.current?.worldToLocal(event.point.clone());
                    if (localPos) {
                        const clampedX = Math.max(-width / 2, Math.min(width / 2, localPos.x));

                        if (cursorRef.current) {
                            cursorRef.current.position.x = clampedX;
                        }

                        const newTime = positionToTime(clampedX);
                        clock.setTime(newTime);
                    }
                }}
            >
                <boxGeometry args={[width, 0.3, 0.02]} />
                <meshBasicMaterial transparent opacity={0} color={"blue"} />
            </mesh>
        </group>
    );
}
