import React from "react";

/**
 * Premium accessible Input primitive supporting custom states, error handling, icons, and textareas.
 */
export function Input({
  label,
  type = "text",
  placeholder = "",
  value,
  onChange,
  disabled = false,
  error = "",
  className = "",
  id,
  icon,
  iconRight,
  as = "input",
  rows = 3,
  ...props
}) {
  const containerId = id || `input-${Math.random().toString(36).substring(2, 9)}`;

  const inputStyles = `
    block w-full px-4 py-3.5 bg-surface-container-lowest border rounded-xl text-on-surface font-body-md text-body-md 
    placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary
    disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-inner
    ${error ? "border-error focus:ring-error/30 focus:border-error" : "border-outline"}
    ${icon ? "pl-11" : ""}
    ${iconRight ? "pr-11" : ""}
  `;

  return (
    <div className={`space-y-2 w-full ${className}`}>
      {label && (
        <label 
          htmlFor={containerId} 
          className="block font-bold text-label-md text-on-surface"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center w-full">
        {icon && (
          <span 
            className="absolute left-4 text-on-surface-variant font-semibold text-lg select-none material-symbols-outlined text-[18px]" 
            aria-hidden="true"
          >
            {icon}
          </span>
        )}

        {as === "textarea" ? (
          <textarea
            id={containerId}
            value={value}
            onChange={onChange}
            disabled={disabled}
            placeholder={placeholder}
            rows={rows}
            className={`${inputStyles} resize-none min-h-[100px]`}
            aria-invalid={!!error}
            aria-describedby={error ? `${containerId}-error` : undefined}
            {...props}
          />
        ) : (
          <input
            id={containerId}
            type={type}
            value={value}
            onChange={onChange}
            disabled={disabled}
            placeholder={placeholder}
            className={inputStyles}
            aria-invalid={!!error}
            aria-describedby={error ? `${containerId}-error` : undefined}
            {...props}
          />
        )}

        {iconRight && (
          <span 
            className="absolute right-4 text-on-surface-variant select-none material-symbols-outlined text-[18px]" 
            aria-hidden="true"
          >
            {iconRight}
          </span>
        )}
      </div>

      {error && (
        <p 
          id={`${containerId}-error`} 
          className="text-error text-label-sm font-semibold flex items-center gap-1.5 animate-bounce"
        >
          <span className="material-symbols-outlined text-[16px]">warning</span>
          {error}
        </p>
      )}
    </div>
  );
}

export default Input;
