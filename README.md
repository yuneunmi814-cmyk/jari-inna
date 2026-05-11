# 🚇 자리있나 (JariInna)

> 4호선 칸별 실시간 혼잡도 + 좌석 공유 커뮤니티 모바일 앱

경기도민 출퇴근자가 **덜 붐비는 칸을 골라 탑승**할 수 있게 돕는 앱입니다.
서울 열린데이터광장의 실시간 지하철 API를 기반으로 4호선 각 칸의 혼잡도를 시각화하고, 사용자 간 좌석 정보를 공유하는 것이 목표입니다.

---

## 📁 폴더 구조

```
jari-inna/
├── app/         # React Native + Expo (TypeScript) 앱
│   ├── App.tsx
│   ├── screens/
│   │   └── HomeScreen.tsx
│   └── ...
├── server/      # Node.js + Express (TypeScript) API 서버
│   ├── src/
│   │   ├── index.ts             # 서버 진입점
│   │   ├── routes/metro.ts      # /api/metro/* 라우트
│   │   └── services/seoulMetro.ts  # 서울 열린데이터광장 API 호출
│   └── tsconfig.json
├── shared/      # 앱 + 서버 공통 타입 정의
│   └── types/metro.ts
├── .env         # 환경 변수 (커밋되지 않음)
├── .env.example # 환경 변수 템플릿
└── package.json # npm workspaces 루트
```

---

## ⚙️ 환경 변수 설정

1. 루트의 `.env.example`을 참고해 `.env`를 채웁니다.
2. **서울 열린데이터광장** ([https://data.seoul.go.kr](https://data.seoul.go.kr))에서 API 키를 발급받으세요.
   - 필요한 데이터셋: "지하철 실시간 위치", "지하철 실시간 도착"
3. `.env`에 발급받은 키를 입력합니다:

```bash
SEOUL_OPEN_API_KEY=발급받은_키_여기에
```

> ⚠️ `.env` 파일은 `.gitignore`에 등록되어 있어 커밋되지 않습니다. 절대 키를 코드에 하드코딩하지 마세요.

---

## 🚀 실행 방법

### 사전 준비

```bash
# 모노레포 의존성 일괄 설치 (server + app + shared 한 번에)
npm install
```

### 백엔드 서버 실행

```bash
# 루트에서
npm run dev:server

# 또는 server 폴더에서 직접
cd server && npm run dev
```

서버가 `http://localhost:3000`에서 가동됩니다.

**헬스체크:**
```bash
curl http://localhost:3000/health
```

**API 호출 예시:**
```bash
# 4호선 실시간 열차 위치
curl http://localhost:3000/api/metro/line/1004/positions

# 사당역 실시간 도착 정보 (4호선만 필터링)
curl "http://localhost:3000/api/metro/station/사당/arrivals?line=1004"
```

### 모바일 앱 실행

```bash
# 루트에서
npm run dev:app

# 또는 app 폴더에서 직접
cd app && npm start
```

Expo Dev Tools가 열리면:
- **iOS 시뮬레이터:** `i` 입력
- **Android 에뮬레이터:** `a` 입력
- **실기기:** Expo Go 앱으로 QR 코드 스캔

---

## 📚 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 서버 상태 + API 키 설정 여부 |
| GET | `/api/metro/line/:line/positions` | 호선별 실시간 열차 위치 (예: `:line=1004`) |
| GET | `/api/metro/station/:name/arrivals?line=1004` | 역별 실시간 도착 정보 (호선 필터 옵션) |

호선 코드: `1001`(1호선) ~ `1009`(9호선). 본 프로젝트는 **1004 (4호선)** 에 집중합니다.

---

## 🗺️ 로드맵

### Phase 1 — 4호선 본인 시나리오 흐름 (현재)
서울 열린데이터광장 API만으로 출퇴근 핵심 흐름 완성.
- [x] 모노레포 + 백엔드 + 앱 골격
- [x] 서울 열린데이터광장 API 연동 (실시간 도착/위치)
- [x] HomeScreen — 출발역 / 다음 열차 / 운행 중 4호선 / 빠른 액션
- [ ] StationPickerScreen 개편 — 출발역 → 방면/도착역 선택
- [ ] 추천 결과 화면 (도착역 기반 도착 시각 + 정거장 수)
- [ ] FavoritesScreen 본격 구현 (스와이프 삭제)

### Phase 2 — 레일포털 통합, 수도권 전체 확장
- [ ] 레일포털([data.kric.go.kr](https://data.kric.go.kr)) API 통합
- [ ] 수도권 광역철도 시각표 (첫차/막차/배차간격)
- [ ] 4호선 칸별 혼잡도 시각화 (레일포털 혼잡도 데이터 기반)
- [ ] 1호선/2호선/7호선/9호선 등 출퇴근 혼잡 노선 추가

### Phase 3 — 환승/광역/KTX
- [ ] 4호선 ↔ KTX/ITX 환승 안내 (한국철도공사 공공데이터포털 API 활용 — `server/src/services/dataGoKr.ts` 보관됨)
- [ ] 좌석 공유 커뮤니티 (Supabase 연동, 실시간 좌석 정보 공유)
- [ ] 푸시 알림 (즐겨찾기 노선 혼잡 알림, 막차 임박 알림)
- [ ] 경기도 버스 환승 정보

---

## 🛠️ 기술 스택

- **프론트엔드:** React Native (Expo) + TypeScript
- **백엔드:** Node.js + Express + TypeScript
- **외부 API:** 서울 열린데이터광장 실시간 지하철 API
- **DB:** Phase 2부터 Supabase

---

## 📝 라이선스

Private / 작성 중
