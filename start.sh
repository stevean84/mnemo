#!/usr/bin/env bash
# Mnemo 시작: 백그라운드로 서버를 띄우고 접속 주소를 알려준다.
cd "$(dirname "$0")"
PORT="${PORT:-4747}"
PID_FILE=data/mnemo.pid
mkdir -p data
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "이미 실행 중입니다 → http://localhost:$PORT"
  exit 0
fi
PORT="$PORT" nohup node src/server.js > data/server.log 2>&1 &
echo $! > "$PID_FILE"
for _ in 1 2 3 4 5 6 7 8 9 10; do
  curl -sf "http://localhost:$PORT/api/health" >/dev/null && { echo "Mnemo 실행 중 → http://localhost:$PORT"; exit 0; }
  sleep 0.3
done
echo "시작하지 못했습니다. data/server.log 를 확인하세요."; cat data/server.log; exit 1
