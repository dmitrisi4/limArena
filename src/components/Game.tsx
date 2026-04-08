/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { Canvas, useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Component, ReactNode, Suspense, useMemo } from 'react';
import { Arena } from './Arena';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { OtherPlayer } from './OtherPlayer';
import { LetterCube } from './LetterCube';
import { NPC } from './NPC';
import { Effects } from './Effects';
import { useGameStore } from '../store';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useShallow } from 'zustand/react/shallow';
import { useIsMobile } from '../lib/useIsMobile';
import { Sky, Stars, Cloud, Float } from '@react-three/drei';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Game Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-black text-white p-8 text-center z-[1000]">
          <div>
            <h2 className="text-2xl font-bold mb-4">Something went wrong in the 3D engine.</h2>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-cyan-500 rounded hover:bg-cyan-600 transition-colors"
            >
              Reload Game
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function GameScene({ isMobile }: { isMobile: boolean }) {
  useFrame((_, delta) => {
    const state = useGameStore.getState();
    if (state.gameState !== 'playing') return;
    const now = Date.now();
    state.updateTime(delta);
    state.updateEnemies(now);
    state.cleanupEffects(now);
  });

  return (
    <>
      <color attach="background" args={['#87ceeb']} />
      
      {/* Stylized Sky */}
      <Sky 
        distance={450000} 
        sunPosition={[100, 10, 100]} 
        inclination={0} 
        azimuth={0.25} 
      />
      
      <Stars 
        radius={100} 
        depth={50} 
        count={5000} 
        factor={4} 
        saturation={0} 
        fade 
        speed={1} 
      />

      {/* Floating Stylized Clouds */}
      {!isMobile && (
        <group>
          <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
            <Cloud position={[-20, 15, -20]} speed={0.2} opacity={0.5} segments={20} />
          </Float>
          <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.8}>
            <Cloud position={[30, 20, 10]} speed={0.1} opacity={0.3} segments={15} />
          </Float>
          <Float speed={0.8} rotationIntensity={0.3} floatIntensity={0.4}>
            <Cloud position={[-40, 18, 30]} speed={0.15} opacity={0.4} segments={25} />
          </Float>
        </group>
      )}

      <fogExp2 attach="fog" args={['#87ceeb', isMobile ? 0.01 : 0.005]} />
      
      {/* Improved Lighting */}
      <ambientLight intensity={1.2} color="#ffffff" />
      <directionalLight 
        position={[100, 100, 50]} 
        intensity={2} 
        color="#fff5e6" 
      />
      <pointLight position={[0, 15, 0]} intensity={1.5} distance={150} color="#ffffff" />
      
      <Physics gravity={[0, -20, 0]}>
        <Suspense fallback={null}>
          <Arena />
          <NPC />
          <Player />
          <Enemies />
          <OtherPlayers />
          <Letters />
        </Suspense>
      </Physics>
      
      <Effects />

      {!isMobile && (
        <EffectComposer>
          <Bloom 
            luminanceThreshold={1} 
            mipmapBlur 
            intensity={0.5} 
            radius={0.4} 
          />
        </EffectComposer>
      )}
    </>
  );
}

function Enemies() {
  const enemies = useGameStore(useShallow(state => state.enemies));
  return (
    <>
      {enemies.map(enemy => (
        <Enemy key={enemy.id} data={enemy} />
      ))}
    </>
  );
}

function OtherPlayers() {
  const otherPlayers = useGameStore(useShallow(state => state.otherPlayers));
  const otherPlayerIds = useMemo(() => Object.keys(otherPlayers), [otherPlayers]);
  return (
    <>
      {otherPlayerIds.map(id => (
        <OtherPlayer key={id} id={id} />
      ))}
    </>
  );
}

function Letters() {
  const letters = useGameStore(useShallow(state => state.letters));
  return (
    <>
      {letters.map(letter => (
        <LetterCube key={letter.id} data={letter} />
      ))}
    </>
  );
}

export function Game() {
  const isMobile = useIsMobile();

  return (
    <Canvas 
      shadows={false} 
      camera={{ fov: 75 }}
      dpr={1}
      gl={{ 
        antialias: false, 
        powerPreference: "high-performance",
        alpha: false,
        stencil: false,
        depth: true,
        preserveDrawingBuffer: false
      }}
    >
      <GameScene isMobile={isMobile} />
    </Canvas>
  );
}
