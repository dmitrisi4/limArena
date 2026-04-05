/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useEffect, useState, useMemo } from 'react';
import { Game } from './components/Game';
import { MobileControls } from './components/MobileControls';
import { useGameStore } from './store';

function HUD() {
  const gameState = useGameStore(state => state.gameState);
  const score = useGameStore(state => state.score);
  const timeLeft = useGameStore(state => state.timeLeft);
  const playerState = useGameStore(state => state.playerState);
  const otherPlayers = useGameStore(state => state.otherPlayers);
  const events = useGameStore(state => state.events);
  const currentQuest = useGameStore(state => state.currentQuest);
  const playerCount = Object.keys(otherPlayers).length + 1;
  const leaveGame = useGameStore(state => state.leaveGame);
  const isMobile = useIsMobile();

  return (
    <>
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
        <div className="relative">
          <div className={`w-4 h-4 border-2 rounded-full ${playerState === 'disabled' ? 'border-red-500' : 'border-cyan-400'}`} />
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full ${playerState === 'disabled' ? 'bg-red-500' : 'bg-cyan-400'}`} />
        </div>
        {!isMobile && <div className="mt-4 text-cyan-400/50 text-xs tracking-widest font-bold">CLICK TO AIM</div>}
      </div>

      {/* HUD Left - Score & Quests */}
      <div className="absolute top-2 left-2 md:top-4 md:left-4 flex flex-col gap-2 md:gap-4 pointer-events-none">
        <div className="text-cyan-400 text-lg md:text-2xl font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
          SCORE: {score.toString().padStart(4, '0')}
        </div>
        
        {/* Quest List */}
        <div className="bg-black/50 border border-cyan-900/50 p-3 rounded w-64 flex flex-col gap-2">
          <div className="text-cyan-400/70 text-xs font-bold mb-1 border-b border-cyan-900/50 pb-1 uppercase tracking-widest">Active Quests</div>
          {currentQuest ? (
            <div className="flex flex-col gap-1">
              <div className="text-cyan-400 font-bold text-sm">{currentQuest.title}</div>
              <div className="text-cyan-400/70 text-[10px] leading-tight">{currentQuest.description}</div>
              
              {/* Progress */}
              <div className="mt-2 flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-cyan-400/50 font-bold">
                  <span>PROGRESS</span>
                  <span>{currentQuest.collectedLetters.length} / {currentQuest.targetWord.length}</span>
                </div>
                <div className="h-1 w-full bg-cyan-900/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-400 transition-all duration-500" 
                    style={{ width: `${(currentQuest.collectedLetters.length / currentQuest.targetWord.length) * 100}%` }}
                  />
                </div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {currentQuest.targetWord.split('').map((char, i) => {
                    // This logic is a bit simple, it just highlights letters that have been collected
                    // To be more accurate, we'd need to track which specific index was collected
                    // But for "APPLE", if we have one 'P', we highlight one 'P'.
                    const countInTargetBefore = currentQuest.targetWord.slice(0, i + 1).split('').filter(c => c === char).length;
                    const countInCollected = currentQuest.collectedLetters.filter(c => c === char).length;
                    const isCollected = countInCollected >= countInTargetBefore;

                    return (
                      <div 
                        key={i} 
                        className={`w-5 h-5 flex items-center justify-center border text-[10px] font-bold rounded ${
                          isCollected 
                            ? 'bg-cyan-400 border-cyan-400 text-black' 
                            : 'border-cyan-900/50 text-cyan-900'
                        }`}
                      >
                        {char}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {currentQuest.isCompleted && (
                <div className="mt-2 text-fuchsia-400 text-[10px] font-bold animate-bounce">
                  QUEST COMPLETE! +500 PTS
                </div>
              )}
            </div>
          ) : (
            <div className="text-cyan-400/30 text-[10px]">NO ACTIVE QUESTS</div>
          )}
        </div>
      </div>
      
      {/* HUD Right - Time, Leave, Events */}
      <div className="absolute top-2 right-2 md:top-4 md:right-4 flex flex-col items-end gap-1 md:gap-2 pointer-events-auto">
        {gameState === 'playing' && (
          <div className="text-cyan-400 text-lg md:text-2xl font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] pointer-events-none">
            TIME: {Math.floor(timeLeft / 60)}:{(Math.floor(timeLeft) % 60).toString().padStart(2, '0')}
          </div>
        )}
        <button
          onClick={leaveGame}
          className="px-2 py-1 md:px-4 md:py-2 bg-red-500/20 border border-red-500 text-red-500 text-xs md:text-sm font-bold rounded hover:bg-red-500 hover:text-black transition-all duration-200"
        >
          LEAVE
        </button>
        {!isMobile && <div className="text-cyan-400/50 text-xs mt-1 pointer-events-none uppercase tracking-widest font-bold">ESC to unlock cursor</div>}

        {/* Event Log */}
        <div className="mt-2 md:mt-4 flex flex-col items-end gap-1 pointer-events-none">
          {events.slice(-3).map(event => (
            <div key={event.id} className="text-[10px] md:text-xs font-bold text-fuchsia-400 bg-black/50 px-2 py-1 rounded border border-fuchsia-900/50 animate-pulse">
              {event.message}
            </div>
          ))}
        </div>
      </div>

      {/* Multiplayer Info */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
        <div className="text-cyan-400 text-[10px] md:text-sm font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] opacity-70">
          PLAYERS ONLINE: {playerCount}
        </div>
      </div>

      {/* Damage Overlay */}
      {playerState === 'disabled' && (
        <div className="absolute inset-0 bg-red-500/20 pointer-events-none flex items-center justify-center">
          <div className="text-red-500 text-4xl md:text-6xl font-black tracking-widest drop-shadow-[0_0_20px_rgba(239,68,68,1)] animate-pulse text-center">
            SYSTEM DISABLED
          </div>
        </div>
      )}

      {/* Mobile Controls */}
      {isMobile && gameState === 'playing' && <MobileControls />}
    </>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    const uaMatch = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    return uaMatch || coarsePointer || window.innerWidth < 768;
  });

  useEffect(() => {
    const check = () => {
      const uaMatch = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
      setIsMobile(uaMatch || coarsePointer || window.innerWidth < 768);
    };
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
}

export default function App() {
  const gameState = useGameStore(state => state.gameState);
  const score = useGameStore(state => state.score);
  const startGame = useGameStore(state => state.startGame);
  const isMobile = useIsMobile();

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden font-mono select-none">
      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <Game />
      </div>

      {/* UI Overlay */}
      {gameState === 'playing' && <HUD />}

      {/* Menus */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 pointer-events-auto">
          <h1 className="text-6xl font-black text-cyan-400 mb-8 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)] tracking-tighter">
            NEON ARENA
          </h1>
          <p className="text-gray-400 mb-8 text-center max-w-md">
            WASD to move. Mouse to look and shoot.<br/>
            Hit enemies for points. Don't get hit!
          </p>

          <div className="flex flex-col gap-6 w-80">
            <button
              onClick={() => startGame()}
              className="w-full px-8 py-4 bg-fuchsia-500/20 border-2 border-fuchsia-400 text-fuchsia-400 text-xl font-bold rounded hover:bg-fuchsia-400 hover:text-black transition-all duration-200 shadow-[0_0_15px_rgba(232,121,249,0.5)]"
            >
              PLAY NOW
            </button>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 pointer-events-auto">
          <h1 className="text-6xl font-black text-red-500 mb-4 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)] tracking-tighter">
            GAME OVER
          </h1>
          <div className="text-3xl text-cyan-400 mb-8 font-bold">
            FINAL SCORE: {score}
          </div>
          <button
            id="start-button"
            onClick={() => startGame()}
            className="px-8 py-4 bg-cyan-500/20 border-2 border-cyan-400 text-cyan-400 text-xl font-bold rounded hover:bg-cyan-400 hover:text-black transition-all duration-200"
          >
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
