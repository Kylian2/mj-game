import { createXRStore, XROrigin } from "@react-three/xr";
import { Canvas, useFrame } from "@react-three/fiber";
import { DoubleSide } from "three";
import { XR } from "@react-three/xr";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import './style/App.css'
import { TimeConductor } from "../../mj-lib/dist/MusicalJuggling";
import { RotatePlayer } from "./xrControls/RotatePlayer";
import { FlyPlayer } from "./xrControls/FlyPlayer";
import { MovePlayer } from "./xrControls/MovePlayer";
import { useRef, useState } from 'react'
import { Slider } from "@react-three/uikit-default";
import { Root } from "@react-three/uikit";
import { HomeScene } from "./scenes/home";

const store = createXRStore();

function Sliider() {

  const [val, setVal] = useState<number>(50); 
  const i = useRef(0);

  useFrame(() => {
    i.current++;
    if (i.current % 10 === 0) {
      setVal(prevVal => {
        const newVal = prevVal + 1;
        return newVal > 300 ? 0 : newVal; 
      });
    }
  });

  const safeVal = typeof val === 'number' && !isNaN(val) ? val : 50;

  return (
    <group position={[5, 1, 0]}>
      <Root>
        {/* Ensure all numeric values are valid */}
        <Slider 
          value={safeVal} 
          defaultValue={50} 
          max={300} 
          step={1} 
          width={300}
        />
      </Root>
    </group>
  );
}

export default function App() {

	const clock: TimeConductor = new TimeConductor({bounds: [0, 20]});
	const xrOrigin: any = useRef(null);
	const [scene, setScene] = useState<String>("home");
	return (
		<div className="canvas-container">
      		<button onClick={() => store.enterVR()}>Enter VR</button>
			<Canvas style={{background:'skyblue'}}>
				<XR store={store}>
					<PerspectiveCamera position={[0, 4, 10]} makeDefault />
                	<XROrigin ref={xrOrigin}/>
           			<OrbitControls />
					
					{scene === 'home' && <HomeScene/>}

					<MovePlayer xrOrigin={xrOrigin}/>
					<FlyPlayer xrOrigin={xrOrigin}/>
					<RotatePlayer/>
				</XR>
			</Canvas>
		</div>
	)

}