import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type Dispatch,
    type RefObject,
    type SetStateAction
} from "react";
import { extend, useFrame, type ThreeElements } from "@react-three/fiber";
import { useXRInputSourceState } from "@react-three/xr";
import * as THREE from "three";
import type { Mesh } from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";

import {
    Alerts,
    AlertsTimeline,
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
    Performance,
    patternToModel
} from "musicaljuggling";
import {
    DEFAULT_BALL_COLOR,
    DEFAULT_BALL_HEIGHT_SEGMENT,
    DEFAULT_BALL_RADIUS,
    DEFAULT_BALL_WIDTH_SEGMENT
} from "musicaljuggling";
import mergeRefs from "merge-refs";
import { pattern } from "./patterns/pattern";
import { Root, Text } from "@react-three/uikit";
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
    color?: THREE.ColorRepresentation;
} & ThreeElements["object3D"];

export function DanubeBleuFigure({
    clock,
    simon = false,
    visualizer = false
}: {
    clock: Clock;
    simon: boolean;
    visualizer: boolean;
}) {
    const initPattern = structuredClone(pattern);
    const patternRef = useRef(initPattern);
    const sequence = pattern.jugglers[0].events[0][1].pattern?.replace(/ /g, "");
    const limit = sequence?.length ?? 0;
    const sizeRef = useRef(2);
    const errorRef = useRef(false);
    const [model, setModel] = useState(() => patternToModel(patternRef.current));

    const [text, setText] = useState(() => "Bon jeu");

    useEffect(() => {
        clock.pause();
        clock.setTime(0);

        let currentPattern;
        if (simon === true) {
            patternRef.current.jugglers[0].events[0][1].pattern = sequence?.slice(
                0,
                sizeRef.current
            );
            currentPattern = patternRef.current;
        } else {
            currentPattern = structuredClone(pattern);
            patternRef.current = currentPattern;
        }

        const newModel = patternToModel(currentPattern);
        setModel(newModel);

        const [start, end] = newModel.patternTimeBounds();

        if (start && end && clock) {
            clock.setBounds([0, end]);
        }
    }, [simon, sequence, pattern, clock]);

    const [ballsData] = useState([
        { id: "Do?K", color: "red" },
        { id: "Re?K", color: "orange" },
        { id: "Mi?K", color: "yellow" }
    ]);
    const [jugglersData] = useState([{ name: "Kylian", position: [-1, 0, 0] }]);
    const [tablesData] = useState([
        { name: "KylianT", position: [0, 0, 0], rotation: [0, Math.PI, 0] }
    ]);

    const handleReachedEnd = useCallback(() => {
        if (simon === true) {
            if (!errorRef.current) {
                sizeRef.current++;
            }
            errorRef.current = false;
            clock.pause();

            if (sizeRef.current <= limit) {
                const newSlice = sequence?.slice(0, sizeRef.current);
                patternRef.current.jugglers[0].events[0][1].pattern = newSlice;
                const newModel = patternToModel(patternRef.current);
                setModel(newModel);
                const [start, end] = newModel.patternTimeBounds();
                if (start && end) {
                    clock.setBounds([0, end]);
                }
                setText("On ajoute un nouveau mouvement (" + sizeRef.current + "/" + limit + ")");
            } else {
                sizeRef.current = 1;
            }

            setTimeout(() => {
                clock.setTime(0);
                clock.play();
            }, 100);
        }
    }, [sequence, limit, clock]);

    useEffect(() => {
        clock.addEventListener("reachedEnd", handleReachedEnd);
    }, [clock, handleReachedEnd]);

    return (
        <>
            <CanvasContent
                clock={clock}
                model={model}
                ballsData={ballsData}
                jugglersData={jugglersData}
                tablesData={tablesData}
                visualizer={visualizer}
                errorRef={errorRef}
                setText={setText}
                text={text}
            />
        </>
    );
}

function animation(ballObject: THREE.Object3D<THREE.Object3DEventMap>) {
    const points = ballObject.children[1] as THREE.Points;

    let scalingFactor = 1.1;

    if (ballObject.userData.isExplosing) {
        points.scale.set(
            points.scale.x * scalingFactor,
            points.scale.y * scalingFactor,
            points.scale.z * scalingFactor
        );
        const material = points.material;
        if (material instanceof THREE.PointsMaterial) {
            material.size = (material.size || 0.05) * 0.9;
        } else {
            console.error("Material is not PointsMaterial");
        }
        ballObject.userData.tickcount++;
    } else {
        ballObject.userData.isExplosing = false;
        points.scale.set(1, 1, 1);
        const material = points.material;
        if (material instanceof THREE.PointsMaterial) {
            material.size = 0.05;
        } else {
            console.error("Material is not PointsMaterial");
        }
    }

    if (ballObject.userData.tickcount > 40) {
        ballObject.userData.tickcount = 0;
        ballObject.userData.isExplosing = false;
    }
}

