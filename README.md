<div align="center">

# Zepio

**다운로드나 회원가입 없이 브라우저에서 바로 즐기는 무료 웹게임 플랫폼**

퍼즐, 시뮬레이션, 아케이드 게임 11개를 한곳에 모았습니다. 한 판은 2~25분이고, 기록은 내 브라우저에만 저장됩니다.

[**zepio.kr**](https://zepio.kr)

![Astro](https://img.shields.io/badge/Astro-BC52EE?style=flat-square&logo=astro&logoColor=white)
![React](https://img.shields.io/badge/React%2019-61DAFB?style=flat-square&logo=react&logoColor=black)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS%204-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=threedotjs&logoColor=white)
![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-F38020?style=flat-square&logo=cloudflarepages&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)

<img src="img/home.jpg" alt="Zepio 홈: 무료 웹게임 플랫폼" width="880">

</div>

<br>

## 프로젝트 소개

설치도 회원가입도 없이, 링크를 열면 바로 한 판을 시작할 수 있는 웹게임 사이트입니다. 서버와 데이터베이스가 없는 정적 사이트라서 이용자 정보를 받지 않고, 점수와 진행 상황은 이용자의 브라우저(`localStorage`)에만 남습니다.

- 게임은 퍼즐 6개, 시뮬레이션 4개, 아케이드 1개입니다. 모바일과 PC 모두에서 되고, 3D 게임 하나만 PC 전용입니다.
- Bug Sweeper와 Hidden Rule은 판을 만들 때 논리만으로 풀 수 있는지 엔진이 직접 확인합니다. 찍어야만 풀리거나 풀 수 없는 판은 나오지 않습니다.
- 게임 9개에는 날짜(KST)를 시드로 삼아 모두가 같은 판을 푸는 **오늘의 도전**이 있고, 연속 일수를 이어 갈 수 있습니다.
- 결과는 점수와 라운드별 기호가 담긴 글로 공유할 수 있습니다. 규칙이나 정답은 담지 않습니다.

<br>

## 게임

| 게임 | 분류 | 시간 | 기기 | 소개 |
|---|---|---|---|---|
| Pattern Challenge | 퍼즐 | 약 3분 | 모바일 · PC | 도형과 숫자에 숨은 규칙을 찾아 빈칸을 채우는 5문제 |
| Light Flip | 퍼즐 | 약 5분 | 모바일 · PC | 누르면 위아래좌우가 뒤집히는 5x5 불 끄기. 최소 이동에 가깝게 |
| Tiny Isle | 시뮬레이션 | 약 8분 | 모바일 · PC | 작은 섬에 건물을 놓는 배치형 시티 빌더. 이웃에 따라 점수가 달라짐 |
| Agent Town | 시뮬레이션 | 약 20분 | 모바일 · PC | AI 에이전트가 되어 마을 사람들의 부탁을 해결하는 도트 RPG |
| 환각 탐정 | 퍼즐 | 약 25분 | 모바일 · PC | AI 보고서의 환각 문장 찾기, 용의자 추리, 단서 표 채우기. 사건 12건 |
| 프롬프트 요새 | 퍼즐 | 약 20분 | 모바일 · PC | 규칙 카드를 조립해 침입 프롬프트를 막는 AI 보안 방어 퍼즐. 방 12개 |
| Stack Tower | 아케이드 | 약 2분 | 모바일 · PC | 좌우로 움직이는 블록을 탭해 높이 쌓는 한 손 타이밍 게임 |
| Bug Sweeper | 퍼즐 | 약 5분 | 모바일 · PC | 찍지 않고 논리만으로 풀 수 있게 만든 지뢰찾기 |
| Rack Tycoon | 시뮬레이션 | 약 20분 | PC | 서버, 냉각기, 허브, 발전기를 배치해 데이터센터를 키우는 3D 경영 |
| Hidden Rule | 퍼즐 | 약 3분 | 모바일 · PC | ○ ✕ 카드 예시로 숨은 규칙을 추리하는 가설 검증 퍼즐 |
| 버그 접수처 | 시뮬레이션 | 약 5분 | 모바일 · PC | 밀려드는 버그 신고를 날마다 바뀌는 정책서대로 분류하는 접수 시뮬레이션 |

<br>

## 화면 구성

### 홈 · 게임 목록

<table>
  <tr>
    <td width="50%"><img src="img/home.jpg" alt="홈: 오늘의 도전과 게임 정렬 · 분류"></td>
    <td width="50%"><img src="img/games.jpg" alt="게임 카드 목록"></td>
  </tr>
  <tr>
    <td align="center">오늘의 도전 배너, 정렬(추천 · 신작 · 짧은 순)과 분류 필터</td>
    <td align="center">게임 카드: 분류, 소요 시간, 내 최고 기록</td>
  </tr>
</table>

### 퍼즐

<table>
  <tr>
    <td width="33%"><img src="img/hidden-rule.jpg" alt="Hidden Rule 플레이 화면"></td>
    <td width="33%"><img src="img/bug-sweeper.jpg" alt="Bug Sweeper 플레이 화면"></td>
    <td width="33%"><img src="img/prompt-fortress.jpg" alt="프롬프트 요새 플레이 화면"></td>
  </tr>
  <tr>
    <td align="center">Hidden Rule: 카드를 시험해 숨은 규칙 추리</td>
    <td align="center">Bug Sweeper: 숫자 단서로 버그 찾기</td>
    <td align="center">프롬프트 요새: 규칙 카드 조립</td>
  </tr>
</table>

### 시뮬레이션

<table>
  <tr>
    <td width="33%"><img src="img/rack-tycoon.jpg" alt="Rack Tycoon 3D 데이터센터"></td>
    <td width="33%"><img src="img/agent-town.jpg" alt="Agent Town 도트 RPG"></td>
    <td width="33%"><img src="img/bug-desk.jpg" alt="버그 접수처 플레이 화면"></td>
  </tr>
  <tr>
    <td align="center">Rack Tycoon: 아이소메트릭 3D, 열과 네트워크에 따라 달라지는 수익</td>
    <td align="center">Agent Town: 걸어 다니며 의뢰를 받는 도트 RPG</td>
    <td align="center">버그 접수처: 정책서대로 버그 신고 분류</td>
  </tr>
</table>

### 모바일

<table>
  <tr>
    <td width="50%" align="center"><img src="img/mobile.jpg" alt="모바일 홈" width="300"></td>
    <td width="50%" align="center"><img src="img/mobile-game.jpg" alt="모바일 게임 화면" width="300"></td>
  </tr>
  <tr>
    <td align="center">모바일 홈</td>
    <td align="center">모바일 게임 화면 (터치 · 키보드 모두 지원)</td>
  </tr>
</table>

<br>

## 주요 기능

- **오늘의 도전** — KST 날짜를 시드로 판을 만들어 모두가 같은 문제를 풉니다. 하루 첫 판만 기록되고 연속 일수가 쌓입니다. 서버 없이 같은 날짜면 같은 판이 나오도록 시드 기반 난수(`_shared/rng.js`)를 씁니다.
- **내 기록** — 게임별 최고 기록, 플레이 횟수, 최근 플레이, 이어 하던 진행 상황을 `localStorage`(`zepio:v1`)에 저장합니다. 읽을 때마다 형식과 범위를 검사해서 깨지거나 고쳐진 값은 기록이 없는 것으로 봅니다. 개인정보 페이지의 버튼으로 한 번에 지울 수 있습니다.
- **홈 정렬 · 분류** — 추천순, 신작순, 짧은 순, 많이 한 순, 최근 한 순과 분류 필터. 고른 값은 기억합니다.
- **결과 공유** — 공유 창이나 클립보드로 `Zepio {게임}` 꼴의 글을 보냅니다. 공유 창을 못 쓰면 직접 복사할 수 있게 글을 보여 줍니다.
- **접근성** — 키보드 조작, 색에 무늬를 함께 쓰는 카드(Hidden Rule), 화면 낭독용 이름, 움직임 줄이기 설정 존중(Stack Tower, Rack Tycoon, Agent Town), ESLint `jsx-a11y` 검사.
- **SEO** — 페이지별 title · description · canonical · Open Graph · JSON-LD, 게임별 OG 이미지, `sitemap` · `robots.txt`.
- **오류 격리** — 게임 안 예외는 `GameErrorBoundary`가 잡아 다시 시도 화면을 보이고, 잡히지 않은 오류는 콘솔에만 남깁니다. 어디로도 보내지 않습니다.

<br>

## 기술 스택

| 구분 | 사용 기술 |
|---|---|
| Framework | Astro (정적 출력), 게임 화면에만 React 19 |
| Language | JavaScript (JSX), TypeScript 미사용 |
| Style | Tailwind CSS 4 |
| 3D | Three.js (Rack Tycoon) |
| 검사 | ESLint 9 (`react-hooks`, `jsx-a11y`) |
| Infra | Cloudflare Pages, Cloudflare Web Analytics |
| CI/CD | GitHub Actions |

<br>

## 아키텍처

```mermaid
flowchart LR
    U["브라우저"] --> P["Astro 정적 페이지<br/>홈 · 게임 상세 · 소개 · 개인정보"]
    P --> M["mountReact<br/>게임 화면만 React"]
    M --> G["게임별 모듈<br/>엔진 · 리듀서 · 화면"]
    G --> S[("localStorage<br/>zepio:v1")]
    G --> R["_shared<br/>난수 · 공유 · 검증 · 일일 카드"]
    P --> H["home-records.js<br/>기록으로 카드 요약 · 정렬"]
    H --> S
```

### 게임 모듈 규칙

게임은 `web/src/games/<slug>/` 폴더 하나로 끝나고, 다른 게임의 코드를 가져오지 않습니다. 공통 코드는 `games/_shared/`와 `lib/`만 씁니다.

| 파일 | 역할 |
|---|---|
| `meta.js` | 이름, 분류, 시간, 기기, SEO 제목과 설명, 썸네일 |
| `content.js` | 게임 소개, 하는 법, 팁, 대상, 자주 묻는 질문 (상세 페이지에 그대로 출력) |
| `index.jsx` | `mountReact(Component)`로 화면을 붙이는 진입점 |
| `record.js` | 저장값 검증, 최고 기록 합치기, 홈 카드 한 줄 요약 |
| `share-text.js` | 결과 공유 글 |
| 엔진 · 리듀서 | 순수 함수로 만든 규칙과 상태 전이 (화면과 분리) |

새 게임은 폴더를 만들고 `games/registry.js`와 `games/records.js`에 한 줄씩 등록하면 홈, 상세 페이지, sitemap에 나타납니다.

<br>

## 폴더 구조

```
web/
  src/
    pages/        홈, 게임 상세([slug]), 소개, 개인정보, 문의, 약관
    components/   헤더, 푸터, 마스코트, 게임 무대
    layouts/      BaseLayout(SEO · 광고), TextLayout
    games/
      <slug>/     게임 11개 (meta · content · index · record · share-text · 엔진 · 화면)
      _shared/    난수, 공유 글, 검증, 일일 카드, 오디오, 뒤로가기 처리
      registry.js · records.js
    lib/          storage(기록), daily(오늘의 도전), share, site, game-host
    scripts/      홈 기록 · 정렬, Play Now, 기록 지우기, 게임 무대, 전역 오류
  public/         favicon, 폰트, 게임별 thumb.svg · og.png
.github/workflows/  GitHub Actions 워크플로
```

<br>

## 개발자

| | |
|---|---|
| <img src="https://github.com/Hasegos.png" width="80"> | **Hasegos**<br>기획 · 설계 · 개발 · 배포 · 운영 전체<br>[GitHub](https://github.com/Hasegos) |

<br>

## 저작권

© 2026 Zepio. All rights reserved.

이 저장소의 소스 코드는 저작권자의 허락 없이 복제 · 배포 · 상업적 이용을 할 수 없습니다.