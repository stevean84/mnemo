# Mnemo

어디서 쓰든 나를 기억하는 개인 AI Agent의 기억 저장소.
ChatGPT·Codex·Claude Code를 오갈 때마다 내 직업·기술·성격·진행 중인 일을 다시 설명하지 않도록,
나에 대한 기억을 한곳에 모으고 어떤 도구에서든 같은 기억을 꺼내 쓴다.

> ATTENTION 2026-2 AI 동아리 개인 프로젝트 · 2차시 버전 (로컬 실행)

## 실행 환경과 필요한 설치
- Node.js 24 이상 (내장 `node:sqlite` 사용, 외부 npm 패키지 없음 → `npm install` 불필요)
- macOS에서 확인 (Node v24.20.0)

## 시작·종료 방법
| | 명령 | 결과 |
| --- | --- | --- |
| 시작 | `./start.sh` (또는 `npm start`) | 백그라운드 실행, `Mnemo 실행 중 → http://localhost:4747` 출력 |
| 종료 | `./stop.sh` (또는 `npm stop`) | `Mnemo를 종료했습니다.` |
| 테스트 | `npm test` | API 테스트 5개 |

- 접속 주소: http://localhost:4747 (포트 변경: `PORT=5000 ./start.sh`)
- 서버 로그: `data/server.log`, 기억 DB: `data/mnemo.db` (git 제외)

## 사용 순서
1. `./start.sh` 실행 후 브라우저에서 http://localhost:4747 을 연다.
2. 기억할 내용을 적고 종류(성격·직업·가족·기술·함께한 일·대화 요약·기타)를 고른 뒤 **기억 추가** (⌘/Ctrl+Enter).
   민감한 내용은 **비공개**를 체크한다.
3. 검색창과 종류 칩으로 기억을 찾는다.
4. **AI에게 줄 context 복사**를 누르고 ChatGPT·Claude 등 대화창에 붙여넣으면, AI가 나를 아는 상태로 대화를 시작한다 (비공개 기억 제외).

### CLI
```bash
node bin/mnemo.js add "주력 언어는 TypeScript" --kind skill --tags ts
node bin/mnemo.js search 동아리
node bin/mnemo.js list --kind job
node bin/mnemo.js rm 3
node bin/mnemo.js context | pbcopy      # context를 클립보드로
```
`npm link`를 하면 어디서든 `mnemo ...`로 쓸 수 있다. Web과 CLI는 같은 저장소를 쓴다.

## HTTP API
| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/health` | 상태·기억 개수·종류 목록 |
| GET | `/api/memories?q=&kind=&private=0&limit=` | 목록·검색 |
| POST | `/api/memories` | 추가 `{kind, content, tags?, visibility?, source?}` |
| PATCH | `/api/memories/:id` | 수정 |
| DELETE | `/api/memories/:id` | 삭제 |
| GET | `/api/context?q=&private=1` | AI용 Markdown context (기본 비공개 제외) |

## 폴더 구조
```
src/server.js   HTTP 서버 + API + 정적 파일
src/db.js       SQLite 저장소, 검증, context 생성
public/         Web UI + 소개 페이지 about.html (mnemo-design 토큰 사용)
bin/mnemo.js    CLI
skills/         이 프로젝트에서 만든 개인 스킬 (voice-summary, mnemo-design)
test/           API 테스트
AGENTS.md       AI 작업 규칙 · requirements.md 제작 지시서
```

## 확인한 결과 (2026-10-27)
- `npm test` 5개 통과: 추가·조회, 빈 내용/잘못된 종류 거부(400), 한국어 2글자 검색·종류 필터, context 비공개 제외, 수정·삭제
- `./start.sh` 두 번 실행 시 "이미 실행 중" 안내, `./stop.sh`로 종료 확인
- CLI로 추가한 기억이 Web 화면 목록에 표시됨 (headless Chrome 화면 확인)
- 데스크톱(1100px)·모바일(390px) 폭에서 레이아웃 확인

## 아직 안 된 것
- Web 화면에서 직접 클릭·입력·삭제·context 복사(클립보드)는 사람이 브라우저에서 확인 필요
- 기억 수정 UI (API만 있음)
- 휴대폰 접속·배포 (3차시), AI 답변 기능·MCP 서버 (5차시), VSCode·Chrome 확장 (이후)

## GitHub
- 저장소 주소: https://github.com/stevean84/mnemo (업로드 후 확인)