function CanvasContent({
    clock,
    model,
    ballsData,
    jugglersData,
    tablesData,
    visualizer = false,
    errorRef,
    setText,
    text
}: {
    clock: Clock;
    model: PerformanceModel;
    ballsData: BasicBallProps[];
    jugglersData: BasicJugglerProps[];
    tablesData: BasicTableProps[];
    visualizer: boolean;
    errorRef?: RefObject<boolean>;
    setText: Dispatch<SetStateAction<string>>;
    text: string;
}) {
    const [performance, setPerformance] = useState(
        () => new PerformanceView({ model: model, clock: clock })
    );

    useEffect(() => {
        const newPerformance = new PerformanceView({ model: model, clock: clock });
        setPerformance(newPerformance);
    }, [model, clock]);

    const ballsRef = useRef(new Map<string, THREE.Object3D>());
    const curvesRef = useRef(new Map<string, THREE.Line>());
    const jugglersRef = useRef(
        new Map<string, { leftHand: THREE.Object3D | null; rightHand: THREE.Object3D | null }>()
    );

    const rightController = useXRInputSourceState("controller", "right");
    const leftController = useXRInputSourceState("controller", "left");

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
                if (ballObject.userData.tickcount === undefined) {
                    ballObject.userData.tickcount = 0;
                }

                const pos = model.position(time);
                const o = new THREE.Object3D();
                if (performance.position) {
                    o.position.set(
                        performance.position[0],
                        performance.position[1],
                        performance.position[2]
                    );
                }
                if (!performance.getClock().isPaused()) {
                    curvePoints = curvePoints.map((p) => o.worldToLocal(p.clone()));

                    let curve = new THREE.CatmullRomCurve3(curvePoints);
                    curve.closed = false;
                    curve.curveType = "catmullrom";
                    curve.tension = 0.5;

                    try {
                        const p = curve.getPoints(100);
                        curveObject?.geometry.setFromPoints(p);
                    } catch (e) {}
                }

                const localPos = o.worldToLocal(pos.clone());
                ballObject.position.copy(localPos);

                const radius = (ballObject.children[0] as Mesh).geometry.parameters.radius;
                const distanceRight = rightPos.distanceTo(ballObject.position);
                const distanceLeft = leftPos.distanceTo(ballObject.position);

                if (distanceRight <= radius) {
                    //ballObject.userData.isExplosing = true;
                }

                if (distanceLeft <= radius) {
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
                    const o = new THREE.Object3D();
                    if (performance.position) {
                        o.position.set(
                            performance.position[0] + jugglerPos[0],
                            performance.position[1] + jugglerPos[1],
                            performance.position[2] + jugglerPos[2]
                        );
                    }
                    const localPos = o.worldToLocal(model.leftHand.position(time).clone());
                    jugglerObject.leftHand.position.copy(localPos);
                }
                if (jugglerObject.rightHand !== null) {
                    const o = new THREE.Object3D();
                    if (performance.position) {
                        o.position.set(
                            performance.position[0] + jugglerPos[0],
                            performance.position[1] + jugglerPos[1],
                            performance.position[2] + jugglerPos[2]
                        );
                    }
                    const localPos = o.worldToLocal(model.rightHand.position(time).clone());
                    jugglerObject.rightHand.position.copy(localPos);
                }
            }
        }
    });

    function mapBalls({
        radius,
        id,
        ref,
        widthSegments,
        heightSegments,
        color,
        ...props
    }: BallReactProps) {
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

        radius ??= 0.05;
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
                        <sphereGeometry args={[radius, widthSegments, heightSegments]} />
                        <meshBasicMaterial color={color} />
                    </mesh>
                    <points>
                        <sphereGeometry args={[radius - 0.045, 16, 16]} />
                        <pointsMaterial size={0.03} transparent={true} color={"yellow"} />
                    </points>
                </object3D>
                <mesh
                    ref={mergeRefs((elem) => {
                        if (elem === null) {
                            curvesRef.current.delete(id);
                        } else {
                            curvesRef.current.set(id, elem);
                        }
                    })}
                >
                    <lineGeometry />
                    <lineMaterial color={color} linewidth={0.002} />
                </mesh>
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
        <>
            <Performance audio={true} clock={clock} performance={performance} position={[0, 0, 0]}>
                {jugglersData.map((elem) => mapJuggler(elem))}
                {/*{tablesData.map((elem) => mapTables(elem))}*/}
                {ballsData.map((elem) => mapBalls(elem))}
            </Performance>
            <group position={[2, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <Root>
                    <Text backgroundColor={"white"}>{text}</Text>
                </Root>
            </group>
            {/* <HandDetector
                model={model}
                ballsRef={ballsRef}
                clock={clock}
                visualizer={visualizer}
                setText={setText}
                onError={() => {
                    if (errorRef != undefined) {
                        errorRef.current = true;
                    }
                }}
            /> */}
        </>
    );
}
