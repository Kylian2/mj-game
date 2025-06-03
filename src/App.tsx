import { createXRStore, XROrigin } from "@react-three/xr";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { XR } from "@react-three/xr";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import './style/App.css'
import { TimeConductor } from "../../mj-lib/dist/MusicalJuggling";
import { RotatePlayer } from "./xrControls/RotatePlayer";
import { FlyPlayer } from "./xrControls/FlyPlayer";
import { MovePlayer } from "./xrControls/MovePlayer";
import { useEffect, useRef, useState } from 'react'
import { HomeScene } from "./scenes/home";
import { DanubeBleu } from "./scenes/danubebleu";
import { WebGLRenderer } from 'three';

const store = createXRStore();

/**
 * Handle position reset when changing scene 
 */
function XRSpaceManager({ scene, xrOrigin }: { scene: string, xrOrigin: React.RefObject<any> }) {
  const { gl } = useThree() as { gl: WebGLRenderer & { xr: any } };
  const initialReferenceSpace = useRef<XRReferenceSpace | null>(null);
  const isInitialized = useRef(false);
  const lastScene = useRef(scene);

  // save initial reference space
  useFrame(() => {
    if (!isInitialized.current && gl.xr.isPresenting) {
      const currentReferenceSpace = gl.xr.getReferenceSpace();
      if (currentReferenceSpace) {
        initialReferenceSpace.current = currentReferenceSpace;
        isInitialized.current = true;
      }
    }
  });

  useEffect(() => {
    if (lastScene.current !== scene && isInitialized.current) {      
      if (initialReferenceSpace.current && gl.xr.isPresenting) {
        try {
          gl.xr.setReferenceSpace(initialReferenceSpace.current);
        } catch (e) {
          console.warn("Error during reference space change", e);
        }
      }

      if (xrOrigin.current) {
        xrOrigin.current.position.set(0, 0, 0);
        xrOrigin.current.rotation.set(0, 0, 0);
        xrOrigin.current.scale.set(1, 1, 1);
        xrOrigin.current.updateMatrixWorld(true);
      }

      lastScene.current = scene;
    }
  }, [scene, gl, xrOrigin]);

  return null; 
}

export default function App() {
  const clock: TimeConductor = new TimeConductor({bounds: [0, 20]});
  const xrOrigin: any = useRef(null);
  const [scene, setScene] = useState<string>("home");

  return (
    <div className="canvas-container">
      <button onClick={() => store.enterVR()}>Enter VR</button>
      <Canvas style={{background:'skyblue'}}>
        <XR store={store}>
          <PerspectiveCamera position={[0, 4, 10]} makeDefault />
          <XROrigin ref={xrOrigin}/>
          <OrbitControls />
          
          <XRSpaceManager scene={scene} xrOrigin={xrOrigin} />
          
          {scene === 'home' && <HomeScene scene={[scene, setScene]}/>}
          {scene === 'danubebleu' && <DanubeBleu scene={[scene, setScene]}/>}

          <MovePlayer xrOrigin={xrOrigin}/>
          <FlyPlayer xrOrigin={xrOrigin}/>
          <RotatePlayer/>
        </XR>
      </Canvas>
    </div>
  )
}