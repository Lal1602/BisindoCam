"use client";

import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import * as THREE from "three";
import { HAND_BONES, LANDMARK_COUNT, type HandFrame, type Handedness } from "@/lib/vision/hand";
import type { Theme } from "@/lib/use-theme";

type FrameSource = RefObject<(() => HandFrame | null) | null>;

// Each hand gets its own glaze (right, left): clay and moss on paper, ivory and sage at night.
const GLAZES: Record<Theme, [string, string]> = {
  light: ["#a65a3a", "#4f6146"],
  dark: ["#e8dfce", "#9fb391"],
};

/** Radius per landmark: broad at the wrist, finer towards the fingertips. */
const JOINT_RADIUS = Array.from({ length: LANDMARK_COUNT }, (_, i) => {
  if (i === 0) return 0.066;
  const segment = (i - 1) % 4; // 0 = base knuckle ... 3 = tip
  return [0.05, 0.044, 0.038, 0.033][segment];
});

/** Palm outline (wrist, thumb base, four knuckles) filled as a fan around its centre. */
const PALM = [0, 1, 5, 9, 13, 17];

const up = new THREE.Vector3(0, 1, 0);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpMatrix = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();

function Hand({
  side,
  source,
  aspect,
  mirrored,
  color,
}: {
  side: Handedness;
  source: FrameSource;
  aspect?: RefObject<number>;
  mirrored: boolean;
  color: string;
}) {
  const joints = useRef<THREE.InstancedMesh>(null);
  const bones = useRef<THREE.InstancedMesh>(null);
  const palm = useRef<THREE.Mesh>(null);
  const viewport = useThree((s) => s.viewport);

  // Smoothed world positions and a 0..1 presence used to fade the hand in and out.
  const stateRef = useRef<{ points: THREE.Vector3[]; presence: number; seeded: boolean } | null>(null);

  useFrame((_, delta) => {
    stateRef.current ??= {
      points: Array.from({ length: LANDMARK_COUNT }, () => new THREE.Vector3()),
      presence: 0,
      seeded: false,
    };
    const state = stateRef.current;
    const frame = source.current?.() ?? null;
    const hand = frame?.hands.find((h) => h.side === side);
    const follow = 1 - Math.exp(-delta * 18);
    state.presence += ((hand ? 1 : 0) - state.presence) * (1 - Math.exp(-delta * 6));

    if (hand) {
      // Cover the viewport exactly like the <video> behind it (object-fit: cover),
      // so the sculpture sits on top of the signer's real hand.
      const ratio = aspect?.current ?? 4 / 3;
      const frameW = Math.max(viewport.width, viewport.height * ratio);
      const frameH = frameW / ratio;
      hand.landmarks.forEach((p, i) => {
        tmpA.set((mirrored ? 0.5 - p.x : p.x - 0.5) * frameW, (0.5 - p.y) * frameH, -p.z * frameW * 1.4);
        if (state.seeded) state.points[i].lerp(tmpA, follow);
        else state.points[i].copy(tmpA);
      });
      state.seeded = true;
    }

    const s = THREE.MathUtils.smoothstep(state.presence, 0, 1);
    // Thickness follows the hand's own size (wrist → middle knuckle), so the
    // sculpture keeps its proportions near or far from the camera.
    const thickness = state.points[0].distanceTo(state.points[9]) * 2.1;

    const jm = joints.current;
    const bm = bones.current;
    const pm = palm.current;
    if (!jm || !bm || !pm) return;

    state.points.forEach((p, i) => {
      const r = JOINT_RADIUS[i] * thickness * s;
      tmpMatrix.compose(p, tmpQuat.identity(), tmpScale.setScalar(r));
      jm.setMatrixAt(i, tmpMatrix);
    });
    jm.instanceMatrix.needsUpdate = true;

    HAND_BONES.forEach(([a, b], i) => {
      tmpA.copy(state.points[a]);
      tmpB.copy(state.points[b]);
      const length = tmpA.distanceTo(tmpB);
      const radius = Math.min(JOINT_RADIUS[a], JOINT_RADIUS[b]) * thickness * 0.84 * s;
      tmpQuat.setFromUnitVectors(up, tmpB.sub(tmpA).normalize());
      tmpMatrix.compose(tmpA.add(state.points[b]).multiplyScalar(0.5), tmpQuat, tmpScale.set(radius, length, radius));
      bm.setMatrixAt(i, tmpMatrix);
    });
    bm.instanceMatrix.needsUpdate = true;

    const geometry = pm.geometry;
    if (!geometry.index) {
      geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array((PALM.length + 1) * 3), 3));
      geometry.setIndex(PALM.flatMap((_, i) => [0, i + 1, ((i + 1) % PALM.length) + 1]));
    }
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    tmpB.set(0, 0, 0);
    PALM.forEach((index, i) => {
      const p = state.points[index];
      position.setXYZ(i + 1, p.x, p.y, p.z);
      tmpB.add(p);
    });
    tmpB.divideScalar(PALM.length);
    position.setXYZ(0, tmpB.x, tmpB.y, tmpB.z);
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    pm.scale.setScalar(s > 0.01 ? 1 : 0);
  });

  return (
    <group>
      <instancedMesh ref={joints} args={[undefined, undefined, LANDMARK_COUNT]} castShadow frustumCulled={false}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshPhysicalMaterial color={color} roughness={0.62} clearcoat={0.35} clearcoatRoughness={0.5} sheen={0.4} />
      </instancedMesh>
      <mesh ref={palm} castShadow frustumCulled={false}>
        <bufferGeometry />
        <meshPhysicalMaterial color={color} roughness={0.62} clearcoat={0.35} clearcoatRoughness={0.5} sheen={0.4} side={THREE.DoubleSide} transparent opacity={0.92} />
      </mesh>
      <instancedMesh ref={bones} args={[undefined, undefined, HAND_BONES.length]} castShadow frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 24, 1, true]} />
        <meshPhysicalMaterial color={color} roughness={0.62} clearcoat={0.35} clearcoatRoughness={0.5} sheen={0.4} />
      </instancedMesh>
    </group>
  );
}

