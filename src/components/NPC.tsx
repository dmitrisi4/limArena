import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Text, Html, useTexture } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore } from '../store';

function RobotModel({ color, emissive }: { color: string, emissive: string }) {
  const meshRef = useRef<THREE.Group>(null);
  const metalTexture = useTexture('https://picsum.photos/seed/stylized-metal/512/512');
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Base/Hover Pad */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.8, 1, 0.2, 16]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      
      {/* Main Body */}
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial map={metalTexture} color={color} roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Screen/Face */}
      <mesh position={[0, 1.3, 0.6]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[0.8, 0.6, 0.1]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      
      {/* Eyes on screen */}
      <mesh position={[0.2, 1.35, 0.66]}>
        <planeGeometry args={[0.15, 0.15]} />
        <meshBasicMaterial color={emissive} />
      </mesh>
      <mesh position={[-0.2, 1.35, 0.66]}>
        <planeGeometry args={[0.15, 0.15]} />
        <meshBasicMaterial color={emissive} />
      </mesh>

      {/* Antenna */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.4]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0, 2.2, 0]}>
        <sphereGeometry args={[0.05]} />
        <meshBasicMaterial color={emissive} />
      </mesh>

      {/* Floating Arms */}
      <group position={[1, 1.2, 0]}>
        <mesh>
          <sphereGeometry args={[0.15]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>
      <group position={[-1, 1.2, 0]}>
        <mesh>
          <sphereGeometry args={[0.15]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>

      <pointLight position={[0, 1.3, 0.7]} distance={2} intensity={1} color={emissive} />
    </group>
  );
}

import { useShallow } from 'zustand/react/shallow';

export function CrafterNPC() {
  const { craftWord, currentQuest, inventory } = useGameStore(useShallow(state => ({
    craftWord: state.craftWord,
    currentQuest: state.currentQuest,
    inventory: state.inventory
  })));
  const [isNear, setIsNear] = useState(false);

  const canCraft = currentQuest && !currentQuest.isCompleted && currentQuest.targetWord.split('').every(char => {
    const countInTarget = currentQuest.targetWord.split('').filter(c => c === char).length;
    const countInInventory = inventory.filter(c => c === char).length;
    return countInInventory >= countInTarget;
  });

  return (
    <group position={[6, 0, 6]}>
      <RigidBody type="fixed" colliders={false}>
        <RobotModel color="#58cc02" emissive="#58cc02" />
        <CuboidCollider args={[4, 4, 4]} sensor onIntersectionEnter={() => setIsNear(true)} onIntersectionExit={() => setIsNear(false)} />
      </RigidBody>

      {isNear && (
        <Html position={[0, 5, 0]} center distanceFactor={10}>
          <div className="flex flex-col items-center gap-2 pointer-events-none select-none">
            <div className="bg-white border-b-4 border-[#e5e5e5] p-4 rounded-2xl shadow-xl w-64 text-center">
              <div className="text-[#58cc02] font-black text-xl mb-1">DUO CRAFTER</div>
              <div className="text-[#777777] text-sm font-bold mb-4">
                {canCraft ? "Ready to craft your word?" : "Bring me the letters for your lesson!"}
              </div>
              {canCraft && (
                <button onClick={() => craftWord()} className="pointer-events-auto px-6 py-2 bg-[#58cc02] border-b-4 border-[#46a302] text-white font-black rounded-xl hover:brightness-110 transition-all active:translate-y-1 active:border-b-0">
                  CRAFT WORD
                </button>
              )}
            </div>
          </div>
        </Html>
      )}
      <Text position={[0, 6, 0]} fontSize={0.5} color="#58cc02" anchorX="center" anchorY="middle">CRAFTING STATION</Text>
    </group>
  );
}

export function TraderNPC() {
  const { inventory, currentQuest, exchangeLetters } = useGameStore(useShallow(state => ({
    inventory: state.inventory,
    currentQuest: state.currentQuest,
    exchangeLetters: state.exchangeLetters
  })));
  const [isNear, setIsNear] = useState(false);

  const neededLetters = currentQuest ? currentQuest.targetWord.split('').filter(char => {
    const countInTarget = currentQuest.targetWord.split('').filter(c => c === char).length;
    const countInInventory = inventory.filter(c => c === char).length;
    return countInInventory < countInTarget;
  }) : [];
  
  const uniqueNeeded = Array.from(new Set(neededLetters));
  const canExchange = inventory.length >= 3 && uniqueNeeded.length > 0;

  const handleExchange = (targetLetter: string) => {
    if (inventory.length < 3) return;
    // Take first 3 letters from inventory
    const toGive = inventory.slice(0, 3);
    exchangeLetters(toGive, targetLetter);
  };

  return (
    <group position={[-6, 0, 6]}>
      <RigidBody type="fixed" colliders={false}>
        <RobotModel color="#00ffff" emissive="#00ffff" />
        <CuboidCollider args={[4, 4, 4]} sensor onIntersectionEnter={() => setIsNear(true)} onIntersectionExit={() => setIsNear(false)} />
      </RigidBody>

      {isNear && (
        <Html position={[0, 5, 0]} center distanceFactor={10}>
          <div className="flex flex-col items-center gap-2 pointer-events-none select-none">
            <div className="bg-white border-b-4 border-[#e5e5e5] p-4 rounded-2xl shadow-xl w-72 text-center">
              <div className="text-[#00ffff] font-black text-xl mb-1">DUO TRADER</div>
              <div className="text-[#777777] text-sm font-bold mb-4">
                {canExchange ? "Exchange any 3 letters for 1 needed letter!" : "I need at least 3 letters to trade."}
              </div>
              {canExchange && (
                <div className="flex flex-wrap justify-center gap-2 pointer-events-auto">
                  {uniqueNeeded.map(letter => (
                    <button 
                      key={letter}
                      onClick={() => handleExchange(letter)}
                      className="px-3 py-1 bg-[#00ffff] border-b-4 border-[#00cccc] text-white font-black rounded-lg hover:brightness-110 text-xs"
                    >
                      GET {letter}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Html>
      )}
      <Text position={[0, 6, 0]} fontSize={0.5} color="#00ffff" anchorX="center" anchorY="middle">TRADING STATION</Text>
    </group>
  );
}

export function NPC() {
  return (
    <group>
      <CrafterNPC />
      <TraderNPC />
    </group>
  );
}
