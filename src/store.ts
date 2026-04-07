/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { create } from 'zustand';
import * as THREE from 'three';
import { io, Socket } from 'socket.io-client';

export type GameState = 'menu' | 'playing' | 'gameover';
export type EntityState = 'active' | 'disabled';

export interface EnemyData {
  id: string;
  position: [number, number, number];
  state: EntityState;
  disabledUntil: number;
}

export interface PlayerData {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: number;
  state: EntityState;
  disabledUntil: number;
  score: number;
  color: string;
}

export interface LaserData {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  timestamp: number;
  color: string;
}

export interface ParticleData {
  id: string;
  position: [number, number, number];
  timestamp: number;
  color: string;
}

export interface GameEvent {
  id: string;
  message: string;
  timestamp: number;
}

export interface LetterData {
  id: string;
  position: [number, number, number];
  letter: string;
  collected: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  targetWord: string;
  collectedLetters: string[];
  isCompleted: boolean;
}

const LESSON_WORDS = ["APPLE", "HELLO", "GREEN", "STUDY", "LEARN", "WORLD", "BREAD", "WATER", "HOUSE", "FRIEND"];
export const SAFE_ZONE_RADIUS = 60;

interface GameStore {
  gameState: GameState;
  score: number;
  timeLeft: number;
  playerState: EntityState;
  playerDisabledUntil: number;
  enemies: EnemyData[];
  lasers: LaserData[];
  particles: ParticleData[];
  events: GameEvent[];
  playerPos: [number, number, number];
  
  // Quest & Inventory System
  currentQuest: Quest | null;
  letters: LetterData[];
  inventory: string[];
  lessonIndex: number;
  totalLessons: number;
  collectLetter: (id: string) => void;
  dropLetter: (position: [number, number, number], letter: string) => void;
  startNextLesson: () => void;
  craftWord: () => void;
  exchangeLetters: (lettersToGive: string[], letterToReceive: string) => void;
  
  // Multiplayer
  socket: Socket | null;
  otherPlayers: Record<string, PlayerData>;

  startGame: () => void;
  endGame: () => void;
  leaveGame: () => void;
  updateTime: (delta: number) => void;
  hitPlayer: (position: [number, number, number]) => void;
  hitEnemy: (id: string, byPlayer?: boolean) => void;
  addLaser: (start: [number, number, number], end: [number, number, number], color: string) => void;
  addParticles: (position: [number, number, number], color: string) => void;
  addEvent: (message: string) => void;
  updateEnemies: (time: number) => void;
  cleanupEffects: (time: number) => void;
  setPlayerState: (state: EntityState) => void;
  
  // Multiplayer actions
  updatePlayerPosition: (position: [number, number, number], rotation: number) => void;

  // Mobile Controls
  mobileInput: {
    move: { x: number, y: number };
    look: { x: number, y: number };
    shooting: boolean;
  };
  setMobileInput: (input: Partial<{
    move: { x: number, y: number };
    look: { x: number, y: number };
    shooting: boolean;
  }>) => void;
}

