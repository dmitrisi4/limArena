/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store';
import * as THREE from 'three';
import { useRef, useMemo, useEffect } from 'react';

import { useShallow } from 'zustand/react/shallow';

const LASER_GEOM = new THREE.BoxGeometry(0.2, 0.2, 1);
const PARTICLE_GEOM = new THREE.BoxGeometry(0.05, 0.05, 0.05);

export function Effects() {
  const lasers = useGameStore(useShallow(state => state.lasers));
  const particles = useGameStore(useShallow(state => state.particles));

  return (
    <group>
      {lasers.map(laser => (
        <Laser key={laser.id} start={laser.start} end={laser.end} color={laser.color} />
      ))}
      {particles.map(p => (
        <ParticleBurst key={p.id} position={p.position} color={p.color} />
      ))}
    </group>
  );
}

function Laser({ start, end, color }: { start: [number, number, number], end: [number, number, number], color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  
  const { position, rotation, length } = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const length = s.distanceTo(e);
    const position = s.clone().lerp(e, 0.5);
    
    const direction = e.clone().sub(s).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      direction
    );
    const rotation = new THREE.Euler().setFromQuaternion(quaternion);
    
    return { position, rotation, length };
  }, [start, end]);

  useFrame((_, delta) => {
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, mat.opacity - delta * 4);
    }
  });

  return (
    <mesh ref={ref} position={position} rotation={rotation} scale={[1, 1, length]}>
      <primitive object={LASER_GEOM} attach="geometry" />
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={1} />
    </mesh>
  );
}

function ParticleBurst({ position, color }: { position: [number, number, number], color: string }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 10; // Reduced from 15
  
  const particles = useMemo(() => {
    return Array.from({ length: count }).map(() => ({
      pos: new THREE.Vector3(0, 0, 0),
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      ),
      scale: 1,
      opacity: 1
    }));
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    if (meshRef.current) {
      particles.forEach((p, i) => {
        p.pos.addScaledVector(p.vel, delta);
        p.scale = Math.max(0.001, p.scale - delta * 2);
        p.opacity = Math.max(0, p.opacity - delta * 3);
        
        dummy.position.copy(p.pos);
        dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = particles[0].opacity;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[PARTICLE_GEOM, undefined, count]} position={position}>
      <meshBasicMaterial color={color} transparent opacity={1} toneMapped={false} />
    </instancedMesh>
  );
}
