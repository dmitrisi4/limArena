/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { Canvas, useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Component, ReactNode } from 'react';
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

function GameLoop() {
  const updateTime = useGameStore(state => state.updateTime);
  const updateEnemies = useGameStore(state => state.updateEnemies);
  const cleanupEffects = useGameStore(state => state.cleanupEffects);

  useFrame((_, delta) => {
    const now = Date.now();
    updateTime(delta);
    updateEnemies(now);
    cleanupEffects(now);
  });
  return null;
}

export function Game() {
  const enemies = useGameStore(state => state.enemies);
  const letters = useGameStore(state => state.letters);
  const otherPlayerIds = useGameStore(
    useShallow(state => Object.keys(state.otherPlayers))
  );
  const isMobile = useIsMobile();

  return (
    <ErrorBoundary>
      <Canvas 
        shadows={!isMobile} 
        camera={{ fov: 75 }}
        dpr={isMobile ? [1, 1.5] : [1, 2]} // Lower DPR for mobile performance
      >
      <color attach="background" args={['#050510']} />
      <fogExp2 attach="fog" args={['#050510', isMobile ? 0.04 : 0.025]} />
      
      <ambientLight intensity={isMobile ? 0.8 : 0.5} />
      <pointLight position={[0, 8, 0]} intensity={1.5} castShadow={!isMobile} distance={60} />
      
      {!isMobile && (
        <>
          <pointLight position={[25, 8, 25]} intensity={1.2} castShadow distance={60} />
          <pointLight position={[-25, 8, -25]} intensity={1.2} castShadow distance={60} />
          <pointLight position={[25, 8, -25]} intensity={1.2} castShadow distance={60} />
          <pointLight position={[-25, 8, 25]} intensity={1.2} castShadow distance={60} />
        </>
      )}
      
      <Physics gravity={[0, -20, 0]}>
        <GameLoop />
        <Arena />
        <NPC />
        <Player />
        {enemies.map(enemy => (
          <Enemy key={enemy.id} data={enemy} />
        ))}
        {otherPlayerIds.map(id => (
          <OtherPlayer key={id} id={id} />
        ))}
        {letters.map(letter => (
          <LetterCube key={letter.id} data={letter} />
        ))}
        <Effects />
      </Physics>

      {/* Bloom can be heavy on mobile, disable or simplify */}
      {!isMobile && (
        <EffectComposer>
          <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} />
        </EffectComposer>
      )}
    </Canvas>
    </ErrorBoundary>
  );
}
