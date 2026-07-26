from typing import Dict, Any, Optional
from app.schemas import ExtractedPatientContext, BrowserLocation

def merge_patient_contexts(
    existing: Dict[str, Any],
    newly_extracted: ExtractedPatientContext,
    browser_location: Optional[BrowserLocation] = None
) -> Dict[str, Any]:
    """
    Merges newly extracted patient signals with existing accumulated context.
    Preserves existing non-empty values unless updated with non-empty new values.
    Attaches browser location if provided.
    """
    result = dict(existing) if existing else {}

    new_dict = newly_extracted.model_dump(exclude_unset=True)

    for key, value in new_dict.items():
        if key == "browser_location":
            continue
        if isinstance(value, list) and len(value) > 0:
            existing_list = result.get(key, [])
            if not isinstance(existing_list, list):
                existing_list = [existing_list] if existing_list else []
            merged_list = list(dict.fromkeys(existing_list + value))
            result[key] = merged_list
        elif value is not None and value != "" and value != False:
            result[key] = value

    if browser_location and (browser_location.city or browser_location.latitude):
        result["browser_location"] = browser_location.model_dump()
    elif "browser_location" in existing and existing["browser_location"]:
        result["browser_location"] = existing["browser_location"]

    return result
