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
import { HandState, type HandActionEvent } from "../../utilities/handState";

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
    const { gl } = useThree() as { gl: THREE.WebGLRenderer & { xr: any } };
    const referenceSpace = gl.xr.getReferenceSpace();

    // Model's definition
    const [model, setModel] = useState(() => patternToModel(pattern));
    const [ballsData] = useState([{ id: "Do?K", color: "red" }]);
    const [jugglersData] = useState([{ name: "Jean", position: [-1, 0, 0] }]);

    // Clock settings, set clock's bounds in function of model's duration
    let [start, end] = model.patternTimeBounds();
    if (!end) end = 15;
    const clock = useRef<Clock>(new Clock({ bounds: [0, end] }));

    // At the begining set playbackrate and make the clock playing in loop.
    useEffect(() => {
        clock.current.setPlaybackRate(0.35);
        clock.current.play();
        clock.current.setLoop(true);
    }, []);

    // Initialize a performance with the actual model and clock
    const [performance, setPerformance] = useState(
        () => new PerformanceView({ model: model, clock: clock.current })
    );

    // Data structure where the balls, curves and jugglers will be stored.
    // When data is store we can access it by doing `ballsRef.current.get(ballid)`
    const ballsRef = useRef(new Map<string, THREE.Object3D>());
    const curvesRef = useRef(new Map<string, THREE.Line>());
    const jugglersRef = useRef(
        new Map<string, { leftHand: THREE.Object3D | null; rightHand: THREE.Object3D | null }>()
    );

    // Store tutorial's texts, and it's progression.
    const currentProgression = useRef(0);
    const texts = [
        "Au moment de lancer une balle, appuyez sur X (manette gauche), et A (manette droite)",
        "Des fleches apparaitront et se coloreront en fonction du lancer",
        "Suivez-les pour valider le lancer",
        "Appuyez sur B pour passer a la pratique"
    ];

    // Texts for adapt subtitles in case user is using controllers or hands
    const subtexts = {
        hand: "Pincer l'index pour avancer, pincer le majeur pour reculer",
        controller: "Appuyer sur B pour avancer, sur Y pour reculer"
    };

    const [text, setText] = useState(texts[currentProgression.current]);
    const [subtext, setSubtext] = useState(subtexts.controller);
    const rightController = useXRInputSourceState("controller", "right");
    const leftController = useXRInputSourceState("controller", "left");
    const tickcount = useRef(0);
    const clickCount = useRef(0);
    const explosionCount = useRef(0);

    // Function to execute when a OK pinch is detected
    const handleOK = () => {
        if (Math.abs(clickCount.current - tickcount.current) > 100) {
            clickCount.current = tickcount.current;
            currentProgression.current++;
            setText(texts[currentProgression.current]);
            if (currentProgression.current >= texts.length) {
                change("toss-practice");
            }
            if (currentProgression.current >= 3) clock.current.pause();
        }
    };

    // Function to execute when a Cancel pinch is detected
    const handleCancel = () => {
        if (Math.abs(clickCount.current - tickcount.current) > 100) {
            if (currentProgression.current - 1 >= 0) {
                currentProgression.current--;
            }
            clickCount.current = tickcount.current;
            setText(texts[currentProgression.current]);
            if (currentProgression.current < 3) clock.current.play();
        }
    };

    // Variables to get hands access
    const [handState, setHandState] = useState<HandState>();
    const handSourceRight = useXRInputSourceState("hand", "right");
    const rightHand = handSourceRight?.inputSource?.hand;
    const handSourceLeft = useXRInputSourceState("hand", "left");
    const leftHand = handSourceLeft?.inputSource?.hand;

    // Initialize hand action detector (to detect pinch, middle pinch and hand closure or opening)
    // The section is executed when left hand or right hand have a change
    useEffect(() => {
        //We create a HandState in function of which hand is "connected"
        if (leftHand && rightHand) {
            setHandState(new HandState({ leftHand: leftHand, rightHand: rightHand }));
        } else if (leftHand) {
            setHandState(new HandState({ leftHand: leftHand }));
        } else if (rightHand) {
            setHandState(new HandState({ rightHand: rightHand }));
        }
    }, [leftHand, rightHand]);

    useEffect(() => {
        if (!handState) {
            //     setSubtext(subtexts.controller);
            return;
        }
        // setSubtext(subtexts.hand);

        // A simple pinch is associated to a OK action
        handState.addEventListener("pinch", (e: HandActionEvent) => {
            handleOK();
        });

        // A midde pinch is associated to a Cancel action
        handState.addEventListener("pinch-middle", (e: HandActionEvent) => {
            handleCancel();
        });

        return () => {
            handState?.removeAllEventListeners();
        };
    }, [handState]);

    // Update subtexts when interaction method change
    useEffect(() => {
        if (rightController) setSubtext(subtexts.controller);
        else setSubtext(subtexts.hand);
    }, [leftController, rightController, rightHand, leftHand]);

    // The section below is executed at each frame
    useFrame((state, delta, frame) => {
        handState?.update(frame, referenceSpace); //First we update the handState to detect if hand actions

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

        // We can also interact with button (in case controllers are connected instead of hands)
        const rightB = rightController?.gamepad?.["b-button"]?.button;
        const leftY = leftController?.gamepad?.["y-button"]?.button;
        if (rightB) {
            handleOK();
        }
        if (leftY) {
            handleCancel();
        }

        // Only if currentProgression is equal or greated than 3 we put particul effect (to illustrate the text)
        if (currentProgression.current >= 3) {
            const ball = ballsRef.current.get("Do?K");
            if (ball && Math.abs(explosionCount.current - tickcount.current) > 70) {
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
            {/* <Performance
                audio={true}
                clock={clock.current}
                performance={performance}
                position={[3, 0, 0]}
            >
                {jugglersData.map((elem) => mapJuggler(elem as BasicJugglerProps))}
                {ballsData.map((elem) => mapBalls(elem as BallReactProps))}
            </Performance> */}
            <TextComponent text={text} subtext={subtext} />
        </>
    );
}

/**
 * Component to display text and subtext
 */
function TextComponent({ text, subtext }: { text: string; subtext: string }) {
    return (
        <group position={[3.5, 1.3, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <Root flexDirection={"column"}>
                <Text backgroundColor={"white"} padding={2}>
                    {text}
                </Text>
                <Text color={"white"} fontSize={12} marginTop={10}>
                    {subtext}
                </Text>
            </Root>
        </group>
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
