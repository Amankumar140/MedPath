import React from "react";

/**
 * Premium accessible Button primitive supporting multiple variants, sizes, and states.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
  disabled = false,
  loading = false,
  type = "button",
  className = "",
  ariaLabel,
  icon,
  iconRight,
  ...props
}) {
  const baseStyles = "inline-flex items-center justify-center font-bold transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 select-none hover-lift active:scale-95";

  const variants = {
    primary: "premium-gradient-primary text-on-primary hover:opacity-95 shadow-md",
    secondary: "bg-secondary text-on-secondary hover:bg-secondary/95 shadow-md",
    outline: "border border-outline-variant/50 text-on-surface hover:bg-surface-container-low dark:border-outline-variant/30",
    ghost: "text-on-surface hover:bg-surface-container-low hover:text-primary",
    danger: "bg-error text-on-error hover:bg-error/90 shadow-md",
    success: "bg-tertiary-container/30 text-on-tertiary-container dark:text-tertiary border border-tertiary/10 hover:bg-tertiary-container/40 shadow-sm",
  };

  const sizes = {
    sm: "px-3.5 py-1.5 rounded-lg text-label-sm gap-1.5",
    md: "px-5 py-2.5 rounded-xl text-label-md gap-2",
    lg: "px-6 py-3.5 rounded-2xl text-label-lg gap-2.5",
  };

  const currentVariant = variants[variant] || variants.primary;
  const currentSize = sizes[size] || sizes.md;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${currentVariant} ${currentSize} ${className}`}
      aria-label={ariaLabel}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div 
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" 
          role="status" 
          aria-label="Loading..."
        />
      ) : (
        icon && <span className="material-symbols-outlined text-[18px] shrink-0" aria-hidden="true">{icon}</span>
      )}
      
      {children}

      {!loading && iconRight && (
        <span className="material-symbols-outlined text-[18px] shrink-0" aria-hidden="true">{iconRight}</span>
      )}
    </button>
  );
}

export default Button;
