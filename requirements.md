# Mnemo 제작 지시서 (requirements)

## 목표와 사용자
- **서비스:** Mnemo — 나를 이해하고 기억하는 개인 AI Agent의 기억 저장소
- **사용자:** 나 (ChatGPT·Codex·Claude Code를 오가며 일하는 개발자·학생)
- **줄일 불편:** 도구를 바꿀 때마다 내 직업·기술 스택·성격·진행 중인 프로젝트·이전 대화 맥락을 다시 설명해야 한다.
- **최종 비전:** VSCode 확장, CLI, Chrome 확장, Web UI 어디서 쓰든 같은 기억을 공유하고, 그 기억을 바탕으로 AI가 나를 아는 상태로 답한다.

## 차시별 범위
| 차시 | 범위 |
| --- | --- |
| **2차시 (이번)** | 로컬 기억 서버 + HTTP API + Web UI + CLI + context 내보내기 |
| 3차시 | 배포 (Vercel) — 로컬 DB를 어떻게 옮길지 결정 필요 |
| 4차시 | 기억 정리 스킬 (대화 → 기억 추출 절차) |
| 5차시 | AI 답변 기능 (저장된 기억을 context로 넣어 질문에 답변), MCP 서버 |
| 이후 | VSCode 확장, Chrome 확장 |

## 기억 데이터
| 필드 | 설명 |
| --- | --- |
| `id` | 자동 증가 번호 |
| `kind` | `personality` 성격 · `job` 직업 · `family` 가족 · `skill` 기술 · `together` 함께한 일 · `conversation` 대화 요약 · `note` 기타 |
| `content` | 기억 본문 (필수, 2000자 이하) |
| `tags` | 쉼표로 구분한 태그 (선택) |
| `visibility` | `normal` / `private` — 가족·개인정보 등 민감한 기억은 `private` |
| `source` | 어디서 추가했는지: `web` · `cli` · `vscode` · `chrome` · `mcp` · `api` |
| `created_at`, `updated_at` | ISO 시각 |

저장: 로컬 SQLite 파일 `data/mnemo.db` (Node 24 내장 `node:sqlite`). 검색은 띄어쓰기로 나눈 단어를 모두 포함하는 부분 일치(LIKE) — 개인 규모 데이터에 충분하고 한국어 1~2글자도 찾을 수 있다.

## 핵심 기능과 확인 방법
| 기능 | 사용자 입력·행동 | 결과 | 직접 확인할 방법 |
| --- | --- | --- | --- |
| 기억 추가 (Web) | 종류 선택, 본문 입력, 비공개 체크 후 "기억 추가" 또는 ⌘/Ctrl+Enter | 목록 맨 위에 카드가 생기고 입력창이 비워진다 | 새로고침해도 카드가 남는지 |
| 검색 | 검색창에 단어 입력 (2글자 이상 부분 일치) | 본문·태그에 단어가 있는 기억만 표시 | "TypeScript" 입력 → 해당 기억만 남는지 |
| 종류 필터 | 칩(전체/성격/직업/…) 클릭 | 해당 종류만 표시 | 칩 선택과 검색을 함께 적용 |
| 삭제 | 카드의 "삭제" 클릭 → 확인 | 카드가 사라진다 | 새로고침 후에도 없는지 |
| Context 복사 | "AI에게 줄 context 복사" 클릭 | 나에 대한 Markdown 요약이 클립보드에 복사 (private 제외) | ChatGPT 등에 붙여넣어 확인 |
| CLI | `mnemo add/search/list/rm/context` | Web과 같은 저장소를 읽고 쓴다 | CLI로 추가 → Web에 보이는지 |
| 빈·오류 상태 | 기억 0개, 서버 꺼짐, 빈 입력 | 안내 문구 표시, 빈 본문은 저장 안 됨 | 각 상황 직접 재현 |

## HTTP API (모든 클라이언트 공통)
| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/health` | 상태·기억 개수 |
| GET | `/api/memories?q=&kind=&private=1&limit=` | 목록·검색 (기본 private 포함) |
| POST | `/api/memories` | 추가 `{kind, content, tags?, visibility?, source?}` |
| PATCH | `/api/memories/:id` | 수정 |
| DELETE | `/api/memories/:id` | 삭제 |
| GET | `/api/context?q=&private=0` | AI에게 줄 Markdown context (기본 private 제외) |

## 디자인
- 디자인 스킬: `mnemo-design` (`../skills/mnemo-design`) — 모던·미니멀, Pretendard, 인디고 포인트
- 구성: 제목 → 기억 입력 → 검색·필터 → 기억 카드 목록

## 실행과 저장
- 내 컴퓨터의 로컬 프로그램, `http://localhost:4747`
- 시작 `./start.sh` / 종료 `./stop.sh` (`npm start` / `npm stop`)
- 서버는 `127.0.0.1`에만 바인딩한다 (같은 와이파이의 다른 기기에서 접근 불가 → 3차시에 다룸)

## 아직 결정하지 않은 것
- 3차시 배포 시 기억 DB를 어디에 둘지 (Vercel은 로컬 파일 DB를 유지하지 못함 → 클라우드 DB 또는 "로컬 서버 + 배포는 소개 페이지만" 중 선택)
- 5차시 AI 연결 방식 (ChatGPT/Codex 로그인 기반 vs API 키)
- 기억 자동 추출 (대화에서 기억할 내용을 AI가 제안 → 사용자가 승인)
- 여러 기기 동기화, 암호화
