/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { Bottle, GAME_COLORS, ColorDef, Particle } from "../types";
import { gameAudio } from "../utils/audio";
import { getPourAmount, checkIsSolved } from "./Solver";
import { BottleSkin } from "../data/skins";

interface GameCanvasProps {
  bottles: Bottle[];
  selectedId: number | null;
  onSelectBottle: (id: number) => void;
  onPour: (sourceId: number, targetId: number) => void;
  isCompleted: boolean;
  hintMove: { from: number; to: number } | null;
  equippedSkin?: BottleSkin;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  bottles,
  selectedId,
  onSelectBottle,
  onPour,
  isCompleted,
  hintMove,
  equippedSkin,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animation values stored in Refs to bypass React state latency in high frame rate requestAnimationFrame loop
  const bottlesRef = useRef<Bottle[]>([]);
  const selectedRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const hintRef = useRef<{ from: number; to: number } | null>(null);

  // Pour Animation Tracking Ref
  const pourAnimRef = useRef<{
    isPouring: boolean;
    sourceId: number;
    targetId: number;
    progress: number;       // 0 to 1
    colorId: number;
    amount: number;         // number of layers being poured
    sourceInitialLayers: number;
    targetInitialLayers: number;
    soundStarted: boolean;
    completeTriggered: boolean;
    startTime: number;
  } | null>(null);

  // Wobble effect for invalid pour taps
  const wobbleRef = useRef<{ id: number; magnitude: number; time: number } | null>(null);

  // Time ticker for wave animation
  const waveTimeRef = useRef<number>(0);

  // Layout calculations
  const [dimensions, setDimensions] = useState({ width: 400, height: 450 });
  const scaleRef = useRef<number>(1);

