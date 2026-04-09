/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { RigidBody } from '@react-three/rapier';
import { Grid, Stars, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import { useGameStore, SAFE_ZONE_RADIUS } from '../store';

import { useIsMobile } from '../lib/useIsMobile';

// Seeded PRNG for consistent multiplayer obstacle generation
function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
const rng = mulberry32(12345);

const BOX_GEOM = new THREE.BoxGeometry(1, 1, 1);
const CYLINDER_GEOM = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);

export function Arena() {
  const isMobile = useIsMobile();
  
  // Load basic textures
  const grassTexture = useTexture('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/terrain/grasslight-big.jpg');
  const woodTexture = useTexture('https://picsum.photos/seed/stylized-wood/512/512');
  const cityFloorTexture = useTexture('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/mossy_cobblestone/mossy_cobblestone_diff_1k.jpg');

  // Load PBR wall textures
  const wallBase = useTexture('/wall_basecolor.png');
  const wallNormal = useTexture('/wall_normal.png');
  const wallRough = useTexture('/wall_rough.png');
  const wallAO = useTexture('/wall_ambientOcclusion.png');
  const wallHeight = useTexture('/wall_height.png');

  const wallMaps = useMemo(() => ({
    map: wallBase,
    normalMap: wallNormal,
    roughnessMap: wallRough,
    aoMap: wallAO,
    displacementMap: wallHeight,
  }), [wallBase, wallNormal, wallRough, wallAO, wallHeight]);

  // Configure textures
  useMemo(() => {
    [grassTexture, woodTexture, cityFloorTexture, wallBase, wallNormal, wallRough, wallAO, wallHeight].forEach(t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
    });
    grassTexture.repeat.set(10, 10);
    cityFloorTexture.repeat.set(6, 6);
    
    // Default repeat for walls
    [wallBase, wallNormal, wallRough, wallAO, wallHeight].forEach(t => {
      t.repeat.set(4, 2);
    });
  }, [grassTexture, woodTexture, cityFloorTexture, wallBase, wallNormal, wallRough, wallAO, wallHeight]);

  const obstacles = useMemo(() => {
    const count = isMobile ? 5 : 12;
    const rngLocal = mulberry32(12345);
    return Array.from({ length: count }).map(() => {
      const type = 'box';
      const x = (rngLocal() - 0.5) * 150;
      const z = (rngLocal() - 0.5) * 150;
      
      if (Math.sqrt(x * x + z * z) < SAFE_ZONE_RADIUS + 3) return null;

      const height = rngLocal() * 5 + 3;
      const isHorizontal = rngLocal() > 0.5;
      const width = isHorizontal ? rngLocal() * 10 + 5 : rngLocal() * 1.5 + 1;
      const depth = isHorizontal ? rngLocal() * 1.5 + 1 : rngLocal() * 10 + 5;
      const color = rngLocal() > 0.5 ? "cyan" : "magenta";

      return { type, position: [x, height / 2 - 0.5, z], size: [width, height, depth], rotation: [0, 0, 0], color };
    }).filter(Boolean);
  }, [isMobile]);

  return (
    <group>
      {/* Floor */}
      <RigidBody type="fixed" name="floor" friction={0}>
        <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial map={grassTexture} color="#4a7a4a" roughness={0.8} />
        </mesh>
      </RigidBody>

      {/* Safe Zone / City */}
      <CityFence radius={SAFE_ZONE_RADIUS} wallMaps={wallMaps} floorTexture={cityFloorTexture} />

      {/* Ceiling */}
      <RigidBody type="fixed" name="ceiling">
        <mesh position={[0, 20, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#000000" roughness={1} />
        </mesh>
      </RigidBody>

      {/* Walls */}
      <Wall name="wall-n" position={[0, 5, -100]} rotation={[0, 0, 0]} maps={wallMaps} />
      <Wall name="wall-s" position={[0, 5, 100]} rotation={[0, Math.PI, 0]} maps={wallMaps} />
      <Wall name="wall-e" position={[100, 5, 0]} rotation={[0, -Math.PI / 2, 0]} maps={wallMaps} />
      <Wall name="wall-w" position={[-100, 5, 0]} rotation={[0, Math.PI / 2, 0]} maps={wallMaps} />

      {/* Obstacles */}
      {obstacles.map((obs, i) => {
        if (!obs) return null;
        return (
          <RigidBody 
            key={i} 
            type="fixed" 
            colliders="cuboid"
            name={`obstacle-${i}`}
            position={obs.position as [number, number, number]}
            rotation={obs.rotation as [number, number, number]}
          >
            <mesh receiveShadow={false} castShadow={false} scale={obs.size as [number, number, number]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial map={woodTexture} color="#8b5a2b" roughness={0.8} />
              
              {/* Neon accent on obstacles */}
              <mesh position={[0, 0.45, 0]} scale={[1.05, 0.05, 1.05]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color={obs.color === 'cyan' ? "#00ffff" : "#ff00ff"} toneMapped={false} />
              </mesh>
            </mesh>
          </RigidBody>
        );
      })}
    </group>
  );
}

function Wall({ name, position, rotation, maps }: { name: string, position: [number, number, number], rotation: [number, number, number], maps: any }) {
  const clonedMaps = useMemo(() => {
    const newMaps: any = {};
    Object.entries(maps).forEach(([key, tex]: [string, any]) => {
      const clone = tex.clone();
      clone.wrapS = clone.wrapT = THREE.RepeatWrapping;
      clone.repeat.set(20, 1);
      newMaps[key] = clone;
    });
    return newMaps;
  }, [maps]);

  return (
    <RigidBody type="fixed" name={name} position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[200, 10, 1, 128, 16, 1]} />
        <meshStandardMaterial 
          {...clonedMaps}
          color="#ffffff" 
          displacementScale={0.2}
          roughness={1} 
        />
      </mesh>
      <mesh position={[0, -4.5, 0.51]}>
        <planeGeometry args={[200, 1]} />
        <meshBasicMaterial color="#ff00ff" toneMapped={false} />
      </mesh>
      <mesh position={[0, 4.5, 0.51]}>
        <planeGeometry args={[200, 1]} />
        <meshBasicMaterial color="#00ffff" toneMapped={false} />
      </mesh>
    </RigidBody>
  );
}

function CityFence({ radius, wallMaps, floorTexture }: { radius: number, wallMaps: any, floorTexture: THREE.Texture }) {
  const segments = 16;
  const height = 4;
  const thickness = 1.2;
  const angleStep = (Math.PI * 2) / segments;
  
  return (
    <group>
      {Array.from({ length: segments }).map((_, i) => {
        const angle = i * angleStep;
        if (i === 0 || i === 1) return null;
        
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const nextAngle = (i + 1) * angleStep;
        const nx = Math.cos(nextAngle) * radius;
        const nz = Math.sin(nextAngle) * radius;
        
        const dx = nx - x;
        const dz = nz - z;
        const length = Math.sqrt(dx * dx + dz * dz);
        const wallAngle = Math.atan2(dz, dx);

        return (
          <RigidBody key={i} type="fixed">
            <mesh position={[x + dx / 2, height / 2 - 0.5, z + dz / 2]} rotation={[0, -wallAngle, 0]}>
              <boxGeometry args={[length, height, thickness, 32, 32, 1]} />
              <meshStandardMaterial 
                {...wallMaps}
                color="#ffffff" 
                displacementScale={0.1}
                roughness={1} 
              />
              <mesh position={[0, height / 2, 0]}>
                <boxGeometry args={[length, 0.1, thickness + 0.1]} />
                <meshBasicMaterial color="#4ade80" toneMapped={false} />
              </mesh>
            </mesh>
          </RigidBody>
        );
      })}
      
      <CityFloor radius={radius} texture={floorTexture} />
    </group>
  );
}

function CityFloor({ radius, texture }: { radius: number, texture: THREE.Texture }) {
  return (
    <group>
      <mesh position={[0, -0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial 
          map={texture}
          color="#ffffff" 
          roughness={0.9} 
        />
      </mesh>
    </group>
  );
}

