import * as THREE from 'three';
import { buildFigure, disposeFigure } from './figures';

// Ảnh đại diện nhân vật cho giao diện (bảng chọn, dải người chơi, bảng xếp hạng), chụp từ chính mô
// hình 3D trong figures.ts bằng một renderer ẩn dùng chung: mỗi nhân vật chụp một lần, giữ lại dạng
// data URL. Chỉ chạy trên trình duyệt.

const SIZE = 256;
const cache = new Map<string, string>();
let stage: null | {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
} = null;

function setup() {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(SIZE, SIZE, false);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fff4e0', '#3a2418', 1.6));
  const key = new THREE.DirectionalLight('#ffffff', 2.4);
  key.position.set(1.5, 3, 3);
  scene.add(key);
  // Khung chân dung: đầu và nửa thân, nhìn hơi chếch từ trên xuống bên phải.
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
  camera.position.set(0.55, 1.05, 2.1);
  camera.lookAt(0, 0.58, 0);
  return { renderer, scene, camera };
}

/** Ảnh đại diện của một nhân vật (data URL PNG nền trong suốt). */
export function portraitOf(id: string): string | null {
  if (typeof window === 'undefined') return null;
  const hit = cache.get(id);
  if (hit) return hit;
  try {
    stage ??= setup();
  } catch {
    // Máy không có WebGL: giao diện hiện vòng màu thay cho ảnh.
    return null;
  }
  const fig = buildFigure(id);
  stage.scene.add(fig);
  stage.renderer.render(stage.scene, stage.camera);
  const url = stage.renderer.domElement.toDataURL('image/png');
  stage.scene.remove(fig);
  disposeFigure(fig);
  cache.set(id, url);
  return url;
}
