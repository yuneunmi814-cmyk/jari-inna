// 시티드 백엔드 서버 진입점
//
// ⚠️ 중요: ./config/env가 다른 모든 import보다 먼저 와야 한다.
// 이유: TS/JS의 import는 호이스팅되어 본문 코드보다 먼저 평가된다.
// 같은 파일 안에서는 import 문 사이 순서가 유지되므로,
// .env 로드를 첫 import로 두면 이후 import되는 모듈들이 환경 변수를 안전하게 사용할 수 있다.
import "./config/env";

import express from "express";
import cors from "cors";
import metroRouter from "./routes/metro";
import debugRouter from "./routes/debug";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// 미들웨어
app.use(cors()); // 개발 단계 전체 허용 (Phase 2에서 origin 제한 예정)
app.use(express.json());

/**
 * GET /health
 * 서버 헬스체크 — 운영/모니터링용
 */
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "seated-server",
    timestamp: new Date().toISOString(),
    apiKeyConfigured: Boolean(process.env.SEOUL_OPEN_API_KEY),
  });
});

// 지하철 API 라우트
app.use("/api/metro", metroRouter);

// 디버그 라우트 (개발 단계 전용) — Phase 통합 끝나면 제거 예정
app.use("/debug", debugRouter);

// 404 핸들러
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "엔드포인트를 찾을 수 없습니다" },
  });
});

app.listen(PORT, () => {
  console.log(`🚇 시티드 서버 가동: http://localhost:${PORT}`);
  console.log(`   헬스체크: http://localhost:${PORT}/health`);
  if (!process.env.SEOUL_OPEN_API_KEY) {
    console.warn(
      "⚠️  SEOUL_OPEN_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요."
    );
  }
});
