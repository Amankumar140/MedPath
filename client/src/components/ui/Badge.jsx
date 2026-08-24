import React from "react";

/**
 * Premium Status Badge/Tag primitive supporting standard layout categories.
 */
export function Badge({
  children,
  variant = "neutral",
  className = "",
  icon,
  ...props
}) {
  const baseStyles = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm select-none shrink-0";

  const variants = {
    neutral: "bg-surface-container-low text-on-surface border-outline-variant/10",
    primary: "bg-primary-container/20 text-primary dark:bg-primary-container/30 dark:text-primary-fixed border-primary-container/25",
    secondary: "bg-secondary-container/20 text-secondary border-secondary/10",
    success: "bg-tertiary-container/30 text-on-tertiary-container dark:text-tertiary border-tertiary/10",
    warning: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    purple: "bg-[#6366f1]/10 text-[#6366f1] dark:text-[#818cf8] border-[#6366f1]/20",
    danger: "bg-error/10 text-error border-error/20",
  };

  const currentVariant = variants[variant] || variants.neutral;

  return (
    <span
      className={`${baseStyles} ${currentVariant} ${className}`}
      {...props}
    >
      {icon && (
        <span className="material-symbols-outlined text-[12px] shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}

export default Badge;
