/* eslint-disable react-hooks/purity */

import { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame, extend } from "@react-three/fiber";
import { shaderMaterial, Sparkles } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { v4 as uuidv4 } from "uuid";

const RadarTrailMaterial = shaderMaterial(
  {
    uColor: new THREE.Color("#39ff14"),
    uTime: -60.0,
    uHolePos: new THREE.Vector2(0.0, 0.0),
    uOrbitAngle: 0.0,
    uOpacity: 1.0,
    uTrapMode: 0.0,
  },
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  `
    uniform vec3 uColor;
    uniform float uTime;
    uniform vec2 uHolePos;
    uniform float uOrbitAngle;
    uniform float uOpacity;
    uniform float uTrapMode;
    
    varying vec2 vUv;

    mat2 rotate(float a) {
        float s = sin(a);
        float c = cos(a);
        return mat2(c, -s, s, c);
    }

    void main() {
      // 100x100 World Scale
      vec2 p = vUv * 100.0 - 50.0; 
      vec2 hole = uHolePos;
      
      vec2 toPixel = p - hole;
      float dist = length(toPixel);

      // Spiral
      float lag = dist * 1.5 * uTrapMode; 
      float spiralAngle = uOrbitAngle - lag;
      float currentRot = spiralAngle * uTrapMode;
      vec2 rotatedToPixel = rotate(currentRot) * toPixel;
      vec2 finalPos = hole + rotatedToPixel;

      // Trail
      float signedDist = finalPos.x - uTime;
      float beam = 0.0;

      if (signedDist > 0.0) {
          beam = smoothstep(0.1, 0.0, signedDist);
      } else {
          beam = exp(signedDist * 0.25);
      }
      
      float head = smoothstep(0.5, 0.0, abs(signedDist));
      beam = max(beam, head); 

      // Implosion
      float mask = 1.0;
      if (uTrapMode > 0.0) {
         float maxRadius = pow(uOpacity, 4.0) * 100.0; 
         float clip = smoothstep(maxRadius, maxRadius * 0.5, dist);
         mask = 1.0 - clip; 
      }
      beam *= mask;

      // Output
      vec3 finalColor = uColor * beam * 10.0; 
      
      if (uTrapMode > 0.5 && dist < 0.5) {
          finalColor += vec3(1.0) * beam * 15.0;
      }

      gl_FragColor = vec4(finalColor, beam * uOpacity);
    }
  `,
);
extend({ RadarTrailMaterial });

interface MaterialRefState {
  uTime: number;
  uHolePos: THREE.Vector2;
  uOrbitAngle: number;
  uTrapMode: number;
  uOpacity: number;
}

function SinglePulse({
  id,
  onComplete,
}: {
  id: string;
  onComplete: (id: string) => void;
}) {
  const materialRef = useRef<MaterialRefState | null>(null);

  const config = useMemo(() => {
    return {
      rotation: Math.random() * Math.PI * 2,
      holePos: new THREE.Vector2(
        (Math.random() - 0.5) * 12.0,
        (Math.random() - 0.5) * 8.0,
      ),
      speed: 75.0 + Math.random() * 10.0,
    };
  }, []);

  const state = useRef({
    x: -60.0,
    mode: 0.0,
    angle: 0.0,
    fade: 1.0,
    spinVelocity: 0.0,
  });

  useFrame((_, delta) => {
    if (!materialRef.current) return;

    if (state.current.mode < 0.9) {
      state.current.x += config.speed * delta;
      const dist = Math.abs(state.current.x - config.holePos.x);

      if (dist < 0.4) {
        state.current.x = config.holePos.x;
        state.current.mode = 1.0;
        state.current.spinVelocity = 15.0;
      }

      if (state.current.x > 60.0) onComplete(id);
    } else {
      state.current.angle += state.current.spinVelocity * delta;
      state.current.spinVelocity += 25.0 * delta;
      state.current.fade = THREE.MathUtils.lerp(
        state.current.fade,
        0,
        delta * 3.5,
      );

      if (state.current.fade <= 0.01) onComplete(id);
    }

    materialRef.current.uTime = state.current.x;
    materialRef.current.uHolePos = config.holePos;
    materialRef.current.uOrbitAngle = state.current.angle;
    materialRef.current.uTrapMode = state.current.mode;
    materialRef.current.uOpacity = state.current.fade;
  });

  return (
    <mesh rotation={[0, 0, config.rotation]}>
      <planeGeometry args={[100, 100]} />
      {/* @ts-expect-error custom material at top of file */}
      <radarTrailMaterial
        ref={materialRef}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function PulseManager() {
  const [pulses, setPulses] = useState<{ id: string }[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPulses([{ id: uuidv4() }]);

    const interval = setInterval(() => {
      setPulses((current) => {
        if (current.length > 2) return current;
        return [...current, { id: uuidv4() }];
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const removePulse = (id: string) => {
    setPulses((current) => current.filter((p) => p.id !== id));
  };

  return (
    <>
      {pulses.map((p) => (
        <SinglePulse key={p.id} id={p.id} onComplete={removePulse} />
      ))}
    </>
  );
}

export default function App() {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000" }}>
      <Canvas orthographic camera={{ zoom: 35, position: [0, 0, 10] }}>
        <Sparkles
          count={2000}
          scale={[100, 100, 1]}
          size={3}
          speed={0.4}
          opacity={0.08}
          color="#999"
          noise={1}
        />

        <PulseManager />

        <EffectComposer>
          <Bloom
            luminanceThreshold={0.0}
            intensity={2.5}
            radius={0.5}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
