import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Text, Html } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../store';

export function NPC() {
  const craftWord = useGameStore(state => state.craftWord);
  const currentQuest = useGameStore(state => state.currentQuest);
  const inventory = useGameStore(state => state.inventory);
  const [isNear, setIsNear] = useState(false);
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  const handleCraft = () => {
    craftWord();
  };

  // Check if we have all letters to show a special prompt
  const canCraft = currentQuest && !currentQuest.isCompleted && currentQuest.targetWord.split('').every(char => {
    const countInTarget = currentQuest.targetWord.split('').filter(c => c === char).length;
    const countInInventory = inventory.filter(c => c === char).length;
    return countInInventory >= countInTarget;
  });

  return (
    <group position={[0, 0, 0]}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <RigidBody type="fixed" colliders={false}>
          <group ref={meshRef}>
            {/* Robot Body */}
            <mesh position={[0, 1.5, 0]}>
              <boxGeometry args={[1.5, 2, 1]} />
              <meshStandardMaterial color="#58cc02" emissive="#58cc02" emissiveIntensity={0.5} />
            </mesh>
            {/* Robot Head */}
            <mesh position={[0, 3, 0]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#58cc02" />
            </mesh>
            {/* Eyes */}
            <mesh position={[0.2, 3.1, 0.51]}>
              <planeGeometry args={[0.2, 0.2]} />
              <meshBasicMaterial color="white" />
            </mesh>
            <mesh position={[-0.2, 3.1, 0.51]}>
              <planeGeometry args={[0.2, 0.2]} />
              <meshBasicMaterial color="white" />
            </mesh>
          </group>

          {/* Sensor for proximity */}
          <CuboidCollider 
            args={[5, 5, 5]} 
            sensor 
            onIntersectionEnter={() => setIsNear(true)}
            onIntersectionExit={() => setIsNear(false)}
          />
        </RigidBody>
      </Float>

      {/* UI Prompt */}
      {isNear && (
        <Html position={[0, 5, 0]} center distanceFactor={10}>
          <div className="flex flex-col items-center gap-2 pointer-events-none select-none">
            <div className="bg-white border-b-4 border-[#e5e5e5] p-4 rounded-2xl shadow-xl w-64 text-center">
              <div className="text-[#58cc02] font-black text-xl mb-1">DUO CRAFTER</div>
              <div className="text-[#777777] text-sm font-bold mb-4">
                {canCraft 
                  ? "I see you have all the letters! Ready to craft?" 
                  : "Collect letters from enemies and bring them to me!"}
              </div>
              {canCraft && (
                <button 
                  onClick={handleCraft}
                  className="pointer-events-auto px-6 py-2 bg-[#58cc02] border-b-4 border-[#46a302] text-white font-black rounded-xl hover:brightness-110 transition-all active:translate-y-1 active:border-b-0"
                >
                  CRAFT WORD
                </button>
              )}
            </div>
            <div className="w-4 h-4 bg-white rotate-45 -mt-2 border-r-4 border-b-4 border-[#e5e5e5]" />
          </div>
        </Html>
      )}

      {/* Floating Label */}
      <Text
        position={[0, 6, 0]}
        fontSize={0.5}
        color="#58cc02"
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf"
        anchorX="center"
        anchorY="middle"
      >
        CRAFTING STATION
      </Text>
    </group>
  );
}
