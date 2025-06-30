import { useEffect, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useXRInputSourceState, type XRControllerState } from "@react-three/xr";
import * as THREE from "three";
import { 
    Clock,
    PerformanceModel,
    Alerts, 
    AlertsTimeline,
} from "musicaljuggling";
import { 
    type AlertEvent
} from "musicaljuggling";
import { Box } from "@react-three/drei";


export function HandDetector({
    clock,
    ballsRef,
    alertesTimeline,
    visualizer = false
}: {
    clock:Clock,
    ballsRef: RefObject<Map<string, THREE.Object3D<THREE.Object3DEventMap>>>,
    alertesTimeline: AlertsTimeline,
    visualizer?: boolean,
}){

    const lastInfEvent = useRef<AlertEvent>(null)
    const lastSupEvent = useRef<AlertEvent>(null)
    const listenedEvent = useRef<Array<AlertEvent>>([]);

    useEffect(() => {

        let alertes = new Alerts(alertesTimeline, clock);

        alertes.addEventListener("inf", (e: AlertEvent, time: number) => {
            const ball = ballsRef.current.get(e.ball.id);
            const color = (ball?.children[0].material as THREE.MeshBasicMaterial).color;
            if(e.actionDescription === 'caught'){
                if(e.hand.isRightHand()){
                    if(!rightRef.current) return;
                    rightRef.current.visible = true;            
                    (rightRef.current.material as THREE.MeshBasicMaterial).color.set(color);
                    rightRef.current.userData.isScaling = true;
                    rightRef.current.userData.startScalingTime = time;    
                    rightRef.current.scale.setScalar(1);
                }else{
                    if(!leftRef.current) return;
                    leftRef.current.visible = true;
                    (leftRef.current.material as THREE.MeshBasicMaterial).color.set(color); 
                    leftRef.current.userData.isScaling = true; 
                    leftRef.current.userData.startScalingTime = time;    
                    leftRef.current.scale.setScalar(1);                                 
                }
            }
            listenedEvent.current.push(e);
            lastInfEvent.current = e;
        })

        alertes.addEventListener("sup", (e: AlertEvent) => {
            if(e === lastInfEvent.current){
                if(e.hand.isRightHand()){
                    if(!rightRef.current) return;
                    (rightRef.current.material as THREE.MeshBasicMaterial).color.set('purple');                   
                    rightRef.current.visible = false;            
                }else{
                    if(!leftRef.current) return;
                    (leftRef.current.material as THREE.MeshBasicMaterial).color.set('purple');                   
                    leftRef.current.visible = false;  
                }
            }
            const index = listenedEvent.current.indexOf(e);
            if (index > -1) {
                listenedEvent.current.splice(index, 1);
            }        
        })

        return () => {
            alertes.removeAllEventListeners();
        };

    }, [])

    clock.addEventListener('reachedEnd', () => {
        listenedEvent.current = [];
    })

    const left = useXRInputSourceState('controller', 'left');
    const right = useXRInputSourceState('controller', 'right');

    const vibrateController = (controller: XRControllerState | undefined, intensity = 1.0, duration = 100) => {

        if(!controller || !controller.inputSource || !controller.inputSource.gamepad){
            console.log('exit');
            return;
        }
        const gamepad = controller.inputSource.gamepad;
        if (gamepad.hapticActuators.length > 0) {
            gamepad.hapticActuators[0].pulse(intensity, duration);
        }
    };

    let score = 0;

    useFrame(() => {

        let leftX = left?.gamepad?.['x-button']?.button;
        let leftY = left?.gamepad?.['y-button']?.button;
        let rightA = right?.gamepad?.['a-button']?.button;
        let rightB = right?.gamepad?.['b-button']?.button;

        let eventToRemove = []

        for (let i = 0; i < listenedEvent.current.length; i++){
            const event = listenedEvent.current[i];

            if(event.actionDescription === 'caught'){
                if(event.hand.isRightHand() && rightA){
                    score++;
                    eventToRemove.push(i);
                    const ballObject = ballsRef.current.get(event.ball.id);
                    if(!ballObject || !rightRef.current) return
                    ballObject.userData.isExplosing = true;
                    rightRef.current.visible = false;
                }
                if(!event.hand.isRightHand() && leftX){
                    score++;
                    eventToRemove.push(i);
                    const ballObject = ballsRef.current.get(event.ball.id);
                    if(!ballObject || !leftRef.current) return
                    ballObject.userData.isExplosing = true;
                    leftRef.current.visible = false;
                }
            }
            // if(event.actionDescription === 'tossed'){
            //     if(event.hand.isRightHand() && rightB){
            //         score++;
            //         eventToRemove.push(i);
            //         const ballObject = ballsRef.current.get(event.ball.id);
            //         ballObject.userData.isExplosing = true;
            //     }
            //     if(!event.hand.isRightHand() && leftY){
            //         score++;
            //         eventToRemove.push(i);
            //         const ballObject = ballsRef.current.get(event.ball.id);
            //         ballObject.userData.isExplosing = true;
            //     }
            // }
        }
        const A = listenedEvent.current.filter((e) => e.actionDescription === 'caught' && e.hand.isRightHand())
        const X = listenedEvent.current.filter((e) => e.actionDescription === 'caught' && !e.hand.isRightHand())

        if(rightA && A.length === 0){
            vibrateController(right, 3, 100);
        }

        if(leftX && X.length === 0){
            vibrateController(left, 3, 100);
        }
    
        for(let i = eventToRemove.length-1; i > 0; i--){
            listenedEvent.current.splice(i, 1);
        }

        scale(leftRef.current as  THREE.Object3D, clock);
        scale(rightRef.current as  THREE.Object3D, clock);

        //console.log(score);
    })

    const leftRef = useRef<THREE.Mesh>(null);
    const rightRef = useRef<THREE.Mesh>(null);

    return <>

    <Box ref={rightRef} args={[0.3, 0.3, 0.3]} position={[-0.5, 1, 0.2]}>
        <meshBasicMaterial alphaHash={true} opacity={0.3} visible={visualizer}></meshBasicMaterial>
    </Box>

    <Box ref={leftRef} args={[0.3, 0.3, 0.3]} position={[-0.5, 1, -0.2]}>
        <meshBasicMaterial alphaHash={true} opacity={0.3} visible={visualizer}></meshBasicMaterial>
    </Box>
        
    </>
}

export function scale(obj: THREE.Object3D, clock: Clock) {
    if (!obj.userData.isScaling) {
        return;
    }

    const scaleDuration = 0.2;
    const scaleAvencement = (clock.getTime() - obj.userData.startScalingTime) / scaleDuration;
           
    const startScale = 1;
    const targetScale = 0;
    
    const currentScale = startScale + (targetScale - startScale) * scaleAvencement;
    if(currentScale < targetScale){
        obj.userData.isScaling = false;
    }
    obj.scale.setScalar(currentScale);
};