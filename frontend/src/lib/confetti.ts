/**
 * Zero-dependency, high-performance Canvas Confetti engine.
 * Renders vibrant celebratory particles with physics, air resistance, and gravity.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: "rect" | "circle";
}

const LUXURY_PALETTE = [
  "#10B981", // Emerald
  "#059669", // Forest dark
  "#34D399", // Light emerald
  "#F59E0B", // Gold / Amber
  "#FBBF24", // Bright gold
  "#6366F1", // Indigo
  "#EC4899", // Vibrant pink
  "#3B82F6", // Royal blue
];

export function fireConfetti(durationMs = 3000) {
  if (typeof window === "undefined") return;

  const canvas = document.createElement("canvas");
  canvas.id = "confetti-canvas";
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "999999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const resize = () => {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  };
  resize();

  const particles: Particle[] = [];
  const particleCount = 120;
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Create dual burst from bottom left and bottom right
  for (let i = 0; i < particleCount; i++) {
    const isLeft = i % 2 === 0;
    const originX = isLeft ? width * 0.2 : width * 0.8;
    const originY = height * 0.7;

    const angle = isLeft
      ? -Math.PI / 4 + (Math.random() * 0.5 - 0.25)
      : -3 * Math.PI / 4 + (Math.random() * 0.5 - 0.25);

    const speed = 12 + Math.random() * 18;

    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 6 + Math.random() * 6,
      color: LUXURY_PALETTE[Math.floor(Math.random() * LUXURY_PALETTE.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      opacity: 1,
      shape: Math.random() > 0.4 ? "rect" : "circle",
    });
  }

  const startTime = Date.now();

  function render() {
    const elapsed = Date.now() - startTime;
    const progress = elapsed / durationMs;

    if (progress >= 1) {
      canvas.remove();
      return;
    }

    ctx!.clearRect(0, 0, width, height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.rotation += p.rotationSpeed;
      p.opacity = Math.max(0, 1 - progress * 1.1);

      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rotation);
      ctx!.globalAlpha = p.opacity;
      ctx!.fillStyle = p.color;

      if (p.shape === "circle") {
        ctx!.beginPath();
        ctx!.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx!.fill();
      } else {
        ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }

      ctx!.restore();
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}
