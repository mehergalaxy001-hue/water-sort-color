/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, CheckCircle, Info, Sparkles } from "lucide-react";

interface TutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Tutorial: React.FC<TutorialProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop screen */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#4A6D7C]/30 backdrop-blur-sm"
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ scale: 0.92, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 15, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 280 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-md"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100/50 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F1F2] text-[#7AA7B5]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="font-sans text-lg font-black text-[#4A6D7C] tracking-wide">
                  How to Play Water Sort
                </h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                id="close-tutorial-btn"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Steps guidelines */}
            <div className="mt-5 space-y-4 font-sans text-sm text-[#4A6D7C]">
              <div className="flex gap-3 items-start">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F1F2] text-xs font-black text-[#7AA7B5] mt-0.5">
                  1
                </span>
                <p>
                  Tap a glass bottle to select it, then tap another bottle to{" "}
                  <strong className="text-[#4A6D7C] font-black">pour colored liquid</strong> into it.
                </p>
              </div>

              <div className="flex gap-3 items-start">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F1F2] text-xs font-black text-[#7AA7B5] mt-0.5">
                  2
                </span>
                <p>
                  You can only pour if the target bottle has{" "}
                  <strong className="text-[#4A6D7C] font-black">matching top color</strong> and has
                  enough empty space, or if the target bottle is{" "}
                  <strong className="text-[#4A6D7C] font-black">completely empty</strong>.
                </p>
              </div>

              <div className="flex gap-3 items-start">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F1F2] text-xs font-black text-[#7AA7B5] mt-0.5">
                  3
                </span>
                <p>
                  Your goal is to organize the layers so that each bottle contains only{" "}
                  <span className="font-black text-[#4A6D7C]">one single uniform color</span>,
                  or is left totally empty.
                </p>
              </div>

              <div className="rounded-2xl bg-[#E8F1F2]/60 border border-white/50 p-3 flex gap-2 text-xs text-[#4A6D7C] leading-relaxed">
                <Info className="h-4.5 w-4.5 text-[#7AA7B5] shrink-0 mt-0.5" />
                <span>
                  <strong>Tip:</strong> If you get stuck, use <span className="font-bold underline">Undo</span> to roll back moves, or click{" "}
                  <span className="font-bold underline">Add Bottle</span> to spawn an extra empty bottle. Valid moves can also be highlighted using the <span className="font-bold underline">Hint</span> system!
                </span>
              </div>
            </div>

            {/* Confirmation CTA */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-2xl bg-[#4A6D7C] px-5 py-2.5 w-full justify-center text-sm font-extrabold text-white hover:bg-[#3d5a67] active:scale-98 transition-all shadow-md shadow-[#4A6D7C]/15"
                id="tutorial-start-game-btn"
              >
                <CheckCircle className="h-4 w-4" />
                Got It, Let's Flow
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
