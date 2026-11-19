import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Line } from "@react-three/drei";
import * as THREE from "three";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import landTopo from "world-atlas/land-110m.json";
import { boxBounds } from "./grid.js";

// Texture size (equirectangular: width = 2 x height)
const W = 2048;
const H = 1024;

export const LIMIT = 6; // colour scale saturates at +/- 6 C
// RdBu goes red -> blue, so reverse the domain: red = warm
export const color = d3
  .scaleDiverging(d3.interpolateRdBu)
  .domain([LIMIT, 0, -LIMIT])
  .clamp(true);

// Coastlines are built once as a Path2D and restroked on every repaint
const land = topojson.feature(landTopo, landTopo.objects.land);
const projection = d3
  .geoEquirectangular()
  .scale(W / (2 * Math.PI))
  .translate([W / 2, H / 2]);
const coastPath = new Path2D(d3.geoPath(projection)(land));

// Specular map: white ocean (shiny), black land (matte). Drawn from the same
// land polygons as the coastlines so the shine stops exactly at the shore.
function makeOceanMask() {
  const w = 1024;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  const proj = d3
    .geoEquirectangular()
    .scale(w / (2 * Math.PI))
    .translate([w / 2, h / 2]);
  ctx.beginPath();
  d3.geoPath(proj, ctx)(land);
  ctx.fillStyle = "#000";
  ctx.fill();
  return new THREE.CanvasTexture(c);
}

// Direction from the globe's centre to a lat/lon, matching three's SphereGeometry UVs
export function latLonToVec(lat, lon) {
  const phi = ((lon + 180) / 360) * 2 * Math.PI;
  const theta = ((90 - lat) * Math.PI) / 180;
  return new THREE.Vector3(
    -Math.cos(phi) * Math.sin(theta),
    Math.cos(theta),
    Math.sin(phi) * Math.sin(theta)
  );
}

// Outline of one box, drawn as a 3D line hugging the sphere.
// Keeping outlines out of the texture means hovering doesn't repaint/re-upload the whole map.
const noRaycast = () => null; // so the outline never steals hover events from the globe

function BoxOutline({ cell, rows, cols, color }) {
  const points = useMemo(() => {
    const { latN, latS, lonW, lonE } = boxBounds(cell.row, cell.col, rows, cols);
    const N = 12; // points per edge, so the edges curve with the sphere
    const pts = [];
    for (let i = 0; i <= N; i++) pts.push([latN, lonW + ((lonE - lonW) * i) / N]);
    for (let i = 1; i <= N; i++) pts.push([latN + ((latS - latN) * i) / N, lonE]);
    for (let i = 1; i <= N; i++) pts.push([latS, lonE + ((lonW - lonE) * i) / N]);
    for (let i = 1; i <= N; i++) pts.push([latS + ((latN - latS) * i) / N, lonW]);
    return pts.map(([lat, lon]) => latLonToVec(lat, lon).multiplyScalar(1.004));
  }, [cell.row, cell.col, rows, cols]);

  return (
    <>
      <Line points={points} color="#000" lineWidth={5} raycast={noRaycast} />
      <Line points={points} color={color} lineWidth={2.5} raycast={noRaycast} />
    </>
  );
}

// Light that rides along with the camera, offset up and to the left,
// so the side you're looking at is always lit and terrain casts shading toward you.
function CameraLight() {
  const light = useRef();
  const offset = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    if (!light.current) return;
    // more from the side = lower sun angle = longer shading on slopes
    offset.set(-2.5, 1.8, 0);
    light.current.position.copy(camera.localToWorld(offset));
  });
  return <directionalLight ref={light} intensity={1.8} />;
}

