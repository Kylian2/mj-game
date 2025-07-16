import { useXRInputSourceState } from "@react-three/xr";
import { useEffect, useRef, useState, type RefObject } from "react";
// Three.js
import * as THREE from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { extend, useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { DOMPointReadOnlyToVector3, HandState, type HandActionEvent } from "../utilities/handState";
import {
    BallView,
    BasicJuggler,
    DEFAULT_BALL_COLOR,
    DEFAULT_BALL_HEIGHT_SEGMENT,
    DEFAULT_BALL_RADIUS,
    DEFAULT_BALL_WIDTH_SEGMENT,
    patternToModel,
    PerformanceView,
    Performance,
    Clock,
    type BasicJugglerProps,
    type JugglingPatternRaw,
    PerformanceModel,
    AlertsTimeline,
    Alerts,
    type AlertEvent
} from "musicaljuggling";
import mergeRefs from "merge-refs";
import { Container, Root, Text } from "@react-three/uikit";
import { ActionLearner } from "../utilities/actionLearner";
import { Box, Sphere, Cone, Octahedron } from "@react-three/drei";

extend({ LineMaterial, LineGeometry });

export type BallReactProps = {
    name?: string;
    id: string;
    radius?: number;
    widthSegments?: number;
    heightSegments?: number;
    color?: THREE.ColorRepresentation;
} & ThreeElements["object3D"];

export const pattern: JugglingPatternRaw = {
    jugglers: [
        {
            name: "Kylian",
            table: "KylianT",
            balls: [
                { id: "Do?K", name: "Do", sound: "Do" },
                { id: "Re?K", name: "Re", sound: "Re" },
                { id: "Mi?K", name: "Mi", sound: "Mi" }
            ],
            events: [
                [
                    "0",
                    {
                        tempo: "1",
                        hands: [["Do"], ["Re", "Mi"]],
                        //pattern: "R20300203004000500000040005"
                        pattern:
                            //"R3003003003003003003003003003003003003003003003003003003003003003003003002020202020202020202020202020202020120202020202020202020202020"
                            //"R202020202020202020300300300300300300300300300300300300300202020202020202020202020"
                            "L2020202020202020202020202020400040004000400040004000400040004000400300300300300300300300300300300300300300202020202020202020202020202020"
                    }
                ]
            ]
        }
    ],
    musicConverter: [[0, { signature: "1", tempo: { note: "1", bpm: 200 } }]]
};

function JugglingMovement({
    model,
    clock,
    ballsData,
    jugglersData
}: {
    model: PerformanceModel;
    clock: RefObject<Clock>;
    ballsData: { id: string; color: string }[];
    jugglersData: {
        name: string;
        position: number[];
    }[];
}) {
    const [performance, setPerformance] = useState(
        () => new PerformanceView({ model: model, clock: clock.current })
    );

    const ballsRef = useRef(new Map<string, THREE.Object3D>());
    const jugglersRef = useRef(
        new Map<string, { leftHand: THREE.Object3D | null; rightHand: THREE.Object3D | null }>()
    );

    useFrame(() => {
        const time = performance.getClock().getTime();

        for (const [id, ballView] of performance.balls) {
            let { model } = ballView;
            const ballObject = ballsRef.current.get(id);

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

                const localPos = o.worldToLocal(pos.clone());
                ballObject.position.copy(localPos);
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
                position={[1, 0, 0]}
            >
                {jugglersData.map((elem) => mapJuggler(elem as BasicJugglerProps))}
                {ballsData.map((elem) => mapBalls(elem as BallReactProps))}
            </Performance>
        </>
    );
}

export function ActionLearnerScene() {
    const handSourceRight = useXRInputSourceState("hand", "right");
    const rightHand = handSourceRight?.inputSource?.hand;
    const handSourceLeft = useXRInputSourceState("hand", "left");
    const leftHand = handSourceLeft?.inputSource?.hand;
    const rightTrajectoryPoints = useRef<THREE.Vector3[]>([]);
    const rightTrajectory = useRef<THREE.Line>(null);
    const leftTrajectoryPoints = useRef<THREE.Vector3[]>([]);
    const leftTrajectory = useRef<THREE.Line>(null);

    const { gl } = useThree() as { gl: THREE.WebGLRenderer & { xr: any } };
    const referenceSpace = gl.xr.getReferenceSpace();

    const [model, setModel] = useState(() => patternToModel(pattern));

    const [ballsData] = useState([
        { id: "Do?K", color: "red" },
        { id: "Re?K", color: "orange" },
        { id: "Mi?K", color: "yellow" }
    ]);

    const [jugglersData] = useState([{ name: "Kylian", position: [-1, 0, 0] }]);

    let [start, end] = model.patternTimeBounds();
    if (!end) {
        console.error("15s defautl end");
        end = 15;
    }
    const clock = useRef<Clock>(new Clock({ bounds: [0, end] }));
    clock.current.setPlaybackRate(0.6);
    useEffect(() => {
        clock.current.pause();
    }, []);

    // Fonction helper pour attendre
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Fonction pour le countdown
    const countdown = async () => {
        setText("Preparez-vous");
        await wait(1000);
        setText("3");
        await wait(1000);
        setText("2");
        await wait(1000);
        setText("1");
        await wait(1000);
        setText("Go !");
    };

    const texts = [
        "Bonjour, nous allons parametrer la reconnaissance de vos mouvements",
        "pour se faire, nous allons enregistrer une figure plusieurs fois.",
        "La figure se joue a une balle et a contient des lancers de 2 à 5.",
        "Vous devriez voir la balle, celle-ci va bouger pour suivre les lancers",
        "vous devrez mimer ces lancers en faisant des mouvements le plus possible semblable à votre façon de jongler.",
        "A l'endroit ou vous lisez ce texte, les indications siteswap des lancers apparaitronts",
        "Pincez pour commencer"
    ];
    const textCount = useRef(0);
    const settingsHasStarted = useRef(false);
    const [text, setText] = useState(texts[textCount.current]);

    const [handState, setHandState] = useState<HandState>();

    const handleOK = async () => {
        if (textCount.current + 1 < texts.length) {
            textCount.current++;
            setText(texts[textCount.current]);
        } else if (!settingsHasStarted.current) {
            settingsHasStarted.current = true;
            setText("Preparez-vous");
            await wait(1000);
            await countdown();
            clock.current.play();
            isLearning.current = true;
        }
    };

    useEffect(() => {
        if (leftHand && rightHand) {
            setHandState(
                new HandState({ leftHand: leftHand, rightHand: rightHand, pinchThreshold: 0.015 })
            );
        } else if (leftHand) {
            setHandState(new HandState({ leftHand: leftHand, pinchThreshold: 0.015 }));
        } else if (rightHand) {
            setHandState(new HandState({ rightHand: rightHand, pinchThreshold: 0.015 }));
        }
    }, [leftHand, rightHand]);

    useEffect(() => {
        if (!handState) return;

        handState.addEventListener("pinch", (e: HandActionEvent) => {
            handleOK();
        });

        return () => {
            handState?.removeAllEventListeners();
        };
    }, [handState]);

    // Enregistrement des positions -------------------------------

    const isLearning = useRef(false);
    const haveLearned = useRef(false);

    let listenings = useRef<
        [
            AlertEvent,
            {
                siteswapp: number;
                hand: string;
                action: string;
                positions: { t: number; position: THREE.Vector3 }[];
            }
        ][]
    >([]);
    let savedMovement = useRef<
        {
            siteswapp: number;
            hand: string;
            action: string;
            positions: { t: number; position: THREE.Vector3 }[];
        }[]
    >([]);

    const actionLearner = useRef<ActionLearner>(new ActionLearner());

    useEffect(() => {
        const alertsTimeline = new AlertsTimeline();
        model.balls.forEach((ball) => {
            alertsTimeline.addTimeline(ball.timeline, 0.05);
        });

        const alerts = new Alerts(alertsTimeline, clock.current);

        // register movement in the listening list
        alerts.addEventListener("inf", (e: AlertEvent) => {
            let movement: { siteswapp: number; hand: string; action: string; positions: [] } = {
                siteswapp: e.actionDescription === "tossed" ? e.siteswapHeight : -1, //Only one catch movement is needed
                hand: e.hand.isRightHand() ? "right" : "left",
                action: e.actionDescription,
                positions: []
            };

            listenings.current.push([e, movement]);
        });

        // save the movement
        alerts.addEventListener("sup", (e: AlertEvent) => {
            const index = listenings.current.map((tab) => tab[0]).indexOf(e);
            if (index > -1) {
                const removed = listenings.current.splice(index, 1);
                savedMovement.current.push(removed[0][1]);
            }
        });

        // when acquisition is completed, add saved data to actionLearner
        clock.current.addEventListener("reachedEnd", () => {
            actionLearner.current.addData(savedMovement.current);
            actionLearner.current.computeData();
            isLearning.current = false;
            haveLearned.current = true;
        });

        return () => {
            alerts.removeAllEventListeners();
        };
    }, [model]);

    // ------------------------------------------------------------

    const positionStackRight = useRef<THREE.Vector3[]>([]); // position stack for right hand
    const positionStackLeft = useRef<THREE.Vector3[]>([]); //position stack for left hand
    const tickcount = useRef(0);

    const [lastRightAction, setLastRightAction] = useState(0); //used for color shape
    const [lastLeftAction, setLastLeftAction] = useState(0); // used for color shape

    useFrame((_, __, frame) => {
        handState?.update(frame, referenceSpace);
        tickcount.current++;
        if (frame?.getJointPose && referenceSpace) {
            const leftPalm = leftHand?.get("middle-finger-metacarpal");
            if (leftPalm) {
                const leftPalmPose = frame.getJointPose(leftPalm, referenceSpace);
                if (leftPalmPose) {
                    const leftPalmPos = DOMPointReadOnlyToVector3(leftPalmPose.transform.position);

                    leftTrajectoryPoints.current.push(leftPalmPos);

                    const curve = new THREE.CatmullRomCurve3(leftTrajectoryPoints.current);
                    curve.closed = false;
                    curve.curveType = "catmullrom";
                    curve.tension = 0.5;

                    try {
                        const p = curve.getPoints(5000);
                        leftTrajectory.current?.geometry.setFromPoints(p);
                    } catch (e) {}

                    // position to save
                    const positionLeft = {
                        t: clock.current.getTime(),
                        position: leftPalmPos
                    };

                    // add the position to all listening movements
                    for (let i = 0; i < listenings.current.length; i++) {
                        if (listenings.current[i][1].hand === "left") {
                            listenings.current[i][1].positions.push(positionLeft);
                        }
                    }

                    // when learning process is completed, palmPos is used to fill position stack
                    if (haveLearned.current) {
                        positionStackLeft.current.push(leftPalmPos);
                        if (positionStackLeft.current.length > 15) {
                            positionStackLeft.current.shift();
                        }
                    }
                }
            }

            const rightPalm = rightHand?.get("middle-finger-metacarpal");
            if (rightPalm) {
                const rightPalmPose = frame.getJointPose(rightPalm, referenceSpace);
                if (rightPalmPose) {
                    const rightPalmPos = DOMPointReadOnlyToVector3(
                        rightPalmPose.transform.position
                    );

                    rightTrajectoryPoints.current.push(rightPalmPos);

                    const curve = new THREE.CatmullRomCurve3(rightTrajectoryPoints.current);
                    curve.closed = false;
                    curve.curveType = "catmullrom";
                    curve.tension = 0.5;

                    try {
                        const p = curve.getPoints(5000);
                        rightTrajectory.current?.geometry.setFromPoints(p);
                    } catch (e) {}

                    //position to save
                    const positionRight = {
                        t: clock.current.getTime(),
                        position: rightPalmPos
                    };

                    // add the position to all listening movements
                    for (let i = 0; i < listenings.current.length; i++) {
                        if (listenings.current[i][1].hand === "right") {
                            listenings.current[i][1].positions.push(positionRight);
                        }
                    }

                    // when learning process is completed, palmPos is used to fill position stack
                    if (haveLearned.current) {
                        positionStackRight.current.push(rightPalmPos);
                        if (positionStackRight.current.length > 15) {
                            positionStackRight.current.shift();
                        }
                    }
                }
            }
        }

        // ash action learner for the nearest movement and update state
        if (haveLearned.current) {
            const left = actionLearner.current.check(positionStackLeft.current, "left");
            const right = actionLearner.current.check(positionStackRight.current, "right");
            if (left?.hand === "left") {
                if (left.siteswapp) setLastLeftAction(left.siteswapp);
            } else {
                console.warn("left side detected a right side mouvement");
            }
            if (right?.hand === "right") {
                if (right.siteswapp) setLastRightAction(right.siteswapp);
            } else {
                console.warn("right side detected a left side mouvement");
            }
        }
    });

    return (
        <>
            <mesh ref={leftTrajectory}>
                <lineGeometry />
                <lineMaterial color={"red"} linewidth={0.002} />
            </mesh>
            <mesh ref={rightTrajectory}>
                <lineGeometry />
                <lineMaterial color={"green"} linewidth={0.002} />
            </mesh>
            <JugglingMovement
                model={model}
                clock={clock}
                ballsData={ballsData}
                jugglersData={jugglersData}
            />
            <group rotation={[0, Math.PI / 4, 0]}>
                <Box args={[0.3, 0.3, 0.3]} position={[3, 1, -0.3]}>
                    <meshBasicMaterial
                        color={lastLeftAction === 2 ? "red" : "grey"}
                    ></meshBasicMaterial>
                </Box>
                <Sphere args={[0.2, 32, 16]} position={[3, 1, -0.8]}>
                    <meshBasicMaterial
                        color={lastLeftAction === -1 ? "blue" : "grey"}
                    ></meshBasicMaterial>
                </Sphere>
                <Cone args={[0.2, 0.3, 16]} position={[3, 1, 0.3]}>
                    <meshBasicMaterial
                        color={lastLeftAction === 3 ? "purple" : "grey"}
                    ></meshBasicMaterial>
                </Cone>
                <Octahedron args={[0.2, 0]} position={[3, 1, 0.8]}>
                    <meshBasicMaterial
                        color={lastLeftAction === 4 ? "green" : "grey"}
                    ></meshBasicMaterial>
                </Octahedron>
            </group>
            <group rotation={[0, -Math.PI / 4, 0]}>
                <Box args={[0.3, 0.3, 0.3]} position={[3, 1, 0.3]}>
                    <meshBasicMaterial
                        color={lastRightAction === 2 ? "red" : "grey"}
                    ></meshBasicMaterial>
                </Box>
                <Sphere args={[0.2, 32, 16]} position={[3, 1, 0.8]}>
                    <meshBasicMaterial
                        color={lastRightAction === -1 ? "blue" : "grey"}
                    ></meshBasicMaterial>
                </Sphere>
                <Cone args={[0.2, 0.3, 16]} position={[3, 1, -0.3]}>
                    <meshBasicMaterial
                        color={lastRightAction === 3 ? "purple" : "grey"}
                    ></meshBasicMaterial>
                </Cone>
                <Octahedron args={[0.2, 0]} position={[3, 1, -0.8]}>
                    <meshBasicMaterial
                        color={lastRightAction === 4 ? "green" : "grey"}
                    ></meshBasicMaterial>
                </Octahedron>
            </group>
            <group rotation={[0, -Math.PI / 2, 0]} position={[4, 1, 0]}>
                <Root>
                    <Container
                        display={"flex"}
                        flexDirection={"column"}
                        alignItems={"flex-start"}
                        gap={10}
                    >
                        <Text backgroundColor={"white"} padding={2}>
                            {text}
                        </Text>
                        <Text color={"white"}>Pincez pour passer a la suite</Text>
                    </Container>
                </Root>
            </group>
        </>
    );
}
