import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Coins, ShoppingBag, Palette, Sparkles, Check, Lock, Play } from "lucide-react";
import { BOTTLE_SKINS, BACKGROUND_THEMES, BottleSkin, BackgroundTheme } from "../data/skins";
import { gameAudio } from "../utils/audio";

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  coins: number;
  onDeductCoins: (amount: number) => void;
  unlockedSkinIds: string[];
  onUnlockSkin: (skinId: string) => void;
  equippedSkinId: string;
  onEquipSkin: (skinId: string) => void;
  unlockedBgIds: string[];
  onUnlockBg: (bgId: string) => void;
  equippedBgId: string;
  onEquipBg: (bgId: string) => void;
  showNotification: (msg: string) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  coins,
  onDeductCoins,
  unlockedSkinIds,
  onUnlockSkin,
  equippedSkinId,
  onEquipSkin,
  unlockedBgIds,
  onUnlockBg,
  equippedBgId,
  onEquipBg,
  showNotification,
}) => {
  const [activeTab, setActiveTab] = useState<"skins" | "backgrounds">("skins");

  if (!isOpen) return null;

  // Buy Bottle Skin handler
  const handleBuySkin = (skin: BottleSkin) => {
    if (coins >= skin.cost) {
      onDeductCoins(skin.cost);
      onUnlockSkin(skin.id);
      onEquipSkin(skin.id);
      gameAudio.playVictory();
      showNotification(`Unlocked & Equipped: ${skin.name}! 💎🏷️`);
    } else {
      gameAudio.playPop();
      showNotification(`Need ${skin.cost - coins} more 🪙 to buy this skin!`);
    }
  };

  // Equip Bottle Skin handler
  const handleEquipSkin = (skin: BottleSkin) => {
    onEquipSkin(skin.id);
    gameAudio.playPop();
  };

  // Buy Background Theme handler
  const handleBuyBg = (bg: BackgroundTheme) => {
    if (coins >= bg.cost) {
      onDeductCoins(bg.cost);
      onUnlockBg(bg.id);
      onEquipBg(bg.id);
      gameAudio.playVictory();
      showNotification(`Unlocked & Equipped BG: ${bg.name}! 🎨🌌`);
    } else {
      gameAudio.playPop();
      showNotification(`Need ${bg.cost - coins} more 🪙 to buy this background!`);
    }
  };

  // Equip Background Theme handler
  const handleEquipBg = (bg: BackgroundTheme) => {
    onEquipBg(bg.id);
    gameAudio.playPop();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-hidden select-none">
        
        {/* Animated Main Shop Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-[#0b0e17] border border-slate-800/80 rounded-3xl w-full max-w-md h-[82vh] flex flex-col overflow-hidden shadow-2xl"
          id="premium-game-shop-modal"
        >
          {/* Header area with Live Coin Wallet balances */}
          <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#07090f] shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 rounded-xl">
                <ShoppingBag className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h2 className="font-sans text-base font-black text-white uppercase tracking-wider">Premium Customizer</h2>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest uppercase">Galaxy Level Skins</p>
              </div>
            </div>

            {/* Wallet Balance widget */}
            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-3.5 py-1.5 rounded-full shadow-inner select-none transition-all">
              <Coins className="h-4 w-4 text-amber-400 animate-pulse" />
              <span className="font-mono text-xs font-black text-amber-200">{coins}</span>
              <span className="text-[10px] text-amber-500 font-bold">🪙</span>
            </div>
          </div>

          {/* Dynamic Tabs selectors (BOTTLE SKINS vs BACKGROUNDS) */}
          <div className="px-4 py-3 bg-[#090b12] border-b border-white/5 flex gap-2 shrink-0">
            <button
              onClick={() => {
                setActiveTab("skins");
                gameAudio.playPop();
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-3xs font-black uppercase tracking-widest transition-all cursor-pointer border-none ${
                activeTab === "skins"
                  ? "bg-gradient-to-r from-cyan-600 to-sky-500 text-white shadow-lg shadow-cyan-600/10"
                  : "bg-black/30 hover:bg-black/50 text-slate-400 hover:text-slate-200"
              }`}
              id="shop-skins-tab-btn"
            >
              <Sparkles className="h-3 w-3" />
              <span>Bottle Skins (50)</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("backgrounds");
                gameAudio.playPop();
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-3xs font-black uppercase tracking-widest transition-all cursor-pointer border-none ${
                activeTab === "backgrounds"
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-605/10"
                  : "bg-black/30 hover:bg-black/50 text-slate-400 hover:text-slate-200"
              }`}
              id="shop-backgrounds-tab-btn"
            >
              <Palette className="h-3 w-3" />
              <span>Backdrops (10)</span>
            </button>
          </div>

          {/* Scrollable Shop Content Grid */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" id="shop-items-panel">
            {activeTab === "skins" ? (
              <div className="grid grid-cols-2 gap-3 pb-6">
                {BOTTLE_SKINS.map((skin) => {
                  const isUnlocked = unlockedSkinIds.includes(skin.id);
                  const isEquipped = equippedSkinId === skin.id;

                  return (
                    <motion.div
                      key={skin.id}
                      whileHover={{ scale: 1.02 }}
                      className={`relative flex flex-col justify-between p-3.5 rounded-2xl border bg-black/40 text-center transition-all ${
                        isEquipped
                          ? "border-cyan-500 bg-cyan-950/5 shadow-md shadow-cyan-950/10"
                          : isUnlocked
                          ? "border-slate-800/80 hover:border-slate-700 hover:bg-black/50"
                          : "border-slate-900 bg-black/50 opacity-90"
                      }`}
                    >
                      {/* Active tag / Badge overlay */}
                      {isEquipped && (
                        <span className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-widest bg-cyan-500 text-slate-950 px-1.5 py-0.5 rounded-full">
                          Active
                        </span>
                      )}

                      {/* Visual Live Preview of the Skin Bottle Shape */}
                      <div className="h-28 flex items-center justify-center relative mt-2 mb-3 bg-slate-950/60 rounded-xl border border-white/5 shadow-inner">
                        <div
                          className="w-10 h-20 rounded-b-2xl border-2 flex flex-col justify-end items-center relative overflow-hidden transition-all duration-300"
                          style={{
                            borderColor: skin.glassColor,
                            boxShadow: `0 0 12px ${skin.glowColor}`,
                          }}
                        >
                          {/* Beautiful simulated fluid layers of vibrant colours */}
                          <div className="w-full h-4 bg-orange-500/80 border-t border-orange-400" />
                          <div className="w-full h-4 bg-cyan-500/80 border-t border-cyan-400" />
                          <div className="w-full h-4 bg-rose-500/80 border-t border-rose-400" />

                          {/* Float Custom Emoji sticker overlay decal printed on glass */}
                          {skin.sticker && (
                            <span className="absolute top-[25%] text-base select-none z-10 animate-bounce" style={{ animationDuration: '3.5s' }}>
                              {skin.sticker}
                            </span>
                          )}

                          {/* Reflection highlight */}
                          <div className="absolute left-1 top-1 bottom-1 w-0.5 bg-white/10" />
                        </div>
                      </div>

                      {/* Label metadata */}
                      <div className="mb-3.5 space-y-0.5">
                        <h4 className="font-sans text-xs font-black text-slate-100 truncate tracking-wide">{skin.name}</h4>
                        <p className="text-[9px] font-mono text-slate-400 font-semibold uppercase tracking-wider">
                          {skin.cost === 0 ? "Default" : `${skin.cost.toLocaleString()} COINS`}
                        </p>
                      </div>

                      {/* CTA Trigger Button */}
                      {isEquipped ? (
                        <button
                          disabled
                          className="w-full bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 py-2 rounded-xl text-4xs font-black uppercase tracking-widest cursor-default border-none"
                        >
                          Equipped
                        </button>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => handleEquipSkin(skin)}
                          className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-sans py-2 rounded-xl text-4xs font-black uppercase tracking-widest cursor-pointer select-none border-none transition-colors"
                        >
                          Equip
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBuySkin(skin)}
                          className="w-full flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-sans py-2 rounded-xl text-4xs font-black uppercase tracking-widest cursor-pointer select-none border-none transition-colors"
                        >
                          <Lock className="h-2.5 w-2.5 text-slate-950" />
                          <span>Unlock</span>
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3 pb-6">
                {BACKGROUND_THEMES.map((themeItem) => {
                  const isUnlocked = unlockedBgIds.includes(themeItem.id);
                  const isEquipped = equippedBgId === themeItem.id;

                  return (
                    <motion.div
                      key={themeItem.id}
                      whileHover={{ scale: 1.01 }}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isEquipped
                          ? "border-indigo-500 bg-indigo-950/5 shadow-md shadow-indigo-950/5"
                          : isUnlocked
                          ? "border-slate-800 bg-black/40 hover:border-slate-700 hover:bg-black/50"
                          : "border-slate-900 bg-black/40 opacity-90"
                      }`}
                    >
                      {/* Left: mini visual preview box representing the background theme */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-14 h-14 rounded-xl shadow-inner border border-white/5 overflow-hidden flex flex-col justify-around p-1.5 ${themeItem.gradientClass}`}
                        >
                          {/* Mini bottles drawings inside the thumbnail preview */}
                          <div className="flex justify-between items-end h-full px-0.5 gap-0.5">
                            <div className="w-2.5 h-10 rounded-b-md border border-white/10 flex flex-col justify-end">
                              <div className="w-full h-3 bg-orange-400" />
                              <div className="w-full h-3 bg-cyan-400" />
                            </div>
                            <div className="w-2.5 h-10 rounded-b-md border border-white/10 flex flex-col justify-end">
                              <div className="w-full h-3 bg-pink-400" />
                              <div className="w-full h-4 bg-emerald-400" />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-sans text-xs font-black text-slate-100 tracking-wide">{themeItem.name}</h4>
                          <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                            {themeItem.cost === 0 ? "Default Backdrop" : `${themeItem.cost.toLocaleString()} COINS 🪙`}
                          </p>
                        </div>
                      </div>

                      {/* Right Control Trigger Button */}
                      <div>
                        {isEquipped ? (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase text-indigo-400 tracking-wider">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                            <span>Equipped</span>
                          </span>
                        ) : isUnlocked ? (
                          <button
                            onClick={() => handleEquipBg(themeItem)}
                            className="bg-neutral-800 hover:bg-neutral-700 text-white font-sans text-4xs font-black uppercase tracking-widest px-4 py-2.5 rounded-xl cursor-pointer select-none border-none transition-colors"
                          >
                            Equip
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBuyBg(themeItem)}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-sans text-4xs font-black uppercase tracking-widest px-4 py-2.5 rounded-xl flex items-center gap-1 cursor-pointer select-none border-none transition-colors"
                          >
                            <Lock className="h-3 w-3 text-slate-950" />
                            <span>Unlock</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Area with safe close trigger */}
          <div className="p-4 border-t border-white/5 bg-[#07090f] flex gap-3 shrink-0">
            <button
              onClick={() => {
                gameAudio.playPop();
                onClose();
              }}
              className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-slate-400 hover:text-white rounded-2xl py-3.5 font-sans text-3xs font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              Back to Main Board
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
