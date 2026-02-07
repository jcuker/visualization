import { Trail } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";

// 1. CONSTANTS & UTILS
const NEON_GREEN = new THREE.Color("#39ff14").multiplyScalar(2); // Boost intensity for Bloom
const ORBIT_SPEED = 2;
const WAVE_LIFETIME = 6; // seconds
const FADE_DURATION = 1.5; // seconds

function randomVector(scale = 10) {
  return new THREE.Vector3(
    (Math.random() - 0.5) * scale,
    (Math.random() - 0.5) * scale,
    (Math.random() - 0.5) * scale,
  );
}

export function WaveAgent() {
  const ref = useRef<THREE.Mesh>(null!);

  // --- FIX START ---
  // We use useState instead of useMemo.
  // useState's initializer runs only once, safely handling the "impure" randomness.

  // 1. Random Axis
  const [orbitAxis] = useState(() =>
    new THREE.Vector3(0, 1, 0).applyEuler(
      new THREE.Euler(Math.random(), Math.random(), 0),
    ),
  );

  // 2. Random Radius
  const [orbitRadius] = useState(() => 1 + Math.random() * 2);
  // --- FIX END ---

  const [target] = useState(() => randomVector(5));
  const [startPos] = useState(() => randomVector(15));
  const [phase, setPhase] = useState<"seeking" | "orbiting" | "fading">(
    "seeking",
  );
  const [startTime] = useState(() => Date.now());

  useFrame((state) => {
    // ... rest of your logic remains exactly the same ...
    if (!ref.current) return;

    const time = state.clock.getElapsedTime();
    const age = (Date.now() - startTime) / 1000;

    if (age > WAVE_LIFETIME && phase !== "fading") {
      setPhase("fading");
    }

    if (phase === "seeking") {
      const alpha = Math.min(age / 2, 1);
      const approachPos = new THREE.Vector3()
        .copy(startPos)
        .lerp(target, alpha);
      approachPos.y += Math.sin(time * 5) * 0.2;
      ref.current.position.copy(approachPos);
      if (alpha >= 1) setPhase("orbiting");
    } else if (phase === "orbiting" || phase === "fading") {
      const angle = time * ORBIT_SPEED;
      const offset = new THREE.Vector3(
        Math.cos(angle) * orbitRadius,
        0,
        Math.sin(angle) * orbitRadius,
      );
      offset.applyAxisAngle(new THREE.Vector3(1, 0, 0), orbitAxis.x);
      ref.current.position.copy(target.clone().add(offset));
    }

    if (phase === "fading") {
      const fadeProgress = (age - WAVE_LIFETIME) / FADE_DURATION;
      const scale = Math.max(1 - fadeProgress, 0);
      ref.current.scale.setScalar(scale);
      if (scale <= 0) {
        window.location.reload();
      }
    }
  });

  return (
    <>
      <mesh ref={ref}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color={NEON_GREEN} />
      </mesh>
      <Trail
        width={3}
        length={12}
        color={NEON_GREEN}
        attenuation={(t) => t * t}
        target={ref}
      />
    </>
  );
}
