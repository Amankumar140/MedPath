import React, { useState } from "react";

export function EmergencyBanner({ compact = false }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  if (compact) {
    return (
      <aside 
        className="bg-red-500/10 dark:bg-red-950/40 border border-red-500/25 px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 text-xs"
        role="region"
        aria-label="Medical emergency notice"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-[18px] shrink-0">
            e911_emergency
          </span>
          <span className="text-red-900 dark:text-red-200 truncate">
            <strong>Emergency?</strong> Severe symptoms need instant medical care.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="tel:112"
            className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white font-semibold px-2.5 py-1 rounded-lg text-xs transition-colors"
            title="Call National Emergency 112"
          >
            <span className="material-symbols-outlined text-[14px]">call</span>
            Call 112
          </a>
          <button
            onClick={() => setDismissed(true)}
            className="text-red-400 hover:text-red-700 p-0.5 rounded cursor-pointer"
            aria-label="Dismiss emergency notice"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside 
      className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/20 border border-red-200 dark:border-red-900/50 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
      role="region"
      aria-label="Urgent medical assistance helpline notice"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-red-600/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-[22px]">e911_emergency</span>
        </div>
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-300 flex items-center gap-1.5">
            Emergency Notice
            <span className="font-normal text-[11px] text-red-700 dark:text-red-400 normal-case">• Decision Support Only</span>
          </h4>
          <p className="text-xs text-red-900/80 dark:text-red-200 leading-relaxed max-w-2xl">
            If you are experiencing severe chest pain, sudden numbness, uncontrolled bleeding, or breathing difficulty, call national emergency services or visit the nearest emergency room immediately.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        <a
          href="tel:112"
          className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold px-3.5 py-1.5 rounded-full text-xs shadow-xs hover:shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">call</span>
          Emergency (112)
        </a>
        <a
          href="tel:102"
          className="inline-flex items-center gap-1.5 bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-200 dark:hover:bg-red-900/60 font-semibold px-3 py-1.5 rounded-full text-xs transition-colors"
        >
          Ambulance (102)
        </a>
        <button
          onClick={() => setDismissed(true)}
          className="text-red-400 hover:text-red-600 dark:hover:text-red-200 p-1 rounded-full cursor-pointer ml-1"
          aria-label="Dismiss banner"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </aside>
  );
}

export default EmergencyBanner;
