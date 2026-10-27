#!/usr/bin/env bash
# Mnemo 종료
cd "$(dirname "$0")"
PID_FILE=data/mnemo.pid
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  kill "$(cat "$PID_FILE")" && rm -f "$PID_FILE" && echo "Mnemo를 종료했습니다."
else
  rm -f "$PID_FILE"; echo "실행 중인 Mnemo가 없습니다."
fi
