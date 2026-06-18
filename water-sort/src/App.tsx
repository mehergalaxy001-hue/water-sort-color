/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Bottle, DIFFICULTY_PRESETS, GAME_COLORS } from "./types";
import { GameCanvas } from "./components/GameCanvas";
import { UIOverlay } from "./components/UIOverlay";
import { Tutorial } from "./components/Tutorial";
import { generateSolvableLevel, solveWaterSort, checkIsSolved } from "./components/Solver";
import { gameAudio } from "./utils/audio";
import { Sparkles, Heart, Coins, Play, Info, Mail, ShieldAlert, Award, FileText, X, Copy, Check, Lock, Unlock, Brain, Trash2, Volume2, VolumeX, Tv, Settings, RefreshCw, ShoppingBag, Palette } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BOTTLE_SKINS, BACKGROUND_THEMES, BottleSkin, BackgroundTheme } from "./data/skins";
import { ShopModal } from "./components/ShopModal";

export default function App() {
  // --- Game Persistence State ---
  // Default first-time users to start directly from level 1!
  const [level, setLevel] = useState<number>(() => {
    const forceResetV1 = localStorage.getItem("water_sort_force_level_1_reset_v3");
    if (!forceResetV1) {
      localStorage.setItem("water_sort_force_level_1_reset_v3", "true");
      localStorage.setItem("water_sort_level", "1");
      localStorage.setItem("water_sort_max_unlocked_level", "1");
      return 1;
    }
    const saved = localStorage.getItem("water_sort_level");
    return saved ? parseInt(saved, 10) : 1;
  });

  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(() => {
    const saved = localStorage.getItem("water_sort_difficulty");
    const val = (saved as "easy" | "medium" | "hard") || "easy";
    return val === "medium" ? "easy" : val;
  });

  // Keep track of the highest level unlocked by the human player naturally
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState<number>(() => {
    const forceResetV1 = localStorage.getItem("water_sort_force_level_1_reset_v3");
    if (!forceResetV1) {
      return 1;
    }
    const savedMax = localStorage.getItem("water_sort_max_unlocked_level");
    const savedCurrent = localStorage.getItem("water_sort_level");
    const currentLvl = savedCurrent ? parseInt(savedCurrent, 10) : 1;
    return savedMax ? Math.max(currentLvl, parseInt(savedMax, 10)) : currentLvl;
  });

  // --- Coin Wallet & System ---
  const [coins, setCoins] = useState<number>(() => {
    const saved = localStorage.getItem("water_sort_coins_balance");
    return saved ? parseInt(saved, 10) : 0; // default initial coins
  });

  // --- Interactive UX Phase state ---
  // 'splash' -> Shows GALAXY STUDIO splash intro
  // 'title'  -> Shows WATER COLOUR 2D main menu with Play, Level settings & info drawers
  // 'playing'-> Actual gameplay arena
  const [gamePhase, setGamePhase] = useState<'splash' | 'title' | 'playing'>('splash');

  // --- Runtime Game State ---
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [initialBottles, setInitialBottles] = useState<Bottle[]>([]); // Saved seed representation for Replay
  const [history, setHistory] = useState<Bottle[][]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [movesCount, setMovesCount] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [addedBottleCount, setAddedBottleCount] = useState<number>(0);

  // --- Tooling & Options State ---
  const [soundMuted, setSoundMuted] = useState<boolean>(() => gameAudio.isSoundMuted());
  const [tutorialOpen, setTutorialOpen] = useState<boolean>(() => {
    const visited = localStorage.getItem("water_sort_visited_before");
    return visited !== "true";
  });
  const [showHintActive, setShowHintActive] = useState<boolean>(false);
  const [hintMove, setHintMove] = useState<{ from: number; to: number } | null>(null);
  const [hintDescription, setHintDescription] = useState<string | null>(null);

  // --- Theme State ('black' for dark mode and 'white' for light mode) ---
  const [theme, setTheme] = useState<'black' | 'white'>(() => {
    return (localStorage.getItem("water_sort_theme") as 'black' | 'white') || 'black';
  });

  // Synchronize theme configuration state with local storage
  useEffect(() => {
    localStorage.setItem("water_sort_theme", theme);
  }, [theme]);

  // --- Shop states for Custom Bottles and Backgrounds ---
  const [unlockedSkinIds, setUnlockedSkinIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("water_sort_unlocked_skin_ids");
    try {
      return saved ? JSON.parse(saved) : ["skin_0"];
    } catch {
      return ["skin_0"];
    }
  });

  const [equippedSkinId, setEquippedSkinId] = useState<string>(() => {
    const saved = localStorage.getItem("water_sort_equipped_skin_id");
    return saved || "skin_0";
  });

  const [unlockedBgIds, setUnlockedBgIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("water_sort_unlocked_bg_ids");
    try {
      return saved ? JSON.parse(saved) : ["bg_0"];
    } catch {
      return ["bg_0"];
    }
  });

  const [equippedBgId, setEquippedBgId] = useState<string>(() => {
    const saved = localStorage.getItem("water_sort_equipped_bg_id");
    return saved || "bg_0";
  });

  const [shopOpen, setShopOpen] = useState<boolean>(false);
  const [shopTab, setShopTab] = useState<'skins' | 'backgrounds'>('skins');

  useEffect(() => {
    localStorage.setItem("water_sort_unlocked_skin_ids", JSON.stringify(unlockedSkinIds));
  }, [unlockedSkinIds]);

  useEffect(() => {
    localStorage.setItem("water_sort_equipped_skin_id", equippedSkinId);
  }, [equippedSkinId]);

  useEffect(() => {
    localStorage.setItem("water_sort_unlocked_bg_ids", JSON.stringify(unlockedBgIds));
  }, [unlockedBgIds]);

  useEffect(() => {
    localStorage.setItem("water_sort_equipped_bg_id", equippedBgId);
  }, [equippedBgId]);

  const equippedSkin = BOTTLE_SKINS.find((s) => s.id === equippedSkinId) || BOTTLE_SKINS[0];
  const equippedBg = BACKGROUND_THEMES.find((b) => b.id === equippedBgId) || BACKGROUND_THEMES[0];

  // --- Informational Modals ---
  const [infoModal, setInfoModal] = useState<'about' | 'privacy' | 'contact' | 'settings' | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);

  // --- Toast/Popup Alerts State ---
  const [toastText, setToastText] = useState<string>("");

  // --- Simulated Reward Video Ads Modal states ---
  const [adActive, setAdActive] = useState<boolean>(false);
  const [adCountdown, setAdCountdown] = useState<number>(5);

  // --- Trigger splash timer run ---
  useEffect(() => {
    if (gamePhase === 'splash') {
      const timer = setTimeout(() => {
        setGamePhase('title');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [gamePhase]);

  // --- Initialize Level Seed ---
  useEffect(() => {
    generateLevelBoard();
  }, [level, difficulty]);

  // Sync volume state config to service
  useEffect(() => {
    gameAudio.setMute(soundMuted);
  }, [soundMuted]);

  // Persistent trackers
  useEffect(() => {
    localStorage.setItem("water_sort_level", level.toString());
    localStorage.setItem("water_sort_difficulty", difficulty);
  }, [level, difficulty]);

  useEffect(() => {
    localStorage.setItem("water_sort_max_unlocked_level", maxUnlockedLevel.toString());
  }, [maxUnlockedLevel]);

  // Persistent coins tracker
  useEffect(() => {
    localStorage.setItem("water_sort_coins_balance", coins.toString());
  }, [coins]);

  /**
   * Action Toast Notice
   */
  const showNotification = (message: string) => {
    setToastText(message);
    setTimeout(() => {
      setToastText("");
    }, 4500);
  };

  /**
   * Helper to get level-dependent color mappings. Ensures different levels
   * use different colors from the 12 available GAME_COLORS instead of always Red & Blue
   */
  const getLevelColors = (levelNum: number, count: number): number[] => {
    const numAvailable = GAME_COLORS.length;
    const selectedIds: number[] = [];
    
    // Deterministic shift based on level to cycle through the colors.
    // Shift by (levelNum * 3) to give variety between successive levels.
    const startOffset = (levelNum * 3) % numAvailable;
    
    for (let i = 0; i < count; i++) {
      // Step through by 2 to diversify color pairings
      const idx = (startOffset + i * 2) % numAvailable;
      selectedIds.push(GAME_COLORS[idx].id);
    }
    return selectedIds;
  };

  /**
   * Level Board Generator (Fresh Shuffle)
   */
  const generateLevelBoard = () => {
    // Dynamic Level-based hardness progression
    // Starts with 3 colors at Level 1, and grows gradually as level increases up to 12 colors at Level 10,000+
    let baseColors = 3;
    if (level <= 1) {
      baseColors = 3; 
    } else if (level <= 3) {
      baseColors = 4;
    } else if (level <= 10) {
      baseColors = 5;
    } else if (level <= 50) {
      baseColors = 6;
    } else if (level <= 150) {
      baseColors = 7;
    } else if (level <= 500) {
      baseColors = 8;
    } else if (level <= 2000) {
      baseColors = 9;
    } else if (level <= 8000) {
      baseColors = 10;
    } else if (level <= 25000) {
      baseColors = 11;
    } else {
      baseColors = 12; // Extremely complex and expert
    }

    // Number of empty bottles progresses as well to optimize space
    let baseEmpty = 3;
    if (level === 1) {
      baseEmpty = 3;
    } else if (level > 1 && level <= 5) {
      baseEmpty = 3; 
    } else {
      // Even levels have 2 empty bottles (harder), odd levels have 3 empty bottles (slightly easier)
      baseEmpty = level % 2 === 0 ? 2 : 3;
    }

    let colorsCount = baseColors;
    let emptyBottlesCount = baseEmpty;

    // Overlay difficulty presets if overridden by manual selector
    if (difficulty === "easy") {
      // Force exactly 4 bottles total in Easy mode (2 colors + 2 empty) as requested
      colorsCount = 2;
      emptyBottlesCount = 2;
    } else if (difficulty === "hard") {
      colorsCount = Math.min(12, baseColors + 2);
      emptyBottlesCount = Math.max(2, baseEmpty - 1);
    }

    const generated = generateSolvableLevel(colorsCount, emptyBottlesCount);

    // Map sequential color IDs (1...colorsCount) to our level-dependent color IDs
    const levelColors = getLevelColors(level, colorsCount);
    const mappedGenerated = generated.map((bottle) =>
      bottle.map((colorId) => levelColors[colorId - 1] || colorId)
    );

    setBottles(mappedGenerated);
    setInitialBottles(mappedGenerated.map((b) => [...b])); // Safe deep clone for Replays
    setHistory([]);
    setSelectedId(null);
    setMovesCount(0);
    setIsCompleted(false);
    setAddedBottleCount(0);
    setShowHintActive(false);
    setHintMove(null);
    setHintDescription(null);
  };

  /**
   * Replay Current Level Board (Same Layout seed)
   */
  const handleReplayLevel = () => {
    if (initialBottles.length > 0) {
      setBottles(initialBottles.map((b) => [...b]));
      setHistory([]);
      setSelectedId(null);
      setMovesCount(0);
      setIsCompleted(false);
      setShowHintActive(false);
      setHintMove(null);
      setHintDescription(null);
      setAddedBottleCount(0);
      gameAudio.playPop();
      showNotification("Replaying current layout!");
    }
  };

  /**
   * Reset the entire game state to default (level 1, 0 coins, clear localStorage)
   */
  const handleGlobalRestartGame = () => {
    localStorage.removeItem("water_sort_level");
    localStorage.removeItem("water_sort_max_unlocked_level");
    localStorage.removeItem("water_sort_coins_balance");
    localStorage.removeItem("water_sort_difficulty");
    localStorage.removeItem("water_sort_theme");
    
    setLevel(1);
    setMaxUnlockedLevel(1);
    setCoins(0);
    setDifficulty("easy");
    setTheme("black");
    setHistory([]);
    setSelectedId(null);
    setMovesCount(0);
    setIsCompleted(false);
    setAddedBottleCount(0);
    setShowHintActive(false);
    setHintMove(null);
    setHintDescription(null);
    setInfoModal(null);
    setGamePhase("title");
    
    gameAudio.playVictory();
    showNotification("Game fully restarted! Starting fresh from Level 1.");
  };

  /**
   * Selection of completed/unlocked levels is fully allowed.
   */
  const handleSetLevel = (targetLvl: number) => {
    if (targetLvl <= maxUnlockedLevel) {
      setLevel(targetLvl);
      setIsCompleted(false);
      gameAudio.playPop();
      showNotification(`Switched to Level ${targetLvl}!`);
    } else {
      gameAudio.playError();
      showNotification(`Level ${targetLvl} is locked! Complete Level ${level} to naturally progress.`);
    }
  };

  /**
   * Skip levels (costs 5000 coins)
   */
  const handleSkipLevel = () => {
    if (level >= 100000) {
      showNotification("You are on Level 100000, which is the final level!");
      gameAudio.playError();
      return;
    }

    if (coins < 5000) {
      showNotification("Need 5000 coins! Watch simulated ad to earn fast");
      gameAudio.playError();
      return;
    }

    setCoins((c) => Math.max(0, c - 5000));
    const nextLvl = level + 1;
    const nextUnlocked = Math.min(100000, Math.max(maxUnlockedLevel, nextLvl));
    setMaxUnlockedLevel(nextUnlocked);
    setLevel(nextLvl);
    setIsCompleted(false);
    gameAudio.playVictory();
    showNotification(`Level Skipped to level ${nextLvl}! -5000🪙`);
  };

  // --- Simulated Reward Ad Timer Safe Engine ---
  useEffect(() => {
    if (!adActive) return;
    if (adCountdown <= 0) {
      setCoins((c) => c + 50);
      setAdActive(false);
      gameAudio.playVictory();
      showNotification("Rewarded +50 Coins! 🪙");
      return;
    }
    const timer = setTimeout(() => {
      setAdCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [adActive, adCountdown]);

  /**
   * Watch Simulated Reward Video Ads (+50 Coins) - Instant reward, no blocking overlay!
   */
  const handleTriggerAdReward = () => {
    setCoins((c) => c + 50);
    gameAudio.playVictory();
    showNotification("Sponsored Reward: +50 Coins credited instantly! 🪙");
  };

  /**
   * Swapping difficulty states
   */
  const handleDifficultyChange = (newDiff: "easy" | "medium" | "hard") => {
    if (newDiff === difficulty) return;
    setDifficulty(newDiff);
    gameAudio.playPop();
  };

  /**
   * Action: Selection change
   */
  const handleSelectBottle = (id: number) => {
    if (selectedId === id) {
      setSelectedId(null);
    } else {
      setSelectedId(id);
    }
  };

  /**
   * Action: Core Pour Engine Callback
   */
  const handlePourComplete = (sourceId: number, targetId: number) => {
    // 1. Deep copy prior step into Undo logs
    const historyCopy = bottles.map((b) => [...b]);
    const updatedHistory = [...history, historyCopy];

    // 2. Compute state transition results
    const src = [...bottles[sourceId]];
    const tgt = [...bottles[targetId]];

    const colorId = src[src.length - 1];

    // Count contiguous elements of the same color on top of the source
    let pourCount = 0;
    for (let i = src.length - 1; i >= 0; i--) {
      if (src[i] === colorId) {
        pourCount++;
      } else {
        break;
      }
    }

    // Capacity check target
    const remainingTarget = 4 - tgt.length;
    const actualPouredAmount = Math.min(pourCount, remainingTarget);

    for (let p = 0; p < actualPouredAmount; p++) {
      src.pop();
      tgt.push(colorId);
    }

    // Set updated state
    const nextBottles = bottles.map((b, idx) => {
      if (idx === sourceId) return src;
      if (idx === targetId) return tgt;
      return [...b];
    });

    setBottles(nextBottles);
    setHistory(updatedHistory);
    setSelectedId(null); // Deselect on complete
    setMovesCount((m) => m + 1);

    // Drop active hint visuals to keep focus minimal
    setShowHintActive(false);
    setHintMove(null);
    setHintDescription(null);

    // 3. Victory Checker - auto completion next level prompt
    if (checkIsSolved(nextBottles)) {
      setIsCompleted(true);
      setCoins((c) => c + 100); // Rewarding 100 coins on complete level
      
      const nextLevelUnlocked = Math.min(1000, level + 1);
      if (nextLevelUnlocked > maxUnlockedLevel) {
        setMaxUnlockedLevel(nextLevelUnlocked);
      }
      
      gameAudio.playVictory();
    }
  };

  /**
   * Support: Undo Operation
   */
  const handleUndo = () => {
    if (history.length === 0) return;
    gameAudio.playPop();

    const previousState = history[history.length - 1];
    setBottles(previousState);

    const nextHistory = history.slice(0, -1);
    setHistory(nextHistory);

    setSelectedId(null);
    setMovesCount((m) => Math.max(0, m - 1));
    setShowHintActive(false);
    setHintMove(null);
    setHintDescription(null);
  };

  /**
   * Support: Additional Tube Assistance
   */
  const handleAddBottle = () => {
    // Strictly capped at exactly 1 extra bottle maximum for all difficulties
    if (addedBottleCount >= 1) {
      gameAudio.playError();
      showNotification("You can only add a maximum of 1 extra tube!");
      return;
    }

    if (coins < 10000) {
      gameAudio.playError();
      showNotification("Need 10,000 Coins to add an extra tube! Watch ads to earn.");
      return;
    }

    setCoins((c) => Math.max(0, c - 10000));
    gameAudio.playPop();
    setBottles([...bottles, []]); // append new empty glass tube!
    setAddedBottleCount((c) => c + 1);
    showNotification("Purchased Extra Tube! -10000🪙");
  };

  /**
   * Support: Custom Hint calculations (Costs 2000 coins)
   */
  const handleShowHint = () => {
    if (showHintActive) {
      setShowHintActive(false);
      setHintMove(null);
      setHintDescription(null);
      gameAudio.playPop();
      return;
    }

    // Check coin requirements first
    if (coins < 2000) {
      showNotification("Need 2000 coins for a hint! Claim Gift or Watch Ads to earn!");
      gameAudio.playError();
      return;
    }

    // Tap solver
    const solution = solveWaterSort(bottles, 3000);
    if (solution && solution.length > 0) {
      const nextMove = solution[0];
      setCoins((c) => Math.max(0, c - 2000)); // deduct coins for hint
      setHintMove(nextMove);
      setHintDescription(
        `Suggested: Pour tube ${nextMove.from + 1} into tube ${nextMove.to + 1}`
      );
      setShowHintActive(true);
      gameAudio.playPop();
      showNotification("Hint obtained! -2000🪙");
    } else {
      // Solver detected no possibilities
      setHintMove(null);
      setHintDescription("No valid moves available. Try using Undo or adding a tube!");
      setShowHintActive(true);
      gameAudio.playError();
    }
  };

  /**
   * Copy Email trigger and copy alert notice
   */
  const handleCopyEmail = () => {
    const emailStr = "watersort@gmail.com";
    navigator.clipboard.writeText(emailStr).then(() => {
      setCopiedEmail(true);
      gameAudio.playSelect();
      setTimeout(() => setCopiedEmail(false), 2000);
    });
  };

  /**
   * Play audio toggle
   */
  const handleToggleSound = () => {
    setSoundMuted((m) => !m);
  };

  /**
   * Close or open tutorial panels
   */
  const handleOpenTutorial = () => {
    setTutorialOpen(true);
    gameAudio.playPop();
  };

  const handleCloseTutorial = () => {
    setTutorialOpen(false);
    localStorage.setItem("water_sort_visited_before", "true");
    gameAudio.playPop();
  };

  /**
   * Navigation: Next game challenge
   */
  const handleNextLevel = () => {
    const nextLvl = level + 1;
    if (nextLvl > 100000) {
      showNotification("CONGRATULATIONS! You completed all 100000 levels! 🎉");
      gameAudio.playVictory();
      setIsCompleted(false);
      return;
    }
    const nextUnlocked = Math.min(100000, Math.max(maxUnlockedLevel, nextLvl));
    setMaxUnlockedLevel(nextUnlocked);
    setLevel(nextLvl);
    gameAudio.playPop();
    setIsCompleted(false);
  };

  return (
    <div className={`relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-between font-sans select-none transition-all duration-300 ${
      theme === 'white' 
        ? "bg-slate-50 text-slate-900" 
        : (equippedBg ? equippedBg.gradientClass : "bg-[#0a1226]") + " text-slate-100"
    }`}>
      
      {/* Floating notification Toast */}
      <AnimatePresence>
        {toastText && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.92 }}
            className="fixed top-4 z-[99] bg-[#1a233d] border border-cyan-500/40 text-cyan-200 px-5 py-3 rounded-2xl shadow-2xl font-sans text-xs font-black tracking-widest uppercase text-center max-w-xs mx-auto flex items-center justify-center gap-2"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <span>{toastText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic ambient dark background glowing bubble spotlights */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden origin-center opacity-50">
        <div className="absolute top-[10%] left-[8%] w-80 h-80 rounded-full bg-blue-600/15 blur-[130px]" />
        <div className="absolute bottom-[18%] right-[10%] w-96 h-96 rounded-full bg-cyan-600/10 blur-[130px]" />
        <div className="absolute top-[40%] right-[3%] w-72 h-72 rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      {/* STATE 1: WATER COLOUR 2D SPLASH INTRO */}
      <AnimatePresence mode="wait">
        {gamePhase === 'splash' && (
          <motion.div
            key="splash-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#070b19]"
            id="galaxy-studio-splash-screen"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="flex flex-col items-center justify-center text-center space-y-6"
            >
              {/* Elegant Text representation of WATER COLOUR 2D branding */}
              <div className="space-y-2">
                <h1 className="font-sans font-extrabold text-[#4fc3f7] text-4xl sm:text-5xl tracking-widest uppercase">
                  Water Colour
                </h1>
                <p className="font-sans font-black text-rose-400 text-6xl tracking-widest">
                  2D
                </p>
              </div>

              {/* Simple Clean Loading Indicator bar */}
              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "105%" }}
                  transition={{ duration: 2.9, ease: "easeInOut" }}
                  className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-rose-400"
                />
              </div>
              <p className="text-4xs font-mono tracking-widest text-slate-500 uppercase">Handcrafted Puzzle</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* STATE 2: WATER COLOUR 2D MAIN WELCOME SCREEN (Direct representation matching image 2 Block Blast styled title with Golden Crown) */}
      <AnimatePresence>
        {gamePhase === 'title' && (
          <motion.div
            key="title-screen"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute inset-0 z-40 flex flex-col justify-between p-6 transition-all duration-300 ${
              theme === 'white'
                ? "bg-gradient-to-b from-slate-100 via-slate-50 to-slate-200 text-slate-900"
                : "bg-gradient-to-b from-[#0c2461] to-[#070b19] text-white"
            }`}
            id="water-colour-2d-title-phase"
          >
            {/* Top Bar for Sound Toggle & Coins Display with +50 Coins Gift/Ads Icon */}
            <div className="flex justify-between items-center w-full z-10 shrink-0 mb-2">
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 border px-3.5 py-1.5 rounded-full backdrop-blur-md transition-all ${
                  theme === 'white'
                    ? "bg-white/90 border-slate-200 text-slate-800"
                    : "bg-black/40 border-white/10 text-amber-200"
                }`}>
                  <Coins className="h-4 w-4 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                  <span className="font-mono text-sm font-black">{coins}</span>
                </div>

                {/* SMALL ADS AD/GIFT ICON AS REQUESTED BY USER */}
                <motion.button
                  onClick={() => {
                    setCoins((c) => c + 50);
                    gameAudio.playVictory();
                    showNotification("Claimed Reward! +50 Coins 🪙🎁");
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 text-white font-sans text-4xs font-black px-2.5 py-1.5 rounded-full shadow-md cursor-pointer tracking-wider shrink-0 uppercase border border-emerald-400/20 active:scale-95 transition-all"
                  id="title-small-ad-bonus-btn"
                  title="Claim free 50 Coins reward"
                >
                  <Tv className="h-3 w-3 animate-pulse text-emerald-100" />
                  <span>+50🪙 GIFT</span>
                </motion.button>
              </div>

              <div className="flex items-center gap-2">
                {/* SKIN/BOTTLE SHOP BUTTON AS REQUESTED BY USER */}
                <motion.button
                  onClick={() => {
                    setShopOpen(true);
                    gameAudio.playPop();
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-amber-200 cursor-pointer select-none shadow-lg transition-all"
                  title="Open Shop & Skins"
                  id="title-shop-toggle-btn"
                >
                  <ShoppingBag className="h-5 w-5 text-amber-400" />
                </motion.button>

                {/* SETTINGS MENU BUTTON AS REQUESTED BY USER */}
                <motion.button
                  onClick={() => {
                    setInfoModal('settings');
                    gameAudio.playPop();
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 border border-white/10 hover:border-cyan-500/30 text-slate-300 hover:text-white cursor-pointer select-none shadow-lg transition-all"
                  title="Open Game Settings"
                  id="title-settings-toggle-btn"
                >
                  <Settings className="h-5 w-5 text-indigo-400 hover:scale-105 transition-transform" />
                </motion.button>

                <motion.button
                  onClick={() => {
                    handleToggleSound();
                    gameAudio.playPop();
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 border border-white/10 hover:border-cyan-500/30 text-slate-300 hover:text-white cursor-pointer select-none shadow-lg transition-all"
                  title={soundMuted ? "Unmute system sounds" : "Mute system sounds"}
                  id="title-sound-toggle-btn"
                >
                  {soundMuted ? (
                    <VolumeX className="h-5 w-5 text-rose-500 hover:scale-105 transition-transform" />
                  ) : (
                    <Volume2 className="h-5 w-5 text-cyan-400 hover:scale-105 transition-transform" />
                  )}
                </motion.button>
              </div>
            </div>

            {/* Logo area */}
            <div className="flex-1 flex flex-col items-center justify-center mt-2">
              
              {/* Luxury Gold Jewel-Adorned Crown floating right above the first word "WATER" - matching image 2 */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                className="relative z-10 -mb-2"
              >
                <div className="w-24 h-14 flex items-center justify-center relative filter drop-shadow-[0_4px_12px_rgba(245,158,11,0.5)]">
                  {/* Direct clean responsive SVGs vector of a regal blocky crown with gemstones loaded safely */}
                  <svg viewBox="0 0 100 60" className="w-full h-full fill-amber-400 stroke-amber-600 stroke-2">
                    {/* Crown Base */}
                    <path d="M10 50 L90 50 L85 20 L65 35 L50 15 L35 35 L15 20 Z" />
                    {/* Jewels on Peaks */}
                    <circle cx="15" cy="20" r="4.5" fill="#f43f5e" />
                    {/* Center Ruby Jewel */}
                    <circle cx="50" cy="15" r="5.5" fill="#0ea5e9" />
                    <circle cx="85" cy="20" r="4.5" fill="#10b981" />
                    {/* Crown Rim line */}
                    <rect x="18" y="44" width="64" height="4" rx="2" fill="#d97706" />
                  </svg>
                </div>
              </motion.div>

              {/* Title Header: WATER COLOUR 2D styled inside gorgeous colorful bouncy human-sculpted grid blocks */}
              <div className="flex flex-col items-center select-none">
                {/* "WATER" letter blocks */}
                <div className="flex gap-1.5 justify-center mb-3">
                  {[
                    { char: "W", bg: "bg-orange-500 border-orange-600 shadow-orange-950/50" },
                    { char: "A", bg: "bg-cyan-500 border-cyan-600 shadow-cyan-950/50" },
                    { char: "T", bg: "bg-rose-500 border-rose-600 shadow-rose-950/50" },
                    { char: "E", bg: "bg-amber-500 border-amber-600 shadow-amber-950/50" },
                    { char: "R", bg: "bg-violet-500 border-violet-600 shadow-violet-950/50" },
                  ].map((item, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.15, rotate: idx % 2 === 0 ? 5 : -5 }}
                      className={`w-14 h-14 ${item.bg} flex items-center justify-center rounded-2xl border-b-4 text-3xl font-black text-white font-sans shadow-lg select-none`}
                    >
                      <span className="drop-shadow-[0_3px_2px_rgba(0,0,0,0.4)]">{item.char}</span>
                    </motion.div>
                  ))}
                </div>

                {/* "COLOUR 2D" subtitled letter blocks */}
                <div className="flex gap-1.5 justify-center">
                  {[
                    { char: "C", bg: "bg-teal-500 border-teal-600" },
                    { char: "O", bg: "bg-pink-500 border-pink-600" },
                    { char: "L", bg: "bg-indigo-500 border-indigo-600" },
                    { char: "O", bg: "bg-emerald-500 border-emerald-600" },
                    { char: "U", bg: "bg-yellow-500 border-yellow-600" },
                    { char: "R", bg: "bg-red-500 border-red-600" },
                    { char: "2", bg: "bg-sky-500 border-sky-600" },
                    { char: "D", bg: "bg-indigo-600 border-indigo-700" },
                  ].map((item, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.15, rotate: idx % 2 === 0 ? -4 : 4 }}
                      className={`w-9 h-9 ${item.bg} flex items-center justify-center rounded-xl border-b-2 text-base font-black text-white font-sans shadow-md select-none`}
                    >
                      <span className="drop-shadow-[0_2px_1px_rgba(0,0,0,0.3)]">{item.char}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Little subtitle mimicking 'Adventure Master' but saying Galaxy Studio proudly */}
                <p className="mt-4 text-xs font-black text-sky-400 tracking-[4px] uppercase font-sans font-medium animate-pulse">
                  GALAXY STUDIO MASTERPIECE
                </p>
              </div>

              {/* HUGE SHINY YELLOW PLAY BUTTON */}
              <div className="mt-12 w-full max-w-xs px-4">
                <motion.button
                  onClick={() => {
                    gameAudio.playVictory();
                    setGamePhase('playing');
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  className="w-full flex items-center justify-center gap-3.5 py-4 px-8 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 font-sans text-xl font-black text-slate-950 uppercase tracking-widest shadow-[0_8px_30px_rgba(245,158,11,0.45)] border-t-2 border-white/20 border-b-4 border-amber-600 transition-all select-none cursor-pointer"
                  id="welcome-screen-play-btn"
                >
                  <Play className="h-6 w-6 fill-current text-slate-950" />
                  <span>PLAY NOW</span>
                </motion.button>
              </div>

              {/* LEVEL GATEWAYS PROGRESSION ROAD (Horizontal scroller) */}
              <div className="w-full max-w-xs mt-6 px-1">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-4xs font-black tracking-widest text-[#38BDF8] uppercase font-sans flex items-center gap-1">
                    <Award className="h-3 w-3 text-cyan-400" />
                    <span>Level Progress Gateways</span>
                  </span>
                  
                  {/* Reset to Level 1 button */}
                  <button
                    onClick={() => {
                      if (window.confirm("Do you want to reset your level progress back to Level 1?")) {
                        setLevel(1);
                        setMaxUnlockedLevel(1);
                        localStorage.setItem("water_sort_level", "1");
                        localStorage.setItem("water_sort_max_unlocked_level", "1");
                        gameAudio.playPop();
                        showNotification("Progress Reset! Started from Level 1 🔄");
                      }
                    }}
                    className="text-4xs font-black text-rose-400 hover:text-rose-300 uppercase tracking-widest flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                    title="Reset progress to Level 1"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Reset Lvl 1</span>
                  </button>
                </div>

                <div className="w-full bg-[#0d162d]/90 border border-white/5 rounded-2xl p-2.5 overflow-x-auto scrollbar-none">
                  <div className="flex items-center gap-2 px-1">
                    {(() => {
                      const startLvl = Math.max(1, level - 5);
                      // Only show levels up to maxUnlockedLevel (no future locked levels are shown!)
                      const endLvl = Math.min(maxUnlockedLevel, level + 5);
                      const list: number[] = [];
                      for (let i = startLvl; i <= endLvl; i++) {
                        list.push(i);
                      }
                      return list;
                    })().map((lvl) => {
                      const isCompletedLvl = lvl < maxUnlockedLevel;
                      const isCurrentLvl = lvl === level;
                      const isUnlockedLvl = lvl <= maxUnlockedLevel;

                      return (
                        <motion.button
                          key={lvl}
                          onClick={() => {
                            if (lvl === level) {
                              // If it's already selected, just play standard sound
                              gameAudio.playPop();
                              showNotification(`You are currently on Level ${level}! Tap Play Now to begin.`);
                              return;
                            }
                            if (lvl <= maxUnlockedLevel) {
                              setLevel(lvl);
                              gameAudio.playVictory();
                              showNotification(`Switched to Level ${lvl}! Tap Play Now to begin. 🏆`);
                            } else {
                              gameAudio.playError();
                              showNotification(`Level ${lvl} is locked! Complete preceding levels to unlock. 🔒`);
                            }
                          }}
                          whileHover={{ scale: 1.05, y: -1 }}
                          whileTap={{ scale: 0.95 }}
                          className={`relative flex flex-col items-center justify-center min-w-[36px] h-9 rounded-xl transition-all select-none cursor-pointer border ${
                            isCurrentLvl
                              ? "bg-amber-400 border-amber-300 text-slate-950 font-black shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                              : isCompletedLvl
                              ? "bg-emerald-950/25 border-emerald-500/30 text-emerald-400 font-bold"
                              : isUnlockedLvl
                              ? "bg-slate-900 border-cyan-500/25 text-cyan-300 font-bold"
                              : "bg-neutral-950 border-neutral-900 text-neutral-600 cursor-not-allowed opacity-40"
                          }`}
                        >
                          <span className="text-3xs font-sans font-black z-10">{lvl}</span>
                          
                          <span className="absolute -top-1 -right-0.5 z-20">
                            {!isUnlockedLvl ? (
                              <Lock className="w-2.5 h-2.5 text-neutral-600" />
                            ) : isCompletedLvl ? (
                              <span className="text-[6px]">⭐️</span>
                            ) : null}
                          </span>

                          {isCurrentLvl && (
                            <span className="absolute inset-0 rounded-xl border border-white animate-ping opacity-25" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Menu Items (Privacy Policy, About Us, Contact Us) */}
            <div className="shrink-0 w-full max-w-sm mx-auto border-t border-white/5 pt-4 pb-2">
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  onClick={() => {
                    setInfoModal('about');
                    gameAudio.playPop();
                  }}
                  className="flex flex-col items-center justify-center p-2.5 bg-[#121b33] border border-white/5 rounded-2xl hover:bg-[#182647] hover:border-cyan-500/20 active:scale-95 transition-all text-center select-none cursor-pointer"
                  id="title-open-about-btn"
                >
                  <Info className="h-4 w-4 text-cyan-400 mb-1" />
                  <span className="font-sans text-4xs font-black text-slate-300 uppercase tracking-widest leading-relaxed">About Us</span>
                </button>

                <button
                  onClick={() => {
                    setInfoModal('privacy');
                    gameAudio.playPop();
                  }}
                  className="flex flex-col items-center justify-center p-2.5 bg-[#121b33] border border-white/5 rounded-2xl hover:bg-[#182647] hover:border-cyan-500/20 active:scale-95 transition-all text-center select-none cursor-pointer"
                  id="title-open-privacy-btn"
                >
                  <FileText className="h-4 w-4 text-emerald-400 mb-1" />
                  <span className="font-sans text-4xs font-black text-slate-300 uppercase tracking-widest leading-relaxed">Privacy Policy</span>
                </button>

                <button
                  onClick={() => {
                    setInfoModal('contact');
                    gameAudio.playPop();
                  }}
                  className="flex flex-col items-center justify-center p-2.5 bg-[#121b33] border border-white/5 rounded-2xl hover:bg-[#182647] hover:border-cyan-500/20 active:scale-95 transition-all text-center select-none cursor-pointer"
                  id="title-open-contact-btn"
                >
                  <Mail className="h-4 w-4 text-amber-500 mb-1" />
                  <span className="font-sans text-4xs font-black text-slate-300 uppercase tracking-widest leading-relaxed">Contact Us</span>
                </button>
              </div>

              {/* Subtle coin count reminder index */}
              <p className="mt-3.5 text-center text-4xs font-sans font-black tracking-[2.5px] text-slate-500 uppercase">
                GALAXY STUDIO • PRIVATE INTEGRATION
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* STATE 3: CORE SOLVING PLAYING GRAPHIC GRID */}
      {gamePhase === 'playing' && (
        <div className="relative z-10 w-full max-w-md h-screen flex flex-col justify-between items-center overflow-hidden" id="main-gameplay-arena">
          
          {/* Full Interactive Canvas Zone with Black Canvas wrappers */}
          <div className="w-full h-full flex-1 flex items-center justify-center relative pt-[120px] pb-[115px] px-4" id="canvas-container">
            <div className="w-full h-full flex items-center justify-center rounded-3xl bg-black/40 border border-neutral-900 shadow-2xl overflow-hidden" id="game-canvas-wrapper">
              <GameCanvas
                bottles={bottles}
                selectedId={selectedId}
                onSelectBottle={handleSelectBottle}
                onPour={handlePourComplete}
                isCompleted={isCompleted}
                hintMove={hintMove}
                equippedSkin={equippedSkin}
              />
            </div>
          </div>

          {/* HUD control overlays */}
          <div className="absolute inset-0 z-20 w-full h-full pointer-events-none flex flex-col justify-between">
            <UIOverlay
              theme={theme}
              onChangeTheme={setTheme}
              bottles={bottles}
              level={level}
              difficulty={difficulty}
              movesCount={movesCount}
              undoAvailable={history.length > 0}
              canAddBottle={addedBottleCount < (difficulty === "easy" ? 1 : 2)}
              isCompleted={isCompleted}
              soundMuted={soundMuted}
              showHintActive={showHintActive}
              hintDescription={hintDescription}
              coins={coins}
              maxUnlockedLevel={maxUnlockedLevel}
              onRestart={generateLevelBoard}
              onUndo={handleUndo}
              onShowHint={handleShowHint}
              onAddBottle={handleAddBottle}
              onToggleSound={handleToggleSound}
              onOpenTutorial={handleOpenTutorial}
              onChangeDifficulty={handleDifficultyChange}
              onNextLevel={handleNextLevel}
              onSkipLevel={handleSkipLevel}
              onSetLevel={handleSetLevel}
              onReplayLevel={handleReplayLevel}
              onTriggerAdReward={handleTriggerAdReward}
              onBackToHome={() => {
                gameAudio.playPop();
                setGamePhase('title');
              }}
            />
          </div>
        </div>
      )}

      {/* Guide overlay tutorial */}
      <Tutorial isOpen={tutorialOpen} onClose={handleCloseTutorial} />

      {/* Interstitial Informational Overlay Dialogs */}
      <AnimatePresence>
        {infoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInfoModal(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm pointer-events-auto"
            />

            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              className="relative w-full max-w-sm bg-[#111625] border border-neutral-800 rounded-3xl p-6 shadow-2xl pointer-events-auto text-slate-100"
              id="informational-overlay-dialog"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  {infoModal === 'about' && <Info className="h-5 w-5 text-cyan-400" />}
                  {infoModal === 'privacy' && <FileText className="h-5 w-5 text-emerald-400" />}
                  {infoModal === 'contact' && <Mail className="h-5 w-5 text-amber-500" />}
                  {infoModal === 'settings' && <Settings className="h-5 w-5 text-indigo-300" />}
                  <h3 className="font-sans text-sm font-black uppercase tracking-widest text-white">
                    {infoModal === 'about' && "About Us"}
                    {infoModal === 'privacy' && "Privacy Policy"}
                    {infoModal === 'contact' && "Contact Support"}
                    {infoModal === 'settings' && "Engine Settings"}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    gameAudio.playPop();
                    setInfoModal(null);
                  }}
                  className="p-1.5 bg-neutral-900 border border-neutral-800 rounded-xl hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs font-sans text-left leading-relaxed text-slate-300 max-h-[70vh] overflow-y-auto pr-1">
                {infoModal === 'about' && (
                  <div className="space-y-3 px-1">
                    <p className="font-sans text-xs font-bold text-cyan-400 uppercase tracking-widest">About Our Independent Design Agency</p>
                    <p>
                      Welcome to <strong>Galaxy Studio</strong>, a pioneering independent digital craft guild established to create meaningful, delightful, and highly polished puzzle experiences. We believe that modern game design has lost its soul to invasive trackers, unnecessary network dependencies, and aggressive monetization schemas. Our team stands firmly against these practices, choosing instead to focus purely on tactile beauty, structural mechanical integrity, and high-DPI visual fluidity.
                    </p>
                    <p>
                      <strong>Water Colour 2D</strong> is our flagship project, representing a delicate marriage of traditional fluid sorting puzzles with contemporary flat color palettes, smooth physics-like transitions, and customized audio synthesis. Our core goal from day one was to draft a highly performant offline playground that sharpens cognitive skills, relaxes spatial anxiety, and provides endless gameplay loops without ever requesting permissions to access your personal workspace or location statistics.
                    </p>
                    <p>
                      Every visual choice you see in the app—from the golden decorated victory crown with its glowing green gemstone, to the simulated test tubes, the liquid level curvatures, and the soft ambient glowing dark mode colors—has been handcrafted by passionate, real designers. We write standard, optimized TypeScript code without automatic boilerplate builders to preserve the highest level of craftsmanship.
                    </p>
                    <p>
                      Our gaming engine is engineered to run seamlessly even on legacy mobile browsers or low-powered computers. By utilizing modern web tech such as HTML5 canvas renders, pure CSS transitions, and local client-side performance models, we achieve a lightweight footprint of under a few megabytes. This allows the game to boot up instantaneously and work completely offline, rendering gorgeous, high-contrast liquid curves with zero frame-rate stuttering.
                    </p>
                    <p>
                      We dedicate our days to creating experiences that act as digital sanctuaries—safe zones where players of all ages can relax their minds, track logical progressions, and experience organic reward systems. We strongly value game-design honesty, which is why everything you unlock—from levels to extra tubes and helper hints—is earned through pure gameplay and interaction. Thank you for installing Water Colour 2D, and thank you for supporting the independent developer ecosystem!
                    </p>
                    <p>
                      At Galaxy Studio, we are constantly working to expand the horizons of modern modular design. If you love our vision, we welcome you to join our journey, share support with friends and family, and help us continue building independent, tracking-free software designed explicitly to celebrate human creativity.
                    </p>
                    <div className="bg-neutral-950/50 p-3.5 rounded-2xl border border-white/5 italic text-slate-400 mt-2">
                      "Real colors, calibrated glass tubes, responsive tactile clicks, and beautiful Web Audio. No databases, no tracking. Just pure relaxation, handcrafted for the human mind."
                    </div>
                  </div>
                )}

                {infoModal === 'privacy' && (
                  <div className="space-y-3 px-1 text-slate-300">
                    <p className="font-sans text-xs font-bold text-emerald-400 uppercase tracking-widest">Privacy Policy & Secure Data Manifesto</p>
                    <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 rounded-xl mb-2 text-center">
                      <p className="text-xs text-emerald-300 font-bold mb-1">Our Complete Live Policy can be viewed at:</p>
                      <a 
                        href="https://www.freeprivacypolicy.com/live/47e95744-6466-49a9-a33e-98874f91097e" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-sky-400 underline font-mono break-all hover:text-sky-300 word-break select-text select-all"
                      >
                        https://www.freeprivacypolicy.com/live/47e95744-6466-49a9-a33e-98874f91097e
                      </a>
                    </div>
                    <p>
                      At <strong>Galaxy Studio</strong>, we treat your digital privacy as a fundamental, non-negotiable human right. We explicitly reject the standard modern practice of silent tracking, telemetry collection, advertising profile building, and personal identity monetization. We believe that your gameplay statistics, device identifiers, and logical puzzle patterns belong strictly to you and should never leave your physical device.
                    </p>
                    <p>
                      Therefore, we stand by a strict, comprehensive pledge: <strong>Water Colour 2D never collects, stores, parses, analyzes, shares, or transmits any form of personal or private player data.</strong>
                    </p>
                    <p>
                      To ensure this protection remains ironclad, our application has been engineered from the ground up to run entirely offline inside your local browser sandbox. All dynamic state management, randomized level generation, solver path searching algorithms, coin balance calculations, and move counters are processed in local memory variables. There are absolute zero tracking pixels, analytics SDKs, cloud-hosted backends, or data warehouses integrated into our workspace.
                    </p>
                    <p>
                      Any progression variables—such as your current game level, highest level unlocked naturally, difficulty selectors, setting preferences, and accumulated game coins—are stored securely inside your browser's private Web Storage slot (`localStorage`). This data is fully under your sovereignty: you can examine it, clear it through browser privacy settings, or reset it at any time. We do not use persistent cookies to map browser sessions.
                    </p>
                    <p>
                      In our simulated Ad Video Reward mechanism, we run a completely local, self-contained timer countdown simulation inside your browser threads. This allows you to accumulate reward coins for free without sending your IP address, geolocation metrics, or consumer attributes to commercial advertising nodes. It serves as a secure, local simulation that gives you immediate access to gameplay rewards without sacrificing your personal security.
                    </p>
                    <p>
                      By downloading and playing Water Colour 2D, you are stepping into a secure offline environment. Our game requires no internet permissions, no camera accesses, no storage scopes, and no account registrations. Play with complete focus and peace of mind, knowing that you are fully secure and that your personal space is absolutely protected!
                    </p>
                  </div>
                )}

                {infoModal === 'contact' && (
                  <div className="space-y-3 px-1">
                    <p className="font-sans text-xs font-bold text-amber-500 uppercase tracking-widest">Contact Support & Developer Correspondence</p>
                    <p>
                      We represent a humble, human-built studio, and we are incredibly passionate about hearing from our global playing community! Whether you have found an interesting liquid combination, want to propose a beautiful custom design for our test tubes, found a visual layout glitch on a specific screen, or simply want to share your positive experiences, Galaxy Studio guarantees direct, personal communication.
                    </p>
                    <p>
                      We explicitly reject robotic corporate automated responders and generic support reply scripts. When you write to us, you are communicating directly with the head game designer. Every single piece of correspondence receives an authentic, friendly response within 24 hours. We welcome your honest criticism, feedback, bug reports, and features requests as they help us make our game the finest puzzle applet in the world.
                    </p>
                    <p>
                      To contact our official support desk or submit feedback, please write to us at our dedicated creator mailbox. We recommend specifying your device type, operating system version, and a brief description of any issue or feature you would like to discuss to help us analyze the context:
                    </p>
                    <div className="bg-[#182138] border border-cyan-500/20 rounded-2xl p-4 space-y-3">
                      <div className="flex flex-col">
                        <span className="text-3xs font-extrabold text-cyan-400 uppercase tracking-wider mb-0.5">Official support correspondence desk</span>
                        <a href="mailto:watersort@gmail.com" className="font-mono text-xs font-bold text-white hover:text-cyan-300 transition-colors break-all underline">
                          watersort@gmail.com
                        </a>
                      </div>

                      <div className="flex gap-2">
                        {/* Copy button */}
                        <button
                          onClick={handleCopyEmail}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 font-sans text-3xs font-black text-slate-950 uppercase tracking-widest transition-all cursor-pointer shadow-md shadow-cyan-500/10 border-none"
                        >
                          {copiedEmail ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedEmail ? "Copied" : "Copy Email"}</span>
                        </button>

                        <a
                          href="mailto:watersort@gmail.com"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 font-sans text-3xs font-black text-white uppercase tracking-widest transition-all text-center"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>Mail Native</span>
                        </a>
                      </div>
                    </div>
                    <p>
                      When suggesting features, you can outline options like custom backgrounds, alternate sound selection schemes, or different layout densities. We regularly implement community proposals in our weekly software upgrades to keep our game dynamic, and we always credit the players who proposed them. Thank you once again for playing and being an active part of the Galaxy Studio family!
                    </p>
                  </div>
                )}

                {infoModal === 'settings' && (
                  <div className="space-y-5 px-1 py-1">
                    <p className="font-sans text-xs font-bold text-indigo-400 uppercase tracking-widest">Personalize Your Fluid Puzzle</p>
                    
                    {/* Theme Preference Settings Selector */}
                    <div className="space-y-2">
                      <label className="text-3xs font-extrabold uppercase tracking-wider text-slate-400 block">
                        Visual Theme preference
                      </label>
                      <div className="grid grid-cols-2 gap-2 bg-[#090d16] p-1.5 rounded-2xl border border-white/5">
                        <button
                          onClick={() => {
                            setTheme('black');
                            gameAudio.playPop();
                          }}
                          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-sans text-3xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                            theme === 'black'
                              ? "bg-slate-800 text-white shadow-md border-t border-slate-700/50"
                              : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          <span>Black Theme</span>
                        </button>
                        <button
                          onClick={() => {
                            setTheme('white');
                            gameAudio.playPop();
                          }}
                          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-sans text-3xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                            theme === 'white'
                              ? "bg-amber-400 text-slate-950 shadow-md border-t border-amber-300"
                              : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          <span>White Theme</span>
                        </button>
                      </div>
                    </div>

                    {/* Audio & Sounds Setting */}
                    <div className="space-y-2">
                      <label className="text-3xs font-extrabold uppercase tracking-wider text-slate-400 block">
                        Audio / Sound Clicks
                      </label>
                      <button
                        onClick={() => {
                          handleToggleSound();
                          gameAudio.playPop();
                        }}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          soundMuted
                            ? "bg-rose-950/20 border-rose-500/20 text-rose-400 hover:bg-rose-950/30"
                            : "bg-emerald-950/20 border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/30"
                        }`}
                      >
                        <span className="font-sans text-3xs font-black uppercase tracking-widest">
                          {soundMuted ? "Muted / Silent System" : "Sound Enabled"}
                        </span>
                        <span>
                          {soundMuted ? "❌" : "🔈"}
                        </span>
                      </button>
                    </div>

                    <div className="bg-[#090d16] p-3.5 rounded-2xl border border-white/5 space-y-1.5">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-300">Technical Engine Specs</h4>
                      <div className="flex justify-between font-mono text-[9px] text-slate-500">
                        <span>VERSION:</span>
                        <span className="font-bold text-slate-400">v1.2.0-STABLE</span>
                      </div>
                      <div className="flex justify-between font-mono text-[9px] text-slate-500">
                        <span>MAX LEVEL RANGE:</span>
                        <span className="font-bold text-slate-400">100,000 BOARDS</span>
                      </div>
                      <div className="flex justify-between font-mono text-[9px] text-slate-500">
                        <span>AUDIO ENGINE:</span>
                        <span className="font-bold text-slate-400">HTML5 WEB AUDIO API</span>
                      </div>
                      <div className="flex justify-between font-mono text-[9px] text-slate-500">
                        <span>SOLVER STACK:</span>
                        <span className="font-bold text-slate-400">DEPTH FIRST (OPTIMIZED)</span>
                      </div>
                    </div>

                    {/* Danger Zone: Reset Entire Game state */}
                    <div className="space-y-2 border-t border-rose-500/10 pt-4">
                      <label className="text-3xs font-extrabold uppercase tracking-wider text-rose-400 block font-black">
                        Danger Zone
                      </label>
                      <button
                        onClick={handleGlobalRestartGame}
                        className="w-full flex items-center justify-center gap-2 p-3 pb-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-sans text-3xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-md shadow-rose-600/10 border-none"
                        id="danger-restart-entire-game-btn"
                      >
                        <RefreshCw className="h-4 w-4 text-white animate-spin" style={{ animationDuration: '6s' }} />
                        <span>Restart Entire Game (Wipe Data)</span>
                      </button>
                      <p className="text-[10px] text-slate-400 font-sans leading-normal">
                        This will completely clear your current level progression, highest level unlocked, difficulty state, and reset your coins balance to 0.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-white/5">
                <button
                  onClick={() => {
                    gameAudio.playPop();
                    setInfoModal(null);
                  }}
                  className="w-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 rounded-xl py-2.5 font-sans text-2xs font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-all cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Simulated Reward Ad Overlay Screen */}
      <AnimatePresence>
        {adActive && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 p-6 pointer-events-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-sm w-full bg-[#111114] border border-neutral-800 rounded-3xl p-8 text-center shadow-2xl relative"
            >
              <div className="flex items-center justify-center mb-4">
                <div className="p-4 bg-amber-500/10 text-amber-400 rounded-2xl animate-bounce">
                  <Coins className="h-10 w-10 fill-amber-400 stroke-amber-600" />
                </div>
              </div>

              <span className="text-4xs font-black px-4 py-1.5 bg-neutral-900 text-[#38BDF8] border border-neutral-850 rounded-full uppercase tracking-widest font-sans inline-block mb-3.5">
                Simulated Ad Network Reward
              </span>

              <h3 className="font-sans text-lg font-black text-white mb-2 uppercase tracking-wide">
                WATER COLOUR 2D PREMIUM
              </h3>
              
              <p className="font-sans text-xs text-slate-400 mb-6 leading-relaxed">
                "Experience absolute pure high DPI graphics, zero latency, and beautiful minimal colors. Power up your memory with Water Sort!" Let the ad complete.
              </p>

              {/* Countdown radial simulation */}
              <div className="flex flex-col items-center justify-center my-6 relative">
                <div className="w-16 h-16 rounded-full border-4 border-neutral-950 border-t-[#38BDF8] animate-spin absolute" />
                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-neutral-900 font-sans text-xl font-black text-slate-100">
                  {adCountdown}s
                </div>
              </div>

              <p className="font-sans text-xs text-emerald-400 font-extrabold animate-pulse uppercase tracking-wider">
                Simulating Ad Stream...
              </p>

              <div className="mt-8 text-4xs font-sans text-slate-600 font-bold uppercase tracking-widest leading-relaxed">
                DO NOT ESCAPE • GET +50 COINS IMMEDIATELY BEFORE RETRYING
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ShopModal
        isOpen={shopOpen}
        onClose={() => setShopOpen(false)}
        coins={coins}
        onDeductCoins={(amount) => setCoins((c) => Math.max(0, c - amount))}
        unlockedSkinIds={unlockedSkinIds}
        onUnlockSkin={(skinId) => setUnlockedSkinIds((prev) => [...prev, skinId])}
        equippedSkinId={equippedSkinId}
        onEquipSkin={setEquippedSkinId}
        unlockedBgIds={unlockedBgIds}
        onUnlockBg={(bgId) => setUnlockedBgIds((prev) => [...prev, bgId])}
        equippedBgId={equippedBgId}
        onEquipBg={setEquippedBgId}
        showNotification={showNotification}
      />

    </div>
  );
}
