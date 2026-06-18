/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  RotateCcw,
  Undo,
  Lightbulb,
  PlusCircle,
  Volume2,
  VolumeX,
  HelpCircle,
  Trophy,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Gauge,
  Play,
  Coins,
  Tv,
  Edit2,
  ChevronRight,
  X,
  Navigation,
  Home,
  Brain,
  Sun,
  Moon
} from "lucide-react";
import { Bottle, GAME_COLORS } from "../types";
import { solveWaterSort } from "./Solver";

interface UIOverlayProps {
  bottles: Bottle[];
  level: number;
  difficulty: "easy" | "medium" | "hard";
  movesCount: number;
  undoAvailable: boolean;
  canAddBottle: boolean;
  isCompleted: boolean;
  soundMuted: boolean;
  showHintActive: boolean;
  hintDescription: string | null;
  coins: number;
  maxUnlockedLevel: number;
  theme?: 'black' | 'white';
  onChangeTheme?: (t: 'black' | 'white') => void;

  onRestart: () => void;         // Generates fresh board layout
  onUndo: () => void;
  onShowHint: () => void;        // Costs 200 coins
  onAddBottle: () => void;
  onToggleSound: () => void;
  onOpenTutorial: () => void;
  onChangeDifficulty: (diff: "easy" | "medium" | "hard") => void;
  onNextLevel: () => void;
  onSkipLevel: () => void;       // Costs 5000 coins
  onSetLevel: (level: number) => void;
  onReplayLevel: () => void;     // Reset same layout board
  onTriggerAdReward: () => void; // Simulated Ads +50 coins
  onBackToHome: () => void;      // Return to custom welcome/title screen
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  bottles,
  level,
  difficulty,
  movesCount,
  undoAvailable,
  canAddBottle,
  isCompleted,
  soundMuted,
  showHintActive,
  hintDescription,
  coins,
  maxUnlockedLevel,
  theme = 'black',
  onChangeTheme,

