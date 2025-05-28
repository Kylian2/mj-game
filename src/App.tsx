import { createXRStore, XROrigin } from "@react-three/xr";
import { Canvas, useFrame } from "@react-three/fiber";
import { DoubleSide } from "three";
import { XR } from "@react-three/xr";
import { PerspectiveCamera } from "@react-three/drei";
import { OrbitControls } from "@react-three/drei";
import { TimeControls } from "./ui/TimeControls";
import './style/App.css'
import { TimeConductor } from "../../mj-lib/dist/MusicalJuggling";
import { RotatePlayer } from "./xrControls/RotatePlayer";
import { FlyPlayer } from "./xrControls/FlyPlayer";
import { MovePlayer } from "./xrControls/MovePlayer";
import { useRef, useState } from 'react'
import { Slider } from "@react-three/uikit-default";
import { Root } from "@react-three/uikit";

const store = createXRStore();

function Ground(props: any) {
	return (
		<mesh {...props}
			rotation={[Math.PI / 2, 0, 0]}>
			<planeGeometry args={[100, 100]}/>
			<meshStandardMaterial color={'green'} side={DoubleSide}/>
		</mesh>
	)
}

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

	return (
		<div className="canvas-container">
      		<button onClick={() => store.enterVR()}>Enter VR</button>
			<Canvas style={{background:'skyblue'}}>
				<XR store={store}>
					<PerspectiveCamera position={[0, 4, 10]} makeDefault />
					<ambientLight intensity={0.5} />
					<spotLight position={[5, 5, 5]} angle={90} penumbra={1} decay={0} intensity={Math.PI} />
					<pointLight position={[10, 10, 10]} />
					<Ground position={[0, 0, 0]}/>
          			<OrbitControls />
					<XROrigin ref={xrOrigin}/>

					<TimeControls timeConductor={clock} backgroundColor="#94B9AF"/>

					<MovePlayer xrOrigin={xrOrigin}/>
					<FlyPlayer xrOrigin={xrOrigin}/>
					<RotatePlayer/>

					<Sliider/>
				</XR>
			</Canvas>
		</div>
	)

}