  // Sync props to refs
  useEffect(() => {
    bottlesRef.current = bottles.map((b) => [...b]);
  }, [bottles]);

  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    hintRef.current = hintMove;
  }, [hintMove]);

  // Handle ResizeObserver to keep canvas high DPI responsive
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      scaleRef.current = dpr;

      setDimensions({
        width: rect.width || 400,
        height: rect.height || 450,
      });
    };

    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // Set Canvas bounds on element
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = scaleRef.current;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
  }, [dimensions]);

  // Handle tap/click mapping
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (pourAnimRef.current?.isPouring) return; // Ignore taps during pour animations

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Determine layout mapping
    const bCount = bottles.length;
    const { bottleWidth, bottleHeight, positions } = calculateBottleLayout(
      bCount,
      dimensions.width,
      dimensions.height
    );

    // Hit test bottles
    let clickedId: number | null = null;
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      // Bottles bounds
      const left = pos.x - bottleWidth / 2 - 12;
      const right = pos.x + bottleWidth / 2 + 12;
      const top = pos.y - bottleHeight / 2 - 20;
      const bottom = pos.y + bottleHeight / 2 + 10;

      if (x >= left && x <= right && y >= top && y <= bottom) {
        clickedId = i;
        break;
      }
    }

    if (clickedId !== null) {
      if (selectedRef.current === null) {
        // Safe selection
        if (bottles[clickedId].length > 0) {
          onSelectBottle(clickedId);
        } else {
          // Can't select empty bottle
          triggerWobble(clickedId);
        }
      } else {
        const sourceId = selectedRef.current;
        const targetId = clickedId;

        if (sourceId === targetId) {
          // Deselect
          onSelectBottle(sourceId); // toggles off in parent
        } else {
          // Attempt pour
          const amt = getPourAmount(bottles[sourceId], bottles[targetId]);
          if (amt > 0) {
            // Initiate the visual pour animation, and freeze UI until completes
            startVisualPour(sourceId, targetId, amt);
          } else {
            // Invalid pour interaction
            gameAudio.playError();
            triggerWobble(sourceId);
            triggerWobble(targetId);
            onSelectBottle(sourceId); // deselect top
          }
        }
      }
    } else {
      // Tapped empty area, deselect
      if (selectedRef.current !== null) {
        onSelectBottle(selectedRef.current);
      }
    }
  };

  const triggerWobble = (id: number) => {
    wobbleRef.current = { id, magnitude: 15, time: 0 };
  };

  // Start visual transition timeline
  const startVisualPour = (sourceId: number, targetId: number, amount: number) => {
    const src = bottlesRef.current[sourceId];
    const colorId = src[src.length - 1];

    pourAnimRef.current = {
      isPouring: true,
      sourceId,
      targetId,
      progress: 0,
      colorId,
      amount,
      sourceInitialLayers: src.length,
      targetInitialLayers: bottlesRef.current[targetId].length,
      soundStarted: false,
      completeTriggered: false,
      startTime: Date.now(),
    };
  };

  /**
   * Animation Loop
   */
  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;

    const render = () => {
      if (!canvas) {
        animationId = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animationId = requestAnimationFrame(render);
        return;
      }

      ctx.save();
      ctx.scale(scaleRef.current, scaleRef.current);
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      waveTimeRef.current += 0.08;

      // Update calculations
      const bCount = bottlesRef.current.length;
      const { bottleWidth, bottleHeight, positions } = calculateBottleLayout(
        bCount,
        dimensions.width,
        dimensions.height
      );

      // Handle custom physics animations inside canvas
      updateWobble();
      updatePourProgress(positions, bottleHeight);
      updateParticles();

      // Render items
      drawConnectingStreams(ctx, positions, bottleWidth, bottleHeight);
      drawBottles(ctx, positions, bottleWidth, bottleHeight);
      drawParticles(ctx);

      ctx.restore();
      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [dimensions, bottles]);

  // Wobble physics
  const updateWobble = () => {
    const w = wobbleRef.current;
    if (w) {
      w.time += 0.15;
      w.magnitude *= 0.88; // decay
      if (w.magnitude < 0.1) {
        wobbleRef.current = null;
      }
    }
  };

  // Animate the pour progression frame-by-frame
  const updatePourProgress = (
    positions: { x: number; y: number }[],
    bottleHeight: number
  ) => {
    const p = pourAnimRef.current;
    if (!p) return;

    // Faster pouring animation: locked to exactly 0.40 seconds (400 milliseconds)
    const elapsed = Date.now() - p.startTime;
    p.progress = Math.min(1.0, elapsed / 400);

    if (p.progress >= 0.15 && !p.soundStarted) {
      p.soundStarted = true;
      // Synthesize sound based on target fullness
      gameAudio.startPouringSound(p.targetInitialLayers / 4);
    }

    // Spawn splashes in the target bottle when fluid stream reaches target level
    if (p.progress >= 0.2 && p.progress < 0.85) {
      const tgtPos = positions[p.targetId];
      const colorDef = GAME_COLORS.find((c) => c.id === p.colorId) || GAME_COLORS[0];

      // Add a couple of small splash particles
      if (Math.random() < 0.4) {
        // Calculate the liquid contact surface height in target bottle
        // Fully empty is base of bottle, full is 4 levels.
        const layerHeight = (bottleHeight - 40) / 4;
        const currentTargetLayers = p.targetInitialLayers + p.amount * ((p.progress - 0.2) / 0.65);
        const contactY = tgtPos.y + bottleHeight / 2 - 20 - (currentTargetLayers - 0.2) * layerHeight;

        spawnSplash(tgtPos.x, contactY, colorDef.primary);
      }
    }

    if (p.progress >= 0.95 && !p.completeTriggered) {
      p.completeTriggered = true;
      gameAudio.stopPouringSound();

      // Finalize exact state change in parent state engine
      onPour(p.sourceId, p.targetId);

      // Check if target completed to emit starry confetti
      const targetAfterPour = [...bottlesRef.current[p.targetId]];
      // Simulate pour locally to preview confetti triggering instantly
      const colorId = p.colorId;
      for (let i = 0; i < p.amount; i++) {
        targetAfterPour.push(colorId);
      }

      if (targetAfterPour.length === 4 && targetAfterPour.every((x) => x === targetAfterPour[0])) {
        // Elegant completed chime and happy visual explosion!
        gameAudio.playBottleComplete();
        const tgtPos = positions[p.targetId];
        spawnConfetti(tgtPos.x, tgtPos.y - bottleHeight / 2, GAME_COLORS.find(c => c.id === p.colorId)?.primary || "#FFD700");
      } else {
        gameAudio.playPop(); // standard completion feedback
      }
    }

    if (p.progress >= 1.0) {
      pourAnimRef.current = null;
    }
  };

  /**
   * Particles physics & drawing.
   */
  const spawnSplash = (x: number, y: number, color: string) => {
    for (let i = 0; i < 3; i++) {
      particlesRef.current.push({
        x: x + (Math.random() * 14 - 7),
        y: y,
        vx: Math.random() * 2 - 1,
        vy: -Math.random() * 2.5 - 1.2,
        color: color,
        radius: Math.random() * 2.5 + 1.5,
        alpha: 1,
        life: 1,
        decay: 0.05 + Math.random() * 0.04,
      });
    }
  };

  const spawnConfetti = (x: number, y: number, color: string) => {
    // Shimmering stars rising and exploding
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4.5 + 2;
      particlesRef.current.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5, // bias upwards
        color: color,
        radius: Math.random() * 3.5 + 2,
        alpha: 1,
        life: 1,
        decay: 0.018 + Math.random() * 0.012,
      });
    }
  };

  const updateParticles = () => {
    const list = particlesRef.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12; // mild gravity
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        list.splice(i, 1);
      }
    }
  };

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    const list = particlesRef.current;
    list.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 4;
      ctx.shadowColor = p.color;

      ctx.beginPath();
      // Draw standard glowing bubble stars
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  };

  /**
   * Fluid Stream connecting the bottles during active poured animation
   */
  const drawConnectingStreams = (
    ctx: CanvasRenderingContext2D,
    positions: { x: number; y: number }[],
    bottleWidth: number,
    bottleHeight: number
  ) => {
    const p = pourAnimRef.current;
    if (!p) return;

    // Stream should start streaming around progress 0.2 and stop around 0.82
    if (p.progress < 0.2 || p.progress > 0.85) return;

    // Calculate source lip and target lip coordinates
    const srcPos = positions[p.sourceId];
    const tgtPos = positions[p.targetId];

    // Compute animated visual positions for sources and targets
    const srcLip = getAnimatedSourceLip(srcPos, tgtPos, p.progress, bottleWidth, bottleHeight);
    const tgtLipY = tgtPos.y - bottleHeight / 2 + 5;

    // Fluid stream starts at source lip lip and descends directly into target mouth
    const colorDef = GAME_COLORS.find((c) => c.id === p.colorId) || GAME_COLORS[0];

    ctx.save();
    ctx.strokeStyle = colorDef.primary;
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Setup flowing splash glow effect
    ctx.shadowBlur = 8;
    ctx.shadowColor = colorDef.primary;

    // Beautiful parabolic spill stream using Bezier route to simulate motion of gravity flow
    ctx.beginPath();
    ctx.moveTo(srcLip.x, srcLip.y);

    const cpX = (srcLip.x + tgtPos.x) / 2;
    const cpY = Math.min(srcLip.y, tgtLipY) - 20; // gentle crest

    ctx.quadraticCurveTo(cpX, cpY, tgtPos.x, tgtLipY);
    ctx.stroke();

    // inner stream core shader
    ctx.strokeStyle = colorDef.secondary;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(srcLip.x, srcLip.y);
    ctx.quadraticCurveTo(cpX, cpY, tgtPos.x, tgtLipY);
    ctx.stroke();

    ctx.restore();
  };

  /**
   * Main Render algorithm for bottles list
   */
  const drawBottles = (
    ctx: CanvasRenderingContext2D,
    positions: { x: number; y: number }[],
    bottleWidth: number,
    bottleHeight: number
  ) => {
    const bCount = bottlesRef.current.length;

    for (let i = 0; i < bCount; i++) {
      const bottleContents = bottlesRef.current[i];
      const pos = positions[i];

      ctx.save();

      // Check if selected or hinted
      const isSelected = selectedRef.current === i;
      const isHintFrom = hintRef.current?.from === i;
      const isHintTo = hintRef.current?.to === i;

      // Handle custom translations
      let drawX = pos.x;
      let drawY = pos.y;
      let rotation = 0;

      // Active Pouring Animation Transforms
      const anim = pourAnimRef.current;
      if (anim && anim.isPouring) {
        if (anim.sourceId === i) {
          // Source bottle floats, lifts, moves towards target and rotates!
          const tgtPos = positions[anim.targetId];
          const progress = anim.progress;

          // Split animation phases
          // Phase A: lift and transition towards target (progress 0.0 -> 0.3)
          // Phase B: tilt and spill (progress 0.3 -> 0.8)
          // Phase C: stand back up and return (progress 0.8 -> 1.0)

          let translationRatio = 0;
          let tiltRatio = 0;

          if (progress < 0.3) {
            translationRatio = progress / 0.3;
            tiltRatio = 0;
          } else if (progress >= 0.3 && progress <= 0.85) {
            translationRatio = 1.0;
            // Angle tilt follows sine back and forth
            tiltRatio = (progress - 0.3) / 0.55;
          } else {
            translationRatio = (1.0 - progress) / 0.15;
            tiltRatio = 0;
          }

          // Ease translation
          const easeTx = easeOutQuad(translationRatio);

          // Find offset target pour mouth coordinates (slightly side relative to pour direction)
          const direction = tgtPos.x > pos.x ? 1 : -1;
          const targetMouthX = tgtPos.x - direction * (bottleWidth / 2 + 10);
          const targetMouthY = tgtPos.y - bottleHeight / 2 - 25;

          // Shift current screen position towards target mouth
          drawX = pos.x + (targetMouthX - pos.x) * easeTx;
          drawY = pos.y + (targetMouthY - pos.y) * easeTx - 15 * Math.sin(translationRatio * Math.PI); // upward arc

          // Rotate bottle around custom pivot lip
          const maxRotation = direction * 1.5; // ~85 degrees
          rotation = Math.sin(tiltRatio * Math.PI) * maxRotation;
        } else if (anim.targetId === i) {
          // Receiving bottle stays steady, but vibrates gently from force impact
          if (anim.progress > 0.2 && anim.progress < 0.85) {
            drawX += Math.sin(waveTimeRef.current * 2) * 0.8;
          }
        }
      } else {
        // Standard non-pouring transitions
        if (isSelected) {
          // Floats in air with smooth breathing sine offset
          drawY -= 24 + Math.sin(waveTimeRef.current * 0.8) * 3;
        }
      }

      // Apply individual Error Tap Wobbles
      const w = wobbleRef.current;
      if (w && w.id === i) {
        drawX += Math.sin(w.time) * w.magnitude;
      }

      // Draw active Hint indicators (gentle glowing aura)
      if (isHintFrom || isHintTo) {
        ctx.save();
        ctx.strokeStyle = isHintFrom ? "rgba(245, 158, 11, 0.45)" : "rgba(16, 185, 129, 0.45)";
        ctx.lineWidth = 14;
        ctx.lineCap = "round";
        ctx.shadowBlur = 12;
        ctx.shadowColor = isHintFrom ? "#F59E0B" : "#10B981";
        drawGlassOutlinePath(ctx, drawX, drawY, bottleWidth, bottleHeight, rotation);
        ctx.stroke();
        ctx.restore();
      }

      // Draw selection/hover rings
      if (isSelected) {
        ctx.save();
        ctx.strokeStyle = "rgba(14, 165, 233, 0.3)";
        ctx.lineWidth = 8;
        ctx.lineCap = "round";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#0EA5E9";
        drawGlassOutlinePath(ctx, drawX, drawY, bottleWidth, bottleHeight, rotation);
        ctx.stroke();
        ctx.restore();
      }

      // 1. Draw Liquid contents (utilize clipping to fit glass perfectly)
      drawBottleLiquid(ctx, drawX, drawY, bottleWidth, bottleHeight, rotation, bottleContents, i);

      // 2. Draw pristine Glass outline containers
      drawBottleGlass(ctx, drawX, drawY, bottleWidth, bottleHeight, rotation, isSelected);

      ctx.restore();
    }
  };

  /**
   * Drawing the inner fluid levels
   */
  const drawBottleLiquid = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
    contents: Bottle,
    bottleIdx: number
  ) => {
    ctx.save();

    // Move to Lip base transform
    ctx.translate(x, y - height / 2);
    ctx.rotate(rotation);
    // Bring back to coordinates relative to lip
    ctx.translate(0, height / 2);

    // Create standard inner clipping path restricting liquid within the tube
    createInnerBottleClip(ctx, width, height);
    ctx.clip();

    // Height parameters
    const neckH = height * 0.12;
    const bodyStartY = -height / 2 + neckH;
    const bodyHeight = height - neckH;
    const capacity = 4;
    const layerHeight = (bodyHeight - 20) / capacity;

    const baseBottomY = height / 2;

    // Check if drawing fluid matches active pour sequence
    const anim = pourAnimRef.current;
    let liquidContents = [...contents];
    let pouringLeavingOffset = 0; // fraction of top layer being lost
    let pouringEnteringOffset = 0; // fraction of new layer being gained

    if (anim && anim.isPouring) {
      if (anim.sourceId === bottleIdx) {
        pouringLeavingOffset = anim.amount * anim.progress;
      } else if (anim.targetId === bottleIdx) {
        // fluid level starts rising between 0.18 and 0.85 progress ratio
        if (anim.progress >= 0.18) {
          const risingRatio = Math.min(1.0, (anim.progress - 0.18) / 0.67);
          pouringEnteringOffset = anim.amount * risingRatio;
        }
      }
    }

    // Render stacking layers
    const totalRenderedLayers = liquidContents.length;

    for (let index = 0; index < totalRenderedLayers; index++) {
      const colorId = liquidContents[index];
      const colorDef = GAME_COLORS.find((c) => c.id === colorId) || GAME_COLORS[0];

      // Default height offsets
      let startH = index * layerHeight;
      let endH = (index + 1) * layerHeight;

      if (anim && anim.isPouring) {
        if (anim.sourceId === bottleIdx && index === totalRenderedLayers - 1) {
          // Shrink the top pouring layer of the source bottle
          // Can fully empty the pouring segments
          const segmentsLeaving = Math.min(1.0, (pouringLeavingOffset - (totalRenderedLayers - 1 - index)));
          if (segmentsLeaving > 0) {
            const segmentPortion = 1.0 - segmentsLeaving;
            endH = startH + layerHeight * segmentPortion;
            if (segmentPortion <= 0.001) continue; // nothing to draw
          }
        }
      }

      // Draw actual colored segment
      drawLiquidSegment(
        ctx,
        -width / 2 - 10,
        width / 2 + 10,
        baseBottomY - startH,
        baseBottomY - endH,
        colorDef,
        index === totalRenderedLayers - 1, // Is top layer for wave rendering
        rotation
      );
    }

    // Draw the rising target liquid segment
    if (anim && anim.isPouring && anim.targetId === bottleIdx && pouringEnteringOffset > 0) {
      const colorDef = GAME_COLORS.find((c) => c.id === anim.colorId) || GAME_COLORS[0];

      // Draw incremental layers stacked on top of existing target layers
      const startIdx = anim.targetInitialLayers;
      const progressValue = pouringEnteringOffset; // ranges up to anim.amount

      for (let index = 0; index < anim.amount; index++) {
        const currentLayerIdx = startIdx + index;
        const currentProgress = progressValue - index;

        if (currentProgress > 0) {
          const clampedProg = Math.min(1.0, currentProgress);
          const startH = currentLayerIdx * layerHeight;
          const endH = startH + layerHeight * clampedProg;

          drawLiquidSegment(
            ctx,
            -width / 2 - 10,
            width / 2 + 10,
            baseBottomY - startH,
            baseBottomY - endH,
            colorDef,
            clampedProg < 1.0 || index === anim.amount - 1, // top wave
            rotation
          );
        }
      }
    }

    ctx.restore();
  };

  /**
   * Helper to draw a single colored layer, including satisfying wavy animated top
   */
  const drawLiquidSegment = (
    ctx: CanvasRenderingContext2D,
    left: number,
    right: number,
    bottomY: number,
    topY: number,
    colorDef: ColorDef,
    isTop: boolean,
    rotation: number
  ) => {
    // 2D flat visual filling style
    ctx.fillStyle = colorDef.primary;

    ctx.beginPath();
    ctx.moveTo(left, bottomY + 2); // overlap bleed
    ctx.lineTo(left, topY);
    ctx.lineTo(right, topY);
    ctx.lineTo(right, bottomY + 2);
    ctx.closePath();
    ctx.fill();

    // Subtle 2D level divider line inside fluid
    ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, topY);
    ctx.lineTo(right, topY);
    ctx.stroke();
  };

  /**
   * Outline structure path generator
   */
  const drawGlassOutlinePath = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number
  ) => {
    ctx.save();
    ctx.translate(x, y - height / 2);
    ctx.rotate(rotation);
    ctx.translate(0, height / 2);

    const neckW = width * 0.58;
    const neckH = height * 0.12;
    const radius = width / 2;

    ctx.beginPath();
    // Start at lip top left
    ctx.moveTo(-neckW / 2 - 4, -height / 2);
    // Top flare
    ctx.quadraticCurveTo(-neckW / 2 - 1, -height / 2 - 4, -neckW / 2 - 4, -height / 2 - 6);
    ctx.lineTo(-neckW / 2 + 15, -height / 2 - 6);
    ctx.lineTo(neckW / 2 - 15, -height / 2 - 6);
    ctx.lineTo(neckW / 2 + 4, -height / 2 - 6);
    ctx.quadraticCurveTo(neckW / 2 + 1, -height / 2 - 4, neckW / 2 + 4, -height / 2);

    // Right Neck down
    ctx.lineTo(neckW / 2, -height / 2 + neckH);
    // Flare out to Main body right
    ctx.quadraticCurveTo(width / 2, -height / 2 + neckH + 12, width / 2, -height / 2 + neckH + 20);

    // Straight right down to rounded base
    ctx.lineTo(width / 2, height / 2 - radius);
    ctx.arc(0, height / 2 - radius, radius, 0, Math.PI, false);

    // Left base
    ctx.lineTo(-width / 2, -height / 2 + neckH + 20);
    // Flare neck left
    ctx.quadraticCurveTo(-width / 2, -height / 2 + neckH + 12, -neckW / 2, -height / 2 + neckH);
    ctx.closePath();

    ctx.restore();
  };

  /**
   * Clipping mask definition for liquid layers
   */
  const createInnerBottleClip = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const neckW = width * 0.52;
    const neckH = height * 0.12;
    const radius = width / 2 - 3.5;

    ctx.beginPath();
    // Inner margins relative to external glass thickness
    ctx.moveTo(-neckW / 2, -height / 2 + 2);
    ctx.lineTo(neckW / 2, -height / 2 + 2);
    ctx.lineTo(neckW / 2, -height / 2 + neckH);
    ctx.quadraticCurveTo(width / 2 - 3.5, -height / 2 + neckH + 12, width / 2 - 3.5, -height / 2 + neckH + 22);
    ctx.lineTo(width / 2 - 3.5, height / 2 - radius);
    ctx.arc(0, height / 2 - radius, radius, 0, Math.PI, false);
    ctx.lineTo(-width / 2 + 3.5, -height / 2 + neckH + 22);
    ctx.quadraticCurveTo(-width / 2 + 3.5, -height / 2 + neckH + 12, -neckW / 2, -height / 2 + neckH);
    ctx.closePath();
  };

  /**
   * Draws the beautiful glass vessel outline, lips, rim highlights, and 3D specular shine lines
   */
  const drawBottleGlass = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
    isSelected: boolean
  ) => {
    ctx.save();
    ctx.translate(x, y - height / 2);
    ctx.rotate(rotation);
    ctx.translate(0, height / 2);

    const neckW = width * 0.58;
    const neckH = height * 0.12;
    const radius = width / 2;

    // Elegant flat 2D outline borders suitable for black background
    let defaultStroke = "rgba(255, 255, 255, 0.85)";
    let defaultGlow = "rgba(255, 255, 255, 0.1)";
    if (equippedSkin) {
      defaultStroke = equippedSkin.glassColor;
      defaultGlow = equippedSkin.glowColor;
    }

    ctx.save();
    // Glass glow shadow effects!
    ctx.shadowColor = defaultGlow;
    ctx.shadowBlur = isSelected ? 18 : 6;

    ctx.strokeStyle = isSelected ? "#38BDF8" : defaultStroke;
    ctx.lineWidth = isSelected ? 4.5 : 3.0;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // DRAW EXPOSED GLASS VESSEL PATH (flat 2D frame)
    ctx.beginPath();
    // Lip ring top flare
    ctx.moveTo(-neckW / 2 - 2, -height / 2);
    ctx.lineTo(neckW / 2 + 2, -height / 2);

    // Entire shell path
    ctx.moveTo(-neckW / 2, -height / 2);
    ctx.lineTo(-neckW / 2, -height / 2 + neckH);
    ctx.quadraticCurveTo(-width / 2, -height / 2 + neckH + 12, -width / 2, -height / 2 + neckH + 20);
    ctx.lineTo(-width / 2, height / 2 - radius);
    ctx.arc(0, height / 2 - radius, radius, Math.PI, 0, true);
    ctx.lineTo(width / 2, -height / 2 + neckH + 20);
    ctx.quadraticCurveTo(width / 2, -height / 2 + neckH + 12, neckW / 2, -height / 2 + neckH);
    ctx.lineTo(neckW / 2, -height / 2);
    ctx.stroke();

    ctx.restore(); // Restore shadows to prevent lagging on subsequent strokes

    // Draw internal high-contrast sticker decal if equipped
    if (equippedSkin && equippedSkin.sticker) {
      ctx.save();
      ctx.font = `bold ${Math.round(width * 0.35)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = isSelected ? 0.85 : 0.55; 
      ctx.fillText(equippedSkin.sticker, 0, height * 0.12);
      ctx.restore();
    }

    // Specular shine highlights
    if (equippedSkin && equippedSkin.shineType === "rainbow-glistening") {
      ctx.save();
      const gradient = ctx.createLinearGradient(-width / 3, -height / 3, -width / 3, height / 3);
      gradient.addColorStop(0, "rgba(239, 68, 68, 0.45)");
      gradient.addColorStop(0.2, "rgba(245, 158, 11, 0.45)");
      gradient.addColorStop(0.4, "rgba(16, 185, 129, 0.45)");
      gradient.addColorStop(0.6, "rgba(14, 165, 233, 0.45)");
      gradient.addColorStop(0.8, "rgba(139, 92, 246, 0.45)");
      gradient.addColorStop(1, "rgba(236, 72, 153, 0.45)");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-width / 2.8, -height / 3);
      ctx.lineTo(-width / 2.8, height / 3.5);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.save();
      // Pristine gloss highlight
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-width / 2.8, -height / 3);
      ctx.lineTo(-width / 2.8, height / 3.5);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  };

  /**
   * Compute dynamic rotating pouring lip location based on angles
   */
  const getAnimatedSourceLip = (
    srcPos: { x: number; y: number },
    tgtPos: { x: number; y: number },
    progress: number,
    bottleWidth: number,
    bottleHeight: number
  ): { x: number; y: number } => {
    // Basic progression ratios
    let translationRatio = 0;
    let tiltRatio = 0;

    if (progress < 0.3) {
      translationRatio = progress / 0.3;
      tiltRatio = 0;
    } else if (progress >= 0.3 && progress <= 0.85) {
      translationRatio = 1.0;
      tiltRatio = (progress - 0.3) / 0.55;
    } else {
      translationRatio = (1.0 - progress) / 0.15;
      tiltRatio = 0;
    }

    const easeTx = easeOutQuad(translationRatio);
    const direction = tgtPos.x > srcPos.x ? 1 : -1;
    const targetMouthX = tgtPos.x - direction * (bottleWidth / 2 + 10);
    const targetMouthY = tgtPos.y - bottleHeight / 2 - 25;

    // Standing centers
    const currentContainerX = srcPos.x + (targetMouthX - srcPos.x) * easeTx;
    const currentContainerY = srcPos.y + (targetMouthY - srcPos.y) * easeTx - 15 * Math.sin(translationRatio * Math.PI);

    // Floating lip (non-rotated)
    const baseLipX = currentContainerX;
    const baseLipY = currentContainerY - bottleHeight / 2;

    // Angle of rotation around lip
    const maxRotation = direction * 1.5;
    const currentRotation = Math.sin(tiltRatio * Math.PI) * maxRotation;

    // Rotate lip point slightly to make spill start precisely at tilted glass edge
    // Neck width is 58% of bottleWidth
    const offsetLength = (bottleWidth * 0.58) / 2;
    // Rotate offset vector by current angle
    const rotatedOffsetIdx = Math.cos(currentRotation) * (direction * offsetLength);
    const rotatedOffsetIdy = Math.sin(currentRotation) * (direction * offsetLength);

    return {
      x: baseLipX + rotatedOffsetIdx,
      y: baseLipY + rotatedOffsetIdy,
    };
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[350px] flex items-center justify-center relative select-none touch-none"
      id="canvas-container-inner"
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="block cursor-pointer outline-none animate-fade-in"
        id="game-canvas-element"
      />
    </div>
  );
};

/**
 * Calculates responsive bottle centers dynamically
 */
export function calculateBottleLayout(
  count: number,
  canvasWidth: number,
  canvasHeight: number
): {
  bottleWidth: number;
  bottleHeight: number;
  positions: { x: number; y: number }[];
} {
  // Let's decide if we need 1 row or 2 rows
  // On widescreen, up to 7 bottles can fit perfectly in 1 row.
  // Otherwise, 2 rows are cleaner to give tall, click-friendly proportions.
  const maxInRow = count <= 6 ? count : Math.ceil(count / 2);
  const rows = count <= 6 ? 1 : 2;

  // Set bottle dimensions relative to screen sizes
  // Force consistent slender test tube dimensions across all modes
  let maxW = Math.min(44, (canvasWidth - 40) / maxInRow - 14);
  let bottleWidth = Math.max(38, maxW);
  let bottleHeight = Math.min(138, canvasHeight / (rows === 1 ? 2.8 : 3.0));

  // Safeguard proportions to maintain consistent look
  if (bottleHeight < bottleWidth * 3.0) {
    bottleHeight = bottleWidth * 3.2;
  }

  const positions: { x: number; y: number }[] = [];

  if (rows === 1) {
    // Single Row layout
    const rowWidth = (maxInRow - 1) * (bottleWidth + 24) + bottleWidth;
    const startX = (canvasWidth - rowWidth) / 2 + bottleWidth / 2;
    const rowY = canvasHeight / 2 + 10;

    for (let i = 0; i < count; i++) {
      positions.push({
        x: startX + i * (bottleWidth + 24),
        y: rowY,
      });
    }
  } else {
    // Dual Rows layout
    const row1Count = maxInRow;
    const row2Count = count - row1Count;

    const r1Width = (row1Count - 1) * (bottleWidth + 18) + bottleWidth;
    const startX1 = (canvasWidth - r1Width) / 2 + bottleWidth / 2;

    const r2Width = (row2Count - 1) * (bottleWidth + 18) + bottleWidth;
    const startX2 = (canvasWidth - r2Width) / 2 + bottleWidth / 2;

    const spacingY = bottleHeight + 35;
    const startY = (canvasHeight - spacingY) / 2 + 10;

    // Row 1
    for (let i = 0; i < row1Count; i++) {
      positions.push({
        x: startX1 + i * (bottleWidth + 18),
        y: startY,
      });
    }

    // Row 2
    for (let i = 0; i < row2Count; i++) {
      positions.push({
        x: startX2 + i * (bottleWidth + 18),
        y: startY + spacingY,
      });
    }
  }

  return { bottleWidth, bottleHeight, positions };
}

// Cubic easing
function easeOutQuad(x: number): number {
  return 1 - (1 - x) * (1 - x);
}

// Color shade generator (hex converter)
function shadeColor(color: string, percent: number): string {
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);

  R = Math.min(255, Math.max(0, R + percent));
  G = Math.min(255, Math.max(0, G + percent));
  B = Math.min(255, Math.max(0, B + percent));

  const rHex = R.toString(16).padStart(2, "0");
  const gHex = G.toString(16).padStart(2, "0");
  const bHex = B.toString(16).padStart(2, "0");

  return `#${rHex}${gHex}${bHex}`;
}
