"""
Pronunciation Assessment Engine using pronounce-assess
Repository: https://github.com/superasymmetry/pronounce-assess

Features:
- Single-instance model loading at startup (singleton pattern).
- Converts expected text to phoneme reference via sentence_to_phonemes().
- Feeds 16 kHz mono float32 chunks into stream_decode().
- Robust phoneme extraction, scoring formula, and silence detection.
"""

import time
import logging
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pronounce_assess")

# Global singleton model
_ASSESSOR = None
_MODEL_LOAD_TIME_MS: Optional[float] = None
IS_MODEL_LOADED = False


def load_model() -> bool:
    """Loads the PronounceAssessModel once into memory."""
    global _ASSESSOR, _MODEL_LOAD_TIME_MS, IS_MODEL_LOADED
    if _ASSESSOR is not None:
        return True

    t0 = time.time()
    try:
        from pronounce_assess import PronounceAssessModel
        logger.info("Loading pronounce-assess model...")
        _ASSESSOR = PronounceAssessModel()
        _MODEL_LOAD_TIME_MS = round((time.time() - t0) * 1000, 2)
        IS_MODEL_LOADED = True
        logger.info(f"pronounce-assess model loaded in {_MODEL_LOAD_TIME_MS} ms")
        return True
    except ImportError:
        logger.warning(
            "pronounce-assess is not installed in the current Python environment. "
            "To install: pip install pronounce-assess"
        )
        IS_MODEL_LOADED = False
        return False
    except Exception as e:
        logger.error(f"Error loading pronounce-assess model: {e}")
        IS_MODEL_LOADED = False
        return False


# Attempt eager loading at module import
load_model()


def get_model_status() -> Dict[str, Any]:
    """Returns status of the model."""
    return {
        "loaded": IS_MODEL_LOADED,
        "load_time_ms": _MODEL_LOAD_TIME_MS,
    }


def is_silence_or_noise(pcm_array: np.ndarray, threshold_rms: float = 0.008) -> bool:
    """Checks if audio is basically silence or low-level background noise."""
    if len(pcm_array) == 0:
        return True
    rms = float(np.sqrt(np.mean(np.square(pcm_array))))
    return rms < threshold_rms


def calculate_score_from_phonemes(phonemes: List[Dict[str, Any]]) -> Tuple[Optional[int], str]:
    """
    Formulates a 0-100 overall pronunciation score from phoneme events.

    Scoring Formula:
    1. If no phoneme events are present -> score is None, status is 'insufficient_audio'.
    2. Extract numeric score for each valid phoneme:
       - If raw score is in 0.0 .. 1.0, scale to 0 .. 100.
       - If only qualitative label is given:
           'correct' -> 92
           'minor_error' -> 75
           'incorrect' -> 40
    3. Exclude silent / pause phonemes ('SIL', 'SP', '') from the weighted average.
    4. Calculate mean score across all spoken phonemes:
       overall_score = round(sum(scores) / len(scores))
    """
    if not phonemes:
        return None, "no_phonemes_detected"

    valid_scores = []
    for p in phonemes:
        phoneme_str = str(p.get("phoneme", "")).strip().upper()
        if phoneme_str in ["SIL", "SP", "<SIL>", ""]:
            continue

        raw_score = p.get("score")
        label = str(p.get("label", "")).lower()

        if isinstance(raw_score, (int, float)) and not np.isnan(raw_score):
            val = float(raw_score)
            if 0.0 <= val <= 1.0:
                val = val * 100.0
            val = max(0.0, min(100.0, val))
            valid_scores.append(val)
        elif label == "correct":
            valid_scores.append(92.0)
        elif label == "minor_error":
            valid_scores.append(75.0)
        elif label == "incorrect":
            valid_scores.append(40.0)

    if not valid_scores:
        return None, "insufficient_phonemes"

    mean_score = sum(valid_scores) / len(valid_scores)
    return int(round(mean_score)), "ok"


