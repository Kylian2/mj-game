import { DoubleSide } from "three"
import { TimeControls } from "../ui/TimeControls"
import { TimeConductor } from "musicaljuggling"
import { useFrame } from "@react-three/fiber";
import type { Dispatch, SetStateAction } from "react";

function Ground(props: any) {
    return (
        <mesh {...props}
            rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[100, 100]}/>
            <meshStandardMaterial color={'green'} side={DoubleSide}/>
        </mesh>
    )
}

export function DanubeBleu({ scene }: { scene: [string, Dispatch<SetStateAction<string>>] }) {
    const [currentScene, setScene] = scene;

    const clock: TimeConductor = new TimeConductor({bounds: [0,20]})
    return(
        <group>
            <ambientLight intensity={2} />
            <Ground/>
            <TimeControls timeConductor={clock}/>
        </group>
    )
}