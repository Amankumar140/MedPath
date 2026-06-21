import React from "react";

/**
 * Premium Card component implementing premium glassmorphism and hovers.
 */
export function Card({
  children,
  variant = "glass",
  hoverLift = false,
  className = "",
  onClick,
  ...props
}) {
  const baseStyles = "rounded-[28px] border transition-all duration-300";

  const variants = {
    glass: "premium-glass-card border-outline-variant/15 shadow-md",
    container: "bg-surface-container-low border-outline-variant/10 shadow-sm",
    lowest: "bg-surface-container-lowest border-outline-variant/10 shadow-sm",
    flat: "bg-surface border-transparent",
  };

  const hoverStyle = hoverLift ? "hover-lift cursor-pointer" : "";
  const clickStyle = onClick ? "cursor-pointer active:scale-[0.99]" : "";

  const currentVariant = variants[variant] || variants.glass;

  return (
    <div
      onClick={onClick}
      className={`${baseStyles} ${currentVariant} ${hoverStyle} ${clickStyle} ${className}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
