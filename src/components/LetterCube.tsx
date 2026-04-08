/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Text, Float } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore, LetterData } from '../store';

export function LetterCube({ data }: { data: LetterData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const collectLetter = useGameStore(useShallow(state => state.collectLetter));

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
      meshRef.current.rotation.x += 0.01;
    }
  });

  if (data.collected) return null;

  return (
    <group position={data.position}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
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
          <mesh ref={meshRef}>
            <boxGeometry args={[1.2, 1.2, 1.2]} />
            <meshStandardMaterial color="#fcd34d" metalness={0.6} roughness={0.4} emissive="#fcd34d" emissiveIntensity={0.2} />
            
            <Text
              position={[0, 0, 0.61]}
              fontSize={0.8}
              color="black"
              fontWeight="bold"
              anchorX="center"
              anchorY="middle"
            >
              {data.letter}
            </Text>
            <Text
              position={[0, 0, -0.61]}
              rotation={[0, Math.PI, 0]}
              fontSize={0.8}
              color="black"
              fontWeight="bold"
              anchorX="center"
              anchorY="middle"
            >
              {data.letter}
            </Text>
          </mesh>
          
          {/* Floating Letter Above */}
          <Text
            position={[0, 2, 0]}
            fontSize={1.2}
            color="#fcd34d"
            fontWeight="bold"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.04}
            outlineColor="black"
          >
            {data.letter}
          </Text>

          <CuboidCollider args={[1, 1, 1]} />
        </RigidBody>
      </Float>
    </group>
  );
}
