import { useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from "react";
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
    model,
    visualizer = false,
    onError,
    setText,
}: {
    clock:Clock,
    ballsRef: RefObject<Map<string, THREE.Object3D<THREE.Object3DEventMap>>>,
    model: PerformanceModel,
    visualizer?: boolean,
    onError: Function,
    setText?: Dispatch<SetStateAction<string>>
}){

    const lastInfEvent = useRef<AlertEvent>(null)
    const lastSupEvent = useRef<AlertEvent>(null)
    const listenedEvent = useRef<Array<AlertEvent>>([]);

    const squeezeRightClick = useRef(false);
    const squeezeLeftClick = useRef(false);
    const Aclick = useRef(false);
    const Xclick = useRef(false);

    useEffect(() => {

        const alertesTimeline = new AlertsTimeline();
        model.balls.forEach((ball) => {
            alertesTimeline.addTimeline(ball.timeline, 0.2)
        })

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

            if(e.actionDescription === 'tossed'){
                if(e.hand.isRightHand()){
                    if(!rightRefToss.current) return;
                    rightRefToss.current.visible = true;            
                    (rightRefToss.current.material as THREE.MeshBasicMaterial).color.set(color);
                    rightRefToss.current.userData.isScalingY = true;
                    rightRefToss.current.userData.startScalingTime = time;    
                    rightRefToss.current.scale.y = 0;                                 
                }else{
                    if(!leftRefToss.current) return;
                    leftRefToss.current.visible = true;
                    (leftRefToss.current.material as THREE.MeshBasicMaterial).color.set(color); 
                    leftRefToss.current.userData.isScalingY = true; 
                    leftRefToss.current.userData.startScalingTime = time;    
                    leftRefToss.current.scale.y = 0;                                 
                }
            }

            listenedEvent.current.push(e);
            lastInfEvent.current = e;
        })

        alertes.addEventListener("sup", (e: AlertEvent) => {
            if(e === lastInfEvent.current){
                if(e.actionDescription === 'caught'){
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
                if(e.actionDescription === 'tossed'){
                    if(e.hand.isRightHand()){
                        if(!rightRefToss.current) return;
                        (rightRefToss.current.material as THREE.MeshBasicMaterial).color.set('white');                   
                        rightRefToss.current.visible = false;            
                    }else{
                        if(!leftRefToss.current) return;
                        (leftRefToss.current.material as THREE.MeshBasicMaterial).color.set('white');                   
                        leftRefToss.current.visible = false;  
                    }
                }
            }

            if(e.actionDescription === 'caught' && e.hand.isRightHand() && !squeezeRightClick.current){
                onError();
                if(setText){
                    setText("Vous n'avez pas rattrape la balle a droite");
                }
            }

            if(e.actionDescription === 'caught' && !e.hand.isRightHand() && !squeezeLeftClick.current){
                onError();
                if(setText){
                    setText("Vous n'avez pas rattrape la balle a gauche");
                }            
            }

            if(e.actionDescription === 'tossed' && e.hand.isRightHand() && !Aclick.current){
                onError();
                if(setText){
                    setText("Vous n'avez pas lance la balle a droite");
                }
            }

            if(e.actionDescription === 'tossed' && !e.hand.isRightHand() && !Xclick.current){
                onError();
                if(setText){
                    setText("Vous n'avez pas lancer la balle a gauche");
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

    }, [model])

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

        let leftSqueeze = left?.gamepad?.['xr-standard-squeeze']?.button;
        let leftX = left?.gamepad?.['x-button']?.button;
        let rightSqueeze = right?.gamepad?.['xr-standard-squeeze']?.button;
        let rightA = right?.gamepad?.['a-button']?.button;

        let eventToRemove = []

        for (let i = 0; i < listenedEvent.current.length; i++){
            const event = listenedEvent.current[i];

            if(event.actionDescription === 'caught'){
                if(event.hand.isRightHand() && rightSqueeze){
                    score++;
                    eventToRemove.push(i);
                    const ballObject = ballsRef.current.get(event.ball.id);
                    if(!ballObject || !rightRef.current) return
                    ballObject.userData.isExplosing = true;
                    rightRef.current.visible = false;
                    squeezeRightClick.current = true;
                }
                if(!event.hand.isRightHand() && leftSqueeze){
                    score++;
                    eventToRemove.push(i);
                    const ballObject = ballsRef.current.get(event.ball.id);
                    if(!ballObject || !leftRef.current) return
                    ballObject.userData.isExplosing = true;
                    leftRef.current.visible = false;
                    squeezeLeftClick.current = true;
                }
            }

            if(event.actionDescription === 'tossed'){
                if(event.hand.isRightHand() && rightA){
                    score++;
                    eventToRemove.push(i);
                    const ballObject = ballsRef.current.get(event.ball.id);
                    if(!ballObject || !rightRefToss.current) return
                    rightRefToss.current.visible = false;
                    ballObject.userData.isExplosing = true;
                    Aclick.current = true;
                }
                if(!event.hand.isRightHand() && leftX){
                    score++;
                    eventToRemove.push(i);
                    const ballObject = ballsRef.current.get(event.ball.id);
                    if(!ballObject || !leftRefToss.current) return
                    leftRefToss.current.visible = false;
                    ballObject.userData.isExplosing = true;
                    Xclick.current = true;
                }
            }
        }
        const rightSqueezeList = listenedEvent.current.filter((e) => e.actionDescription === 'caught' && e.hand.isRightHand())
        const leftSqueezeList = listenedEvent.current.filter((e) => e.actionDescription === 'caught' && !e.hand.isRightHand())
        const A = listenedEvent.current.filter((e) => e.actionDescription === 'tossed' && e.hand.isRightHand())
        const X = listenedEvent.current.filter((e) => e.actionDescription === 'tossed' && !e.hand.isRightHand())

        if(rightSqueeze && rightSqueezeList.length === 0){
            vibrateController(right, 3, 100);
            onError();
            if(setText){
                setText("Mauvais timing !");
            } 
        }

        if(leftSqueeze && leftSqueezeList.length === 0){
            vibrateController(left, 3, 100);
            onError();
            if(setText){
                setText("Mauvais timing !");
            } 
        }

        if(rightA && A.length === 0){
            vibrateController(right, 3, 100);
            onError();
            if(setText){
                setText("Mauvais timing !");
            } 
        }

        if(leftX && X.length === 0){
            vibrateController(left, 3, 100);
            onError();
            if(setText){
                setText("Mauvais timing !");
            } 
        }
        
    
        for(let i = eventToRemove.length-1; i > 0; i--){
            listenedEvent.current.splice(i, 1);
        }

        scale(leftRef.current as  THREE.Object3D, clock);
        scale(rightRef.current as  THREE.Object3D, clock);

        scaleY(leftRefToss.current as  THREE.Object3D, clock);
        scaleY(rightRefToss.current as  THREE.Object3D, clock);
        //console.log(score);
    })

    const leftRef = useRef<THREE.Mesh>(null);
    const rightRef = useRef<THREE.Mesh>(null);
    const leftRefToss = useRef<THREE.Mesh>(null);
    const rightRefToss = useRef<THREE.Mesh>(null);

    useEffect(() => {
        if(leftRef.current){
            leftRef.current.visible = false;
        }
        if(rightRef.current){
            rightRef.current.visible = false;
        }
        if(leftRefToss.current){
            leftRefToss.current.visible = false;
        }
        if(rightRefToss.current){
            rightRefToss.current.visible = false;
        }
    })

    return <>

    <Box ref={rightRef} args={[0.3, 0.3, 0.3]} position={[-0.5, 1, 0.2]}>
        <meshBasicMaterial alphaHash={true} opacity={0.3} visible={visualizer}></meshBasicMaterial>
    </Box>

    <Box ref={leftRef} args={[0.3, 0.3, 0.3]} position={[-0.5, 1, -0.2]}>
        <meshBasicMaterial alphaHash={true} opacity={0.3} visible={visualizer}></meshBasicMaterial>
    </Box>

    <Box ref={leftRefToss} args={[0.1, 0.6, 0.1]} position={[-0.5, 1.1, -0.2]}>
        <meshBasicMaterial alphaHash={true} opacity={0.3} visible={visualizer}></meshBasicMaterial>
    </Box>

    <Box ref={rightRefToss} args={[0.1, 0.6, 0.1]} position={[-0.5, 1.1, 0.2]}>
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

export function scaleY(obj: THREE.Object3D, clock: Clock) {
    if (!obj.userData.isScalingY) {
        return;
    }

    const scaleDuration = 0.2;
    const scaleAvencement = (clock.getTime() - obj.userData.startScalingTime) / scaleDuration;
           
    const startScale = 0;
    const targetScale = 1;
    
    const currentScale = startScale + (targetScale - startScale) * scaleAvencement;
    if(currentScale >= targetScale){
        obj.userData.isScalingY = false;
        obj.visible = false;
        return
    }
    obj.scale.y = currentScale;
};