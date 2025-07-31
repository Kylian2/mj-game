import { createXRStore, XROrigin } from "@react-three/xr";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { XR } from "@react-three/xr";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import "./style/App.css";
import { RotatePlayer } from "./xrControls/RotatePlayer";
import { FlyPlayer } from "./xrControls/FlyPlayer";
import { MovePlayer } from "./xrControls/MovePlayer";
import { useEffect, useRef, useState } from "react";
import { HomeScene } from "./scenes/home";
import { DanubeBleu } from "./scenes/danubebleu";
import { DanubeBleuFigure } from "./figures/danubebleu";
import { Tutorial } from "./scenes/tutorial";
import { ThreeBallsScene } from "./scenes/threeBalls";
import { TwoBallsScene } from "./scenes/twoBall";
import { ThreeBallsTrainingScene } from "./scenes/threeBallsTraining";
import { TwoBallsTrainingScene } from "./scenes/twoBallTraining";
import * as THREE from "three";
const store = createXRStore();

/**
 * Handle position reset when changing scene
 */
function XRSpaceManager({ scene, xrOrigin }: { scene: string; xrOrigin: React.RefObject<any> }) {
    const { gl } = useThree() as { gl: THREE.WebGLRenderer & { xr: any } };
    const initialReferenceSpace = useRef<XRReferenceSpace | null>(null);
    const isInitialized = useRef(false);
    const lastScene = useRef(scene);

    // save initial reference space
    useFrame(() => {
        if (!isInitialized.current && gl.xr.isPresenting) {
            const currentReferenceSpace = gl.xr.getReferenceSpace();

            const quaternion = new THREE.Quaternion();
            quaternion.setFromEuler(
                scene === "home" ? new THREE.Euler(0, 0, 0) : new THREE.Euler(0, Math.PI / 2, 0)
            );
            const offsetTransform = new XRRigidTransform(
                {
                    x: 0,
                    y: -0.1,
                    z: 0
                },
                quaternion
            );

            const synchronizedSpace =
                currentReferenceSpace.getOffsetReferenceSpace(offsetTransform);
            if (currentReferenceSpace) {
                initialReferenceSpace.current = synchronizedSpace;
                isInitialized.current = true;

                try {
                    gl.xr.setReferenceSpace(initialReferenceSpace.current);
                } catch (e) {
                    console.warn("Error during reference space change", e);
                }
            }
        }
    });

    useEffect(() => {
        if (lastScene.current !== scene && isInitialized.current) {
            if (initialReferenceSpace.current && gl.xr.isPresenting) {
                const quaternion = new THREE.Quaternion();
                quaternion.setFromEuler(
                    scene === "home" ? new THREE.Euler(0, 0, 0) : new THREE.Euler(0, Math.PI / 2, 0)
                );
                const offsetTransform = new XRRigidTransform(
                    {
                        x: 0,
                        y: -0.1,
                        z: 0
                    },
                    quaternion
                );

                const synchronizedSpace =
                    initialReferenceSpace.current.getOffsetReferenceSpace(offsetTransform);

                try {
                    gl.xr.setReferenceSpace(synchronizedSpace);
                } catch (e) {
                    console.warn("Error during reference space change", e);
                }
            }

            if (xrOrigin.current) {
                xrOrigin.current.position.set(0, 0, 0);
            }

            lastScene.current = scene;
        }
    }, [scene, gl, xrOrigin]);

    return null;
}

export default function App() {
    const xrOrigin: any = useRef(null);
    const [scene, setScene] = useState<string>("home");

    return (
        <div className="canvas-container">
            <button onClick={() => store.enterVR()}>Enter VR</button>
            <Canvas style={{ background: "skyblue" }}>
                <XR store={store}>
                    <PerspectiveCamera position={[0, 4, 10]} makeDefault />
                    <XROrigin
                        ref={xrOrigin}
                        rotation={scene === "home" ? [0, 0, 0] : [0, 0, 0]}
                        // position={[0.08, 0.2, 0]}
                    />
                    <OrbitControls />

                    <XRSpaceManager scene={scene} xrOrigin={xrOrigin} />

                    {scene === "home" && <HomeScene scene={[scene, setScene]} />}
                    {scene === "tutorial" && <Tutorial scene={[scene, setScene]} />}
                    {scene === "danubebleu" && <DanubeBleu scene={[scene, setScene]} />}
                    {scene === "two-balls" && <TwoBallsScene scene={[scene, setScene]} />}
                    {scene === "two-balls-training" && (
                        <TwoBallsTrainingScene scene={[scene, setScene]} />
                    )}
                    {scene === "three-balls" && <ThreeBallsScene scene={[scene, setScene]} />}
                    {scene === "three-balls-training" && (
                        <ThreeBallsTrainingScene scene={[scene, setScene]} />
                    )}

                    <FlyPlayer xrOrigin={xrOrigin} />
                    <RotatePlayer />
                    {scene === "home" && <MovePlayer xrOrigin={xrOrigin} />}
                </XR>
            </Canvas>
        </div>
    );
}
