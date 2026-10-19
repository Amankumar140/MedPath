import React from "react";
import Button from "./Button";

/**
 * Premium Empty State primitive with icons, title, and action hooks.
 */
export function EmptyState({
  icon = "clinical_notes",
  title = "No Records Found",
  description = "There are no entries to display at this time.",
  action,
  className = "",
  ...props
}) {
  return (
    <div 
      className={`bg-surface-container rounded-[28px] border border-outline-variant/15 p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-8 shadow-sm animate-fade-in ${className}`}
      {...props}
    >
      <div className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mb-5">
        <span className="material-symbols-outlined text-[32px] animate-pulse" aria-hidden="true">
          {icon}
        </span>
      </div>

      <h3 className="text-headline-md font-bold text-primary dark:text-primary-fixed mb-2.5">
        {title}
      </h3>
      
      <p className="text-body-md text-on-surface-variant max-w-sm mb-6.5 font-medium leading-relaxed">
        {description}
      </p>

      {action && (
        <div className="flex justify-center">
          {React.isValidElement(action) ? (
            action
          ) : (
            <Button
              onClick={action.onClick}
              variant="primary"
              icon={action.icon}
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
