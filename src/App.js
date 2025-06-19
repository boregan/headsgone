import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import threesixty from "./360.jpg";
import "./style.css";

function Box(props) {
  const mesh = useRef();
  useFrame(() => (mesh.current.rotation.x = mesh.current.rotation.y += 0.01));
  const base = new THREE.TextureLoader().load(threesixty);

  return (
    <mesh {...props} ref={mesh}>
      <boxGeometry args={[3, 3, 3]} />
      <meshBasicMaterial attach="material" map={base} />
    </mesh>
  );
}
export default function App() {
  return (
    <Canvas>
      <ambientLight />
      <Box />
    </Canvas>
  );
}