function Studio({ theme }: { theme: Theme }) {
  const height = useThree((s) => s.viewport.height);
  return (
    <>
      <ambientLight intensity={theme === "dark" ? 0.35 : 0.5} />
      <directionalLight position={[-2, 4, 5]} intensity={theme === "dark" ? 1.6 : 1.9} color="#fff4e2" />
      <directionalLight position={[3, -1, 2]} intensity={0.45} color="#d9c7ad" />
      {/* Local light rig — no HDR download, so it works offline too. */}
      <Environment resolution={64}>
        <Lightformer form="rect" intensity={2.2} position={[0, 4, 3]} scale={[8, 3, 1]} color="#fff3df" />
        <Lightformer form="rect" intensity={0.8} position={[-5, 0, 1]} scale={[3, 8, 1]} color="#e9d8bf" />
        <Lightformer form="ring" intensity={0.6} position={[4, 1, -2]} scale={2} color="#ffffff" />
      </Environment>
      <ContactShadows
        position={[0, -height * 0.44, 0]}
        scale={height * 1.6}
        blur={2.6}
        far={height}
        opacity={theme === "dark" ? 0.55 : 0.32}
        color={theme === "dark" ? "#000000" : "#4a3a2a"}
      />
    </>
  );
}

export default function HandSculpture({
  source,
  theme,
  aspect,
  mirrored = true,
  orbit = false,
}: {
  source: FrameSource;
  /** Camera frame width / height; defaults to 4:3. */
  aspect?: RefObject<number>;
  theme: Theme;
  mirrored?: boolean;
  /** Let the viewer turn the sculpture (dictionary); it also drifts slowly on its own. */
  orbit?: boolean;
}) {
  const [first, second] = GLAZES[theme];
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 6], fov: 32 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0, touchAction: orbit ? "pan-y" : undefined }}
      aria-hidden
    >
      <Studio theme={theme} />
      <Hand side="Right" source={source} aspect={aspect} mirrored={mirrored} color={first} />
      <Hand side="Left" source={source} aspect={aspect} mirrored={mirrored} color={second} />
      {orbit && (
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={0.6}
          minPolarAngle={Math.PI * 0.3}
          maxPolarAngle={Math.PI * 0.7}
        />
      )}
    </Canvas>
  );
}
