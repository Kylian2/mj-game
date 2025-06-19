/* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect */
/* eslint-disable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
/* eslint-disable @eslint-react/web-api/no-leaked-event-listener */
import { useEffect, useState } from "react";
import { Button, Slider, Toggle } from "@react-three/uikit-default";
import { Play, Pause, Gauge, Snail, Rabbit, Infinity } from '@react-three/uikit-lucide';
import { Clock } from "musicaljuggling";
import { Root, Container, Text } from "@react-three/uikit";
import { SimpleSlider } from "./SimpleSlider";

//TODO : Handle loading state ?
//TODO : Bounds in UI or in COnductor ?
//TODO : Rename Conductor to Clock ?
//TODO : TimeUpdate in UI rather ? Or in controller ? If in controller, allows queries to stop when timer does not change.
//TODO : In timeconductor, have bounds to allow reachedend to trigger.
//TODO : Button logo animation ?
//TODO : Have slider on its line by itself to have consistent width (not depending on label or icon).
//TODO : smooth slider (with requestAnimationframe ? Here rather tahn in conductor ?)
//TODO : Playbackrate, gravity, note spread functions.

const DEFAULT_BOUNDS = [0, 20];
const DEFAULT_BACKGROUND = '#BFD0E0';
type TimeState = "playing" | "paused" | "reachedEnd";

/**
 * A 3D UI interface for controlling playback.
 * 
 * This component renders a play/pause button, a time slider, a playback rate slider and a loop toogling button synchronized
 * with a TimeConductor instance.
 * 
 * @param props
 * @param props.timeConductor - The TimeConductor instance that manages time
 * @param props.backgroundColor - BackgroundColor of the ui
 * @returns The 3D time controls interface
 */
