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
  const lessonIndex = useGameStore(state => state.lessonIndex);
  const totalLessons = useGameStore(state => state.totalLessons);
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

      {/* HUD Top - Lesson Progress Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pointer-events-none">
        <div className="flex items-center gap-4">
          <div className="text-[#58cc02] font-black text-xl drop-shadow-sm">DuoTag</div>
          <div className="flex-1 h-4 bg-[#e5e5e5] rounded-full overflow-hidden border-2 border-[#e5e5e5]">
            <div 
              className="h-full bg-[#58cc02] transition-all duration-1000 ease-out" 
              style={{ width: `${((lessonIndex) / totalLessons) * 100}%` }}
            >
              <div className="w-full h-1/3 bg-white/20" />
            </div>
          </div>
          <div className="text-white font-bold text-sm">{lessonIndex}/{totalLessons}</div>
        </div>
      </div>

      {/* HUD Left - Score & Quests */}
      <div className="absolute top-16 left-2 md:top-20 md:left-4 flex flex-col gap-2 md:gap-4 pointer-events-none">
        <div className="text-[#58cc02] text-lg md:text-2xl font-black drop-shadow-sm">
          XP: {score}
        </div>
        
        {/* Quest List - Duolingo Style */}
        <div className="bg-white border-b-4 border-r-4 border-[#e5e5e5] p-4 rounded-2xl w-64 flex flex-col gap-2 shadow-sm">
          <div className="text-[#afafaf] text-[10px] font-black uppercase tracking-widest">Current Lesson</div>
          {currentQuest ? (
            <div className="flex flex-col gap-1">
              <div className="text-[#4b4b4b] font-black text-lg leading-tight">{currentQuest.title}</div>
              <div className="text-[#777777] text-sm font-bold bg-[#f7f7f7] p-2 rounded-xl border-2 border-[#e5e5e5] mt-1 italic">
                "{currentQuest.description}"
              </div>
              
              {/* Progress */}
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex justify-between text-[10px] text-[#afafaf] font-black">
                  <span>WORD PROGRESS</span>
                  <span>{currentQuest.collectedLetters.length} / {currentQuest.targetWord.length}</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {currentQuest.targetWord.split('').map((char, i) => {
                    const countInTargetBefore = currentQuest.targetWord.slice(0, i + 1).split('').filter(c => c === char).length;
                    const countInCollected = currentQuest.collectedLetters.filter(c => c === char).length;
                    const isCollected = countInCollected >= countInTargetBefore;

                    return (
                      <div 
                        key={i} 
                        className={`w-7 h-8 flex items-center justify-center border-b-4 text-sm font-black rounded-xl transition-all duration-300 ${
                          isCollected 
                            ? 'bg-[#58cc02] border-[#46a302] text-white' 
                            : 'bg-white border-[#e5e5e5] text-[#afafaf]'
                        }`}
                      >
                        {isCollected ? char : '_'}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {currentQuest.isCompleted && (
                <div className="mt-3 bg-[#d7ffb8] text-[#58cc02] p-2 rounded-xl border-2 border-[#b8f28b] text-center font-black text-xs animate-bounce">
                  YOU'RE DOING GREAT!
                </div>
              )}
            </div>
          ) : (
            <div className="text-[#afafaf] text-[10px] font-black">LESSON COMPLETE</div>
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
          <h1 className="text-6xl font-black text-[#58cc02] mb-4 drop-shadow-[0_0_20px_rgba(88,204,2,0.8)] tracking-tighter">
            LESSON COMPLETE!
          </h1>
          <div className="text-3xl text-white mb-2 font-black">
            TOTAL XP: {score}
          </div>
          <div className="text-xl text-[#afafaf] mb-8 font-bold">
            Lessons Mastered: {useGameStore.getState().lessonIndex} / {useGameStore.getState().totalLessons}
          </div>
          <button
            id="start-button"
            onClick={() => startGame()}
            className="px-8 py-4 bg-[#58cc02] border-b-4 border-[#46a302] text-white text-xl font-black rounded-2xl hover:brightness-110 transition-all duration-200"
          >
            START NEW SESSION
          </button>
        </div>
      )}
    </div>
  );
}
