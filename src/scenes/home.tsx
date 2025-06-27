import { Container, Root, Image, Text } from "@react-three/uikit"
import { Button } from "@react-three/uikit-default"
import { DoubleSide, Euler, Object3D, RepeatWrapping, SphereGeometry, SpotLight, Vector3 } from "three"
import { useTexture } from '@react-three/drei';
import { useRef, useEffect, type Dispatch, type SetStateAction } from "react";
import { useFrame } from "@react-three/fiber";
import { randInt } from "three/src/math/MathUtils.js";
import { max } from "three/tsl";

function Ground(props: any) {
    const texture = useTexture('/plywood.jpg');
    
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(20, 20);
    
    return (
        <mesh {...props}
            rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[100, 100]}/>
            <meshStandardMaterial map={texture} side={DoubleSide}/>
        </mesh>
    )
}

function PosterSpotLight({ targetPosition }: { targetPosition: [number, number, number], intensity?: number }) {
    const spotRef = useRef<SpotLight>(null);
    const targetRef = useRef<Object3D>(null);
    
    useEffect(() => {
        if (spotRef.current && targetRef.current) {
            spotRef.current.target = targetRef.current;
            spotRef.current.target.updateMatrixWorld();
        }
    }, []);

    return (
        <>
            <spotLight 
                ref={spotRef}
                position={[0, 6, 0]} 
                angle={Math.PI / 9}
                penumbra={0.3} 
                decay={0} 
                intensity={2.5}
                castShadow
            />
            <object3D ref={targetRef} position={targetPosition} />
        </>
    );
}

function Poster({title, image, position, rotation, scene, setScene} :{title?:String, image?:string, position: Vector3, rotation: Euler, scene?:string, setScene?: Dispatch<SetStateAction<string>>}){    return (
        <group position={position} rotation={rotation}>
            <Root flexDirection={'column'} gap={12}>
                <Container backgroundColor={'black'} padding={12}>
                    <Image height={200} src={image}></Image>
                </Container>
                <Text color={'white'} textAlign={'center'}>{title}</Text>
                <Button onClick={()=> {if(scene && setScene){ setScene(scene) }}} marginTop={12} backgroundColor={'white'}><Text color={'black'}>Jouer</Text></Button>
            </Root>
        </group>
    )
}

function Posters({posters, setScene}: {posters : Array<{title: string, src: string, scene?:string}>, setScene: Dispatch<SetStateAction<string>>}){
    const posterCount: number = posters.length;
    const radius = 12;
    return(
        <group position={[0, 2, 0]}>
            {posters.map((poster, index) => {
                const angle = (index / Math.max(posterCount, 8)) * Math.PI * 2;
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                const rotationY = -Math.PI/2 - angle;
                                
                return (
                    <group key={index}> 
                        <PosterSpotLight 
                            targetPosition={[x, 0, z]}
                        />
                        <Poster
                            title={poster.title}
                            image={poster.src}
                            scene={poster.scene}
                            position={new Vector3(x, 0, z)}
                            rotation={new Euler(0, rotationY, 0)}
                            setScene={setScene}
                        />
                    </group>
                );
            })}
    </group>
    )
}

function Carpet(props:any){
    return(
        <group {...props}>
            <mesh  rotation={[Math.PI/2, 0, 0]} position={[0, 0.01, 0]}>
                <circleGeometry args={[5, 32]}/>
                <meshStandardMaterial color={'#c32a2a'} side={DoubleSide}/>
            </mesh>
            <mesh rotation={[Math.PI/2, 0, 0]} position={[0, 0.01, 0]}>
                <planeGeometry args={[3, 32]}/>
                <meshStandardMaterial color={'#c32a2a'} side={DoubleSide}/>
            </mesh>
        </group>
    )
}

function WallAndRoof(props:any){
    return(
        <group {...props}>
            <mesh position={[0, 4, 0]}>
                <cylinderGeometry args={[15, 15, 8, 32, 1, true]} />
                <meshStandardMaterial color={'#353535'} side={DoubleSide}/>
            </mesh>
            {/*<mesh position={[0, 10.5, 0]}>
                <coneGeometry args={[15, 5, 32, 1, true]} />
                <meshStandardMaterial color={'#780000'} side={DoubleSide}/>
            </mesh>*/}
        </group>
    )
}

function DiscoSpotlight({ position, color, speed = 1, pattern = 'circle' }: {position: Vector3, color: string, speed: number, pattern: String}) {
const lightRef = useRef<SpotLight>(null);
const targetRef = useRef<Object3D>(null);

useFrame((state) => {
    if (lightRef.current && targetRef.current) {
    const time = state.clock.elapsedTime * speed;
    
    let targetX, targetZ;
    
    switch (pattern) {
        case 'circle':
        targetX = Math.cos(time) * 10;
        targetZ = Math.sin(time) * 10;
        break;
        case 'figure8':
        targetX = Math.cos(time) * 10;
        targetZ = Math.sin(time * 2) * 8;
        break;
        case 'random':
        targetX = Math.cos(time * 0.7) * 10 + Math.sin(time * 1.3) * 5;
        targetZ = Math.sin(time * 0.9) * 10 + Math.cos(time * 1.1) * 5;
        break;
        case 'sweep':
        targetX = Math.sin(time) * 15;
        targetZ = -2;
        break;
        default:
        targetX = Math.cos(time) * 10;
        targetZ = Math.sin(time) * 10;
    }
    
    targetRef.current.position.set(targetX, 0, targetZ);
    lightRef.current.target = targetRef.current;
    }
});

return (
    <>
    <spotLight
        ref={lightRef}
        position={position}
        intensity={50}
        distance={20}
        angle={Math.PI / 6}
        penumbra={0.3}
        castShadow
        color={color}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
    />
    <object3D ref={targetRef} />
    </>
);
}

