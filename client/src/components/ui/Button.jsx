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
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 select-none active:scale-95 rounded-full";

  const variants = {
    primary: "bg-primary text-on-primary hover:bg-primary/90 active:bg-primary/80 shadow-sm hover:shadow-md",
    purple: "bg-primary text-on-primary hover:bg-primary/90 active:bg-primary/80 shadow-sm hover:shadow-md",
    secondary: "bg-secondary-container text-on-secondary-container hover:bg-secondary-container/90 active:bg-secondary-container/80 shadow-sm",
    tonal: "bg-secondary-container text-on-secondary-container hover:bg-secondary-container/90 active:bg-secondary-container/80 shadow-sm",
    outline: "bg-transparent border border-outline text-primary hover:bg-primary/10 active:bg-primary/15",
    ghost: "bg-transparent text-primary hover:bg-primary/10 active:bg-primary/15",
    danger: "bg-error text-on-error hover:bg-error/90 active:bg-error/80 shadow-sm",
    success: "bg-tertiary-container text-on-tertiary-container hover:bg-tertiary-container/90 active:bg-tertiary-container/80 shadow-sm",
  };

  const sizes = {
    sm: "px-4 py-1.5 rounded-full text-label-sm gap-1.5 min-h-[32px]",
    md: "px-6 py-2.5 rounded-full text-label-md gap-2 min-h-[40px]",
    lg: "px-8 py-3.5 rounded-full text-label-lg gap-2.5 min-h-[48px]",
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
