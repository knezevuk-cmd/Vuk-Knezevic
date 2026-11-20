import React from 'react';
import { X } from 'lucide-react';
import { Language, TRANSLATIONS } from '../game/i18n';
import { THREAT_GUIDE } from '../game/wings';
import { ResilientImage } from './ResilientImage';

interface FieldGuideModalProps {
  open: boolean;
  language: Language;
  onClose: () => void;
}

export const FieldGuideModal: React.FC<FieldGuideModalProps> = ({ open, language, onClose }) => {
  if (!open) return null;

  const t = TRANSLATIONS[language];

  const clearanceMeta: Record<string, { label: string; colorClass: string }> = {
    DODGE: { label: t.clearanceDodge, colorClass: 'text-red-400' },
    JUMP: { label: t.clearanceJump, colorClass: 'text-amber-400' },
    SLIDE: { label: t.clearanceSlide, colorClass: 'text-emerald-400' },
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="field-guide-title"
    >
      <div className="w-full max-w-2xl max-h-[88dvh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div>
            <h2
              id="field-guide-title"
              className="font-display text-xl font-bold text-slate-100"
            >
              {t.threatGuide}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{t.guideSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.backToHallway}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-white/5">
              <ResilientImage
                src="/src/assets/images/janitor_portrait_1795196414291.jpg"
                alt={t.janitorName}
                className="h-14 w-14 rounded-xl object-cover shrink-0"
                fallbackLabel={t.janitorName}
              />
              <div>
                <h3 className="font-display text-sm font-bold text-slate-100">
                  {t.janitorName}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">{t.gocaDesc}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-amber-400/20">
              <ResilientImage
                src="/src/assets/images/janitor_zir_portrait_1795198858052.jpg"
                alt={t.zirName}
                className="h-14 w-14 rounded-xl object-cover shrink-0"
                fallbackLabel={t.zirName}
              />
              <div>
                <h3 className="font-display text-sm font-bold text-amber-300">
                  {t.zirName}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">{t.zirDesc}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-rose-400/25 sm:col-span-2">
              <ResilientImage
                src="/src/assets/images/principal_direktorka_portrait_1795204688325.jpg"
                alt={t.direktorkaName}
                className="h-14 w-14 rounded-xl object-cover shrink-0"
                fallbackLabel={t.direktorkaName}
              />
              <div>
                <h3 className="font-display text-sm font-bold text-rose-300">
                  {t.direktorkaName}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">{t.direktorkaDesc}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-white/5">
              <ResilientImage
                src="/src/assets/images/student_runner_portrait_1795154776247.jpg"
                alt={t.studentTitle}
                className="h-14 w-14 rounded-xl object-cover shrink-0"
                fallbackLabel={t.studentTitle}
              />
              <div>
                <h3 className="font-display text-sm font-bold text-slate-100">
                  {t.studentTitle}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">{t.studentDesc}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-white/5">
              <ResilientImage
                src="/src/assets/images/sentient_locker_portrait_1795154776638.jpg"
                alt={t.lockerTitle}
                className="h-14 w-14 rounded-xl object-cover shrink-0"
                fallbackLabel={t.lockerTitle}
              />
              <div>
                <h3 className="font-display text-sm font-bold text-slate-100">
                  {t.lockerTitle}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">{t.lockerDesc}</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-white/10">
            {THREAT_GUIDE.map((threat) => {
              const meta = clearanceMeta[threat.clearance];
              return (
                <div key={threat.kind} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="font-display text-base font-bold text-slate-100">
                      {threat.name[language]}
                    </h4>
                    <span className={`text-xs font-semibold ${meta.colorClass}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mt-1">{threat.description[language]}</p>
                  <p className="text-xs text-slate-400 mt-1">{threat.counterplay[language]}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/10 bg-slate-950/50 shrink-0 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-6 rounded-xl bg-amber-500 text-slate-950 font-semibold text-sm hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
          >
            {t.backToHallway}
          </button>
        </div>
      </div>
    </div>
  );
};
