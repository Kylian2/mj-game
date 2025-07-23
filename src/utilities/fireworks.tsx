import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Type definitions
interface ParticleData {
    id: number;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    color: string;
    life: number;
    maxLife: number;
}

interface FireworkData {
    id: number;
    startPosition: [number, number, number];
    colors: string[];
}

interface ParticleProps {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    color: string;
    life: number;
    maxLife: number;
}

interface FireworkProps {
    startPosition: [number, number, number];
    colors: string[];
}

interface FireworksSystemProps {
    isActive: boolean;
    position: THREE.Vector3;
}

const colors: string[][] = [
    ["#ff0000", "#ff4444", "#ffaaaa"], // Red variations
    ["#00ff00", "#44ff44", "#aaffaa"], // Green variations
    ["#0000ff", "#4444ff", "#aaaaff"], // Blue variations
    ["#ffff00", "#ffff44", "#ffffaa"], // Yellow variations
    ["#ff00ff", "#ff44ff", "#ffaaff"], // Magenta variations
    ["#00ffff", "#44ffff", "#aaffff"], // Cyan variations
    ["#ff8800", "#ffaa44", "#ffddaa"] // Orange variations
];

/**
 * Individual particle component for firework explosions
 * Handles physics simulation including gravity, friction, and fade-out effects
 */
function Particle({ position, velocity, color, life, maxLife }: ParticleProps) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta: number) => {
        if (!meshRef.current) return;

        // Update position based on velocity
        position.add(velocity.clone().multiplyScalar(delta));

        // Apply gravity force
        velocity.y -= 9.8 * delta;

        // Apply air friction
        velocity.multiplyScalar(1 - Math.random() * 0.3);

        // Update mesh position
        meshRef.current.position.copy(position);

        // Calculate fade-out based on remaining life
        const alpha: number = life / maxLife;
        if (meshRef.current.material instanceof THREE.MeshBasicMaterial) {
            meshRef.current.material.opacity = alpha;
        }
        meshRef.current.scale.setScalar(alpha * 0.5);
    });

    return (
        <mesh ref={meshRef} position={position}>
            <sphereGeometry args={[0.05, 6, 6]} />
            <meshBasicMaterial color={color} transparent opacity={1} />
        </mesh>
    );
}

/**
 * Individual firework component that handles the rocket launch and explosion
 * Creates a realistic trajectory with physics-based explosion at peak height
 */
function Firework({ startPosition, colors }: FireworkProps) {
    const [particles, setParticles] = useState<ParticleData[]>([]);
    const [isExploded, setIsExploded] = useState<boolean>(false);

    // Rocket that travels upward before exploding
    const rocketRef = useRef<THREE.Mesh>(null);
    const rocketPosition = useRef<THREE.Vector3>(new THREE.Vector3(...startPosition));
    const rocketVelocity = useRef<THREE.Vector3>(
        new THREE.Vector3(
            (Math.random() - 0.5) * 2, // Small horizontal variation
            7 + Math.random() * 5, // Upward velocity with randomness
            (Math.random() - 0.5) * 2 // Small depth variation
        )
    );

    useFrame((state, delta: number) => {
        if (!isExploded && rocketRef.current) {
            // Update rocket movement with physics
            rocketPosition.current.add(rocketVelocity.current.clone().multiplyScalar(delta));
            rocketVelocity.current.y -= 9.8 * delta; // Apply gravity

            rocketRef.current.position.copy(rocketPosition.current);

            // Trigger explosion when rocket reaches peak (vertical velocity becomes negative)
            if (rocketVelocity.current.y <= 0) {
                explode();
            }
        }

        // Update particle lifetimes and remove dead particles
        setParticles((prevParticles: ParticleData[]) =>
            prevParticles
                .map((particle: ParticleData) => ({
                    ...particle,
                    life: particle.life - delta
                }))
                .filter((particle: ParticleData) => particle.life > 0)
        );
    });

    /**
     * Creates explosion effect with randomized particle distribution
     * Generates particles in 3D spherical distribution with varying speeds
     */
    const explode = (): void => {
        setIsExploded(true);

        const newParticles: ParticleData[] = [];
        const particleCount: number = 50 + Math.random() * 50; // Random particle count
        const explosionPosition: THREE.Vector3 = rocketPosition.current.clone();

        for (let i = 0; i < particleCount; i++) {
            const speed: number = 5 + Math.random() * 10;

            // Generate random 3D direction using spherical coordinates
            const phi: number = Math.random() * Math.PI * 2; // Azimuthal angle
            const theta: number = Math.random() * Math.PI; // Polar angle

            const velocity: THREE.Vector3 = new THREE.Vector3(
                Math.sin(theta) * Math.cos(phi) * speed,
                Math.sin(theta) * Math.sin(phi) * speed,
                Math.cos(theta) * speed
            );

            const lifespan: number = 2 + Math.random() * 2;

            newParticles.push({
                id: i,
                position: explosionPosition.clone(),
                velocity: velocity,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: lifespan, // Random lifespan
                maxLife: lifespan // Store max life for fade calculations
            });
        }

        setParticles(newParticles);
    };

    return (
        <>
            {/* Rocket before explosion */}
            {!isExploded && (
                <mesh ref={rocketRef} position={startPosition}>
                    <sphereGeometry args={[0.05, 8, 8]} />
                    <meshBasicMaterial color={colors[Math.floor(Math.random() * colors.length)]} />
                </mesh>
            )}

            {/* Explosion particles */}
            {particles.map((particle: ParticleData) => (
                <Particle
                    key={particle.id}
                    position={particle.position}
                    velocity={particle.velocity}
                    color={particle.color}
                    life={particle.life}
                    maxLife={particle.maxLife}
                />
            ))}
        </>
    );
}

/**
 * Main fireworks system component
 * Manages the spawning and lifecycle of multiple fireworks
 * @param {boolean} isActive - Controls whether fireworks should be launched
 */
export function FireworksSystem({ isActive, position }: FireworksSystemProps) {
    const [fireworks, setFireworks] = useState<FireworkData[]>([]);
    const intervalRef = useRef<Timeout | null>(null);

    useEffect(() => {
        if (isActive) {
            // Launch fireworks at random intervals
            intervalRef.current = setInterval(() => {
                // Color palettes for different firework types

                const newFirework: FireworkData = {
                    id: Date.now() + Math.random(), // Unique identifier
                    startPosition: [position.x, position.y, position.z],
                    colors: colors[Math.floor(Math.random() * colors.length)]
                };

                setFireworks((prev: FireworkData[]) => [...prev, newFirework]);

                // Clean up old fireworks after animation completes
                setTimeout(() => {
                    setFireworks((prev: FireworkData[]) =>
                        prev.filter((fw: FireworkData) => fw.id !== newFirework.id)
                    );
                }, 8000);
            }, 1500 + Math.random() * 3000); // Random interval between 1.5-4 seconds
        } else {
            // Clear interval when inactive
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        // Cleanup on unmount
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isActive]);

    return (
        <>
            {fireworks.map((firework: FireworkData) => (
                <Firework
                    key={firework.id}
                    startPosition={firework.startPosition}
                    colors={firework.colors}
                />
            ))}
        </>
    );
}
