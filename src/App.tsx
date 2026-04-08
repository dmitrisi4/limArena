/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useEffect, useState, useMemo, memo } from 'react';
import { Game } from './components/Game';
import { MobileControls } from './components/MobileControls';
import { useIsMobile } from './lib/useIsMobile';
import { useGameStore } from './store';

import { useShallow } from 'zustand/react/shallow';

function HUD() {
  const {
    gameState, score, timeLeft, playerState, otherPlayers, events,
    currentQuest, lessonIndex, totalLessons, leaveGame, inventory
  } = useGameStore(useShallow(state => ({
    gameState: state.gameState,
    score: state.score,
    timeLeft: state.timeLeft,
    playerState: state.playerState,
    otherPlayers: state.otherPlayers,
    events: state.events,
    currentQuest: state.currentQuest,
    lessonIndex: state.lessonIndex,
    totalLessons: state.totalLessons,
    leaveGame: state.leaveGame,
    inventory: state.inventory
  })));
  
  const playerCount = Object.keys(otherPlayers).length + 1;
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
          <div className="text-[#afafaf] text-[10px] font-black uppercase tracking-widest">Target Word</div>
          {currentQuest ? (
            <div className="flex flex-col gap-1">
              <div className="text-[#4b4b4b] font-black text-lg leading-tight">{currentQuest.title}</div>
              <div className="text-[#777777] text-sm font-bold bg-[#f7f7f7] p-2 rounded-xl border-2 border-[#e5e5e5] mt-1 italic">
                "{currentQuest.description}"
              </div>
              
              {/* Progress */}
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex justify-between text-[10px] text-[#afafaf] font-black">
                  <span>CRAFTING PROGRESS</span>
                  <span>{inventory.filter(l => currentQuest.targetWord.includes(l)).length} / {currentQuest.targetWord.length}</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {currentQuest.targetWord.split('').map((char, i) => {
                    const countInTargetBefore = currentQuest.targetWord.slice(0, i + 1).split('').filter(c => c === char).length;
                    const countInInventory = inventory.filter(c => c === char).length;
                    const isAvailable = countInInventory >= countInTargetBefore;

                    return (
                      <div 
                        key={i} 
                        className={`w-7 h-8 flex items-center justify-center border-b-4 text-sm font-black rounded-xl transition-all duration-300 ${
                          isAvailable 
                            ? 'bg-[#58cc02] border-[#46a302] text-white' 
                            : 'bg-white border-[#e5e5e5] text-[#afafaf]'
                        }`}
                      >
                        {char}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="mt-2 text-[10px] text-[#afafaf] font-bold text-center">
                FIND THE DUO CRAFTER AT CENTER
              </div>
            </div>
          ) : (
            <div className="text-[#afafaf] text-[10px] font-black">LESSON COMPLETE</div>
          )}
        </div>

        {/* Inventory */}
        <div className="bg-white border-b-4 border-r-4 border-[#e5e5e5] p-4 rounded-2xl w-64 flex flex-col gap-2 shadow-sm">
          <div className="text-[#afafaf] text-[10px] font-black uppercase tracking-widest">Inventory</div>
          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-1">
            {inventory.length === 0 && <div className="text-[#afafaf] text-xs italic">Empty...</div>}
            {inventory.map((letter, i) => (
              <div key={i} className="w-6 h-6 flex items-center justify-center bg-[#f7f7f7] border-2 border-[#e5e5e5] rounded-lg text-[10px] font-black text-[#4b4b4b]">
                {letter}
              </div>
            ))}
          </div>
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



const MemoizedGame = memo(Game);

export default function App() {
  const { gameState, score, startGame } = useGameStore(useShallow(state => ({
    gameState: state.gameState,
    score: state.score,
    startGame: state.startGame
  })));
  const isMobile = useIsMobile();

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden font-mono select-none">
      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <MemoizedGame />
      </div>

      {/* UI Overlay */}
      {gameState === 'playing' && <HUD />}

      {/* Menus */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-10 pointer-events-auto">
          <div className="w-full max-w-4xl px-8 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
              <h1 className="text-5xl md:text-7xl font-black text-[#58cc02] mb-6 tracking-tight">
                DuoTag
              </h1>
              <p className="text-[#4b4b4b] text-xl md:text-2xl font-bold mb-12 leading-relaxed">
                The free, fun, and effective way to learn words while dodging lasers!
              </p>
              <div className="flex flex-col gap-4 w-full max-w-sm">
                <button
                  onClick={() => startGame()}
                  className="w-full py-4 bg-[#58cc02] border-b-4 border-[#46a302] text-white text-xl font-black rounded-2xl hover:brightness-110 transition-all active:translate-y-1 active:border-b-0"
                >
                  GET STARTED
                </button>
                <button
                  className="w-full py-4 bg-white border-2 border-b-4 border-[#e5e5e5] text-[#1cb0f6] text-xl font-black rounded-2xl hover:bg-[#f7f7f7] transition-all"
                >
                  I ALREADY HAVE AN ACCOUNT
                </button>
              </div>
            </div>
            <div className="hidden md:flex flex-1 justify-center">
              <div className="w-64 h-64 bg-[#58cc02] rounded-full flex items-center justify-center shadow-2xl animate-bounce">
                <div className="text-white text-9xl font-black">🦉</div>
              </div>
            </div>
          </div>
          
          <div className="absolute bottom-8 text-[#afafaf] text-sm font-bold uppercase tracking-widest">
            WASD TO MOVE • MOUSE TO SHOOT • COLLECT LETTERS • CRAFT WORDS
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
