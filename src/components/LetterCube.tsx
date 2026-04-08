/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Text, Float, useTexture } from '@react-three/drei';
import { useRef, Suspense } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore, LetterData } from '../store';

function LetterModel({ data, meshRef }: { data: LetterData, meshRef: React.RefObject<THREE.Mesh> }) {
  const goldTexture = useTexture('https://picsum.photos/seed/gold-texture/512/512');
  
  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1.2, 1.2, 1.2]} />
      <meshStandardMaterial 
        map={goldTexture}
        color="#fcd34d" 
        metalness={0.8} 
        roughness={0.2} 
        emissive="#fcd34d" 
        emissiveIntensity={0.3} 
      />
      
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
  );
}

export function LetterCube({ data }: { data: LetterData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const collectLetter = useGameStore(useShallow(state => state.collectLetter));

  useFrame((state_fiber) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
      meshRef.current.rotation.x += 0.01;
    }

    // Distance-based pickup fallback
    const playerPos = state_fiber.camera.position;
    const dist = playerPos.distanceTo(new THREE.Vector3(...data.position));
    if (dist < 3) {
      collectLetter(data.id);
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
          <Suspense fallback={<mesh><boxGeometry args={[1.2, 1.2, 1.2]} /><meshStandardMaterial color="#fcd34d" /></mesh>}>
            <LetterModel data={data} meshRef={meshRef} />
          </Suspense>
          
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

          <CuboidCollider args={[1.5, 1.5, 1.5]} />
        </RigidBody>
      </Float>
    </group>
  );
}
