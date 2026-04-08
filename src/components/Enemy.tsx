/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, useRapier, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore, EnemyData } from '../store';
import { Text } from '@react-three/drei';

const ENEMY_SPEED = 3;
const CHASE_DIST = 15; // Reduced from 20
const SHOOT_DIST = 15;
const SHOOT_COOLDOWN = 3500; // Increased from 2000 for less aggressive shooting

function RobotModel({ color, isAggro, isDisabled }: { color: string, isAggro: boolean, isDisabled: boolean }) {
  const group = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (group.current) {
      // Hover effect
      group.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  const emissiveColor = isDisabled ? '#111' : (isAggro ? '#ff0000' : '#00ffff');

  return (
    <group ref={group}>
      {/* Head */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.8} />
      </mesh>
      
      {/* Visor/Eyes */}
      <mesh position={[0, 1.55, 0.3]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.5, 0.15, 0.1]} />
        <meshBasicMaterial color={emissiveColor} />
      </mesh>

      {/* Body/Torso */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.3, 0.5, 0.8, 6]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Shoulders/Arms */}
      <group position={[0, 1.1, 0]}>
        <mesh position={[0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.4]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        <mesh position={[-0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.4]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        
        {/* Hands/Cannons */}
        <mesh position={[0.8, -0.2, 0.2]}>
          <boxGeometry args={[0.2, 0.2, 0.4]} />
          <meshStandardMaterial color="#111" metalness={1} />
        </mesh>
        <mesh position={[-0.8, -0.2, 0.2]}>
          <boxGeometry args={[0.2, 0.2, 0.4]} />
          <meshStandardMaterial color="#111" metalness={1} />
        </mesh>
      </group>

      {/* Thruster/Base */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.2, 0.05, 0.3, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <pointLight position={[0, 0.2, 0]} distance={2} intensity={isAggro ? 2 : 0.5} color={emissiveColor} />
    </group>
  );
}

export function Enemy({ data }: { data: EnemyData }) {
  const body = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  const { world, rapier } = useRapier();
  
  const lastShootTime = useRef(0);
  const patrolTarget = useRef(new THREE.Vector3());
  const lastPatrolChange = useRef(0);
  const state = useRef<'patrol' | 'chase'>('patrol');

  const groupRef = useRef<THREE.Group>(null);

  // Initialize patrol target
  useMemo(() => {
    patrolTarget.current.set(
      data.position[0] + (Math.random() - 0.5) * 10,
      data.position[1],
      data.position[2] + (Math.random() - 0.5) * 10
    );
  }, [data.position]);

  useFrame((state_fiber) => {
    const gState = useGameStore.getState();
    if (!body.current || gState.gameState !== 'playing' || data.state === 'disabled') {
      if (body.current) {
        body.current.setLinvel({ x: 0, y: body.current.linvel().y, z: 0 }, true);
      }
      return;
    }

    const pos = body.current.translation();
    const currentPos = new THREE.Vector3(pos.x, pos.y, pos.z);
    
    let closestTargetPos: THREE.Vector3 | null = null;
    let closestDist = CHASE_DIST;

    // Check player
    if (gState.playerState === 'active' && data.isAggro) {
      const playerPos = camera.position.clone();
      playerPos.y = pos.y; // Ignore height difference for distance
      const distToPlayer = currentPos.distanceTo(playerPos);
      if (distToPlayer < closestDist) {
        closestDist = distToPlayer;
        closestTargetPos = playerPos;
      }
    }

    // Check other enemies
    const allEnemies = gState.enemies;
    allEnemies.forEach(e => {
      if (e.id !== data.id && e.state === 'active' && data.isAggro) {
        const ePos = new THREE.Vector3(e.position[0], pos.y, e.position[2]);
        const distToEnemy = currentPos.distanceTo(ePos);
        if (distToEnemy < closestDist) {
          closestDist = distToEnemy;
          closestTargetPos = ePos;
        }
      }
    });

    // AI Logic
    if (closestTargetPos) {
      state.current = 'chase';
    } else if (state.current === 'chase') {
      state.current = 'patrol';
      patrolTarget.current.set(
        currentPos.x + (Math.random() - 0.5) * 40,
        currentPos.y,
        currentPos.z + (Math.random() - 0.5) * 40
      );
      lastPatrolChange.current = Date.now();
    }

    const direction = new THREE.Vector3();

    if (state.current === 'chase' && closestTargetPos) {
      direction.subVectors(closestTargetPos, currentPos).normalize();
      
      // Shooting logic
      const now = Date.now();
      if (closestDist < SHOOT_DIST && now - lastShootTime.current > SHOOT_COOLDOWN) {
        // Raycast to check line of sight
        const rayDir = new THREE.Vector3().subVectors(closestTargetPos, currentPos).normalize();
        
        // Add random spread so they miss sometimes
        const spread = 0.15;
        rayDir.x += (Math.random() - 0.5) * spread;
        rayDir.y += (Math.random() - 0.5) * spread;
        rayDir.z += (Math.random() - 0.5) * spread;
        rayDir.normalize();
        
        // Offset start position to avoid hitting self
        const startPos = new THREE.Vector3(currentPos.x, currentPos.y + 0.5, currentPos.z);
        startPos.add(rayDir.clone().multiplyScalar(1.5));

        const ray = new rapier.Ray(startPos, rayDir);
        const hit = world.castRay(ray, SHOOT_DIST, true);

        if (hit) {
          const collider = hit.collider;
          const rb = collider.parent();
          if (rb && rb.userData) {
            const userData = rb.userData as { name?: string };
            if (userData.name === 'player') {
              // Hit player!
              gState.hitPlayer([camera.position.x, camera.position.y, camera.position.z]);
              gState.addParticles([camera.position.x, camera.position.y, camera.position.z], '#ff0000');
              gState.addLaser(
                [startPos.x, startPos.y, startPos.z],
                [camera.position.x, camera.position.y, camera.position.z],
                '#ff0000'
              );
              lastShootTime.current = now;
            } else if (userData.name?.startsWith('bot-')) {
              // Hit another enemy!
              const hitPoint = ray.pointAt(hit.timeOfImpact);
              const hitPos: [number, number, number] = [hitPoint.x, hitPoint.y, hitPoint.z];
              gState.hitEnemy(userData.name, hitPos);
              gState.addParticles(hitPos, '#ff0000');
              gState.addLaser(
                [startPos.x, startPos.y, startPos.z],
                hitPos,
                '#ff0000'
              );
              lastShootTime.current = now;
            } else {
              // Hit wall or obstacle
              const hitPoint = ray.pointAt(hit.timeOfImpact);
              const hitPos: [number, number, number] = [hitPoint.x, hitPoint.y, hitPoint.z];
              gState.addParticles(hitPos, '#ff0000');
              gState.addLaser(
                [startPos.x, startPos.y, startPos.z],
                hitPos,
                '#ff0000'
              );
              lastShootTime.current = now;
            }
          } else {
            // Hit wall or obstacle
            const hitPoint = ray.pointAt(hit.timeOfImpact);
            gState.addParticles([hitPoint.x, hitPoint.y, hitPoint.z], '#ff0000');
            gState.addLaser(
              [startPos.x, startPos.y, startPos.z],
              [hitPoint.x, hitPoint.y, hitPoint.z],
              '#ff0000'
            );
            lastShootTime.current = now;
          }
        }
      }
    } else {
      // Patrol
      const now = Date.now();
      // Change target if reached or if stuck for 4 seconds
      if (currentPos.distanceTo(patrolTarget.current) < 2 || now - lastPatrolChange.current > 4000) {
        patrolTarget.current.set(
          currentPos.x + (Math.random() - 0.5) * 60,
          currentPos.y,
          currentPos.z + (Math.random() - 0.5) * 60
        );
        lastPatrolChange.current = now;
      }
      direction.subVectors(patrolTarget.current, currentPos).normalize();
    }

    // Apply movement
    const velocity = body.current.linvel();
    body.current.setLinvel({
      x: direction.x * ENEMY_SPEED,
      y: velocity.y,
      z: direction.z * ENEMY_SPEED
    }, true);

    // Rotate to face direction
    if (groupRef.current && direction.lengthSq() > 0.1) {
      const targetRotation = Math.atan2(direction.x, direction.z);
      // Simple lerp for rotation
      const currentRotation = groupRef.current.rotation.y;
      // Handle angle wrap-around
      let diff = targetRotation - currentRotation;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      groupRef.current.rotation.y += diff * 0.1;
    }
  });

  const color = data.state === 'disabled' ? '#444' : (data.isAggro ? '#ff0055' : '#58cc02');

  return (
    <RigidBody
      ref={body}
      colliders={false}
      mass={1}
      type="dynamic"
      position={data.position}
      enabledRotations={[false, false, false]}
      userData={{ name: data.id }}
    >
      <CapsuleCollider args={[0.5, 0.5]} position={[0, 1, 0]} />
      <group ref={groupRef} position={[0, 0, 0]}>
        <RobotModel color={color} isAggro={data.isAggro} isDisabled={data.state === 'disabled'} />

        {/* Username Label */}
        <Text
          position={[0, 2.8, 0]}
          fontSize={0.3}
          color={data.state === 'active' ? (data.isAggro ? '#ff0055' : '#58cc02') : '#666666'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {data.id} {data.isAggro ? '💢' : '💤'}
        </Text>
      </group>
    </RigidBody>
  );
}
