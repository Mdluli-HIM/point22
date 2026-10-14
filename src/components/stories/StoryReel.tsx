"use client";

import Image from "next/image";
import * as THREE from "three";
import gsap from "gsap";
import { useEffect, useRef } from "react";
import type { StoryAsset } from "@/data/story-media.generated";

type Props = {
  media: StoryAsset[];
  storyTitle: string;
  onOpen: (index: number) => void;
};

type ReelMesh = THREE.Mesh<
  THREE.BufferGeometry,
  THREE.ShaderMaterial
>;

const CARD_WIDTH = 3.05;
const CARD_HEIGHT = 3.95;

const AUTO_SPEED = 0.075;
const WHEEL_SPEED = 0.0045;
const DRAG_SPEED = 0.0055;

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;

    gl_Position =
      projectionMatrix *
      modelViewMatrix *
      vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uTexture;
  uniform vec2 uCrop;
  uniform float uOpacity;
  uniform float uBrightness;
  uniform float uReveal;

  varying vec2 vUv;

  void main() {
    vec2 uv = (vUv - 0.5) * uCrop + 0.5;

    vec4 tex = texture2D(uTexture, uv);

    float luminance = dot(
      tex.rgb,
      vec3(0.299, 0.587, 0.114)
    );

    vec3 monochrome = vec3(luminance);

    // Normal colour returns smoothly on hover.
    vec3 result = mix(
      monochrome,
      tex.rgb,
      uReveal
    );

    // Distant photos get darker as they turn away.
    result *= uBrightness;

    gl_FragColor = vec4(
      result,
      tex.a * uOpacity
    );

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// A real curved photographic surface.
// The edges bend away from the camera instead
// of remaining a completely flat CSS rectangle.
function createCurvedGeometry() {
  const geometry = new THREE.PlaneGeometry(
    CARD_WIDTH,
    CARD_HEIGHT,
    20,
    24
  );

  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;

  const halfWidth = CARD_WIDTH / 2;
  const bend = 0.27;

  for (let i = 0; i < positions.count; i++) {
    const originalX = positions.getX(i);
    const normalisedX = originalX / halfWidth;
    const angle = normalisedX * bend;

    const x =
      (Math.sin(angle) / Math.sin(bend)) *
      halfWidth;

    const z =
      -0.4 *
      ((1 - Math.cos(angle)) /
        (1 - Math.cos(bend)));

    positions.setX(i, x);
    positions.setZ(i, z);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();

  return geometry;
}

export default function StoryReel({
  media,
  storyTitle,
  onOpen,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onOpenRef = useRef(onOpen);

  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || !media.length) return;

    const root: HTMLDivElement = node;

    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch (error) {
      console.warn(
        "Point22 WebGL Reel unavailable:",
        error
      );
      return;
    }

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 1.7)
    );

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const canvas = renderer.domElement;
    canvas.className = "p22-reel-webgl-canvas";
    canvas.setAttribute(
      "aria-hidden",
      "true"
    );

    root.appendChild(canvas);
    root.dataset.webgl = "ready";

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      42,
      1,
      0.1,
      100
    );

    camera.position.set(0, 0, 16);
    camera.lookAt(0, 0, 0);

    const geometry = createCurvedGeometry();

    const placeholder = new THREE.DataTexture(
      new Uint8Array([35, 35, 35, 255]),
      1,
      1
    );

    placeholder.needsUpdate = true;

    const cardCount = Math.max(27, media.length);
    const meshes: ReelMesh[] = [];

    const materialsBySource = new Map<
      string,
      THREE.ShaderMaterial[]
    >();

    const textures: THREE.Texture[] = [];
    const videos: HTMLVideoElement[] = [];

    let alive = true;

    for (let index = 0; index < cardCount; index++) {
      const asset = media[index % media.length];

      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTexture: { value: placeholder },
          uCrop: {
            value: new THREE.Vector2(1, 1),
          },
          uOpacity: { value: 1 },
          uBrightness: { value: 1 },
          uReveal: { value: 0 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const mesh: ReelMesh = new THREE.Mesh(
        geometry,
        material
      );

      mesh.userData.index = index % media.length;
      mesh.userData.distance = 0;
      mesh.frustumCulled = false;

      scene.add(mesh);
      meshes.push(mesh);

      const registered =
        materialsBySource.get(asset.src) ?? [];

      registered.push(material);
      materialsBySource.set(asset.src, registered);
    }

    function assignTexture(
      src: string,
      texture: THREE.Texture,
      imageWidth: number,
      imageHeight: number
    ) {
      if (!alive) {
        texture.dispose();
        return;
      }

      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(
        4,
        renderer.capabilities.getMaxAnisotropy()
      );

      textures.push(texture);

      const photoAspect =
        imageWidth / Math.max(1, imageHeight);

      const cardAspect = CARD_WIDTH / CARD_HEIGHT;

      const cropX =
        photoAspect > cardAspect
          ? cardAspect / photoAspect
          : 1;

      const cropY =
        photoAspect < cardAspect
          ? photoAspect / cardAspect
          : 1;

      for (
        const material of
        materialsBySource.get(src) ?? []
      ) {
        material.uniforms.uTexture.value = texture;
        material.uniforms.uCrop.value.set(
          cropX,
          cropY
        );
      }
    }

    const loader = new THREE.TextureLoader();
    const uniqueAssets = new Map(
      media.map((asset) => [asset.src, asset])
    );

    uniqueAssets.forEach((asset) => {
      if (asset.type === "image") {
        loader.load(
          asset.src,
          (texture) => {
            const image = texture.image as
              HTMLImageElement;

            assignTexture(
              asset.src,
              texture,
              image.naturalWidth || image.width,
              image.naturalHeight || image.height
            );
          },
          undefined,
          (error) => {
            console.warn(
              "Could not load Reel image:",
              asset.src,
              error
            );
          }
        );

        return;
      }

      const video = document.createElement("video");

      video.src = asset.src;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "metadata";

      videos.push(video);

      const texture = new THREE.VideoTexture(video);

      assignTexture(
        asset.src,
        texture,
        CARD_WIDTH,
        CARD_HEIGHT
      );

      const updateVideoCrop = () => {
        if (!alive) return;

        const aspect =
          video.videoWidth /
          Math.max(1, video.videoHeight);

        const cardAspect = CARD_WIDTH / CARD_HEIGHT;

        for (
          const material of
          materialsBySource.get(asset.src) ?? []
        ) {
          material.uniforms.uCrop.value.set(
            aspect > cardAspect
              ? cardAspect / aspect
              : 1,
            aspect < cardAspect
              ? aspect / cardAspect
              : 1
          );
        }
      };

      video.addEventListener(
        "loadedmetadata",
        updateVideoCrop
      );

      video.play().catch(() => {
        // Muted autoplay may be restricted.
      });
    });

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const state = {
      current: 0,
      target: 0,
      velocity: 0,
      dragging: false,
      transitioning: false,
      pointerId: -1,
      startX: 0,
      startY: 0,
      lastY: 0,
      lastTime: 0,
      moved: false,
      cursorX: 0,
      targetCursorX: 0,
      hovered: null as ReelMesh | null,
      lastInteraction: performance.now(),
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function wrappedDistance(
      index: number,
      position: number
    ) {
      return (
        ((((index - position + cardCount / 2) %
          cardCount) + cardCount) % cardCount) -
        cardCount / 2
      );
    }

    function resize() {
      const width = Math.max(1, root.clientWidth);
      const height = Math.max(1, root.clientHeight);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height, false);
    }

    function pick(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect();

      pointer.x =
        ((event.clientX - rect.left) /
          Math.max(1, rect.width)) * 2 - 1;

      pointer.y =
        -((event.clientY - rect.top) /
          Math.max(1, rect.height)) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      const candidates = meshes.filter(
        (mesh) =>
          mesh.visible &&
          Math.abs(mesh.userData.distance) < 3.2
      );

      const hits = raycaster.intersectObjects(
        candidates,
        false
      );

      return (hits[0]?.object ?? null) as
        ReelMesh | null;
    }


    // ==========================================
    // POINT22 — CINEMATIC REEL TO VIEWER
    // ==========================================

    type SavedMaterial = {
      material: THREE.ShaderMaterial;
      opacity: number;
      brightness: number;
      reveal: number;
    };

    type ReelSnapshot = {
      mesh: ReelMesh;
      position: THREE.Vector3;
      rotation: THREE.Euler;
      scale: THREE.Vector3;
      renderOrder: number;
      materials: SavedMaterial[];
    };

    let snapshot: ReelSnapshot | null = null;
    let transitionTimeline: gsap.core.Timeline | null = null;
    let viewerWasOpen = false;

    function openWithReelTransition(hit: ReelMesh) {
      if (state.transitioning || !alive) return;

      // Respect accessibility preferences.
      if (reducedMotion) {
        onOpenRef.current(Number(hit.userData.index));
        return;
      }

      state.transitioning = true;
      state.dragging = false;
      state.velocity = 0;
      state.target = state.current;
      state.hovered = hit;

      viewerWasOpen = false;

      const materials = meshes.map((mesh) => ({
        material: mesh.material,
        opacity: mesh.material.uniforms.uOpacity.value,
        brightness:
          mesh.material.uniforms.uBrightness.value,
        reveal: mesh.material.uniforms.uReveal.value,
      }));

      snapshot = {
        mesh: hit,
        position: hit.position.clone(),
        rotation: hit.rotation.clone(),
        scale: hit.scale.clone(),
        renderOrder: hit.renderOrder,
        materials,
      };

      // Calculate a camera-safe viewing distance
      // based on the actual viewport aspect ratio.
      const tangent = Math.tan(
        THREE.MathUtils.degToRad(camera.fov / 2)
      );

      const aspect =
        root.clientWidth / Math.max(1, root.clientHeight);

      const heightDistance =
        CARD_HEIGHT / (2 * tangent * 0.76);

      const widthDistance =
        CARD_WIDTH / (2 * tangent * aspect * 0.8);

      const targetZ =
        camera.position.z -
        Math.max(heightDistance, widthDistance);

      // The selected photo renders above the others.
      hit.renderOrder = 1000;

      root.dataset.reelTransition = "entering";
      root.style.cursor = "default";

      transitionTimeline = gsap.timeline({
        defaults: {
          ease: "power3.inOut",
        },
        onComplete: () => {
          if (!alive) return;

          // Open the existing Point22 viewer only
          // once the photo has unfolded into place.
          onOpenRef.current(
            Number(hit.userData.index)
          );
        },
      });

      // Move the selected photo forward.
      transitionTimeline.to(
        hit.position,
        {
          x: 0,
          y: 0,
          z: targetZ,
          duration: 1.05,
        },
        0
      );

      // Straighten the curved reel orientation.
      // The underlying card mesh retains its
      // gentle physical curvature.
      transitionTimeline.to(
        hit.rotation,
        {
          x: 0,
          y: 0,
          z: 0,
          duration: 0.98,
        },
        0
      );

      transitionTimeline.to(
        hit.scale,
        {
          x: 1,
          y: 1,
          z: 1,
          duration: 1.05,
        },
        0
      );

      // Restore the image's real colours.
      transitionTimeline.to(
        hit.material.uniforms.uReveal,
        {
          value: 1,
          duration: 0.65,
          ease: "power2.out",
        },
        0.12
      );

      transitionTimeline.to(
        hit.material.uniforms.uBrightness,
        {
          value: 1,
          duration: 0.5,
        },
        0
      );

      transitionTimeline.to(
        hit.material.uniforms.uOpacity,
        {
          value: 1,
          duration: 0.4,
        },
        0
      );

      // Fade away every unselected photograph.
      for (const mesh of meshes) {
        if (mesh === hit) continue;

        transitionTimeline.to(
          mesh.material.uniforms.uOpacity,
          {
            value: 0,
            duration: 0.48,
            ease: "power2.inOut",
          },
          0.08
        );
      }
    }

    function returnFromViewer() {
      const saved = snapshot;

      if (!saved || !alive) return;

      transitionTimeline?.kill();

      root.dataset.reelTransition = "returning";

      const mesh = saved.mesh;

      transitionTimeline = gsap.timeline({
        defaults: {
          ease: "power3.inOut",
        },
        onComplete: () => {
          if (!alive) return;

          mesh.renderOrder = saved.renderOrder;
          state.transitioning = false;
          state.hovered = null;
          state.lastInteraction = performance.now();

          snapshot = null;
          viewerWasOpen = false;

          root.style.cursor = "grab";
          delete root.dataset.reelTransition;
        },
      });

      transitionTimeline.to(
        mesh.position,
        {
          x: saved.position.x,
          y: saved.position.y,
          z: saved.position.z,
          duration: 0.85,
        },
        0
      );

      transitionTimeline.to(
        mesh.rotation,
        {
          x: saved.rotation.x,
          y: saved.rotation.y,
          z: saved.rotation.z,
          duration: 0.85,
        },
        0
      );

      transitionTimeline.to(
        mesh.scale,
        {
          x: saved.scale.x,
          y: saved.scale.y,
          z: saved.scale.z,
          duration: 0.85,
        },
        0
      );

      // Restore the other photographs along
      // the same timeline as the returning card.
      for (const entry of saved.materials) {
        transitionTimeline.to(
          entry.material.uniforms.uOpacity,
          {
            value: entry.opacity,
            duration: 0.7,
          },
          0.1
        );

        transitionTimeline.to(
          entry.material.uniforms.uBrightness,
          {
            value: entry.brightness,
            duration: 0.7,
          },
          0.1
        );

        transitionTimeline.to(
          entry.material.uniforms.uReveal,
          {
            value: entry.material === mesh.material
              ? 0
              : entry.reveal,
            duration: 0.6,
          },
          0
        );
      }
    }

    // Detect when the existing full-screen viewer
    // closes, allowing the image to return to Reel.
    const viewerObserver = new MutationObserver(() => {
      if (!root.isConnected || !state.transitioning) {
        return;
      }

      const page = root.closest(".p22-story-page");

      const viewerOpen = Boolean(
        page?.querySelector(".p22-story-lightbox")
      );

      if (viewerOpen) {
        viewerWasOpen = true;
      } else if (viewerWasOpen && snapshot) {
        viewerWasOpen = false;
        returnFromViewer();
      }
    });

    viewerObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    function onWheel(event: WheelEvent) {
      if (event.ctrlKey || state.transitioning) return;

      event.preventDefault();

      const multiplier =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? root.clientHeight
            : 1;

      const delta =
        Math.abs(event.deltaY) >=
        Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX;

      state.target +=
        delta * multiplier * WHEEL_SPEED;

      state.velocity = 0;
      state.lastInteraction = performance.now();
    }

    function onPointerDown(event: PointerEvent) {
      if (state.transitioning) return;

      if (
        event.pointerType === "mouse" &&
        event.button !== 0
      ) {
        return;
      }

      state.dragging = true;
      state.pointerId = event.pointerId;
      state.startX = event.clientX;
      state.startY = event.clientY;
      state.lastY = event.clientY;
      state.lastTime = event.timeStamp;
      state.velocity = 0;
      state.moved = false;
      state.hovered = null;
      state.lastInteraction = performance.now();

      try {
        root.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is optional.
      }
    }

    function onPointerMove(event: PointerEvent) {
      if (state.transitioning) return;

      const rect = root.getBoundingClientRect();

      if (
        event.pointerType === "mouse" ||
        event.pointerType === "pen"
      ) {
        state.targetCursorX = gsap.utils.clamp(
          -1,
          1,
          ((event.clientX - rect.left) /
            Math.max(1, rect.width) - 0.5) * 2
        );
      }

      if (
        state.dragging &&
        event.pointerId === state.pointerId
      ) {
        const deltaY =
          event.clientY - state.lastY;

        state.target -= deltaY * DRAG_SPEED;

        const dt = Math.max(
          0.016,
          (event.timeStamp - state.lastTime) / 1000
        );

        const currentVelocity =
          -deltaY * DRAG_SPEED / dt;

        state.velocity =
          state.velocity * 0.6 +
          currentVelocity * 0.4;

        state.lastY = event.clientY;
        state.lastTime = event.timeStamp;

        if (
          Math.hypot(
            event.clientX - state.startX,
            event.clientY - state.startY
          ) > 7
        ) {
          state.moved = true;
        }

        state.lastInteraction = performance.now();
        return;
      }

      state.hovered = pick(event);

      root.style.cursor = state.hovered
        ? "pointer"
        : "grab";
    }

    function onPointerUp(event: PointerEvent) {
      if (
        !state.dragging ||
        event.pointerId !== state.pointerId
      ) {
        return;
      }

      state.dragging = false;

      if (root.hasPointerCapture(event.pointerId)) {
        root.releasePointerCapture(event.pointerId);
      }

      const recentMovement =
        event.timeStamp - state.lastTime < 90;

      if (
        reducedMotion ||
        !recentMovement ||
        !state.moved
      ) {
        state.velocity = 0;
      } else {
        state.velocity = gsap.utils.clamp(
          -4.5,
          4.5,
          state.velocity
        );
      }

      state.lastInteraction = performance.now();

      if (!state.moved) {
        const hit = pick(event);

        if (hit) {
          openWithReelTransition(hit);
        }
      }
    }

    function onPointerLeave() {
      state.hovered = null;
      state.targetCursorX = 0;
      root.style.cursor = "grab";
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        state.target += 1;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        state.target -= 1;
      }

      if (
        event.key === "Enter" &&
        state.hovered
      ) {
        event.preventDefault();
        openWithReelTransition(state.hovered);
      }

      state.lastInteraction = performance.now();
    }

    function tick() {
      if (
        document.visibilityState === "hidden" ||
        document.querySelector(".p22-story-lightbox")
      ) {
        return;
      }

      const dt = Math.min(
        0.05,
        gsap.ticker.deltaRatio(60) / 60
      );

      // GSAP controls the meshes during entry/exit.
      // Keep drawing, but pause the Reel camera.
      if (state.transitioning) {
        renderer.render(scene, camera);
        return;
      }

      if (!state.dragging && !reducedMotion) {
        if (Math.abs(state.velocity) > 0.01) {
          state.target += state.velocity * dt;
          state.velocity *= Math.exp(-4.2 * dt);
        } else {
          state.velocity = 0;

          if (
            performance.now() -
              state.lastInteraction > 1100
          ) {
            state.target += AUTO_SPEED * dt;
          }
        }
      }

      const ease = reducedMotion
        ? 1
        : 1 - Math.exp(-8 * dt);

      state.current +=
        (state.target - state.current) * ease;

      state.cursorX +=
        (state.targetCursorX - state.cursorX) *
        (1 - Math.exp(-5 * dt));

      if (Math.abs(state.current) > cardCount * 100) {
        const cycles =
          Math.trunc(state.current / cardCount) *
          cardCount;

        state.current -= cycles;
        state.target -= cycles;
      }

      for (let index = 0; index < meshes.length; index++) {
        const mesh = meshes[index];
        const distance = wrappedDistance(
          index,
          state.current
        );

        const absolute = Math.abs(distance);
        const visible = absolute < 5.8;

        mesh.visible = visible;
        mesh.userData.distance = distance;

        if (!visible) continue;

        const mobile = root.clientWidth < 720;

        // The whole series follows a curved,
        // continuous spatial path.
        const x =
          Math.sin(distance * 0.46) *
            (mobile ? 3.3 : 4.75) +
          state.cursorX * (mobile ? 0 : 0.11);

        const y = -distance *
          (mobile ? 1.33 : 1.47);

        const z =
          -0.35 * absolute -
          0.18 * absolute * absolute;

        mesh.position.set(x, y, z);

        // Distant cards turn nearly edge-on.
        mesh.rotation.set(
          gsap.utils.clamp(
            -0.85,
            0.85,
            -distance * 0.15
          ),
          gsap.utils.clamp(
            -1.36,
            1.36,
            -distance * 0.29
          ),
          -Math.sin(distance * 0.4) * 0.065
        );

        const hovered = state.hovered === mesh;
        const material = mesh.material;

        const opacity = hovered
          ? 1
          : gsap.utils.clamp(
              0.055,
              1,
              1 - Math.max(0, absolute - 1.4) * 0.22
            );

        const brightness = hovered
          ? 1
          : gsap.utils.clamp(
              0.13,
              1,
              1 - Math.max(0, absolute - 0.95) * 0.20
            );

        material.uniforms.uOpacity.value = opacity;
        material.uniforms.uBrightness.value =
          brightness;

        // Smooth original-colour reveal on hover.
        const reveal = material.uniforms.uReveal;

        reveal.value +=
          ((hovered ? 1 : 0) - reveal.value) *
          (1 - Math.exp(-9 * dt));
      }

      renderer.render(scene, camera);
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    resize();

    root.addEventListener("wheel", onWheel, {
      passive: false,
    });
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener(
      "pointercancel",
      onPointerUp
    );
    root.addEventListener(
      "pointerleave",
      onPointerLeave
    );
    root.addEventListener("keydown", onKeyDown);

    renderer.render(scene, camera);
    gsap.ticker.add(tick);

    return () => {
      alive = false;

      viewerObserver.disconnect();
      transitionTimeline?.kill();

      resizeObserver.disconnect();
      gsap.ticker.remove(tick);

      root.removeEventListener("wheel", onWheel);
      root.removeEventListener(
        "pointerdown",
        onPointerDown
      );
      root.removeEventListener(
        "pointermove",
        onPointerMove
      );
      root.removeEventListener(
        "pointerup",
        onPointerUp
      );
      root.removeEventListener(
        "pointercancel",
        onPointerUp
      );
      root.removeEventListener(
        "pointerleave",
        onPointerLeave
      );
      root.removeEventListener(
        "keydown",
        onKeyDown
      );

      for (const mesh of meshes) {
        mesh.material.dispose();
      }

      geometry.dispose();
      placeholder.dispose();

      for (const texture of textures) {
        texture.dispose();
      }

      for (const video of videos) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }

      renderer.dispose();
      canvas.remove();

      delete root.dataset.webgl;
    };
  }, [media]);

  return (
    <div
      ref={rootRef}
      className="p22-reel-viewport"
      tabIndex={0}
      role="region"
      aria-label={`${storyTitle} curved photographic reel. Scroll or drag vertically to explore.`}
    >
      <div className="p22-reel-fallback">
        {media.slice(0, 3).map((asset, index) => (
          <button
            key={asset.src}
            type="button"
            onClick={() => onOpen(index)}
            aria-label={`Open photograph from ${storyTitle}`}
          >
            {asset.type === "image" ? (
              <Image
                src={asset.src}
                alt={`Photography from ${storyTitle}`}
                fill
                sizes="220px"
              />
            ) : (
              <video
                src={asset.src}
                muted
                playsInline
                preload="metadata"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
