"""
FastAPI Server for Pronunciation Assessment (pronounce-assess)
Designed for local kiosk execution on Intel i5 + 8GB RAM

API Endpoints:
- GET / : Healthcheck
- GET /status : Model status, load time, and RAM stats
- POST /recognize : Audio assessment matching section 7 specification:
  Input: audio (UploadFile/multipart) + expected (Form string)
  Output: { expected, score, phonemes, status }
"""

import time
import asyncio
import subprocess
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pronunciation import (
    assess_audio,
    get_model_status,
    load_model,
)

app = FastAPI(
    title="Robinson Crusoe Cave - Pronunciation Assessment API",
    description="Local phoneme assessment engine using pronounce-assess",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Concurrency lock: ensure sequential queue for safe model inference (Section 11)
_INFERENCE_LOCK = asyncio.Lock()


@app.on_event("startup")
async def startup_event():
    """Ensure model is loaded once at server start."""
    load_model()


@app.get("/")
def health_check():
    return {
        "status": "ok",
        "app": "Robinson Crusoe Pronunciation Assessor",
        "library": "pronounce-assess",
    }


@app.get("/status")
def model_status():
    """Returns load time, readiness, and memory diagnostic info."""
    status = get_model_status()
    return {
        "status": "ok",
        "engine": "pronounce-assess",
        "model_loaded": status["loaded"],
        "load_time_ms": status["load_time_ms"],
        "target_specs": "Intel i5, 8GB RAM, local execution without cloud dependency",
    }


def convert_audio_to_pcm16k(audio_bytes: bytes) -> np.ndarray:
    """
    Decodes arbitrary incoming audio (WebM, Opus, WAV, MP4)
    into mono 16000Hz float32 PCM using ffmpeg.
    """
    try:
        proc = subprocess.Popen(
            [
                "ffmpeg",
                "-i", "pipe:0",
                "-f", "f32le",
                "-ar", "16000",
                "-ac", "1",
                "pipe:1"
            ],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL
        )
        raw_pcm, _ = proc.communicate(input=audio_bytes, timeout=10)
        if not raw_pcm:
            return np.array([], dtype=np.float32)
        return np.frombuffer(raw_pcm, dtype=np.float32)
    except Exception as e:
        print(f"ffmpeg conversion error: {e}")
        return np.array([], dtype=np.float32)


@app.post("/recognize")
async def recognize(
    audio: UploadFile = File(...),
    expected: str = Form(...),
):
    """
    Core pronunciation assessment endpoint per section 7 specification:

    Input:
        audio: WebM / WAV audio file from browser recording
        expected: Target English sentence or word

    Output:
        {
          "expected": string,
          "score": int | null,
          "phonemes": list,
          "status": string
        }
    """
    t_start = time.time()
    audio_bytes = await audio.read()

    if not audio_bytes or len(audio_bytes) < 100:
        return {
            "expected": expected,
            "score": None,
            "phonemes": [],
            "status": "empty_audio",
            "message": "Аудиозапись пустая или не была получена с микрофона."
        }

    pcm_array = convert_audio_to_pcm16k(audio_bytes)
    audio_duration_sec = round(len(pcm_array) / 16000.0, 2)

    if len(pcm_array) < 1600:  # < 0.1 sec
        return {
            "expected": expected,
            "score": None,
            "phonemes": [],
            "status": "too_short",
            "message": "Запись слишком короткая для распознавания."
        }

    # Split into 8000-sample chunks (0.5 sec) as required by ChunkRecord / stream_decode
    chunk_size = 8000
    chunks = [
        pcm_array[i:i + chunk_size]
        for i in range(0, len(pcm_array), chunk_size)
    ]

    # Process sequentially with lock
    async with _INFERENCE_LOCK:
        phonemes, score, status = assess_audio(chunks, expected, pcm_array)

    proc_time_ms = round((time.time() - t_start) * 1000, 2)

    return {
        "expected": expected,
        "score": score,
        "phonemes": phonemes,
        "status": status,
        "events": phonemes,  # backward compatibility
        "audio_duration_sec": audio_duration_sec,
        "processing_time_ms": proc_time_ms,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)