  onRestart,
  onUndo,
  onShowHint,
  onAddBottle,
  onToggleSound,
  onOpenTutorial,
  onChangeDifficulty,
  onNextLevel,
  onSkipLevel,
  onSetLevel,
  onReplayLevel,
  onTriggerAdReward,
  onBackToHome,
}) => {
  const [showAiCompanion, setShowAiCompanion] = useState<boolean>(false);
  const [adsWatchedForAi, setAdsWatchedForAi] = useState<number>(0);
  const [isPlayingAd, setIsPlayingAd] = useState<boolean>(false);
  const [adCountdown, setAdCountdown] = useState<number>(0);
  const [currentAdBrand, setCurrentAdBrand] = useState<string>("");

  useEffect(() => {
    setAdsWatchedForAi(0);
    setIsPlayingAd(false);
    setAdCountdown(0);
  }, [level]);

  // Clean, robust timer effect for companion sponsor ads
  useEffect(() => {
    if (!isPlayingAd) return;
    if (adCountdown <= 0) {
      return;
    }
    const timer = setTimeout(() => {
      setAdCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [isPlayingAd, adCountdown]);

  // We can write highly intelligent Board Evaluation logic directly locally!
  const handleAnalyzeBoard = () => {
    // 1. Check if the current level layout is solved:
    const isAlreadySolved = bottles.length > 0 && bottles.every((b) => b.length === 0 || (b.length === 4 && b.every((x) => x === b[0])));
    if (isAlreadySolved) {
      return {
        status: "SOLVED",
        statusClass: "text-emerald-400 bg-emerald-950/20 border-emerald-500/20",
        tip: "Hit NEXT level to proceed onto your journey!",
        mismatchCount: 0,
        completedCount: bottles.filter(b => b.length === 4).length,
        progress: 100,
        path: [] as { from: number; to: number }[],
      };
    }

    // 2. Count distinct unmixed color stacks in the bottles:
    let totalLayers = 0;
    let mismatchedAdjacentLayers = 0;
    let completedBottlesCount = 0;
    
    bottles.forEach((b) => {
      if (b.length > 0) {
        totalLayers += b.length;
        // Count how many adjacent layers are different
        for (let i = 0; i < b.length - 1; i++) {
          if (b[i] !== b[i+1]) {
            mismatchedAdjacentLayers++;
          }
        }
        // Is it completed?
        if (b.length === 4 && b.every((x) => x === b[0])) {
          completedBottlesCount++;
        }
      }
    });

    // 3. Solve the current board state using solveWaterSort:
    const path = solveWaterSort(bottles, 1000);
    const solvable = (path && path.length > 0) || checkIsSolved(bottles);

    let statusText = "Solvable & Maneuverable";
    let statusClass = "text-emerald-400 bg-emerald-900/15 border-emerald-500/20";
    let strategyTip = "Analyze the colors. Focus on emptying at least one tube completely to get a vacant channel!";

    if (solvable) {
      if (path && path[0]) {
        strategyTip = `Strategic Move: Pour Tube ${path[0].from + 1} into Tube ${path[0].to + 1} to open up new pathways!`;
      } else {
        strategyTip = "Excellent! You are just a couple of moves away from completing the level.";
      }
    } else {
      statusText = "Locked / Dead End";
      statusClass = "text-rose-400 bg-rose-950/20 border-rose-550/20";
      strategyTip = "Warning: Current states have no resolving maneuvers! Click 'Undo' or tap '+🧪 Extra Tube' to break the bottleneck.";
    }

    const calculatedProgress = totalLayers > 0 
      ? Math.round((completedBottlesCount / (difficulty === "easy" ? 3 : difficulty === "medium" ? 5 : 8)) * 100)
      : 0;

    return {
      status: statusText,
      statusClass: statusClass,
      solvable: solvable,
      tip: strategyTip,
      mismatchCount: mismatchedAdjacentLayers,
      completedCount: completedBottlesCount,
      progress: Math.min(100, calculatedProgress),
      path: path,
    };
  };

  const checkIsSolved = (state: Bottle[]) => {
    return state.every((b) => b.length === 0 || (b.length === 4 && b.every((col) => col === b[0])));
  };

  const analysis = handleAnalyzeBoard();

  return (
    <div className="flex flex-col w-full h-full max-w-md mx-auto pointer-events-none select-none justify-between">
      {/* Top Controller Panel - Pack all requested actions up top */}
      <div className="w-full shrink-0 flex flex-col p-4 pointer-events-auto gap-3 bg-gradient-to-b from-[#111116]/90 via-[#111116]/40 to-transparent">
        
        {/* GOLDEN RETRO ARCADE BUTTONS ROW */}
        <div className="flex items-center justify-between w-full h-12 gap-1.5 select-none">
          {/* Group 1: Navigation & Moves */}
          <div className="flex items-center gap-1.5">
            {/* Home/Menu button */}
            <button
              onClick={onBackToHome}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 border-2 border-amber-950 shadow-[0_3px_0_#75350f] active:translate-y-[2px] active:shadow-[0_1px_0_#75350f] transition-all cursor-pointer"
              title="Return to title menu"
              id="back-to-home-btn-arcade"
            >
              <Home className="h-5 w-5 text-slate-950 stroke-[2.5]" />
            </button>

            {/* Undo Pour button */}
            <button
              onClick={onUndo}
              disabled={!undoAvailable}
              className={`flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 border-2 border-amber-950 shadow-[0_3px_0_#75350f] active:translate-y-[2px] active:shadow-[0_1px_0_#75350f] transition-all cursor-pointer ${
                !undoAvailable ? "opacity-35 cursor-not-allowed shadow-none translate-y-[2px] border-amber-950/60" : ""
              }`}
              title="Undo last pour"
              id="undo-btn-arcade"
            >
              <Undo className="h-5 w-5 text-slate-950 stroke-[2.5]" />
            </button>

            {/* Replay Same Level layout */}
            <button
              onClick={onReplayLevel}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 border-2 border-amber-950 shadow-[0_3px_0_#75350f] active:translate-y-[2px] active:shadow-[0_1px_0_#75350f] transition-all cursor-pointer"
              title="Reset current level layout"
              id="replay-btn-arcade"
            >
              <RotateCcw className="h-4.5 w-4.5 text-slate-950 stroke-[2.5]" />
            </button>
          </div>

          {/* Group 2: Helpers & Skip */}
          <div className="flex items-center gap-1.5">
            {/* Hint Solver helper */}
            <button
              onClick={onShowHint}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 border-2 border-amber-950 shadow-[0_3px_0_#75350f] active:translate-y-[2px] active:shadow-[0_1px_0_#75350f] transition-all cursor-pointer relative"
              title="Suggest strategic hint (costs 2K coins)"
              id="hint-btn-arcade"
            >
              <Lightbulb className="h-4.5 w-4.5 text-slate-950 stroke-[2.5]" />
              <span className="absolute -bottom-1 -right-0.5 bg-red-600 text-white font-mono font-black text-[7px] px-1 rounded-full border border-amber-950 leading-tight">
                2K
              </span>
            </button>

            {/* Add Extra Empty Tube */}
            <button
              onClick={onAddBottle}
              disabled={!canAddBottle}
              className={`flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 border-2 border-amber-950 shadow-[0_3px_0_#75350f] active:translate-y-[2px] active:shadow-[0_1px_0_#75350f] transition-all cursor-pointer relative ${
                !canAddBottle ? "opacity-35 cursor-not-allowed shadow-none translate-y-[2px] border-amber-950/60" : ""
              }`}
              title="Purchase extra glass tube container (costs 10K coins)"
              id="add-tube-btn-arcade"
            >
              <PlusCircle className="h-4.5 w-4.5 text-slate-950 stroke-[2.5]" />
              <span className="absolute -bottom-1 -right-0.5 bg-red-600 text-white font-mono font-black text-[7px] px-0.5 rounded-full border border-amber-950 leading-tight">
                10K
              </span>
            </button>

            {/* Skip current level board */}
            <button
              onClick={onSkipLevel}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 border-2 border-amber-950 shadow-[0_3px_0_#75350f] active:translate-y-[2px] active:shadow-[0_1px_0_#75350f] transition-all cursor-pointer relative"
              title="Skip level directly (costs 5K coins)"
              id="skip-btn-arcade"
            >
              <ArrowRight className="h-4.5 w-4.5 text-slate-950 stroke-[2.5]" />
              <span className="absolute -bottom-1 -right-0.5 bg-red-600 text-white font-mono font-black text-[7px] px-0.5 rounded-full border border-amber-950 leading-tight">
                5K
              </span>
            </button>

            {/* AI Advisor strategist brain */}
            <button
              onClick={() => {
                setShowAiCompanion(true);
                const audioObj = (window as any).gameAudio || { playPop: () => {} };
                if (audioObj.playPop) audioObj.playPop();
              }}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 border-2 border-amber-950 shadow-[0_3px_0_#75350f] active:translate-y-[2px] active:shadow-[0_1px_0_#75350f] transition-all cursor-pointer relative"
              title="Consult AI Tactical Advisor"
              id="ai-brain-btn-arcade"
            >
              <Brain className="h-4.5 w-4.5 text-slate-950 stroke-[2.5] animate-pulse" />
              <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
            </button>
          </div>
        </div>

        {/* HUD LEVEL, COINS, MOVES AND DIFFICULTIES STATUS INFOBAR */}
        <div className="flex items-center justify-between w-full h-9 px-1 gap-1">
          {/* Coins Display / Free Reward Trigger */}
          <button
            onClick={onTriggerAdReward}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded bg-black/45 border border-amber-500/20 text-amber-300 hover:border-amber-400/40 hover:scale-103 active:scale-97 transition-all cursor-pointer select-none shadow-sm"
            title="Sponsor: get +50 Coins free!"
          >
            <Coins className="h-3.5 w-3.5 fill-amber-400 stroke-amber-600 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="font-mono text-xs font-black">{coins}</span>
          </button>

          {/* LEVEL DISPLAY */}
          <div className="flex flex-col items-center">
            <span className="font-sans font-black text-xl tracking-[1.5px] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] select-none uppercase">
              LEVEL {level}
            </span>
          </div>

          {/* Moves Count */}
          <div className="flex items-center gap-1 bg-black/45 h-8 px-2.5 rounded border border-indigo-500/10 text-slate-300 text-2xs font-extrabold uppercase">
            <Gauge className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            <span>MOVES: <strong className="text-white font-black">{movesCount}</strong></span>
          </div>
        </div>

        {/* MINIMALIST LEVEL STATS AND COMPACT DIFFICULTY PILLS */}
        <div className="flex items-center justify-between w-full h-6 px-1.5 opacity-90">
          {/* Difficulty Toggler Switch */}
          <button
            onClick={() => {
              const nextDiff = difficulty === 'easy' ? 'hard' : 'easy';
              onChangeDifficulty(nextDiff);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-900 border border-neutral-800 text-[10px] font-black uppercase text-slate-400 hover:text-white cursor-pointer active:scale-95 transition-all"
            title="Toggle game difficulty preset"
          >
            <span>DIFFICULTY:</span>
            <span className={difficulty === 'easy' ? 'text-emerald-400 font-extrabold' : 'text-rose-455 font-extrabold'}>
              {difficulty.toUpperCase()}
            </span>
          </button>

          {/* Instant Ads sponsored button indicator */}
          <button
            onClick={onTriggerAdReward}
            className="flex items-center gap-1 text-[10px] text-emerald-400 font-black tracking-wider uppercase hover:text-emerald-300"
            title="Simulated Sponsor ad trigger"
          >
            <Tv className="h-3 w-3 shrink-0 text-emerald-400 animate-bounce" />
            <span>+50🪙 AD-GIFT</span>
          </button>
        </div>

        {/* Dynamic Hints overlay description inline */}
        <AnimatePresence>
          {showHintActive && hintDescription && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full bg-[#1A2234]/95 border border-[#20518C] rounded-xl px-4 py-2 text-3xs text-[#7DD3FC] text-center flex items-center justify-center gap-2 overflow-hidden font-sans font-extrabold uppercase shadow-lg select-text pointer-events-auto shrink-0 leading-relaxed"
            >
              <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-400 animate-bounce" />
              <span>{hintDescription}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Spacer zone representing the middle Glass Bottles, completely transparent click-through! */}
      <div className="flex-1 min-h-0 pointer-events-none" />

      {/* Absolutely NOTHING at the bottom! No bar, no clutter, keeping it perfectly empty & clean below the bottles as requested. */}
      <div className="w-full h-2 shrink-0 pointer-events-none" />

      {/* Interactive popovers overlay dialog containers */}
      <AnimatePresence>
        {/* AI Companion Sidebar Modal Drawer */}
        {showAiCompanion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAiCompanion(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm pointer-events-auto"
            />

            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              className="relative w-full max-w-sm bg-[#111625] border border-violet-500/30 rounded-3xl p-6 shadow-2xl pointer-events-auto text-slate-100"
              id="ai-companion-drawer-dialog"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-violet-400 animate-bounce" />
                  <h3 className="font-sans text-xs font-black uppercase tracking-widest text-[#A78BFA]">
                    AI Tactical Companion v1.0
                  </h3>
                </div>
                <button
                  onClick={() => setShowAiCompanion(false)}
                  className="p-1.5 bg-neutral-900 border border-neutral-800 rounded-xl hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {isPlayingAd ? (
                /* SIMULATED AD PLAYER WINDOW */
                <div className="space-y-4 text-center py-4 select-none font-sans" id="simulated-ad-player-box">
                  <div className="relative aspect-video rounded-2xl bg-slate-950 flex flex-col items-center justify-center border border-emerald-500/30 overflow-hidden shadow-inner w-full">
                    {/* Sponsored Badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-600/95 text-[8px] font-black uppercase text-white tracking-widest animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      <span>SPONSORED AD</span>
                    </div>

                    <div className="absolute top-2 right-2 text-[9px] font-mono text-slate-400 bg-black/60 px-2 py-0.5 rounded">
                      Countdown: {adCountdown}s
                    </div>

                    {/* Spinning coin/star */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                      className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/30 mb-2"
                    >
                      <Sparkles className="h-7 w-7 text-emerald-400 animate-pulse" />
                    </motion.div>

                    <p className="text-2xs font-sans font-black uppercase tracking-wider text-emerald-300">
                      {currentAdBrand}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] text-center leading-normal">
                      {currentAdBrand.includes("Pop") ? "Mix delicious colorful sodas together with friends!" : 
                       currentAdBrand.includes("Galaxy") ? "Travel the stars and earn infinite virtual cash coins!" :
                       currentAdBrand.includes("Color") ? "The ultimate brain puzzle. Test your active IQ in 500+ colorful challenges!" :
                       currentAdBrand.includes("Space") ? "Explore cosmic jewelry matching adventures today!" :
                       "Super fun bubble sort gameplay for genius minds only!"}
                    </p>

                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-800">
                      <motion.div 
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 4, ease: "linear" }}
                        className="h-full bg-emerald-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-4xs font-black uppercase tracking-widest text-[#A78BFA] animate-pulse">
                      Do Not Close - Transmission Active
                    </p>
                    <p className="text-4xs text-slate-400 leading-normal font-sans">
                      Credits are computed securely. Tap close when countdown reaches 0 to claim unlock progress.
                    </p>
                  </div>

                  <div className="pt-2">
                    {adCountdown === 0 ? (
                      <button
                        onClick={() => {
                          const audioObj = (window as any).gameAudio || { playPop: () => {} };
                          if (audioObj.playPop) audioObj.playPop();
                          setAdsWatchedForAi((prev) => prev + 1);
                          setIsPlayingAd(false);
                        }}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 rounded-xl py-2.5 font-sans text-2xs font-black uppercase tracking-widest transition-all cursor-pointer border-none shadow-md shadow-emerald-500/20"
                        id="close-ad-btn"
                      >
                        [X] Close Ad & Claim Credit
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full bg-neutral-800 text-neutral-500 rounded-xl py-2.5 font-sans text-2xs font-bold uppercase tracking-widest cursor-not-allowed opacity-60 border-none"
                      >
                        Wait {adCountdown} seconds...
                      </button>
                    )}
                  </div>
                </div>
              ) : adsWatchedForAi < 2 ? (
                /* LOCK AD WALL CONTAINER */
                <div className="space-y-4 text-center py-3 select-none font-sans" id="ai-gated-ads-locked-box">
                  <div className="flex flex-col items-center justify-center p-4 bg-violet-950/15 border border-violet-500/20 rounded-2xl relative">
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#7a55ed]/20 text-[#a588f7] border border-[#7a55ed]/30 px-2 py-0.5 rounded text-[8px] font-black uppercase">
                      Gated Core
                    </div>

                    <div className="p-3 bg-violet-500/10 rounded-full border border-violet-500/30 mb-3 relative">
                      <Brain className="h-8 w-8 text-violet-400 animate-pulse" />
                      <span className="absolute -top-1.5 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white">🔒</span>
                    </div>

                    <h4 className="text-3xs font-black text-violet-300 uppercase tracking-widest mb-1.5">
                      AI Tactician Gated Block
                    </h4>
                    
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      To access high-performance real-time quantum diagnostics & strategic suggestions for LEVEL {level}, you must watch 2 sponsor ads.
                    </p>
                  </div>

                  <div className="bg-neutral-950/40 p-4 rounded-xl border border-white/5">
                    <p className="text-4xs font-black tracking-widest text-slate-400 uppercase mb-3 text-center">
                      Sponsor Verification Progress
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                        adsWatchedForAi >= 1 
                          ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-400 whitespace-nowrap" 
                          : "bg-[#161a29]/60 border-white/5 text-slate-500"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider">Ad 1</span>
                        <span className="text-3xs font-black">{adsWatchedForAi >= 1 ? "✅ CHECKED" : "❌ PENDING"}</span>
                      </div>

                      <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                        adsWatchedForAi >= 2 
                          ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-400 whitespace-nowrap" 
                          : "bg-[#161a29]/60 border-white/5 text-slate-500"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider">Ad 2</span>
                        <span className="text-3xs font-black">{adsWatchedForAi >= 2 ? "✅ CHECKED" : "❌ PENDING"}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <button
                      onClick={() => {
                        const brands = ["Soda Pop Tycoon 🥤", "Galaxy Coin Star 👑", "Infinite Color Craft 🧪", "Space Jewel Saga 💎", "Bubble Sparkle Pro 🫧"];
                        const chosen = brands[Math.floor(Math.random() * brands.length)];
                        setCurrentAdBrand(chosen);
                        setIsPlayingAd(true);
                        setAdCountdown(4);

                        const audioObj = (window as any).gameAudio || { playPop: () => {} };
                        if (audioObj.playPop) audioObj.playPop();
                      }}
                      className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-95 text-white font-sans text-2xs font-black uppercase tracking-widest py-3 px-6 rounded-xl transition-all cursor-pointer shadow-lg shadow-violet-600/30 border-none flex items-center justify-center gap-2"
                      id="launch-simulated-ad-btn"
                    >
                      <Tv className="w-4 h-4 text-white animate-pulse" />
                      <span>Watch Sponsor Ad ({adsWatchedForAi}/2)</span>
                    </button>
                    
                    <p className="text-4xs text-slate-550 mt-2 italic font-sans text-center">
                      *Note: Sponsorship credentials reset on level transitions to maintain sandbox fair play.
                    </p>
                  </div>
                </div>
              ) : (
                /* UNLOCKED STANDARD DRAWER CONTENT CONTAINER */
                <>
                  <div className="bg-violet-950/20 p-3 rounded-2xl border border-violet-500/10">
                    <p className="text-4xs font-black text-violet-400 uppercase tracking-widest mb-1.5">Offline Privacy Shield Active</p>
                    <p className="text-[11px] text-slate-300 font-sans">
                      Calculated in secure, locally-isolated sandbox threads directly on your device. Zero cloud analytics or telemetry logs transmitted, preserving Galaxy Studio core privacy standards.
                    </p>
                  </div>

                  {/* Main solvability meter */}
                  <div className="bg-neutral-950/50 p-4 rounded-2xl border border-white/5 space-y-3 font-sans">
                    <div className="flex items-center justify-between">
                      <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider font-sans">Evaluation State:</span>
                      <span className={`text-3.5cs font-bold px-2.5 py-1.5 rounded-xl border uppercase tracking-wider text-[11px] ${analysis.statusClass}`}>
                        {analysis.status}
                      </span>
                    </div>

                    <div className="space-y-1 pt-1 font-sans">
                      <div className="flex justify-between text-3xs font-bold text-slate-400 uppercase font-sans">
                        <span>Sorting Progress:</span>
                        <span className="text-emerald-400 font-black">{analysis.progress}%</span>
                      </div>
                      <div className="w-full bg-neutral-900 rounded-full h-2 overflow-hidden border border-white/5">
                        <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${analysis.progress}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Diagnostic Details */}
                  <div className="grid grid-cols-2 gap-2.5 font-sans">
                    <div className="bg-[#151b2d] p-3 rounded-xl border border-white/5">
                      <span className="text-4xs font-black text-violet-400 uppercase tracking-wider block mb-0.5 font-sans">Tubes Sorted</span>
                      <span className="text-lg font-mono font-black text-white font-sans">{analysis.completedCount}</span>
                    </div>
                    <div className="bg-[#151b2d] p-3 rounded-xl border border-white/5">
                      <span className="text-4xs font-black text-violet-400 uppercase tracking-wider block mb-0.5 font-sans">Contact Junctions</span>
                      <span className="text-lg font-mono font-black text-white font-sans">{analysis.mismatchCount}</span>
                    </div>
                  </div>

                  {/* Core tactical suggestion */}
                  <div className="bg-[#1e142a]/60 p-4 rounded-2xl border border-violet-500/20 relative overflow-hidden font-sans">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-violet-500/5 rounded-full blur-xl pointer-events-none" />
                    <span className="text-3xs font-black text-violet-300 uppercase tracking-widest block mb-1 font-sans">
                      Companion Strategic Recommendation
                    </span>
                    <p className="text-slate-200 text-xs italic leading-relaxed font-sans">
                      "{analysis.tip}"
                    </p>
                  </div>

                  {/* Gated AI Autopilot Path Sequence */}
                  <div className="bg-[#0f111a] border border-violet-500/20 rounded-2xl p-4 space-y-3 font-sans">
                    <p className="text-3xs font-black text-[#A78BFA] uppercase tracking-widest flex items-center gap-1 font-sans">
                      <span>🔮 AI Gated Companion Autopilot Pathway</span>
                    </p>
                    
                    {analysis.path && analysis.path.length > 0 ? (
                      <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                        {analysis.path.slice(0, 10).map((move, index) => (
                          <div 
                            key={index} 
                            className="flex items-center justify-between bg-[#151722] border border-white/5 py-1.5 px-3 rounded-lg text-[11px] font-sans font-medium"
                          >
                            <span className="text-slate-400 font-sans">Step {index + 1}:</span>
                            <div className="flex items-center gap-1.5 font-sans">
                              <span className="bg-[#7a55ed]/20 text-[#a588f7] border border-[#7a55ed]/30 px-1.5 py-0.5 rounded font-black font-mono">
                                Tube {move.from + 1}
                              </span>
                              <span className="text-slate-500 font-bold font-sans">➔</span>
                              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-black font-mono">
                                Tube {move.to + 1}
                              </span>
                            </div>
                          </div>
                        ))}
                        {analysis.path.length > 10 && (
                          <p className="text-[10px] text-slate-500 text-center italic mt-1.5 font-sans">
                            ... and {analysis.path.length - 10} more tactical maneuvers
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic font-sans py-2 text-center bg-black/20 rounded-lg">
                        No path found. Ensure current tubes are unblocked!
                      </p>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-white/5 font-sans">
                    <button
                      onClick={() => setShowAiCompanion(false)}
                      className="w-full bg-violet-600 hover:bg-violet-700 active:scale-95 text-white rounded-xl py-2.5 font-sans text-2xs font-bold uppercase tracking-widest transition-all cursor-pointer border-none shadow-md shadow-violet-600/20 font-sans"
                    >
                      Confirm Insight
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}

        {/* Level Complete Victory Congrats modal overlay dialog */}
        {isCompleted && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 pointer-events-auto">
            {/* Dark background modal shadow blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
              id="victory-backdrop"
            />

            {/* Confetti drop animation simulation effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-10 select-none">
              {[...Array(16)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: -50, x: Math.random() * 400 - 200, rotate: 0 }}
                  animate={{ y: 900, rotate: 360, x: Math.random() * 400 - 200 }}
                  transition={{ repeat: Infinity, duration: 2.5 + Math.random() * 2, ease: "linear" }}
                  className="absolute w-2 h-4 rounded-xs opacity-80"
                  style={{
                    backgroundColor: ["#f43f5e", "#0ea5e9", "#10b981", "#fbbf24", "#a855f7"][i % 5],
                    left: `${5 + Math.random() * 90}%`,
                    top: `-20px`
                  }}
                />
              ))}
            </div>

            {/* Core screenshot layout container matching Image 1 */}
            <motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 220 }}
              className="relative w-full max-w-sm rounded-3xl bg-transparent flex flex-col items-center justify-center p-4 select-none text-center z-20"
              id="victory-body"
            >
              {/* 1. Golden Crown on top with green gemstone from Photo 1 */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
                className="relative z-30 filter drop-shadow-[0_8px_20px_rgba(245,158,11,0.6)]"
              >
                <div className="w-28 h-16 flex items-center justify-center select-none">
                  <svg viewBox="0 0 100 60" className="w-full h-full fill-amber-400 stroke-amber-600 stroke-2">
                    {/* Crown main gold body */}
                    <path d="M10 50 L90 50 L85 20 L65 35 L50 15 L35 35 L15 20 Z" />
                    
                    {/* Gemstones on peak */}
                    <circle cx="15" cy="20" r="4.5" fill="#f43f5e" />
                    
                    {/* Central Diamond Emerald green jewel - high visibility matching screenshot 1 */}
                    <polygon points="50,11 54,17 50,23 46,17" fill="#10b981" stroke="#34d399" strokeWidth="1" />
                    
                    <circle cx="85" cy="20" r="4.5" fill="#0ea5e9" />
                    {/* Base decorations */}
                    <rect x="18" y="44" width="64" height="4.5" rx="2" fill="#d97706" />
                    <circle cx="34" cy="46" r="1.5" fill="#ffffff" />
                    <circle cx="50" cy="46" r="1.5" fill="#f43f5e" />
                    <circle cx="65" cy="46" r="1.5" fill="#ffffff" />
                  </svg>
                </div>
              </motion.div>

              {/* 2. 3D folded game Ribbon Banner containing randomized positive words ("AWESOME", "NICE") */}
              <div className="relative flex items-center justify-center w-full my-1 z-20 filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]">
                {/* Visual Ribbon tails for 3D realism */}
                <div className="absolute -left-1.5 bottom-1.5 w-6 h-10 bg-rose-800 rounded-l-md transform -skew-y-12 origin-right -z-10 overflow-hidden">
                  <div className="absolute inset-0 bg-black/15" />
                </div>
                <div className="absolute -left-1.5 bottom-0.5 w-3 h-1.5 bg-rose-950 rounded-bl-sm transform -z-10" />

                {/* Central Ribbon Panel */}
                <div className="bg-gradient-to-r from-rose-600 to-rose-500 py-3.5 px-14 border-y-2 border-white/25 rounded-md shadow-xl relative select-none">
                  <div className="absolute inset-0.5 border border-dashed border-white/20 select-none" />
                  <span className="font-sans font-black text-2xl sm:text-3xl text-white tracking-[0.08em] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.55)] font-bold italic">
                    {["AWESOME", "GREAT", "NICE", "EXCELLENT", "BRILLIANT", "PRO MASTER"][level % 6]}
                  </span>
                </div>

                <div className="absolute -right-1.5 bottom-0.5 w-3 h-1.5 bg-rose-950 rounded-br-sm transform -z-10" />
                <div className="absolute -right-1.5 bottom-1.5 w-6 h-10 bg-rose-800 rounded-r-md transform skew-y-12 origin-left -z-10 overflow-hidden">
                  <div className="absolute inset-0 bg-black/15" />
                </div>
              </div>

              {/* Reward feedback & mini achievements stats block */}
              <div className="mt-8 mb-10 bg-black/40 px-6 py-4 rounded-3xl border border-neutral-800 max-w-xs w-full shadow-inner select-none space-y-2">
                <p className="font-sans text-xs text-yellow-400 font-extrabold uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <Coins className="h-4.5 w-4.5 fill-yellow-400 stroke-yellow-600 animate-spin" />
                  <span>REWARDED: +100 COINS</span>
                </p>
                <p className="font-sans text-2xs text-slate-400 tracking-widest uppercase">
                  Solved in <strong className="text-white font-black">{movesCount}</strong> moves
                </p>
              </div>

              {/* 3. High visual centered Yellow Pill Button labeled "NEXT" */}
              <div className="w-full max-w-xs px-2 mb-4">
                <motion.button
                  onClick={onNextLevel}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  className="w-full py-4.5 px-10 rounded-full bg-[#fbbf24] text-slate-950 font-sans text-xl font-extrabold uppercase tracking-[4px] shadow-[0_8px_30px_rgba(245,158,11,0.45)] border-t-2 border-white/20 border-b-4 border-amber-600 cursor-pointer select-none"
                  id="congrats-next-level-btn"
                >
                  NEXT
                </motion.button>
              </div>

              {/* 4. "Easy & Hard" footer indicator matching the exact photo layout */}
              <p className="font-sans text-sm font-black text-slate-100 uppercase tracking-[4px] opacity-90 mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                Easy & Hard
              </p>

              {/* Replay option fallback */}
              <button
                onClick={onReplayLevel}
                className="font-sans text-3xs font-extrabold text-slate-400 hover:text-white uppercase tracking-widest flex items-center gap-1 opacity-75 hover:opacity-100 transition-opacity cursor-pointer mx-auto"
                id="congrats-replay-level-btn"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Replay Same Layout</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
