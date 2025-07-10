// React and Three.js Fiber
import { extend, useFrame, type ThreeElements } from "@react-three/fiber";

// React-XR
import { useXRInputSourceState } from "@react-three/xr";

// Utilities
import mergeRefs from "merge-refs";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

// Three.js
import * as THREE from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import type { Mesh } from "three";

// Musical Juggling Library
import {
    Performance,
    Clock,
    BallView,
    BasicJuggler,
    DEFAULT_BALL_COLOR,
    DEFAULT_BALL_HEIGHT_SEGMENT,
    DEFAULT_BALL_RADIUS,
    DEFAULT_BALL_WIDTH_SEGMENT,
    patternToModel,
    PerformanceView,
    type BasicJugglerProps,
    type JugglingPatternRaw,
    type BasicBallProps
} from "musicaljuggling";
import { TossProgress } from "../../utilities/tossProgress";
import { Root, Text } from "@react-three/uikit";

extend({ LineMaterial, LineGeometry });

export type BallReactProps = {
    name?: string;
    id: string;
    radius?: number;
    widthSegments?: number;
    heightSegments?: number;
    color?: THREE.ColorRepresentation;
} & ThreeElements["object3D"];

const pattern: JugglingPatternRaw = {
    jugglers: [
        {
            name: "Jean",
            table: "JeanT",
            balls: [{ id: "Do?K", name: "Do", sound: "Do" }],
            events: [
                [
                    "0",
                    {
                        tempo: "1",
                        hands: [[], ["Do"]],
                        pattern: "R3003003003003003003003003003003003003003003003003003003003003"
                    }
                ]
            ]
        }
    ],
    musicConverter: [[0, { signature: "1", tempo: { note: "1", bpm: 200 } }]]
};

function wait(ms: number) {
    new Promise((resolve) => setTimeout(resolve, ms));
}

export function TossIntroduction({ change }: { change: Dispatch<SetStateAction<string>> }) {
    const [model, setModel] = useState(() => patternToModel(pattern));

    const [ballsData] = useState([{ id: "Do?K", color: "red" }]);

    const [jugglersData] = useState([{ name: "Jean", position: [-1, 0, 0] }]);

    let [start, end] = model.patternTimeBounds();
    if (!end) end = 15;
    const clock = useRef<Clock>(new Clock({ bounds: [0, end] }));
    useEffect(() => {
        clock.current.setPlaybackRate(0.35);
        clock.current.play();
        clock.current.setLoop(true);
    }, []);

    const [performance, setPerformance] = useState(
        () => new PerformanceView({ model: model, clock: clock.current })
    );

    const ballsRef = useRef(new Map<string, THREE.Object3D>());
    const curvesRef = useRef(new Map<string, THREE.Line>());
    const jugglersRef = useRef(
        new Map<string, { leftHand: THREE.Object3D | null; rightHand: THREE.Object3D | null }>()
    );

    const currentProgression = useRef(0);
    const texts = [
        "Au moment de lancer la balle, un indicateur se remplit",
        "En jeu, pour lancer la balle de la main droite il faut appuyer sur A",
        "Et sur X pour lancer de la gauche",
        "Si le timing de votre lancer est bon, vous verrez des particules autour de la balle",
        "Appuyez sur B pour passer a la pratique"
    ];

    const [text, setText] = useState(texts[currentProgression.current]);
    const rightController = useXRInputSourceState("controller", "right");
    const tickcount = useRef(0);
    const Bcount = useRef(0);
    const explosionCount = useRef(0);

    useFrame(() => {
        const time = performance.getClock().getTime();

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
                animation(ballObject);
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

        // Gestion du bouton B
        const rightB = rightController?.gamepad?.["b-button"]?.button;
        if (rightB && Math.abs(Bcount.current - tickcount.current) > 200) {
            Bcount.current = tickcount.current;
            currentProgression.current++;
            setText(texts[currentProgression.current]);
            if (currentProgression.current >= texts.length) {
                change("toss-right");
            }
        }

        if (currentProgression.current >= 3) {
            clock.current.pause();
            const ball = ballsRef.current.get("Do?K");
            if (ball && Math.abs(explosionCount.current - tickcount.current) > 100) {
                explosionCount.current = tickcount.current;
                ball.userData.isExplosing = true;
            }
        }

        tickcount.current++;
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
                        <sphereGeometry args={[radius, widthSegments, heightSegments]} />
                        <meshBasicMaterial color={color} />
                    </mesh>
                    <points>
                        <sphereGeometry args={[radius - 0.05, 16, 16]} />
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
                visible={false}
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

    return (
        <>
            <Performance
                audio={true}
                clock={clock.current}
                performance={performance}
                position={[3, 0, 0]}
            >
                {jugglersData.map((elem) => mapJuggler(elem as BasicJugglerProps))}
                {ballsData.map((elem) => mapBalls(elem as BallReactProps))}
            </Performance>
            <TossProgress
                indicatorPosition={[2.5, 1.1, 0]}
                model={model}
                clock={clock.current}
                ballsRef={ballsRef}
            />
            <TextComponent text={text} />
        </>
    );
}

function TextComponent({ text }: { text: string }) {
    return (
        <group position={[3.5, 1.3, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <Root flexDirection={"column"}>
                <Text backgroundColor={"white"} padding={2}>
                    {text}
                </Text>
                <Text color={"white"} fontSize={12} marginTop={10}>
                    Appuie sur B pour passer au suivant
                </Text>
            </Root>
        </group>
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

    return;
}
