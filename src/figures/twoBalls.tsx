// React and Three.js Fiber
import { extend, useFrame, useThree, type ThreeElements } from "@react-three/fiber";

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
import { Root, Text } from "@react-three/uikit";
import { CatchChecker } from "../utilities/catchChecker";
import { TossChecker } from "../utilities/tossChecker";
import { TimeControls } from "../ui/TimeControls";
import { HandState } from "../utilities/handState";
import { FollowTrajectory } from "../utilities/followTrajectory";

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
            balls: [
                { id: "Do?K", name: "Do", sound: "Do" },
                { id: "Re?K", name: "Re", sound: "Re" }
            ],
            events: [
                [
                    "0",
                    {
                        tempo: "1",
                        hands: [["Do"], ["Re"]],
                        pattern: "R31313122313131"
                    }
                ]
            ]
        }
    ],
    musicConverter: [[0, { signature: "1", tempo: { note: "1", bpm: 200 } }]]
};

export function TwoBallsPerformance({ training = false }: { training?: boolean }) {
    const { gl } = useThree() as { gl: THREE.WebGLRenderer & { xr: any } };
    const referenceSpace = gl.xr.getReferenceSpace();

    // Model's definition
    const [model, setModel] = useState(() => patternToModel(pattern));
    const [ballsData] = useState([
        { id: "Do?K", color: "green" },
        { id: "Re?K", color: "blue" }
    ]);
    const [jugglersData] = useState([{ name: "Jean", position: [-1, 0, 0] }]);

    // Clock settings, set clock's bounds in function of model's duration
    let [start, end] = model.patternTimeBounds();
    if (!end) end = 15;
    const clock = useRef<Clock>(new Clock({ bounds: [0, end] }));
    // Set playbackrate
    useEffect(() => {
        clock.current.setPlaybackRate(0.3);
    }, []);

    // Initialize a performance with the actual model and clock
    const [performance, setPerformance] = useState(
        () => new PerformanceView({ model: model, clock: clock.current })
    );

    //State to send a reset signal to FollowTrajectory component
    const [resetSignal, setResetSignal] = useState(0);

    // Parameters state given to timeControls
    const [tossPause, setTossPause] = useState(true);
    const [catchPause, setCatchPause] = useState(false);
    const [arrows, setArrows] = useState(true);

    // Data structure where the balls, curves and jugglers will be stored.
    // When data is store we can access it by doing `ballsRef.current.get(ballid)`.
    const ballsRef = useRef(new Map<string, THREE.Object3D>());
    const curvesRef = useRef(new Map<string, THREE.Line>());
    const jugglersRef = useRef(
        new Map<string, { leftHand: THREE.Object3D | null; rightHand: THREE.Object3D | null }>()
    );

    const rightController = useXRInputSourceState("controller", "right");
    const tickcount = useRef(0);
    const Bcount = useRef(0);
    const [text, setText] = useState("Appuyez sur B pour commencer");

    // Variables for levels informations
    const level = useRef(1); // Current level
    const errorCount = useRef(0); //Error count made during practice

    // Levels informations, congratulations are text displayed after the level's completion
    // and speed is the playback rate for the level
    const levelsInformations = new Map<
        number,
        {
            congratulations: string[];
            speed: number;
        }
    >([
        [
            1,
            {
                congratulations: ["Super !", "Appuyez sur B pour rejouer"],
                speed: 0.3
            }
        ]
    ]);

    // Helper function to wait
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Helper function to make a countdown
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

    // Function executed when a level is finished
    const nextLevel = async () => {
        const infos = levelsInformations.get(level.current); // retrieve current level informations
        if (!infos) {
            console.warn("No information for level " + level.current);
            return;
        }

        // If there is error, we try again
        if (errorCount.current > 0) {
            errorCount.current = 0;
            setText("Dommage, allez on reessaye");
            await wait(2000);

            await countdown();

            clock.current.setPlaybackRate(infos.speed);
            clock.current.setTime(0);
            clock.current.play();
            return;
        }

        //If there is no error
        errorCount.current = 0; //maybe be dispensable

        //We display all congratulations texts
        for (let i = 0; i < infos.congratulations.length; i++) {
            setText(infos.congratulations[i]);
            if (i < infos.congratulations.length - 1) {
                await wait(2000);
            }
        }

        clock.current.setTime(0);
        clock.current.pause();
    };

    useEffect(() => {
        const handleReachedEnd = () => {
            setResetSignal(resetSignal + 1);
            if (!training) nextLevel();
        };

        clock.current.addEventListener("reachedEnd", handleReachedEnd);

        return () => {
            clock.current.removeEventListener("reachedEnd", handleReachedEnd);
        };
    }, []);

    /**
     * Handle B button pressure (and B-like action -> hand pinch)
     */
    const handleB = () => {
        Bcount.current = tickcount.current;
        if (clock.current.isPaused()) {
            (async () => {
                await countdown();
                clock.current.play();
            })();
        } else {
            clock.current.pause();
            setText("Pause");
        }
    };

    // Variables to get hands access
    const [handState, setHandState] = useState<HandState>();
    const handSourceRight = useXRInputSourceState("hand", "right");
    const rightHand = handSourceRight?.inputSource?.hand;

    // Initialize hand action detector (to detect pinch, middle pinch and hand closure or opening)
    // The section is executed when right hand has a change
    useEffect(() => {
        //We create a HandState in function of which hand is "connected"
        if (rightHand) {
            setHandState(new HandState({ rightHand: rightHand }));
        }
    }, [rightHand]);

    useEffect(() => {
        if (!handState) return;

        // A simple pinch is like a B controller button
        handState.addEventListener("pinch", (e: HandActionEvent) => {
            if (Math.abs(Bcount.current - tickcount.current) > 200) handleB();
        });

        return () => {
            handState?.removeAllEventListeners();
        };
    }, [handState]);

    //This section is executed on each frame
    useFrame((_, __, frame) => {
        handState?.update(frame, referenceSpace);
        const time = performance.getClock().getTime();

        // This part update ball's position and curve
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

                // We convert position from world to local referential (THIS MUST BE FIXED IN A CLEANER WAY IN THE LIB)
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

                    // We convert position from world to local referential (THIS MUST BE FIXED IN A CLEANER WAY IN THE LIB)
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

                    // We convert position from world to local referential (THIS MUST BE FIXED IN A CLEANER WAY IN THE LIB)
                    const localPos = o.worldToLocal(model.rightHand.position(time).clone());
                    jugglerObject.rightHand.position.copy(localPos);
                }
            }
        }

        // Handle B button interaction
        const rightB = rightController?.gamepad?.["b-button"]?.button;
        if (rightB && Math.abs(Bcount.current - tickcount.current) > 200) {
            Bcount.current = tickcount.current;
            if (clock.current.isPaused()) {
                (async () => {
                    await countdown();
                    clock.current.play();
                })();
            } else {
                clock.current.pause();
                setText("Pause");
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
            <TextComponent text={text}></TextComponent>

            {/* Declare FollowTrajectory first */}
            <FollowTrajectory model={model} clock={clock.current} reset={resetSignal} />

            <CatchChecker
                model={model}
                clock={clock.current}
                ballsRef={ballsRef}
                errorCount={errorCount}
                setErrorText={setText}
                makeStop={catchPause}
            />
            <TossChecker
                model={model}
                clock={clock.current}
                ballsRef={ballsRef}
                errorCount={errorCount}
                setErrorText={setText}
                makeStop={tossPause}
                arrowsVisible={arrows}
            />
            {training && (
                <TimeControls
                    timeConductor={clock.current}
                    position={[3.5, 0.8, 0]}
                    rotation={[0, -Math.PI / 2, 0]}
                    tossPause={tossPause}
                    catchPause={catchPause}
                    arrows={arrows}
                    setTossPause={setTossPause}
                    setCatchPause={setCatchPause}
                    setArrows={setArrows}
                ></TimeControls>
            )}
        </>
    );
}

/**
 * Explosion animation function, update animation progression at each frame (must be called at each frame)
 */
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

/**
 * Component to display text
 */
function TextComponent({ text }: { text: string }) {
    return (
        <group position={[3.5, 1.3, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <Root>
                <Text backgroundColor={"white"} padding={2}>
                    {text}
                </Text>
            </Root>
        </group>
    );
}