function GlobeMesh({ boxes, hover, selected, onHover, relief, shine }) {
  // grayscale elevation map (black = sea level), same equirectangular layout as our texture
  const bump = useLoader(THREE.TextureLoader, `${import.meta.env.BASE_URL}textures/earth-topology.png`);
  const oceanMask = useMemo(makeOceanMask, []);
  // specular strength as a grey level: 0 = no shine, 1 = full white highlight
  const specular = useMemo(() => new THREE.Color(shine, shine, shine), [shine]);

  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    return c;
  }, []);

  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [canvas]);

  // Repaint the texture only when the values or box size change
  useEffect(() => {
    const { values, rows, cols } = boxes;
    const ctx = canvas.getContext("2d");
    const bw = W / cols;
    const bh = H / rows;

    // 1. one solid rectangle per box (+1 px overlap hides hairline seams)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = color(values[r * cols + c]);
        ctx.fillRect(Math.floor(c * bw), Math.floor(r * bh), Math.ceil(bw) + 1, Math.ceil(bh) + 1);
      }
    }

    // 2. faint grid lines so the boxes read as boxes (fainter when they're tiny)
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      ctx.moveTo(c * bw, 0);
      ctx.lineTo(c * bw, H);
    }
    for (let r = 0; r <= rows; r++) {
      ctx.moveTo(0, r * bh);
      ctx.lineTo(W, r * bh);
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 3. coastlines
    ctx.strokeStyle = "rgba(30, 30, 30, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.stroke(coastPath);

    texture.needsUpdate = true; // tell three.js to re-upload the canvas
  }, [boxes, canvas, texture]);

  // uv.x runs 0 -> 1 from -180 to 180 longitude; uv.y runs 0 (south) -> 1 (north)
  const handleMove = (e) => {
    e.stopPropagation();
    if (!e.uv) return;
    const { rows, cols } = boxes;
    const col = Math.min(cols - 1, Math.floor(e.uv.x * cols));
    const row = Math.min(rows - 1, Math.floor((1 - e.uv.y) * rows));
    onHover({ row, col, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY });
  };

  const { rows, cols } = boxes;
  return (
    <>
      <mesh onPointerMove={handleMove} onPointerOut={() => onHover(null)}>
        <sphereGeometry args={[1, 128, 64]} />
        {/* Phong is lit, so the bump map can shade mountains.
            specularMap limits the glossy highlight to the ocean; land stays matte. */}
        <meshPhongMaterial
          map={texture}
          bumpMap={bump}
          bumpScale={relief}
          specularMap={oceanMask}
          specular={specular}
          shininess={80}
        />
      </mesh>
      {selected && <BoxOutline cell={selected} rows={rows} cols={cols} color="#ffd23f" />}
      {hover && <BoxOutline cell={hover} rows={rows} cols={cols} color="#ffffff" />}
    </>
  );
}

// Smoothly swings the camera to face a lat/lon. Grabbing the globe cancels the flight.
function CameraFlyer({ target }) {
  const { camera, controls } = useThree();
  const flying = useRef(false);
  const goal = useRef(new THREE.Vector3());

  useEffect(() => {
    if (!target) return;
    goal.current.copy(latLonToVec(target.lat, target.lon));
    flying.current = true;
  }, [target]);

  useEffect(() => {
    if (!controls) return;
    const stop = () => (flying.current = false);
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [controls]);

  useFrame(() => {
    if (!flying.current) return;
    const dir = camera.position.clone().normalize();
    const dist = THREE.MathUtils.lerp(camera.position.length(), 2.4, 0.08);
    dir.lerp(goal.current, 0.08).normalize();
    camera.position.copy(dir.multiplyScalar(dist));
    camera.lookAt(0, 0, 0);
    controls?.update();
    if (camera.position.clone().normalize().angleTo(goal.current) < 0.002) flying.current = false;
  });
  return null;
}

export default function Globe({ flyTo, ...props }) {
  return (
    // flat = no tone mapping, so the colours on the globe match the legend
    <Canvas flat camera={{ position: [0, 0.6, 2.8], fov: 45 }}>
      <color attach="background" args={["#03040a"]} />
      {/* Stars sit on a big sphere around the scene. They are fixed in the world,
          so when OrbitControls swings the camera around the globe, they sweep past. */}
      <Stars radius={60} depth={40} count={6000} factor={4} saturation={0} fade speed={0.5} />
      {/* Mostly even ambient light keeps the data colours readable;
          the camera light adds just enough shading for the relief to show. */}
      <ambientLight intensity={1.9} />
      <CameraLight />
      <Suspense fallback={null}>
        <GlobeMesh {...props} />
      </Suspense>
      <OrbitControls makeDefault enablePan={false} minDistance={1.4} maxDistance={6} rotateSpeed={0.6} />
      <CameraFlyer target={flyTo} />
    </Canvas>
  );
}
