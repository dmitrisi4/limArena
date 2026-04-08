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
      <color attach="background" args={['#050510']} />
      <fogExp2 attach="fog" args={['#050510', isMobile ? 0.05 : 0.025]} />
      
      <ambientLight intensity={isMobile ? 1.0 : 0.8} />
      <pointLight position={[0, 15, 0]} intensity={2.5} distance={150} />
      
      <Physics gravity={[0, -20, 0]}>
        <Arena />
        <NPC />
        <Player />
        <Enemies />
        <OtherPlayers />
        <Letters />
      </Physics>
      
      <Effects />
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
