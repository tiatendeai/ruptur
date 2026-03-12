from __future__ import annotations

import os
import subprocess
import tempfile
from typing import Any

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from faster_whisper import WhisperModel


def _env(name: str, default: str) -> str:
    v = os.getenv(name)
    return v if v is not None and v != "" else default


WHISPER_MODEL_NAME = _env("WHISPER_MODEL", "tiny")
WHISPER_DEVICE = _env("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = _env("WHISPER_COMPUTE_TYPE", "int8")
WHISPER_LANGUAGE = os.getenv("WHISPER_LANGUAGE")  # optional, e.g. "pt"
WHISPER_BEAM_SIZE = int(_env("WHISPER_BEAM_SIZE", "5"))
WHISPER_VAD_FILTER = _env("WHISPER_VAD_FILTER", "true").lower() in {"1", "true", "yes", "y", "on"}

_model: WhisperModel | None = None


def get_model() -> WhisperModel:
    global _model
    if _model is None:
        _model = WhisperModel(WHISPER_MODEL_NAME, device=WHISPER_DEVICE, compute_type=WHISPER_COMPUTE_TYPE)
    return _model


app = FastAPI(title="Ruptur Whisper (local)", version="0.0.0")

LOUDNORM = "loudnorm=I=-16:TP=-1.5:LRA=11"


def preprocess_audio_to_wav(input_path: str) -> str:
    """
    Normaliza volume e converte para WAV 16kHz mono para melhorar a transcrição.
    Retorna o caminho do WAV (arquivo temporário). Se falhar, retorna o input_path.
    """
    out = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    out_path = out.name
    out.close()

    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        input_path,
        "-vn",
        "-sn",
        "-dn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-af",
        LOUDNORM,
        "-f",
        "wav",
        out_path,
    ]

    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=90)
        return out_path
    except Exception:
        try:
            os.unlink(out_path)
        except Exception:
            pass
        return input_path


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "model": WHISPER_MODEL_NAME,
        "device": WHISPER_DEVICE,
        "compute_type": WHISPER_COMPUTE_TYPE,
        "language": WHISPER_LANGUAGE or "",
    }


class TranscribeUrlRequest(BaseModel):
    url: str = Field(min_length=1)


@app.post("/transcribe/url")
async def transcribe_url(req: TranscribeUrlRequest) -> dict[str, Any]:
    url = req.url.strip()
    if not url.lower().startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="url_invalid")

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.get(url)
        if r.status_code >= 400:
            raise HTTPException(status_code=502, detail="download_failed")
        data = r.content
        content_type = r.headers.get("content-type", "")

    suffix = ".bin"
    if "ogg" in content_type:
        suffix = ".ogg"
    elif "mpeg" in content_type or "mp3" in content_type:
        suffix = ".mp3"
    elif "wav" in content_type:
        suffix = ".wav"
    elif "mp4" in content_type:
        suffix = ".mp4"

    with tempfile.NamedTemporaryFile(suffix=suffix) as fp:
        fp.write(data)
        fp.flush()
        path = fp.name
        wav_path = preprocess_audio_to_wav(path)
        try:
            segments, info = get_model().transcribe(
                wav_path,
                language=WHISPER_LANGUAGE or None,
                beam_size=WHISPER_BEAM_SIZE,
                vad_filter=WHISPER_VAD_FILTER,
            )
            text = "".join(seg.text for seg in segments).strip()
            return {
                "ok": True,
                "text": text,
                "language": info.language,
                "duration": info.duration,
                "preprocessed": wav_path != path,
            }
        finally:
            if wav_path != path:
                try:
                    os.unlink(wav_path)
                except Exception:
                    pass


@app.post("/transcribe/file")
async def transcribe_file(file: UploadFile = File(...)) -> dict[str, Any]:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="file_empty")

    suffix = os.path.splitext(file.filename or "")[1] or ".bin"
    with tempfile.NamedTemporaryFile(suffix=suffix) as fp:
        fp.write(content)
        fp.flush()
        path = fp.name
        wav_path = preprocess_audio_to_wav(path)
        try:
            segments, info = get_model().transcribe(
                wav_path,
                language=WHISPER_LANGUAGE or None,
                beam_size=WHISPER_BEAM_SIZE,
                vad_filter=WHISPER_VAD_FILTER,
            )
            text = "".join(seg.text for seg in segments).strip()
            return {
                "ok": True,
                "text": text,
                "language": info.language,
                "duration": info.duration,
                "preprocessed": wav_path != path,
            }
        finally:
            if wav_path != path:
                try:
                    os.unlink(wav_path)
                except Exception:
                    pass


# OpenAI-ish compatibility (minimal): POST /v1/audio/transcriptions (multipart form)
@app.post("/v1/audio/transcriptions")
async def openai_transcriptions(file: UploadFile = File(...), model: str | None = None) -> dict[str, Any]:
    # `model` is ignored here (kept for compatibility); configure model via env.
    _ = model
    result = await transcribe_file(file=file)
    return {"text": result["text"]}
