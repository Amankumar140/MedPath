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
  const baseStyles = "rounded-[24px] transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]";

  const variants = {
    glass: "bg-surface-container border border-outline-variant/20 shadow-sm",
    container: "bg-surface-container border border-outline-variant/15 shadow-sm",
    lowest: "bg-surface-container-lowest border border-outline-variant/20 shadow-sm",
    flat: "bg-surface-container-low border border-transparent",
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