const INITIAL_ENEMIES: EnemyData[] = Array.from({ length: 60 }).map((_, i) => ({
  id: `bot-${i}`,
  position: [
    (Math.random() - 0.5) * 900, 
    1, 
    (Math.random() - 0.5) * 900
  ],
  state: 'active',
  disabledUntil: 0
}));

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: 'menu',
  score: 0,
  timeLeft: 120, // 2 minutes
  playerState: 'active',
  playerDisabledUntil: 0,
  enemies: [],
  lasers: [],
  particles: [],
  events: [],
  playerPos: [0, 0, 0],
  
  socket: null,
  otherPlayers: {},

  mobileInput: {
    move: { x: 0, y: 0 },
    look: { x: 0, y: 0 },
    shooting: false
  },

  currentQuest: null,
  letters: [],
  inventory: [],
  lessonIndex: 0,
  totalLessons: LESSON_WORDS.length,

  setMobileInput: (input) => set((state) => ({
    mobileInput: { ...state.mobileInput, ...input }
  })),

  startGame: () => {
    const { socket } = get();
    
    if (socket) {
      socket.disconnect();
    }

    let newSocket: Socket | null = null;

    // Initialize multiplayer
    newSocket = io(window.location.origin, {
      transports: ['websocket']
    });
    
    newSocket.on('connect', () => {
      newSocket!.emit('joinGame');
    });

    newSocket.on('gameError', (msg: string) => {
      alert(msg);
      get().leaveGame();
    });

    newSocket.on('gameJoined', (players: Record<string, PlayerData>) => {
      const otherPlayers = { ...players };
      delete otherPlayers[newSocket!.id!];
      
      const targetWord = LESSON_WORDS[0];
      const initialLetters: LetterData[] = Array.from({ length: 30 }).map((_, i) => ({
        id: `letter-init-${i}`,
        position: [(Math.random() - 0.5) * 800, 1, (Math.random() - 0.5) * 800],
        letter: String.fromCharCode(65 + Math.floor(Math.random() * 26)),
        collected: false
      }));

      set({ 
        otherPlayers,
        gameState: 'playing',
        timeLeft: 600, // 10 minutes
        score: 0,
        enemies: INITIAL_ENEMIES.map(e => ({ ...e, state: 'active', disabledUntil: 0 })),
        lessonIndex: 0,
        inventory: [],
        currentQuest: {
          id: 'quest-0',
          title: `LESSON 1: ${targetWord}`,
          description: `Translate: Яблоко`,
          targetWord,
          collectedLetters: [],
          isCompleted: false
        },
        letters: initialLetters
      });
    });

      newSocket.on('playerJoined', (player: PlayerData) => {
        set(state => ({
          otherPlayers: { ...state.otherPlayers, [player.id]: player },
          events: [...state.events, { id: Math.random().toString(), message: `${player.name} joined`, timestamp: Date.now() }]
        }));
      });

      newSocket.on('playerMoved', (data: { id: string, position: [number, number, number], rotation: number }) => {
        set(state => {
          if (!state.otherPlayers[data.id]) return state;
          return {
            otherPlayers: {
              ...state.otherPlayers,
              [data.id]: {
                ...state.otherPlayers[data.id],
                position: data.position,
                rotation: data.rotation
              }
            }
          };
        });
      });

      newSocket.on('playerShot', (data: { id: string, start: [number, number, number], end: [number, number, number], color: string }) => {
        set(state => ({
          lasers: [...state.lasers, { id: Math.random().toString(36).substr(2, 9), start: data.start, end: data.end, timestamp: Date.now(), color: data.color }],
          particles: [...state.particles, { id: Math.random().toString(36).substr(2, 9), position: data.end, timestamp: Date.now(), color: data.color }]
        }));
      });

      newSocket.on('playerHit', (data: { targetId: string, shooterId: string, targetDisabledUntil: number, shooterScore: number }) => {
        set(state => {
          const now = Date.now();
          const isLocalShooter = data.shooterId === newSocket!.id;
          const isLocalTarget = data.targetId === newSocket!.id;
          
          const shooterName = isLocalShooter ? 'You' : (state.otherPlayers[data.shooterId]?.name || 'Unknown');
          const targetName = isLocalTarget ? 'You' : (state.otherPlayers[data.targetId]?.name || 'Unknown');
          const eventMsg = `${shooterName} tagged ${targetName}`;
          const newEvent = { id: Math.random().toString(), message: eventMsg, timestamp: now };

          let newState: Partial<GameStore> = {
            events: [...state.events, newEvent]
          };

          if (isLocalTarget) {
            // Safe zone protection
            const distFromCenter = Math.sqrt(state.playerPos[0] * state.playerPos[0] + state.playerPos[2] * state.playerPos[2]);
            if (distFromCenter < SAFE_ZONE_RADIUS) return state;

            newState.playerState = 'disabled';
            newState.playerDisabledUntil = data.targetDisabledUntil;
          }

          if (isLocalShooter) {
            newState.score = data.shooterScore;
          }

          // Update other players' states
          const players = { ...state.otherPlayers };
          let playersChanged = false;

          if (!isLocalTarget && players[data.targetId]) {
            players[data.targetId] = {
              ...players[data.targetId],
              state: 'disabled',
              disabledUntil: data.targetDisabledUntil
            };
            playersChanged = true;
          }

          if (!isLocalShooter && players[data.shooterId]) {
            players[data.shooterId] = {
              ...players[data.shooterId],
              score: data.shooterScore
            };
            playersChanged = true;
          }

          if (playersChanged) {
            newState.otherPlayers = players;
          }

          return newState;
        });
      });

      newSocket.on('playerLeft', (id: string) => {
        set(state => {
          const players = { ...state.otherPlayers };
          const playerName = players[id]?.name || 'Unknown';
          delete players[id];
          return { 
            otherPlayers: players,
            events: [...state.events, { id: Math.random().toString(), message: `${playerName} left`, timestamp: Date.now() }]
          };
        });
      });
    const targetWord = LESSON_WORDS[0];
    const initialLetters: LetterData[] = Array.from({ length: 30 }).map((_, i) => ({
      id: `letter-init-${i}`,
      position: [(Math.random() - 0.5) * 800, 1, (Math.random() - 0.5) * 800],
      letter: String.fromCharCode(65 + Math.floor(Math.random() * 26)),
      collected: false
    }));

    set({
      gameState: 'playing',
      score: 0,
      timeLeft: 600,
      playerState: 'active',
      playerDisabledUntil: 0,
      enemies: INITIAL_ENEMIES.map(e => ({ ...e, state: 'active', disabledUntil: 0 })),
      lasers: [],
      particles: [],
      events: [],
      socket: newSocket,
      otherPlayers: {},
      lessonIndex: 0,
      inventory: [],
      currentQuest: {
        id: 'quest-0',
        title: `LESSON 1: ${targetWord}`,
        description: `Translate: Яблоко`,
        targetWord: targetWord,
        collectedLetters: [],
        isCompleted: false
      },
      letters: initialLetters
    });
  },

  endGame: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({ gameState: 'gameover', socket: null });
  },

  leaveGame: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({
      gameState: 'menu',
      socket: null,
      otherPlayers: {},
      enemies: [],
      lasers: [],
      particles: [],
      events: [],
      score: 0,
      timeLeft: 120,
      playerState: 'active'
    });
  },

  updateTime: (delta) => set((state) => {
    if (state.gameState !== 'playing') return state;
    const newTime = state.timeLeft - delta;
    if (newTime <= 0) {
      if (state.socket) state.socket.disconnect();
      return { timeLeft: 0, gameState: 'gameover', socket: null, roomId: null };
    }
    return { timeLeft: newTime };
  }),

  hitPlayer: (position) => set((state) => {
    if (state.playerState === 'disabled' || state.gameState !== 'playing') return state;
    
    // Safe zone protection
    const distFromCenter = Math.sqrt(position[0] * position[0] + position[2] * position[2]);
    if (distFromCenter < SAFE_ZONE_RADIUS) return state;

    return {
      playerState: 'disabled',
      playerDisabledUntil: Date.now() + 3000,
      score: Math.max(0, state.score - 50), // Penalty for getting hit
    };
  }),

  hitEnemy: (id, byPlayer = false) => set((state) => {
    if (state.gameState !== 'playing') return state;
    
    // Check if it's a multiplayer player
    if (state.socket && state.otherPlayers[id]) {
      state.socket.emit('hitPlayer', id);
      return state;
    }

    const enemies = state.enemies.map(e => {
      if (e.id === id && e.state === 'active') {
        // Drop a random letter
        if (Math.random() > 0.3) {
          const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
          setTimeout(() => get().dropLetter(e.position, randomLetter), 0);
        }
        return { ...e, state: 'disabled' as EntityState, disabledUntil: Date.now() + 3000 };
      }
      return e;
    });
    return {
      enemies,
      score: byPlayer ? state.score + 100 : state.score, // Points for hitting enemy
      events: byPlayer ? [...state.events, { id: Math.random().toString(), message: `You tagged ${id}`, timestamp: Date.now() }] : state.events
    };
  }),

  addLaser: (start, end, color) => {
    const { socket } = get();
    if (socket) {
      socket.emit('shoot', { start, end, color });
    }
    set((state) => ({
      lasers: [...state.lasers, { id: Math.random().toString(36).substr(2, 9), start, end, timestamp: Date.now(), color }]
    }));
  },

  addParticles: (position, color) => set((state) => ({
    particles: [...state.particles, { id: Math.random().toString(36).substr(2, 9), position, timestamp: Date.now(), color }]
  })),

  addEvent: (message) => set((state) => ({
    events: [...state.events, { id: Math.random().toString(), message, timestamp: Date.now() }]
  })),

  updateEnemies: (time) => set((state) => {
    let changed = false;
    const enemies = state.enemies.map(e => {
      if (e.state === 'disabled' && time > e.disabledUntil) {
        changed = true;
        return { ...e, state: 'active' as EntityState };
      }
      
      // Safe zone check: enemies stay outside
      const distFromCenter = Math.sqrt(e.position[0] * e.position[0] + e.position[2] * e.position[2]);
      if (distFromCenter < SAFE_ZONE_RADIUS + 5) {
        const pushDir = [e.position[0] / distFromCenter, 0, e.position[2] / distFromCenter];
        changed = true;
        return {
          ...e,
          position: [
            pushDir[0] * (SAFE_ZONE_RADIUS + 10),
            e.position[1],
            pushDir[2] * (SAFE_ZONE_RADIUS + 10)
          ] as [number, number, number]
        };
      }

      return e;
    });
    
    // Also update other players' states
    let otherPlayers = state.otherPlayers;
    let playersChanged = false;
    Object.values(state.otherPlayers).forEach(p => {
      if (p.state === 'disabled' && time > p.disabledUntil) {
        if (!playersChanged) {
          otherPlayers = { ...state.otherPlayers };
          playersChanged = true;
        }
        otherPlayers[p.id] = { ...p, state: 'active' };
      }
    });

    if (state.playerState === 'disabled' && time > state.playerDisabledUntil) {
      return { enemies, playerState: 'active', otherPlayers: playersChanged ? otherPlayers : state.otherPlayers };
    }
    return changed || playersChanged ? { enemies, otherPlayers } : state;
  }),

  cleanupEffects: (time) => set((state) => {
    const lasers = state.lasers.filter(l => time - l.timestamp < 200); // Lasers last 200ms
    const particles = state.particles.filter(p => time - p.timestamp < 500); // Particles last 500ms
    const events = state.events.filter(e => time - e.timestamp < 5000); // Events last 5s
    if (lasers.length !== state.lasers.length || particles.length !== state.particles.length || events.length !== state.events.length) {
      return { lasers, particles, events };
    }
    return state;
  }),

  setPlayerState: (playerState) => set({ playerState }),

  collectLetter: (id) => set((state) => {
    const letter = state.letters.find(l => l.id === id);
    if (!letter || letter.collected) return state;

    const newLetters = state.letters.map(l => l.id === id ? { ...l, collected: true } : l);
    const newInventory = [...state.inventory, letter.letter];
    
    setTimeout(() => get().addParticles(letter.position, '#fcd34d'), 0);
    return {
      letters: newLetters,
      inventory: newInventory,
      score: state.score + 10,
      events: [...state.events, { id: Math.random().toString(), message: `PICKED UP: ${letter.letter}`, timestamp: Date.now() }]
    };
  }),

  dropLetter: (position, letter) => set((state) => ({
    letters: [...state.letters, {
      id: `letter-drop-${Math.random().toString(36).substr(2, 9)}`,
      position: [position[0], 1, position[2]],
      letter,
      collected: false
    }],
    events: [...state.events, { id: Math.random().toString(), message: `ENEMY DROPPED: ${letter}`, timestamp: Date.now() }]
  })),

  startNextLesson: () => set((state) => {
    const nextIndex = state.lessonIndex + 1;
    if (nextIndex >= LESSON_WORDS.length) {
      return {
        events: [...state.events, { id: Math.random().toString(), message: "CONGRATULATIONS! ALL LESSONS COMPLETE!", timestamp: Date.now() }],
        score: state.score + 1000,
        gameState: 'gameover'
      };
    }

    const nextWord = LESSON_WORDS[nextIndex];
    const translations: Record<string, string> = {
      "APPLE": "Яблоко",
      "HELLO": "Привет",
      "GREEN": "Зеленый",
      "STUDY": "Учиться",
      "LEARN": "Изучать",
      "WORLD": "Мир",
      "BREAD": "Хлеб",
      "WATER": "Вода",
      "HOUSE": "Дом",
      "FRIEND": "Друг"
    };

    return {
      lessonIndex: nextIndex,
      currentQuest: {
        id: `quest-${nextIndex}`,
        title: `LESSON ${nextIndex + 1}: ${nextWord}`,
        description: `Translate: ${translations[nextWord] || nextWord}`,
        targetWord: nextWord,
        collectedLetters: [],
        isCompleted: false
      },
      events: [...state.events, { id: Math.random().toString(), message: `NEW LESSON: ${nextWord}`, timestamp: Date.now() }]
    };
  }),

  craftWord: () => set((state) => {
    if (!state.currentQuest || state.currentQuest.isCompleted) return state;
    
    const target = state.currentQuest.targetWord;
    const inv = [...state.inventory];
    const collected: string[] = [];
    let canCraft = true;

    for (const char of target) {
      const index = inv.indexOf(char);
      if (index !== -1) {
        inv.splice(index, 1);
        collected.push(char);
      } else {
        canCraft = false;
        break;
      }
    }

    if (canCraft) {
      setTimeout(() => get().startNextLesson(), 2000);
      return {
        inventory: inv,
        score: state.score + 500,
        currentQuest: { ...state.currentQuest, collectedLetters: collected, isCompleted: true },
        events: [...state.events, { id: Math.random().toString(), message: `EXCELLENT! ${target} crafted!`, timestamp: Date.now() }]
      };
    } else {
      return {
        events: [...state.events, { id: Math.random().toString(), message: `NOT ENOUGH LETTERS FOR ${target}`, timestamp: Date.now() }]
      };
    }
  }),

  exchangeLetters: (lettersToGive, letterToReceive) => set((state) => {
    const inv = [...state.inventory];
    let allFound = true;
    
    for (const char of lettersToGive) {
      const index = inv.indexOf(char);
      if (index !== -1) {
        inv.splice(index, 1);
      } else {
        allFound = false;
        break;
      }
    }

    if (allFound) {
      return {
        inventory: [...inv, letterToReceive],
        events: [...state.events, { id: Math.random().toString(), message: `EXCHANGED 3 LETTERS FOR ${letterToReceive}`, timestamp: Date.now() }]
      };
    }
    return state;
  }),

  updatePlayerPosition: (position, rotation) => {
    const { socket } = get();
    if (socket) {
      socket.emit('updatePosition', { position, rotation });
    }
    set({ playerPos: position });
  }
}));
