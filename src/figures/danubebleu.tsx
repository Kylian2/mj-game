import { useEffect, useRef, useState, type RefObject } from "react";
import { extend, useFrame, type ThreeElements } from "@react-three/fiber";
import { useXRInputSourceState, type XRControllerState } from "@react-three/xr";
import * as THREE from "three";
import type { Mesh } from "three";
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

import {
    type BasicBallProps,
    BasicJuggler,
    type BasicJugglerProps,
    BasicTable,
    type BasicTableProps
} from "musicaljuggling";
import { 
    BallView, 
    Clock,
    PerformanceModel,
    PerformanceView, 
    Alerts, 
    AlertsTimeline,
    Performance, 
    patternToModel
} from "musicaljuggling";
import { 
    type AlertEvent,
    DEFAULT_BALL_COLOR, 
    DEFAULT_BALL_HEIGHT_SEGMENT, 
    DEFAULT_BALL_RADIUS, 
    DEFAULT_BALL_WIDTH_SEGMENT
} from "musicaljuggling";
import mergeRefs from 'merge-refs';
import { pattern } from "./patterns/pattern";
import { Box } from "@react-three/drei";

//TODO : styles ?
//TODO : clock optional for performance ?

//To extend those components to make them usable with R3F
extend({ LineMaterial, LineGeometry });

export type BallReactProps = {
    name?: string;
    id: string;
    radius?: number;
    widthSegments?: number;
    heightSegments?: number;
    color?: THREE.ColorRepresentation;} & ThreeElements["object3D"];

export function DanubeBleuFigure({clock}: {clock:Clock}) {
    const [model] = useState(() => patternToModel(pattern));
    const [ballsData] = useState<BasicBallProps[]>([
        { id: "Do?K", color: "red" },
        { id: "Re?K", color: "orange" },
        { id: "Mi?K", color: "yellow" }
    ]);
    const [jugglersData] = useState<BasicJugglerProps[]>([
        { name: "Kylian", position: [-1,0,0] as [number, number, number] }
    ]);
    const [tablesData] = useState<BasicTableProps[]>([
        { name: "KylianT", position: [0, 0, 0], rotation: [0, Math.PI, 0] }
    ]);

    return (
        <>
        <CanvasContent
            clock={clock}
            model={model}
            ballsData={ballsData}
            jugglersData={jugglersData}
            tablesData={tablesData}
        />
        </>
    );
}

function animation(ballObject: THREE.Object3D<THREE.Object3DEventMap>){

    const points = ballObject.children[1] as THREE.Points;
    
    let scalingFactor = 1.1;

    if(ballObject.userData.isExplosing){
        points.scale.set(points.scale.x*scalingFactor,points.scale.y*scalingFactor,points.scale.z*scalingFactor);
        const material = points.material;
        if (material instanceof THREE.PointsMaterial) {
            material.size = (material.size || 0.05) * 0.9;
        }else{
            console.error("Material is not PointsMaterial");
        }  
        ballObject.userData.tickcount++; 
    }else{
        ballObject.userData.isExplosing = false;
        points.scale.set(1, 1, 1);
        const material = points.material;
        if (material instanceof THREE.PointsMaterial) {
            material.size = 0.05;
        }else{
            console.error("Material is not PointsMaterial");
        }  
    }

    if(ballObject.userData.tickcount > 40){
        ballObject.userData.tickcount = 0;
        ballObject.userData.isExplosing = false;
    }
}

function HandDetector({
    clock,
    ballsRef,
    model
}: {
    clock:Clock,
    ballsRef: RefObject<Map<string, THREE.Object3D<THREE.Object3DEventMap>>>,
    model: PerformanceModel
}){

    const lastInfEvent = useRef<AlertEvent>(null)
    const lastSupEvent = useRef<AlertEvent>(null)
    const listenedEvent = useRef<Array<AlertEvent>>([]);

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
        <meshBasicMaterial alphaHash={true} opacity={0.3} visible={false}></meshBasicMaterial>
    </Box>

    <Box ref={leftRef} args={[0.3, 0.3, 0.3]} position={[-0.5, 1, -0.2]}>
        <meshBasicMaterial alphaHash={true} opacity={0.3} visible={false}></meshBasicMaterial>
    </Box>
        
    </>
}

