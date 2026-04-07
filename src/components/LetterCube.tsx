/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Text, Float } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore, LetterData } from '../store';

export function LetterCube({ data }: { data: LetterData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const collectLetter = useGameStore(state => state.collectLetter);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
      meshRef.current.rotation.x += 0.01;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.05;
      ringRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.5;
    }
  });

  if (data.collected) return null;

  return (
    <group position={data.position}>
      <Float speed={3} rotationIntensity={1.5} floatIntensity={1.5}>
        <RigidBody
          type="fixed"
          sensor
          onIntersectionEnter={({ other }) => {
            if (other.rigidBodyObject?.name === 'player') {
              collectLetter(data.id);
            }
          }}
        >
          {/* Main Cube */}
          <mesh ref={meshRef} castShadow>
            <boxGeometry args={[1.5, 1.5, 1.5]} />
            <meshStandardMaterial color="#fcd34d" metalness={0.9} roughness={0.1} emissive="#fcd34d" emissiveIntensity={0.3} />
            
            {/* Letter on each face - Bold and Large */}
            {[
              [0, 0, 0.76],
              [0, 0, -0.76],
              [0.76, 0, 0],
              [-0.76, 0, 0],
              [0, 0.76, 0],
              [0, -0.76, 0]
            ].map((pos, i) => (
              <Text
                key={i}
                position={pos as [number, number, number]}
                rotation={[
                  i === 4 ? -Math.PI / 2 : i === 5 ? Math.PI / 2 : 0,
                  i === 2 ? Math.PI / 2 : i === 3 ? -Math.PI / 2 : i === 1 ? Math.PI : 0,
                  0
                ]}
                fontSize={1.2}
                color="black"
                fontWeight="bold"
                anchorX="center"
                anchorY="middle"
              >
                {data.letter}
              </Text>
            ))}
          </mesh>
          
          {/* Floating Letter Above */}
          <Text
            position={[0, 2.5, 0]}
            fontSize={1.8}
            color="#fcd34d"
            fontWeight="bold"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.08}
            outlineColor="black"
          >
            {data.letter}
          </Text>

          {/* Spinning Ring */}
          <mesh ref={ringRef}>
            <torusGeometry args={[1.8, 0.08, 16, 32]} />
            <meshBasicMaterial color="#fcd34d" toneMapped={false} />
          </mesh>
          
          {/* Glow effect */}
          <mesh scale={2}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#fcd34d" transparent opacity={0.1} />
          </mesh>
          
          <pointLight color="#fcd34d" intensity={3} distance={8} />
          
          <CuboidCollider args={[1.2, 1.2, 1.2]} />
        </RigidBody>
      </Float>
    </group>
  );
}
