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
  
  const grassTexture = useTexture('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/terrain/grasslight-big.jpg');
  grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(10, 10);

  const woodTexture = useTexture('https://picsum.photos/seed/stylized-wood/512/512');
  woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;

  const obstacles = useMemo(() => {
    const count = isMobile ? 5 : 12; // Minimum for stability
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
          <meshStandardMaterial 
            map={grassTexture} 
            color="#4a7a4a" 
            roughness={0.8} 
            metalness={0.1} 
          />
        </mesh>
      </RigidBody>

      {/* Safe Zone / City */}
      <CityFence radius={SAFE_ZONE_RADIUS} />

      {/* Ceiling */}
      <RigidBody type="fixed" name="ceiling">
        <mesh position={[0, 20, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#000000" roughness={1} />
        </mesh>
      </RigidBody>

      {/* Atmosphere */}
      {/* Atmosphere disabled for stability */}

      {/* Walls */}
      <Wall name="wall-n" position={[0, 5, -100]} rotation={[0, 0, 0]} isMobile={isMobile} />
      <Wall name="wall-s" position={[0, 5, 100]} rotation={[0, Math.PI, 0]} isMobile={isMobile} />
      <Wall name="wall-e" position={[100, 5, 0]} rotation={[0, -Math.PI / 2, 0]} isMobile={isMobile} />
      <Wall name="wall-w" position={[-100, 5, 0]} rotation={[0, Math.PI / 2, 0]} isMobile={isMobile} />

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
              <primitive object={obs.type === 'box' ? BOX_GEOM : CYLINDER_GEOM} attach="geometry" />
              <meshStandardMaterial 
                map={woodTexture} 
                color="#8b5a2b" 
                roughness={0.8} 
                metalness={0.1} 
              />
              
              {/* Neon accent on obstacles */}
              <mesh position={[0, 0.45, 0]} scale={[1.05, 0.05, 1.05]}>
                <primitive object={obs.type === 'box' ? BOX_GEOM : CYLINDER_GEOM} attach="geometry" />
                <meshBasicMaterial color={obs.color === 'cyan' ? "#00ffff" : "#ff00ff"} toneMapped={false} />
              </mesh>
            </mesh>
          </RigidBody>
        );
      })}
    </group>
  );
}

function Wall({ name, position, rotation, isMobile }: { name: string, position: [number, number, number], rotation: [number, number, number], isMobile: boolean }) {
  const stoneTexture = useTexture('https://picsum.photos/seed/stylized-stone/512/512');
  stoneTexture.wrapS = stoneTexture.wrapT = THREE.RepeatWrapping;
  stoneTexture.repeat.set(4, 1);

  return (
    <RigidBody type="fixed" name={name} position={position} rotation={rotation}>
      {/* Solid Wall */}
      <mesh>
        <boxGeometry args={[200, 10, 1]} />
        <meshStandardMaterial 
          map={stoneTexture}
          color="#555" 
          roughness={0.9} 
          metalness={0.1} 
        />
      </mesh>
      {/* Glowing Base Line */}
      <mesh position={[0, -4.5, 0.51]}>
        <planeGeometry args={[200, 1]} />
        <meshBasicMaterial color="#ff00ff" toneMapped={false} />
      </mesh>
      {/* Glowing Top Line */}
      <mesh position={[0, 4.5, 0.51]}>
        <planeGeometry args={[200, 1]} />
        <meshBasicMaterial color="#00ffff" toneMapped={false} />
      </mesh>
    </RigidBody>
  );
}

function CityFence({ radius }: { radius: number }) {
  const segments = 16;
  const height = 4;
  const thickness = 1.2;
  const angleStep = (Math.PI * 2) / segments;
  
  const stoneTexture = useTexture('https://picsum.photos/seed/stylized-stone-wall/512/512');
  stoneTexture.wrapS = stoneTexture.wrapT = THREE.RepeatWrapping;

  return (
    <group>
      {Array.from({ length: segments }).map((_, i) => {
        const angle = i * angleStep;
        // Leave a gap for entrance
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
              <boxGeometry args={[length, height, thickness]} />
              <meshStandardMaterial 
                map={stoneTexture}
                color="#777" 
                roughness={0.9} 
                metalness={0.1} 
              />
              {/* Glowing top edge */}
              <mesh position={[0, height / 2, 0]}>
                <boxGeometry args={[length, 0.1, thickness + 0.1]} />
                <meshBasicMaterial color="#58cc02" toneMapped={false} />
              </mesh>
            </mesh>
          </RigidBody>
        );
      })}
      
      {/* City Floor */}
      <CityFloor radius={radius} />
    </group>
  );
}

function CityFloor({ radius }: { radius: number }) {
  // Using a reliable high-quality mossy cobblestone texture from Polyhaven
  const texture = useTexture('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/mossy_cobblestone/mossy_cobblestone_diff_1k.jpg');
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);

  return (
    <group>
      <mesh position={[0, -0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial 
          map={texture}
          color="#ffffff" 
          roughness={0.9} 
          metalness={0.1} 
        />
      </mesh>
    </group>
  );
}

function AmbientParticles() {
  const count = 800;
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const [positions, sizes] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 1000;
      positions[i * 3 + 1] = Math.random() * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1000;
      sizes[i] = Math.random() * 0.8 + 0.4; // Smaller particles
    }
    return [positions, sizes];
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#ffffff') } // White color
  }), []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          attribute float aSize;
          varying float vAlpha;
          void main() {
            vec3 pos = position;
            // Slow upward drift and wobble
            pos.y += uTime * 0.5;
            pos.x += sin(uTime * 0.2 + pos.y) * 2.0;
            pos.z += cos(uTime * 0.2 + pos.y) * 2.0;
            
            // Wrap around Y
            pos.y = mod(pos.y, 40.0);
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            
            // Size attenuation
            gl_PointSize = aSize * (300.0 / -mvPosition.z);
            
            // Fade out near top and bottom
            vAlpha = smoothstep(0.0, 5.0, pos.y) * smoothstep(40.0, 35.0, pos.y);
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          varying float vAlpha;
          void main() {
            // Distance from center of point
            float d = length(gl_PointCoord - vec2(0.5));
            // Soft circle using smoothstep
            float alpha = smoothstep(0.5, 0.1, d) * 0.5 * vAlpha;
            if (alpha < 0.01) discard;
            gl_FragColor = vec4(uColor, alpha);
          }
        `}
      />
    </points>
  );
}
