import { useState, type Dispatch, type SetStateAction } from "react";
import { DoubleSide } from "three";
import { CatchLeft } from "../tutorials/catch/left";
import { TossIntroduction } from "../tutorials/catch/introduction";
import * as THREE from "three";

export function Tutorial({ scene }: { scene: [string, Dispatch<SetStateAction<string>>] }) {
    const [currentScene, setScene] = scene;

    function Ground(props: any) {
        return (
            <mesh {...props} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[300, 300]} />
                <meshStandardMaterial color={"#C0D7BB"} side={DoubleSide} />
            </mesh>
        );
    }

    // Circular stage platform
    function Stage() {
        return (
            <group>
                <mesh position={[0, 0.1, 0]} castShadow>
                    <cylinderGeometry args={[8, 8, 0.3, 32]} />
                    <meshStandardMaterial color="#A76D60" />
                </mesh>
                {/* Stage lights around perimeter */}
                {Array.from({ length: 8 }).map((_, i) => {
                    const angle = (i / 8) * Math.PI * 2;
                    const x = Math.cos(angle) * 9;
                    const z = Math.sin(angle) * 9;
                    return (
                        <pointLight
                            key={i}
                            position={[x, 2, z]}
                            intensity={0.5}
                            color="#ffffff"
                            distance={15}
                        />
                    );
                })}
            </group>
        );
    }

    // Crowd of spectators
    function Crowd() {
        const positions = [
            [-12, 0, 5],
            [-10, 0, 6],
            [-8, 0, 5.5],
            [8, 0, 5.5],
            [10, 0, 6],
            [12, 0, 5],
            [-15, 0, 8],
            [-12, 0, 9],
            [-9, 0, 8.5],
            [9, 0, 8.5],
            [12, 0, 9],
            [15, 0, 8],
            [-18, 0, 12],
            [-14, 0, 11],
            [14, 0, 11],
            [18, 0, 12]
        ];

        return (
            <group position={[0, 0, -10]}>
                {positions.map((pos, index) => (
                    <group key={index} position={[pos[0], pos[1], pos[2]]}>
                        {/* Body */}
                        <mesh position={[0, 1, 0]} castShadow>
                            <cylinderGeometry args={[0.3, 0.4, 1.5, 8]} />
                            <meshStandardMaterial color={`hsl(${index * 23}, 40%, 30%)`} />
                        </mesh>
                        {/* Head */}
                        <mesh position={[0, 2, 0]} castShadow>
                            <sphereGeometry args={[0.25, 12, 12]} />
                            <meshStandardMaterial color="#fdbcb4" />
                        </mesh>
                        {/* Arms raised in excitement */}
                        <mesh position={[-0.4, 1.8, 0]} rotation={[0, 0, 0.5]} castShadow>
                            <cylinderGeometry args={[0.08, 0.08, 0.8, 6]} />
                            <meshStandardMaterial color="#fdbcb4" />
                        </mesh>
                        <mesh position={[0.4, 1.8, 0]} rotation={[0, 0, -0.5]} castShadow>
                            <cylinderGeometry args={[0.08, 0.08, 0.8, 6]} />
                            <meshStandardMaterial color="#fdbcb4" />
                        </mesh>
                    </group>
                ))}
            </group>
        );
    }

    // Backdrop with circus tent elements
    function Backdrop() {
        const side = 8;
        return (
            <group>
                {/* Tent poles */}
                {Array.from({ length: 4 }).map((_, i) => {
                    const angle = (i / side) * 2 * Math.PI * 2;
                    const x = Math.cos(angle) * 25;
                    const z = Math.sin(angle) * 25;
                    return (
                        <mesh key={i} position={[x, 6, z]} castShadow>
                            <cylinderGeometry args={[0.3, 0.3, 12, 8]} />
                            <meshStandardMaterial color="#8B4513" />
                        </mesh>
                    );
                })}

                {/* Tent fabric */}
                <mesh position={[0, 16, 0]}>
                    <coneGeometry args={[25, 8, 8]} />
                    <meshStandardMaterial
                        color="#DC143C"
                        transparent
                        opacity={0.8}
                        side={DoubleSide}
                    />
                </mesh>

                {/* Decorative banners */}
                {Array.from({ length: side }).map((_, i) => {
                    const angle = (i / side) * Math.PI * 2;
                    const x = Math.cos(angle) * 25;
                    const z = Math.sin(angle) * 25;
                    return (
                        <mesh
                            key={i}
                            position={[x, 12 - 1.4, z]}
                            rotation={[0, angle + (Math.PI * (i + 1)) / 2, -Math.PI / 2]}
                        >
                            <planeGeometry args={[3, 1]} />
                            <meshStandardMaterial
                                color={`hsl(${i * 40}, 80%, 60%)`}
                                side={DoubleSide}
                            />
                        </mesh>
                    );
                })}
            </group>
        );
    }

    const [tossTutorial, setTossTutoriel] = useState(true);

    return (
        <group>
            {/* Lighting setup */}
            <ambientLight intensity={1} />
            <pointLight position={[10, 10, 10]} intensity={0.5} />

            {/* Main spotlight */}
            <spotLight
                position={[0, 15, 8]}
                angle={0.4}
                penumbra={0.5}
                intensity={2}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                color="#ffffff"
            />

            {/* Colored stage lights */}
            <pointLight position={[-5, 8, 5]} intensity={1} color="#ff6b6b" />
            <pointLight position={[5, 8, 5]} intensity={1} color="#4ecdc4" />

            {/* Scene elements */}
            <Ground />
            <Stage />
            <Crowd />
            <Backdrop />

            {/* Tutorials elements */}
            {!tossTutorial && <TossIntroduction finished={setTossTutoriel} />}
            {tossTutorial && <CatchLeft />}
        </group>
    );
}