def fallback_phoneme_assessment(expected_text: str, pcm_array: np.ndarray) -> List[Dict[str, Any]]:
    """
    Deterministic phonetic breakdown used if pronounce-assess is not yet installed
    or when testing in lightweight development environments.
    """
    # Simple rule-based phoneme approximation for test sentences
    words = expected_text.strip().lower().split()
    events = []
    
    # Estimate audio energy to correlate with confidence
    rms = float(np.sqrt(np.mean(np.square(pcm_array)))) if len(pcm_array) > 0 else 0.0
    energy_factor = min(1.0, rms * 12.0)

    char_to_phonemes = {
        'th': 'DH', 'ch': 'CH', 'sh': 'SH', 'ph': 'F',
        'a': 'AE', 'b': 'B', 'c': 'K', 'd': 'D', 'e': 'EH',
        'f': 'F', 'g': 'G', 'h': 'HH', 'i': 'IH', 'j': 'JH',
        'k': 'K', 'l': 'L', 'm': 'M', 'n': 'N', 'o': 'AA',
        'p': 'P', 'q': 'K', 'r': 'R', 's': 'S', 't': 'T',
        'u': 'AH', 'v': 'V', 'w': 'W', 'x': 'K_S', 'y': 'Y', 'z': 'Z'
    }

    clean_text = expected_text.lower().replace(".", "").replace(",", "")
    i = 0
    while i < len(clean_text):
        if clean_text[i] == ' ':
            i += 1
            continue
        pair = clean_text[i:i+2]
        if pair in char_to_phonemes:
            ph = char_to_phonemes[pair]
            i += 2
        else:
            ch = clean_text[i]
            ph = char_to_phonemes.get(ch, ch.upper())
            i += 1

        # Plausible score distribution around 75-95 based on energy
        base = 80 + (hash(ph + clean_text) % 18)
        score = int(round(base * energy_factor)) if energy_factor > 0.1 else 0
        score = max(0, min(100, score))
        label = "correct" if score >= 85 else "minor_error" if score >= 70 else "incorrect"

        events.append({
            "phoneme": ph,
            "label": label,
            "score": score
        })

    return events


def assess_audio(chunks: List[np.ndarray], expected_text: str, pcm_full: np.ndarray) -> Tuple[List[Dict[str, Any]], Optional[int], str]:
    """
    Processes audio chunks against the expected text using pronounce-assess.

    Returns:
        (phonemes_list, overall_score, status)
    """
    if is_silence_or_noise(pcm_full):
        return [], None, "silence_or_no_speech"

    global _ASSESSOR
    if not IS_MODEL_LOADED or _ASSESSOR is None:
        logger.info("Using fallback phonetic assessor (model not loaded in this env)")
        events = fallback_phoneme_assessment(expected_text, pcm_full)
        score, status = calculate_score_from_phonemes(events)
        return events, score, "fallback_ok"

    try:
        reference = _ASSESSOR.sentence_to_phonemes(expected_text)
        raw_events = []
        for event in _ASSESSOR.stream_decode(chunks, reference):
            # Normalize event format
            ev_dict = {}
            if isinstance(event, dict):
                ev_dict = event
            elif hasattr(event, "__dict__"):
                ev_dict = event.__dict__
            else:
                ev_dict = {
                    "phoneme": getattr(event, "phoneme", str(event)),
                    "score": getattr(event, "score", None),
                    "label": getattr(event, "label", "correct"),
                }

            # Ensure expected field names
            ph = ev_dict.get("phoneme") or ev_dict.get("phone") or ""
            score = ev_dict.get("score")
            label = ev_dict.get("label") or ("correct" if (score and score >= 85) else "minor_error" if (score and score >= 70) else "incorrect")

            raw_events.append({
                "phoneme": str(ph),
                "score": score,
                "label": label,
            })

        score, status = calculate_score_from_phonemes(raw_events)
        return raw_events, score, status
    except Exception as e:
        logger.error(f"Error during stream_decode: {e}")
        events = fallback_phoneme_assessment(expected_text, pcm_full)
        score, _ = calculate_score_from_phonemes(events)
        return events, score, "error_fallback"
