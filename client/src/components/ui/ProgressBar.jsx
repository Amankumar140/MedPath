import React from "react";

/**
 * Premium Progress Bar primitive supporting smooth transitions and accessibility tags.
 */
export function ProgressBar({
  value = 0,
  max = 100,
  label,
  showValue = false,
  variant = "primary",
  className = "",
  ...props
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const variants = {
    primary: "bg-primary dark:bg-primary-fixed",
    secondary: "bg-secondary",
    success: "bg-tertiary",
  };

  const currentVariant = variants[variant] || variants.primary;

  return (
    <div className={`space-y-2 w-full ${className}`} {...props}>
      {(label || showValue) && (
        <div className="flex justify-between items-center text-label-sm font-bold text-outline">
          {label && <span>{label}</span>}
          {showValue && <span>{Math.round(percentage)}%</span>}
        </div>
      )}

      <div 
        className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden border border-outline-variant/10 shadow-inner"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div 
          className={`h-full transition-all duration-500 rounded-full ${currentVariant}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
