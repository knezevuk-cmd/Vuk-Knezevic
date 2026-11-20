import React from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import { Language } from '../game/i18n';

interface MobileControlsProps {
  language: Language;
  onLeft: () => void;
  onRight: () => void;
  onJump: () => void;
  onSlide: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  language,
  onLeft,
  onRight,
  onJump,
  onSlide,
}) => {
  const trigger = (fn: () => void) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  const jumpLabel = language === 'sr' ? 'Skok' : 'Jump';
  const slideLabel = language === 'sr' ? 'Klizaj' : 'Slide';

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between px-4 pb-5 pt-2 sm:px-6 sm:pb-6"
      style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
    >
      {/* Left thumb: Lane steer */}
      <div className="pointer-events-auto flex items-center gap-3">
        <button
          type="button"
          onPointerDown={trigger(onLeft)}
          aria-label={language === 'sr' ? 'Levo' : 'Move Left'}
          className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-slate-900/75 text-slate-100 backdrop-blur-md active:scale-95 active:bg-amber-500 active:text-slate-950 transition-transform"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          onPointerDown={trigger(onRight)}
          aria-label={language === 'sr' ? 'Desno' : 'Move Right'}
          className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-slate-900/75 text-slate-100 backdrop-blur-md active:scale-95 active:bg-amber-500 active:text-slate-950 transition-transform"
        >
          <ArrowRight className="h-6 w-6" />
        </button>
      </div>

      {/* Right thumb: Jump & Slide */}
      <div className="pointer-events-auto flex items-center gap-3">
        <button
          type="button"
          onPointerDown={trigger(onSlide)}
          aria-label={slideLabel}
          className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl border border-emerald-400/25 bg-slate-900/75 text-emerald-300 backdrop-blur-md active:scale-95 active:bg-emerald-500 active:text-slate-950 transition-transform"
        >
          <ArrowDown className="h-5 w-5" />
          <span className="text-[10px] font-semibold leading-none mt-0.5">{slideLabel}</span>
        </button>
        <button
          type="button"
          onPointerDown={trigger(onJump)}
          aria-label={jumpLabel}
          className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl border border-amber-400/30 bg-slate-900/75 text-amber-300 backdrop-blur-md active:scale-95 active:bg-amber-500 active:text-slate-950 transition-transform"
        >
          <ArrowUp className="h-5 w-5" />
          <span className="text-[10px] font-semibold leading-none mt-0.5">{jumpLabel}</span>
        </button>
      </div>
    </div>
  );
};
