#!/usr/bin/env bash
# 녹음 파일 → 전사 txt + SRT (whisper-cpp, 로컬 실행)
# 사용법: transcribe.sh <녹음파일> <출력폴더> ["용어집 문장"]
set -euo pipefail

IN="${1:?녹음 파일 경로가 필요합니다}"
OUT_DIR="${2:?출력 폴더가 필요합니다}"
GLOSSARY="${3:-}"
MODEL="${WHISPER_MODEL:-$HOME/.cache/whisper-cpp/ggml-small.bin}"

missing=()
command -v ffmpeg >/dev/null || missing+=("ffmpeg  → brew install ffmpeg")
command -v whisper-cli >/dev/null || missing+=("whisper-cli → brew install whisper-cpp")
[ -f "$MODEL" ] || missing+=("모델 $MODEL → curl -L -o \"$MODEL\" https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin")
if [ ${#missing[@]} -gt 0 ]; then
  printf '필요한 도구가 없습니다:\n'; printf '  - %s\n' "${missing[@]}"; exit 2
fi

mkdir -p "$OUT_DIR"
name="$(basename "${IN%.*}")"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT

ffmpeg -loglevel error -y -i "$IN" -ar 16000 -ac 1 "$tmp/in.wav"
args=(-m "$MODEL" -l ko -f "$tmp/in.wav" -osrt -otxt -of "$OUT_DIR/$name" -np)
[ -n "$GLOSSARY" ] && args+=(--prompt "$GLOSSARY")
whisper-cli "${args[@]}" >/dev/null 2>&1

dur="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")"
echo "길이: ${dur%.*}초"
echo "전사: $OUT_DIR/$name.txt"
echo "자막: $OUT_DIR/$name.srt"
