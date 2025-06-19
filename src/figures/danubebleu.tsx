import { Canvas, extend, useFrame, type Euler, type ThreeElements, type Vector3 } from "@react-three/fiber";
import { BallView, DEFAULT_BALL_COLOR, DEFAULT_BALL_HEIGHT_SEGMENT, DEFAULT_BALL_RADIUS, DEFAULT_BALL_WIDTH_SEGMENT, Performance, PerformanceContext } from "musicaljuggling";
import {
    BasicBall,
    type BasicBallProps,
    BasicJuggler,
    type BasicJugglerProps,
    BasicTable,
    type BasicTableProps
} from "musicaljuggling";
import { Clock } from "musicaljuggling";
import { use, useEffect, useRef, useState } from "react";
import { PerformanceModel } from "musicaljuggling";
import { PerformanceView } from "musicaljuggling";
import * as THREE from "three";
import { pattern } from "./patterns/pattern";
import { patternToModel } from "musicaljuggling";
import mergeRefs from 'merge-refs';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { OrbitControls } from "@react-three/drei";
import type { Mesh } from "three";
import { distance, userData } from "three/tsl";
import { useXRInputSourceState } from "@react-three/xr";
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

    if(ballObject.userData.isScaling){
        points.scale.set(points.scale.x*scalingFactor,points.scale.y*scalingFactor,points.scale.z*scalingFactor);
        const material = points.material;
        if (material instanceof THREE.PointsMaterial) {
            material.size = (material.size || 0.05) * 0.9;
        }else{
            console.error("Material is not PointsMaterial");
        }  
        ballObject.userData.tickcount++; 
    }else{
        ballObject.userData.isScaling = false;
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
        ballObject.userData.isScaling = false;
    }
}

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

        // Update the balls' positions. 
        // let i = 0;
        for (const [id, ballView] of performance.balls) {
            // i++;
            // if (i === 2 || i === 1){
            //     continue;
            // }
            let { model, curvePoints, initCurve } = ballView;
            const ballObject = ballsRef.current.get(id);
            const curveObject = curvesRef.current.get(id);

            if (curvePoints.length === 0) {
                ballView.initCurve(performance.getClock());
            }

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
                    curvePoints.shift();
                    curvePoints.push(model.position(time+0.51));
                    curvePoints = curvePoints.map((p) => o.worldToLocal(p.clone()));

                    let curve = new THREE.CatmullRomCurve3(curvePoints);
                    curve.closed = false;
                    curve.curveType = 'catmullrom';
                    curve.tension = 0.5;

                    const p = curve.getPoints(100);

                    curveObject?.geometry.setFromPoints(p);
                }

                const localPos = o.worldToLocal(
                    pos.clone()
                );
                ballObject.position.copy(localPos);


                const radius = (ballObject.children[0] as Mesh).geometry.parameters.radius;
                const distanceRight = rightPos.distanceTo(ballObject.position);
                const distanceLeft = leftPos.distanceTo(ballObject.position);

                if(distanceRight <= radius){
                    ballObject.userData.isScaling = true;
                    console.log("Rightenter")
                }

                if(distanceLeft <= radius){
                    ballObject.userData.isScaling = true;
                    console.log("Rightenter")
                }

                animation(ballObject);
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

        const caughtColor = () => {
            const ball = ballsRef.current.get(id);
            if(ball && ball.children[0]){
                ball.children[0].material.color.set('blue')
            }
            //console.log('catch');
        }

        const tossedColor = () => {
            const ball = ballsRef.current.get(id);
            if(ball && ball.children[0]){
                ball.children[0].material.color.set(color);
            }
            //console.log('toss')
        }
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
            ball.model.addEventListener("caught", () => caughtColor())
            ball.model.addEventListener("tossed", () => tossedColor())
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
                 
            </>
        );
    }
    // <BasicBall
    //     id="Do?K"
    //     color="red"
    //     ref={(elem) => {
    //         if (elem !== null) {
    //             ballsRef.current.set("Do?K", elem);
    //         }
    //     }}
    // />

    function mapJuggler({ name, ...props }: BasicJugglerProps) {
        const juggler = jugglersRef.current.get(name);
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
    // <BasicJuggler
    //     name="Kylian"
    //     position={[-1, 0, 0]}
    //     rightHandRef={(elem) => {
    //         const ref = jugglersRef.current.get("Kylian");
    //         if (ref !== undefined) {
    //             ref.rightHand = elem;
    //         }
    //     }}
    //     leftHandRef={(elem) => {
    //         const ref = jugglersRef.current.get("Kylian");
    //         if (ref !== undefined) {
    //             ref.leftHand = elem;
    //         }
    //     }}
    // />

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