function scale(obj: THREE.Object3D, clock: Clock) {
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

function CanvasContent({
    clock,
    model,
    ballsData,
    jugglersData,
    tablesData
}: {
    clock: Clock;
    model: PerformanceModel;
    ballsData: BasicBallProps[];
    jugglersData: BasicJugglerProps[];
    tablesData: BasicTableProps[];
}) {
    const [performance] = useState(() => new PerformanceView({ model: model, clock: clock }));
    const ballsRef = useRef(new Map<string, THREE.Object3D>());
    const curvesRef = useRef(new Map<string, THREE.Line>());
    const jugglersRef = useRef(
        new Map<string, { leftHand: THREE.Object3D | null; rightHand: THREE.Object3D | null }>()
    );

    const rightController = useXRInputSourceState('controller', 'right');
    const leftController = useXRInputSourceState('controller', 'left');

    useFrame(() => {
        const time = performance.getClock().getTime();
        const rightPos = new THREE.Vector3();
        rightController?.object?.getWorldPosition(rightPos);

        const leftPos = new THREE.Vector3();
        leftController?.object?.getWorldPosition(leftPos);

        for (const [id, ballView] of performance.balls) {

            let { model, curvePoints } = ballView;
            const ballObject = ballsRef.current.get(id);
            const curveObject = curvesRef.current.get(id);

            ballView.calculateCurve(performance.getClock());

            if (ballObject !== undefined) {
                if(ballObject.userData.tickcount === undefined){
                    ballObject.userData.tickcount = 0;
                }

                const pos = model.position(time);
                const o = new THREE.Object3D()
                if(performance.position){
                    o.position.set(performance.position[0], performance.position[1], performance.position[2]);
                }
                if(!performance.getClock().isPaused()){
                    curvePoints = curvePoints.map((p) => o.worldToLocal(p.clone()));

                    let curve = new THREE.CatmullRomCurve3(curvePoints);
                    curve.closed = false;
                    curve.curveType = 'catmullrom';
                    curve.tension = 0.5;
                    
                    try{
                        const p = curve.getPoints(100);
                        curveObject?.geometry.setFromPoints(p);
                    }catch(e){
                        
                    }
                }

                const localPos = o.worldToLocal(
                    pos.clone()
                );
                ballObject.position.copy(localPos);


                const radius = (ballObject.children[0] as Mesh).geometry.parameters.radius;
                const distanceRight = rightPos.distanceTo(ballObject.position);
                const distanceLeft = leftPos.distanceTo(ballObject.position);

                if(distanceRight <= radius){
                    //ballObject.userData.isExplosing = true;
                }

                if(distanceLeft <= radius){
                    //ballObject.userData.isExplosing = true;
                }

                animation(ballObject);
                scale(ballObject, clock);
            }

        }


        // Update the hands' positions.
        for (const [name, { model }] of performance.jugglers) {
            const jugglerObject = jugglersRef.current.get(name);
            const jugglerPos = performance.jugglers.get(name)?.position;
            if (jugglerObject !== undefined) {
                if (jugglerObject.leftHand !== null) {
                    const o = new THREE.Object3D()
                    if(performance.position){
                        o.position.set(performance.position[0] + jugglerPos[0], performance.position[1] + jugglerPos[1], performance.position[2] + jugglerPos[2]);
                    }
                    const localPos = o.worldToLocal(
                        model.leftHand.position(time).clone()
                    );
                    jugglerObject.leftHand.position.copy(localPos);
                }
                if (jugglerObject.rightHand !== null) {
                    const o = new THREE.Object3D()
                    if(performance.position){
                        o.position.set(performance.position[0] + jugglerPos[0], performance.position[1] + jugglerPos[1], performance.position[2] + jugglerPos[2]);
                    }
                    const localPos = o.worldToLocal(
                        model.rightHand.position(time).clone()
                    );
                    jugglerObject.rightHand.position.copy(localPos);
                }
            }
        }
    });

    function mapBalls({ radius, id, ref, 
        widthSegments, 
        heightSegments, 
        color, 
        ...props }: BallReactProps) {

        // Create / delete the ball.
        useEffect(() => {
            if (performance === undefined) {
                return;
            }
            const ballModel = performance.model.balls.get(id);
            if (ballModel === undefined) {
                return;
            }
            const ball = new BallView({
                model: ballModel
            });
            performance.balls.set(id, ball);
            return () => {
                performance.balls.delete(id);
            };
        }, [performance, radius, id]);

        radius ??= DEFAULT_BALL_RADIUS;
        widthSegments ??= DEFAULT_BALL_WIDTH_SEGMENT;
        heightSegments ??= DEFAULT_BALL_HEIGHT_SEGMENT;
        color ??= DEFAULT_BALL_COLOR;
        
        return (
            <>
                <object3D
                    key={id}
                    ref={mergeRefs((elem) => {
                        if (elem === null) {
                            ballsRef.current.delete(id);
                        } else {
                            ballsRef.current.set(id, elem);
                        }
                        /*@ts-expect-error React 19's refs are weirdly typed*/
                    }, ref)}
                    {...props}
                    userData={{ baseColor: color }} 
                >
                    <mesh>
                        <sphereGeometry args={[radius, widthSegments, heightSegments]}/>
                        <meshBasicMaterial color={color}/>
                    </mesh>
                    <points>
                        <sphereGeometry args={[radius-0.05, 16, 16]}/>
                        <pointsMaterial size={0.03} transparent={true} color={'yellow'}/>
                    </points>
                </object3D>
                <mesh ref={mergeRefs((elem) => {
                        if (elem === null) {
                            curvesRef.current.delete(id);
                        } else {
                            curvesRef.current.set(id, elem);
                        }
                    })}>
                    <lineGeometry />
                    <lineMaterial color={color} linewidth={0.002}/>
                </mesh>
                <HandDetector model={model} ballsRef={ballsRef} clock={clock}/>
            </>
        );
    }

    function mapJuggler({ name, ...props }: BasicJugglerProps) {
        return (
            <BasicJuggler
                name={name}
                key={name}
                rightHandRef={(elem) => {
                    const ref = jugglersRef.current.get(name);
                    if (ref === undefined) {
                        if (elem !== null) {
                            jugglersRef.current.set(name, {
                                rightHand: elem,
                                leftHand: null
                            });
                        }
                    } else {
                        ref.rightHand = elem;
                        if (ref.rightHand === null && ref.leftHand === null) {
                            // jugglersRef.current.delete(name);
                        }
                    }
                }}
                leftHandRef={(elem) => {
                    const ref = jugglersRef.current.get(name);
                    if (ref === undefined) {
                        if (elem !== null) {
                            jugglersRef.current.set(name, {
                                rightHand: null,
                                leftHand: elem
                            });
                        }
                    } else {
                        ref.leftHand = elem;
                        if (ref.rightHand === null && ref.leftHand === null) {
                            // jugglersRef.current.delete(name);
                        }
                    }
                }}
                {...props}
                />
        );
    }

    function mapTables({ name, ...props }: BasicTableProps) {
        return <BasicTable name={name} key={name} {...props} />;
    }

    return (
        <Performance audio={true} clock={clock} performance={performance} position={[0, 0, 0]}>
            {jugglersData.map((elem) => mapJuggler(elem))}
            {/*{tablesData.map((elem) => mapTables(elem))}*/}
            {ballsData.map((elem) => mapBalls(elem))}
        </Performance>
    );
}
