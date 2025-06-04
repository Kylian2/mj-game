import React, { useRef, useMemo, type SetStateAction, type Dispatch } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Box, Cylinder, Sphere, Plane, useTexture } from "@react-three/drei";
import { DoubleSide, Mesh, RepeatWrapping } from "three";
import { TimeConductor } from "musicaljuggling";
import { TimeControls } from "../ui/TimeControls";
import { Button } from "@react-three/uikit-default";
import { Root, Text } from "@react-three/uikit";

function Ground(props: any) {
    return (
        <mesh {...props}
            rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[300, 300]}/>
            <meshStandardMaterial color={'#7A9F4D'} side={DoubleSide}/>
        </mesh>
    )
}

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const trunkRef = useRef<Mesh>(null);
  const topRef = useRef<Mesh>(null);
  
  useFrame(function(state) {
    if (topRef.current) {
      topRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  return (
    <group position={position} scale={scale}>
      <Cylinder ref={trunkRef} args={[0.25, 0.35, 3]} position={[0, 1.5, 0]}>
        <meshLambertMaterial color="#654321" />
      </Cylinder>
      
      {/* Base of pine 3 */}
      <mesh position={[0, 3.5, 0]}>
        <coneGeometry args={[2.2, 3, 8]} />
        <meshLambertMaterial color="#0F4F0F" />
      </mesh>
      
      {/* Stage 1 */}
      <mesh position={[0, 5, 0]}>
        <coneGeometry args={[1.8, 2.5, 8]} />
        <meshLambertMaterial color="#1F5F1F" />
      </mesh>
      
      {/* Stage 2 */}
      <mesh position={[0, 6.2, 0]}>
        <coneGeometry args={[1.3, 2, 8]} />
        <meshLambertMaterial color="#2F6F2F" />
      </mesh>
      
      {/* Top */}
      <mesh ref={topRef} position={[0, 7.5, 0]}>
        <coneGeometry args={[0.8, 1.5, 6]} />
        <meshLambertMaterial color="#228B22" />
      </mesh>
    </group>
  );
}



function Flower({ position, color }: { position: [number, number, number]; color: string }) {
    const petalCount = 6;
    const petals = useMemo(function () {
        return Array.from({ length: petalCount }, function (_, i) {
            const angle = (i / petalCount) * Math.PI * 2;
            return {
                position: [Math.cos(angle) * 0.3, 0.1, Math.sin(angle) * 0.3] as [
                    number,
                    number,
                    number
                ],
                rotation: [0, angle, 0] as [number, number, number]
            };
        });
    }, []);

    return (
        <group position={position}>
            <Cylinder args={[0.02, 0.02, 0.8]} position={[0, 0.4, 0]}>
                <meshLambertMaterial color="#228B22" />
            </Cylinder>

            <Sphere args={[0.1]} position={[0, 0.8, 0]}>
                <meshLambertMaterial color="#FFD700" />
            </Sphere>

            {petals.map(function (petal, i) {
                return (
                    <mesh
                        key={i}
                        position={[
                            petal.position[0],
                            0.8,
                            petal.position[2]
                        ]}
                        rotation={petal.rotation}
                    >
                        <sphereGeometry args={[0.15, 8, 6]} />
                        <meshLambertMaterial color={color} />
                    </mesh>
                );
            })}
        </group>
    );
}

function WoodenSeat(props: any) {
    return (
        <group {...props}>
            {Array.from({ length: 6 }, function (_, i) {
                return (
                    <group key={i} position={[0, 0, 8 + i * 3]}>
                        <Box args={[15, 0.3, 1]} position={[0, 0.4, 0]} castShadow>
                            <meshStandardMaterial color="#8B4513" />
                        </Box>
                        <Box args={[15, 0.8, 0.2]} position={[0, 0.8, -0.4]} castShadow>
                            <meshStandardMaterial color="#8B4513" />
                        </Box>
                    </group>
                );
            })}
        </group>
    );
}

export function DanubeBleu({ scene }: { scene: [string, Dispatch<SetStateAction<string>>] }) {
    const stageRef = useRef<Mesh>(null);
    const clock: TimeConductor = new TimeConductor({bounds:[0,20]});
    const [currentScene, setScene] = scene;    
    return (
        <group>
            <Ground/>
            <group position={[0, 0.01, -5]}>
                <Plane ref={stageRef} args={[18, 18]} position={[0, 0, 0]} rotation={[Math.PI/2, 0, 0]} castShadow receiveShadow>
                    <meshStandardMaterial color="#8B4513" roughness={0.8} metalness={0.1} side={DoubleSide} />
                </Plane>

                <Plane args={[12, 8]} position={[0, 4, -8]}>
                    <meshLambertMaterial color="#4169E1" opacity={0.7} transparent side={DoubleSide} />
                </Plane>

                <Plane args={[2, 8]} position={[-6, 4, -7]} rotation={[0, Math.PI / 4, 0]}>
                    <meshLambertMaterial color="#8B0000" side={DoubleSide}/>
                </Plane>
                <Plane args={[2, 8]} position={[6, 4, -7]} rotation={[0, -Math.PI / 4, 0]}>
                    <meshLambertMaterial color="#8B0000" side={DoubleSide}/>
                </Plane>
            </group>

            <Tree position={[-15, 0, -10]} scale={1.2} />
            <Tree position={[-12, 0, 5]} scale={0.9} />
            <Tree position={[15, 0, -8]} scale={1.1} />
            <Tree position={[12, 0, 8]} scale={1.3} />
            <Tree position={[-18, 0, 2]} scale={0.8} />
            <Tree position={[18, 0, -2]} scale={1.0} />
            <Tree position={[-25, 0, -20]} scale={0.7} />
            <Tree position={[25, 0, -18]} scale={0.8} />
            <Tree position={[0, 0, -25]} scale={0.9} />
            <Tree position={[-15, 0, 25]} scale={1.1} />
            <Tree position={[19, 0, 26]} scale={0.9} />
            <Tree position={[-18, 0, 45]} scale={1.2} />
            <Tree position={[12, 0, 35]} scale={0.9} />

            <Flower position={[-9, 0, 19]} color="#FF69B4" />
            <Flower position={[13, 0, 12]} color="#FF1493" />
            <Flower position={[-14, 0, 8]} color="#FF69B4" />
            <Flower position={[7, 0, 16]} color="#FF1493" />
            <Flower position={[-16, 0, 8]} color="#FF69B4" />
            <Flower position={[5, 0, -17]} color="#FF1493" />

            <WoodenSeat position={[0, 0, 35]} rotation={[0, Math.PI, 0]}/>

            <TimeControls timeConductor={clock}></TimeControls>

            <ambientLight intensity={1} />
            <pointLight position={[10, 10, 10]} />
            <group position={[0, 1, 0]}>
                <Root>
                    <Button onClick={() => setScene("home")}>
                        <Text>Accueil</Text>
                    </Button>
                </Root>
            </group>
        </group>
    );
}
