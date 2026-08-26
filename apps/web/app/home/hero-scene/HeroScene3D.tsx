"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { DoubleSide, MathUtils, type Group, type DirectionalLight } from "three";

const NAVY_DEEP = "#0B2545";
const NAVY_MID = "#163E6C";
const GOLD = "#D4A72C";
const GOLD_LIGHT = "#E6BA3D";
const PAGE = "#F4F1E8";

/** A single flat "book" — a thin box, optionally with a thin lighter "pages" inset. */
function Book({
  position,
  rotationY,
  size,
  color,
  emissive,
}: {
  position: [number, number, number];
  rotationY: number;
  size: [number, number, number];
  color: string;
  emissive?: string;
}) {
  return (
    <mesh position={position} rotation={[0, rotationY, 0]} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={0.45}
        metalness={0.12}
        emissive={emissive ?? "#000000"}
        emissiveIntensity={emissive ? 0.35 : 0}
      />
    </mesh>
  );
}

/** Thin ribbon "bookmark" poking out from between the pages, catches the rim light. */
function Bookmark() {
  return (
    <mesh position={[0.55, 0.55, 0.05]} rotation={[0.05, 0, -0.08]}>
      <planeGeometry args={[0.16, 1.1]} />
      <meshStandardMaterial
        color={GOLD_LIGHT}
        roughness={0.3}
        metalness={0.2}
        emissive={GOLD}
        emissiveIntensity={0.25}
        side={DoubleSide}
      />
    </mesh>
  );
}

function BookStack({
  autoRotate,
  mouse,
}: {
  autoRotate: boolean;
  mouse: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const group = useRef<Group>(null);
  const spin = useRef(0);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;

    if (autoRotate) {
      spin.current += delta * 0.18; // slow idle rotation
    }

    // Small mouse-parallax tilt, independent of the auto-spin base angle.
    const targetTiltX = mouse.current.y * 0.12;
    const targetTiltZ = -mouse.current.x * 0.1;

    g.rotation.y = spin.current + mouse.current.x * 0.15;
    g.rotation.x += (targetTiltX - g.rotation.x) * Math.min(1, delta * 3);
    g.rotation.z += (targetTiltZ - g.rotation.z) * Math.min(1, delta * 3);
  });

  return (
    <group ref={group} position={[0, -0.15, 0]} scale={1.2}>
      <Book position={[0, -0.55, 0]} rotationY={-0.28} size={[2.6, 0.32, 1.9]} color={NAVY_DEEP} />
      <Book position={[0, -0.2, 0]} rotationY={0.16} size={[2.35, 0.3, 1.7]} color={PAGE} />
      <Book position={[0, 0.12, 0]} rotationY={-0.1} size={[2.05, 0.28, 1.5]} color={NAVY_MID} />
      <Book
        position={[0, 0.42, 0]}
        rotationY={0.06}
        size={[1.7, 0.24, 1.25]}
        color={GOLD}
        emissive={GOLD}
      />
      <Bookmark />
    </group>
  );
}

function Rig({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  // Subtle key-light shift so the "studio" lighting reacts to the cursor too.
  const light = useRef<DirectionalLight>(null);
  useFrame((_, delta) => {
    if (!light.current) return;
    const targetX = 3 + mouse.current.x * 1.2;
    const targetY = 4 + mouse.current.y * 0.8;
    light.current.position.x += (targetX - light.current.position.x) * Math.min(1, delta * 2);
    light.current.position.y += (targetY - light.current.position.y) * Math.min(1, delta * 2);
  });

  return (
    <>
      <ambientLight intensity={0.55} color="#EAF0FA" />
      <directionalLight ref={light} position={[3, 4, 4]} intensity={1.1} color="#FFFFFF" />
      {/* Gold rim light — brand accent */}
      <pointLight position={[-2.4, 0.6, -2.2]} intensity={7} color={GOLD} distance={8} decay={2} />
      {/* Soft navy fill from below-front so shadows never go pure black */}
      <pointLight position={[0, -1.5, 3]} intensity={2.5} color={NAVY_MID} distance={8} decay={2} />
    </>
  );
}

export default function HeroScene3D({
  reducedMotion,
  interactive,
  dpr,
}: {
  reducedMotion: boolean;
  interactive: boolean;
  dpr: number;
}) {
  const mouse = useRef({ x: 0, y: 0 });

  // Track pointer at the window level (not on the canvas) so the cards/rings
  // layered above the scene keep their own click/hover behavior untouched.
  useEffect(() => {
    if (!interactive) return;
    const handlePointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mouse.current.x = MathUtils.clamp(nx, -1, 1);
      mouse.current.y = MathUtils.clamp(ny, -1, 1);
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [interactive]);

  return (
    <Canvas
      dpr={dpr}
      frameloop={reducedMotion ? "demand" : "always"}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{ position: [0, 0.4, 6.2], fov: 32 }}
      style={{ pointerEvents: "none" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
    >
      <Rig mouse={mouse} />
      <BookStack autoRotate={!reducedMotion} mouse={mouse} />
    </Canvas>
  );
}
