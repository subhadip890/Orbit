/**
 * OrbitalScene.tsx
 * Three.js orbital star system — the signature 3D element.
 * Central star glows in proportion to campaign progress.
 * Orbiting bodies represent campaign activity.
 */
import { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, Trail, Stars } from '@react-three/drei'
import * as THREE from 'three'

interface OrbitalSceneProps {
  progress?: number // 0–1, drives star glow intensity
  reducedMotion?: boolean
}

// ─── Central star ─────────────────────────────────────────────────────────────
function CentralStar({ progress = 0 }: { progress: number }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)

  const coreMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#E8D5A3'),
        emissive: new THREE.Color('#C8A84B'),
        emissiveIntensity: 0.8 + progress * 1.2,
        roughness: 0.2,
        metalness: 0.1,
      }),
    [progress]
  )

  const glowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#E8D5A3'),
        transparent: true,
        opacity: 0.06 + progress * 0.08,
        side: THREE.BackSide,
      }),
    [progress]
  )

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.12
      meshRef.current.rotation.z = t * 0.05
      // Subtle breathing
      const pulse = 1 + Math.sin(t * 1.2) * 0.02
      meshRef.current.scale.setScalar(pulse)
    }
    if (glowRef.current) {
      const glowPulse = 1 + Math.sin(t * 0.9 + 1) * 0.04
      glowRef.current.scale.setScalar(glowPulse)
    }
  })

  return (
    <group position={[0, 0, 0]}>
      {/* Core */}
      <Sphere ref={meshRef} args={[1.0, 32, 32]}>
        <primitive object={coreMaterial} attach="material" />
      </Sphere>
      {/* Outer glow layer */}
      <Sphere ref={glowRef} args={[2.2, 32, 32]}>
        <primitive object={glowMaterial} attach="material" />
      </Sphere>
      {/* Point light from star */}
      <pointLight
        color="#E8D5A3"
        intensity={2.5 + progress * 2}
        distance={18}
        decay={2}
      />
    </group>
  )
}

// ─── Orbiting body ─────────────────────────────────────────────────────────────
interface OrbitingBodyProps {
  radius: number
  speed: number
  size: number
  phase: number
  inclination: number
  color: string
  reducedMotion: boolean
}

function OrbitingBody({
  radius,
  speed,
  size,
  phase,
  inclination,
  color,
  reducedMotion,
}: OrbitingBodyProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const groupRef = useRef<THREE.Group>(null!)

  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.4,
        roughness: 0.5,
        metalness: 0.3,
      }),
    [color]
  )

  useFrame((state) => {
    if (reducedMotion) return
    const t = state.clock.getElapsedTime()
    const angle = t * speed + phase
    if (groupRef.current) {
      groupRef.current.position.x = Math.cos(angle) * radius
      groupRef.current.position.z = Math.sin(angle) * radius
      groupRef.current.position.y = Math.sin(angle) * radius * Math.sin(inclination)
    }
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.8
    }
  })

  return (
    <group ref={groupRef}>
      <Trail
        width={0.5}
        length={4}
        color={new THREE.Color(color)}
        attenuation={(t) => t * t}
      >
        <Sphere ref={meshRef} args={[size, 12, 12]}>
          <primitive object={bodyMaterial} attach="material" />
        </Sphere>
      </Trail>
    </group>
  )
}

// ─── Orbit ring (visual) ───────────────────────────────────────────────────────
function OrbitRing({ radius, inclination }: { radius: number; inclination: number }) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2
      pts.push(
        new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius * Math.sin(inclination),
          Math.sin(angle) * radius
        )
      )
    }
    return pts
  }, [radius, inclination])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    return geo
  }, [points])

  return (
    <line>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial
        color="#1E3A6E"
        transparent
        opacity={0.3}
        attach="material"
      />
    </line>
  )
}

// ─── Scene content ─────────────────────────────────────────────────────────────
function SceneContent({
  progress,
  reducedMotion,
}: {
  progress: number
  reducedMotion: boolean
}) {
  const orbiters = useMemo(
    () => [
      { radius: 3.2, speed: 0.35, size: 0.28, phase: 0, inclination: 0.3, color: '#4ECCA3' },
      { radius: 4.8, speed: 0.22, size: 0.2, phase: 2.1, inclination: 0.12, color: '#7EB8F7' },
      { radius: 6.2, speed: 0.14, size: 0.35, phase: 4.5, inclination: 0.5, color: '#E8D5A3' },
    ],
    []
  )

  return (
    <>
      {/* Ambient + directional lighting */}
      <ambientLight intensity={0.08} />
      <directionalLight position={[5, 5, 5]} intensity={0.3} color="#1E3A6E" />

      {/* Background star field */}
      <Stars
        radius={90}
        depth={50}
        count={3000}
        factor={4}
        saturation={0}
        fade
        speed={reducedMotion ? 0 : 0.4}
      />

      {/* Central star */}
      <CentralStar progress={progress} />

      {/* Orbit rings + bodies */}
      {orbiters.map((o, i) => (
        <group key={i}>
          <OrbitRing radius={o.radius} inclination={o.inclination} />
          <OrbitingBody {...o} reducedMotion={reducedMotion} />
        </group>
      ))}
    </>
  )
}

// ─── Main export ───────────────────────────────────────────────────────────────
export default function OrbitalScene({ progress = 0, reducedMotion = false }: OrbitalSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 4, 14], fov: 55 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <SceneContent progress={progress} reducedMotion={reducedMotion} />
      </Suspense>
    </Canvas>
  )
}
