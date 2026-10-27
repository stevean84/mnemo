# Mnemo 작업 규칙

Mnemo는 어떤 AI 도구(CLI·VSCode·Chrome·Web UI)에서 쓰든 같은 "나"에 대한 기억과
이전 대화의 맥락을 이어주는 개인 기억 Agent다. 기능 기획은 `requirements.md`를 따른다.

## 소통
- 설명과 답변은 한국어로 쓰되 필요한 용어는 영어를 사용한다.
- 바꾼 기능은 실제로 실행해서 확인하고, 확인하지 못한 것은 구분해 알린다.
- 정보가 부족하면 임의로 만들지 말고 질문한다.

## 파일
- 기존 파일을 삭제해야 하면 먼저 이유와 대상을 알려주고 승인받는다.
- `data/`(기억 DB)는 개인정보다. git에 올리지 않고, 테스트는 별도 DB 파일로 한다.

## 실행
- 프로그램은 내 컴퓨터의 localhost(기본 http://localhost:4747)에서 실행하고 실제 접속 주소를 알려준다.
- 시작·종료는 `./start.sh`, `./stop.sh`(또는 `npm start`, `npm stop`)로 한다.
- 외부 npm 패키지 없이 Node 24 내장 기능(`node:http`, `node:sqlite`)만 쓴다.
  패키지가 꼭 필요하면 이유를 먼저 알리고 승인받는다.

## 설계 원칙
- **Local-first**: 기억은 내 컴퓨터에만 저장한다. 외부 전송은 사용자가 켠 기능에서만 한다.
- **하나의 기억 저장소, 여러 클라이언트**: Web UI·CLI·(예정) VSCode·Chrome·MCP는 모두 같은 HTTP API를 쓴다.
  API 응답 형식을 바꾸면 모든 클라이언트를 함께 고치고 README의 API 표를 갱신한다.
- **민감도 구분**: 기억마다 `private`/`normal` 공개 범위를 둔다. context 내보내기는 기본적으로 `private`를 제외한다.
- 디자인은 `mnemo-design` 스킬(`../skills/mnemo-design`)을 따른다.

## 확인
- 기능을 바꾸면 `npm test`를 실행한다.
- 화면을 바꾸면 브라우저에서 직접 열어 추가·검색·삭제를 확인한다.
