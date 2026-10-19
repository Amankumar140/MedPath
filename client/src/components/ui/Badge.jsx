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
  const baseStyles = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium tracking-normal select-none shrink-0 border transition-all duration-200";

  const variants = {
    neutral: "bg-surface-container-low text-on-surface border-outline-variant/30",
    secondary: "bg-secondary-container text-on-secondary-container border-secondary-container",
    primary: "bg-primary-container text-on-primary-container border-primary-container",
    tertiary: "bg-tertiary-container text-on-tertiary-container border-tertiary-container",
    success: "bg-tertiary-container text-on-tertiary-container border-tertiary-container",
    warning: "bg-secondary-container text-on-secondary-container border-outline-variant/30",
    purple: "bg-primary-container text-on-primary-container border-primary-container",
    danger: "bg-error-container text-on-error-container border-error-container",
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