function SpotlightObject(props: any) {

    return (
        <group {...props}>
            <mesh position={[0, 1, 0]}>
                <cylinderGeometry args={[0.25,0.75, 1, 4]} />
                <meshStandardMaterial color={'#444444'}/>
            </mesh>
            <mesh position={[0, 1.3, 0]}>
                <boxGeometry args={[0.5, 1, 0.5]} />
                <meshStandardMaterial color={'#444444'}/>
            </mesh>
            <mesh position={[0, 0.49, 0]} rotation={[Math.PI/2, 0, Math.PI/4]}>
                <planeGeometry args={[0.95, 0.95]} />
                <meshStandardMaterial color={'white'} side={DoubleSide}/>
            </mesh>
        </group>
    );
}

function BallStack(props: any){
    const nbBalls = randInt(3, 8);
    const grid = [3,3,3];
    const colors = [
        "#FF5733","#33C1FF","#FF33A1","#75FF33",
        "#FFC300","#9D33FF","#33FFBD","#FF3333","#33FF57",
        "#3375FF", "#FF9A33", "#FF33EC", "#33FFEC","#A6FF33","#FF6F61"
    ]
    let balls: Array<{x:number, z:number, color:string}> = [];
    for(let i = 0; i<nbBalls; i++){
        const col = i % grid[0];
        const row = Math.floor(i / grid[0]);

        let ball = {
            x: (col - (grid[0] - 1) / 2) * 0.4,
            z: (row - (grid[1] - 1) / 2) * 0.4,
            color: colors[randInt(0, colors.length)]
        };
        balls.push(ball);
    }

    return (
        <group {...props}>
            {balls.map((ball) => {                   
                return (
                    <mesh position={[ball.x, 0.12, ball.z]} rotation={[0, 0, 0]}>
                        <sphereGeometry args={[0.2, 32, 16]} />
                        <meshStandardMaterial color={ball.color} side={DoubleSide} roughness={0.4}/>
                    </mesh>
                );
            })}
        </group>
    )
}

export function HomeScene({ scene }: { scene: [string, Dispatch<SetStateAction<string>>] }) {
    const posters = [
        { title: "Danube Bleu", src:"posters/danubebleu.jpg", scene:"danubebleu" },
        { title: "Au clair de la lune", src:"posters/auclairdelalune.jpg" },
        { title: "Pachelbel", src:"posters/pachelbel.jpg" },
    ];
    const [currentScene, setScene] = scene;    
    return(
        <group>
            <ambientLight intensity={2} />
            <pointLight position={[10, 10, 10]} />
            <Ground position={[0, 0, 0]}/>
            <Posters posters={posters} setScene={setScene}/>
            <Carpet/>
            <WallAndRoof/>
            <DiscoSpotlight 
                position={new Vector3(-4, 6, -4)} 
                color="#ff0080" 
                speed={0.8} 
                pattern="circle" 
            />
            <DiscoSpotlight 
                position={new Vector3(4, 6, -4)} 
                color="#00ff80" 
                speed={1.2} 
                pattern="figure8" 
            />
            <DiscoSpotlight 
                position={new Vector3(0, 6, 4)} 
                color="#8000ff" 
                speed={0.6} 
                pattern="sweep" 
            />
            <DiscoSpotlight 
                position={new Vector3(0, 6, 4)} 
                color="#ffdc5e" 
                speed={0.9} 
                pattern="figure8" 
            />
            <SpotlightObject position={new Vector3(Math.cos(0)*4, 6, Math.sin(0)*4)} rotation={new Euler(0, Math.PI/2, Math.PI/7)} />
            <SpotlightObject position={new Vector3(Math.cos(2*Math.PI/3)*4, 6, Math.sin(2*Math.PI/3)*4)} rotation={new Euler(0, Math.PI/4, -Math.PI/5)} />
            <SpotlightObject position={new Vector3(Math.cos(4*Math.PI/3)*4, 6, Math.sin(4*Math.PI/3)*4)} rotation={new Euler(0, Math.PI, Math.PI/3)} />
            <mesh position={[0, 7.5, 0]} rotation={[Math.PI/2, 0, 0]}>
                <torusGeometry args={[3.6, 0.2, 16, 10]} />
                <meshStandardMaterial color={'#444444'} side={DoubleSide}/>
            </mesh>
            <mesh position={[0, 7.5, 0]} rotation={[0, 0, 0]}>
                <boxGeometry args={[30,0.2,0.2]} />
                <meshStandardMaterial color={'#444444'} side={DoubleSide}/>
            </mesh>
            <BallStack position={[12, 0, 4]} rotation={([0, Math.PI/4, 0])}/>
            <BallStack position={[-5, 0, 12]} rotation={([0, Math.PI/4, 0])}/>
            <BallStack position={[-7, 0, -10]} rotation={([0, Math.PI/4, 0])}/>
        </group>
    )
}