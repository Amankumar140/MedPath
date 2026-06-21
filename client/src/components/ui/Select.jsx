import React from "react";

/**
 * Premium Dropdown Select component.
 */
export function Select({
  label,
  value,
  onChange,
  options = [],
  disabled = false,
  className = "",
  id,
  error = "",
  ...props
}) {
  const selectId = id || `select-${Math.random().toString(36).substring(2, 9)}`;

  const selectStyles = `
    block w-full px-4 py-3.5 bg-surface-container-lowest border rounded-xl text-on-surface font-body-md text-body-md 
    focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary
    disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-inner cursor-pointer
    ${error ? "border-error focus:ring-error/30 focus:border-error" : "border-outline"}
  `;

  return (
    <div className={`space-y-2 w-full ${className}`}>
      {label && (
        <label 
          htmlFor={selectId} 
          className="block font-bold text-label-md text-on-surface"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={selectStyles}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : undefined}
          {...props}
        >
          {options.map((opt) => {
            const isObject = typeof opt === "object" && opt !== null;
            const optVal = isObject ? opt.value : opt;
            const optLabel = isObject ? opt.label : opt;

            return (
              <option key={optVal} value={optVal}>
                {optLabel}
              </option>
            );
          })}
        </select>
      </div>

      {error && (
        <p 
          id={`${selectId}-error`} 
          className="text-error text-label-sm font-semibold flex items-center gap-1.5 animate-bounce"
        >
          <span className="material-symbols-outlined text-[16px]">warning</span>
          {error}
        </p>
      )}
    </div>
  );
}

export default Select;
