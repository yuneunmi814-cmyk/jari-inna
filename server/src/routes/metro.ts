// 지하철 관련 API 라우트
// /api/metro/* 하위 엔드포인트들을 정의

import { Router, Request, Response } from "express";
import {
  getRealtimePosition,
  getRealtimeArrival,
  filterByLineCode,
} from "../services/seoulMetro";
import { LineCode } from "../../../shared/types/metro";
import { ApiResponse } from "../../../shared/types/metro";

const router = Router();

/**
 * 표준 응답 래퍼 - 성공/실패 일관된 포맷 유지
 */
function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data, timestamp: new Date().toISOString() };
}

function fail(code: string, message: string): ApiResponse<never> {
  return {
    success: false,
    error: { code, message },
    timestamp: new Date().toISOString(),
  };
}

/**
 * GET /api/metro/line/:line/positions
 * 특정 호선의 실시간 열차 위치 조회
 * 예: /api/metro/line/1004/positions → 4호선 모든 운행 열차
 */
router.get("/line/:line/positions", async (req: Request, res: Response) => {
  const lineParam = Number(req.params.line);

  // 호선 코드 검증 (1001~1009 범위)
  if (!Number.isInteger(lineParam) || lineParam < 1001 || lineParam > 1009) {
    return res
      .status(400)
      .json(fail("INVALID_LINE", `유효하지 않은 호선 코드: ${req.params.line}`));
  }

  try {
    const positions = await getRealtimePosition(lineParam as LineCode);
    return res.json(ok(positions));
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[metro.routes] positions error:", message);
    return res.status(502).json(fail("UPSTREAM_ERROR", message));
  }
});

/**
 * GET /api/metro/station/:name/arrivals
 * 특정 역의 실시간 도착 정보 조회
 * 쿼리 ?line=1004 추가 시 해당 호선만 필터링
 * 예: /api/metro/station/사당/arrivals?line=1004
 */
router.get("/station/:name/arrivals", async (req: Request, res: Response) => {
  const stationName = req.params.name;

  if (!stationName || stationName.trim() === "") {
    return res.status(400).json(fail("INVALID_STATION", "역 이름이 비어있습니다"));
  }

  try {
    let arrivals = await getRealtimeArrival(stationName);

    // ?line=1001~1009 쿼리 처리 — 환승역에서 특정 호선만 보고 싶을 때.
    // (강남: 2호선 1002 + 신분당선 1077 섞임 → line=1002 보내면 2호선만 추림)
    const lineParam = req.query.line;
    if (typeof lineParam === "string") {
      const lineNum = Number(lineParam);
      if (Number.isInteger(lineNum) && lineNum >= 1001 && lineNum <= 1009) {
        const beforeCount = arrivals.length;
        arrivals = filterByLineCode(arrivals, lineNum as LineCode);
        console.log(
          `[metro.routes] arrivals filter line=${lineNum}: ${beforeCount} → ${arrivals.length}`
        );
      }
    }

    return res.json(ok(arrivals));
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[metro.routes] arrivals error:", message);
    return res.status(502).json(fail("UPSTREAM_ERROR", message));
  }
});

export default router;
