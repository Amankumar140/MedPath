import React, { useState } from "react";

/**
 * Displays a list of saved locations with actions (select, edit, delete, set default).
 */
export function SavedAddressList({
  locations = [],
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
  selectable = true,
  loading = false,
}) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!onDelete) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="bg-surface-container-low rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-surface-container-high rounded w-20 mb-2"></div>
            <div className="h-3 bg-surface-container-high rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="text-center py-6 text-on-surface-variant">
        <span className="material-symbols-outlined text-[32px] text-outline-variant mb-2 block">bookmark_border</span>
        <p className="text-body-md">No saved addresses yet</p>
        <p className="text-label-sm text-outline mt-1">Save an address for quick access in future consultations</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {locations.map((loc) => (
        <div
          key={loc.id}
          onClick={() => selectable && onSelect && onSelect(loc)}
          className={`bg-surface-container-lowest dark:bg-surface-container-high/40 rounded-xl p-4 border transition-all duration-200 group ${
            selectable
              ? "cursor-pointer hover:shadow-md hover:border-secondary/40 border-outline-variant/20"
              : "border-outline-variant/20"
          }`}
          role={selectable ? "button" : undefined}
          tabIndex={selectable ? 0 : undefined}
          onKeyDown={(e) => selectable && e.key === "Enter" && onSelect && onSelect(loc)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[18px]">
                  {loc.label?.toLowerCase() === "home" ? "home" :
                   loc.label?.toLowerCase() === "work" ? "work" :
                   loc.label?.toLowerCase() === "parents" ? "family_restroom" :
                   "location_on"}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="text-body-md font-semibold text-primary dark:text-primary-fixed truncate">
                    {loc.label}
                  </h4>
                  {loc.isDefault && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-secondary/10 text-secondary px-2 py-0.5 rounded-md shrink-0">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-label-sm text-on-surface-variant line-clamp-2 leading-relaxed">
                  {loc.formattedAddress}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {onSetDefault && !loc.isDefault && (
                <button
                  onClick={(e) => { e.stopPropagation(); onSetDefault(loc.id); }}
                  className="p-1.5 rounded-lg text-outline-variant hover:text-secondary hover:bg-secondary/10 transition-all"
                  title="Set as default"
                  aria-label="Set as default address"
                >
                  <span className="material-symbols-outlined text-[16px]">star</span>
                </button>
              )}
              {onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(loc); }}
                  className="p-1.5 rounded-lg text-outline-variant hover:text-primary hover:bg-primary/10 transition-all"
                  title="Edit"
                  aria-label={`Edit ${loc.label}`}
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => handleDelete(e, loc.id)}
                  disabled={deletingId === loc.id}
                  className="p-1.5 rounded-lg text-outline-variant hover:text-error hover:bg-error/10 transition-all disabled:opacity-50"
                  title="Delete"
                  aria-label={`Delete ${loc.label}`}
                >
                  {deletingId === loc.id ? (
                    <div className="w-4 h-4 border-2 border-error border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Select indicator */}
          {selectable && (
            <div className="flex items-center gap-1 mt-2 text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-[14px]">touch_app</span>
              <span className="text-[11px] font-medium">Use this address</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default SavedAddressList;