export function TimeControls({ timeConductor, backgroundColor, props }: { timeConductor: Clock, backgroundColor?: string ,props:any }) {
    // The timeConductor is the single truth source here, so UI callbacks should
    // interact with timeConductor instead of setting their own state.

    const [status, setStatus] = useState<TimeState>(
        timeConductor.isPaused() ? "paused" : "playing"
    );
    const [statusBeforeSliderChange, setStatusBeforeSliderChange] = useState<TimeState | undefined>(
        undefined
    );
    const [bounds, setBounds] = useState<[number, number]>([
        timeConductor.getBounds()[0] ?? DEFAULT_BOUNDS[0],
        timeConductor.getBounds()[1] ?? DEFAULT_BOUNDS[1]
    ]);
    const [time, setTime] = useState(timeConductor.getTime());

    const [speedSliderActive, setSpeedSliderActive] = useState<boolean>(false);

    const [playbackRate, setPlaybackRate] = useState(timeConductor.getPlaybackRate());
    const [loop, setLoop] = useState(timeConductor.getLoop());

    backgroundColor = backgroundColor ?? DEFAULT_BACKGROUND;

    useEffect(() => {
        // Sets the various states in case the timeConductor has changed.
        setStatus(timeConductor.isPaused() ? "paused" : "playing");
        setStatusBeforeSliderChange(undefined);
        setBounds([
            timeConductor.getBounds()[0] ?? DEFAULT_BOUNDS[0],
            timeConductor.getBounds()[1] ?? DEFAULT_BOUNDS[1]
        ]);
        setTime(timeConductor.getTime());
        setPlaybackRate(timeConductor.getPlaybackRate());
        setLoop(timeConductor.getLoop());

        // Adds event listeners, and store their removal method in an array.
        const removeEventListeners: (() => void)[] = [];
        removeEventListeners.push(
            timeConductor.addEventListener("play", () => {
                setStatus("playing");
            })
        );
        removeEventListeners.push(
            timeConductor.addEventListener("pause", () => {
                setStatus("paused");
            })
        );
        removeEventListeners.push(
            timeConductor.addEventListener("reachedEnd", () => {
                setStatus("reachedEnd");
            })
        );
        removeEventListeners.push(
            timeConductor.addEventListener("timeUpdate", () => {
                // const newTime = timeConductor.getTime();
                // if(newTime%5 < 0.5){
                //     setTime(newTime);
                //     console.log("timeset");
                // }
            })
        );
        removeEventListeners.push(
            timeConductor.addEventListener("playbackRateChange", () => {
                setPlaybackRate(timeConductor.getPlaybackRate());
            })
        );
        removeEventListeners.push(
            timeConductor.addEventListener("boundsChange", () => {
                setBounds([
                    timeConductor.getBounds()[0] ?? DEFAULT_BOUNDS[0],
                    timeConductor.getBounds()[1] ?? DEFAULT_BOUNDS[1]
                ]);
            })
        );
        removeEventListeners.push(
            timeConductor.addEventListener("loopChange", () => {
                setLoop(timeConductor.getLoop());
            })
        );

        // Return a function to remove all event listeners.
        return () => {
            removeEventListeners.forEach((callback) => {
                callback();
            });
        };
    }, [timeConductor]);

    /**
     * Handles play/pause button click events.
     * 
     * Toggle play/pause states, if end is reached then restart playing from the beginning
     */
    function onButtonClick() {
        if (status === "playing") {
            timeConductor.pause();
        } else if (status === "paused") {
            timeConductor.play().catch((error: unknown) => {
                console.warn(error);
            });
        } else {
            timeConductor.setTime(bounds[0]);
            timeConductor.play().catch((error: unknown) => {
                console.warn(error);
            });
        }
    }

    /**
     * Handles slider value changes on dragging.
     * 
     * @param value - The new time value from the slider (in seconds)
     */
    function onSliderChange(value: number) {
        // We pause playback when going through the slider.
        // We remember what the status was before interaction to figure out by the end (when mouse is unpressed) whether we should resume playback.
        if (statusBeforeSliderChange === undefined) {
            setStatusBeforeSliderChange(status);
        }
        if (status !== "paused") {
            timeConductor.pause();
        }
        timeConductor.setTime(value);
    }

    //There is no event 'on slider change end' on uikit's slider
    function onSliderChangeEnd(value: number) {
        timeConductor.setTime(value);
        if (statusBeforeSliderChange === "reachedEnd" || statusBeforeSliderChange === "playing") {
            timeConductor.play().catch((error: unknown) => {
                console.warn(error);
            });
        }
        setStatusBeforeSliderChange(undefined);
    }

    /**
     * Handles playback rates changes on dragging
     * 
     * @param value - The new rate value from the slider
     */
    function onSpeedSliderChange(value: number){
        timeConductor.setPlaybackRate(value);
    }

    /**
     * Handles loop toggling
     * 
     * @param value - The new looping status
     */
    function onLoopToggle(value: boolean){
        timeConductor.setLoop(value);
    }

    return (
        <group {...props} rotation={[0, Math.PI/2, 0]} position={[-3, 1, -5]}>
            <group position={[-3, 0, 0]}>
                <Root gap={32} alignItems={'center'}>  
                    <Container
                        alignItems="center" 
                        gap={12}
                        borderRadius={8}
                    >
                        <Toggle borderColor={'black'} borderWidth={1.5} checked={loop} onCheckedChange={(checked) => onLoopToggle(checked)}>
                            <Infinity width={16} height={16}/>
                        </Toggle>
                    </Container>
                    <Container 
                        flexDirection="row" 
                        alignItems="center" 
                        gap={20}
                        borderRadius={8}
                    >
                        <Button variant="outline" backgroundColor='white' borderColor="black" borderWidth={1.5} onClick={onButtonClick}>
                            <Play width={16} height={16} display={status !== 'playing' ? "flex" : "none"}/>
                            <Pause width={16} height={16} display={status === 'playing'? "flex" : "none"}/>
                        </Button>
                        {/* <Slider value={time} defaultValue={bounds[0]} max={bounds[1]} step={1} width={300} onValueChange={onSliderChange}/>
                        <Text fontWeight={'bold'} color={'white'}>{`${formatTime(time)} / ${formatTime(bounds[1])}`}</Text> */}
                    </Container>
                </Root>
            </group>
            <SimpleSlider
                clock={timeConductor}
                width={4}          
                position={[0, 0, 0]}
                trackColor="#141414"
            />
            <group position={[(speedSliderActive ? 4 : 2.6), 0, 0]}>
                <Root>
                    <Container alignItems='center' gap={12} borderRadius={8}>
                        <Toggle borderColor={'black'} borderWidth={1.5} checked={speedSliderActive} onCheckedChange={() => setSpeedSliderActive(!speedSliderActive)}>
                            <Gauge width={16} height={16}/>
                        </Toggle>
                        <Container display={speedSliderActive ? 'flex' : 'none'} alignItems={'center'} gap={12}>
                            <Text width={50} fontWeight={'bold'} color={'white'}>x {playbackRate.toFixed(2)}</Text>
                            <Snail color="white" width={18} height={18}/>
                            <Slider defaultValue={1}  min={0.25} max={3} step={0.25} width={150} onValueChange={onSpeedSliderChange}/>
                            <Rabbit color="white" width={18} height={18}/>
                        </Container>
                    </Container>
                </Root>
            </group>
        </group>
    )
}

/**
 * Converts time to a friendly string format.
 * E.g. : 90s -> 1:30
 * @param time The time in seconds.
 * @return The formatted string.
 */
function formatTime(time: number, showMilliseconds = false): string {
    let text = "";
    if (time < 0) {
        time = -time;
        text += "-";
    }
    let hoursDefined = false;
    if (time >= 3600) {
        hoursDefined = true;
        text += `${Math.floor(time / 3600)}:`;
        time = time % 3600;
    }
    const nbMinutes = Math.floor(time / 60);
    if (hoursDefined && nbMinutes < 10) {
        text += "0";
    }
    text += `${nbMinutes}:`;
    const nbSeconds = Math.floor(time % 60);

    if (nbSeconds < 10) {
        text += "0";
    }
    text += `${nbSeconds}`;

    return text;
}
