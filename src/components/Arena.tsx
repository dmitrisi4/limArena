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
const OBSTACLE_MAT = new THREE.MeshStandardMaterial({ color: "#1a1a2e", roughness: 0.6, metalness: 0.5 });
const NEON_MAT_CYAN = new THREE.MeshBasicMaterial({ color: "#00ffff", toneMapped: false });
const NEON_MAT_MAGENTA = new THREE.MeshBasicMaterial({ color: "#ff00ff", toneMapped: false });

export function Arena() {
  const isMobile = useIsMobile();
  
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
          <meshStandardMaterial color="#050510" roughness={0.2} metalness={0.8} />
        </mesh>
      </RigidBody>
      {!isMobile && <Grid position={[0, -0.49, 0]} args={[200, 200]} cellColor="#ff00ff" sectionColor="#00ffff" fadeDistance={100} cellThickness={0.5} sectionThickness={1.5} />}

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
              <primitive object={OBSTACLE_MAT} attach="material" />
              
              {/* Neon accent on obstacles */}
              <mesh position={[0, 0.45, 0]} scale={[1.05, 0.05, 1.05]}>
                <primitive object={obs.type === 'box' ? BOX_GEOM : CYLINDER_GEOM} attach="geometry" />
                <primitive object={obs.color === 'cyan' ? NEON_MAT_CYAN : NEON_MAT_MAGENTA} attach="material" />
              </mesh>
            </mesh>
          </RigidBody>
        );
      })}
    </group>
  );
}

function Wall({ name, position, rotation, isMobile }: { name: string, position: [number, number, number], rotation: [number, number, number], isMobile: boolean }) {
  return (
    <RigidBody type="fixed" name={name} position={position} rotation={rotation}>
      {/* Solid Wall */}
      <mesh>
        <boxGeometry args={[200, 10, 1]} />
        <meshStandardMaterial color="#0a0a1a" roughness={0.8} metalness={0.2} />
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
  const thickness = 1;
  const angleStep = (Math.PI * 2) / segments;

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
            <mesh position={[x + dx / 2, height / 2, z + dz / 2]} rotation={[0, -wallAngle, 0]}>
              <boxGeometry args={[length, height, thickness]} />
              <meshStandardMaterial color="#58cc02" emissive="#58cc02" emissiveIntensity={0.2} transparent opacity={0.6} />
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
  const texture = useTexture('https://picsum.photos/seed/metal/512/512');
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);

  return (
    <group>
      <mesh position={[0, -0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 32]} />
        <meshStandardMaterial 
          map={texture}
          color="#2a2a4e" 
          roughness={0.4} 
          metalness={0.6} 
        />
      </mesh>
      {/* Small grid inside city for detail */}
      <Grid 
        position={[0, -0.47, 0]} 
        args={[radius * 2, radius * 2]} 
        cellColor="#58cc02" 
        sectionColor="#58cc02" 
        fadeDistance={radius * 2} 
        cellThickness={0.2} 
        sectionThickness={0.5} 
      />
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
