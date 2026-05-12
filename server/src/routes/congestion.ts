// 혼잡도 API 라우트 — KRIC stationCongestion 정규화 결과를 앱에 노출
//
// GET /api/congestion/station/:name       ← 역명으로 자동 매핑 (앱 사용)
//     예: /api/congestion/station/사당, /api/congestion/station/이수
//
// GET /api/congestion/by-code/:stinCd     ← stinCd 직접 (디버그/내부)
//     예: /api/congestion/by-code/433
//
// 공통 쿼리:
//   ?time=HH:MM  — 시각 슬롯 지정 (없으면 현재 시각 자동)

import { Request, Response, Router } from "express";
import { findByCode, findByName } from "../data/line4StationCodes";
import { getStationCongestion } from "../services/kric/stationCongestion";

const router = Router();

function ok<T>(data: T, source: string) {
  return {
    success: true,
    data,
    source,
    timestamp: new Date().toISOString(),
  };
}

function fail(code: string, message: string) {
  return {
    success: false,
    error: { code, message },
    timestamp: new Date().toISOString(),
  };
}

/**
 * GET /api/congestion/station/:name
 * 역명으로 자동 매핑 → KRIC stationCongestion 호출 → 정규화
 *
 * 예: /api/congestion/station/사당
 *     /api/congestion/station/이수?time=08:00
 *     /api/congestion/station/총신대입구  (KRIC 정식명도 OK)
 */
router.get("/station/:name", async (req: Request, res: Response) => {
  const name = decodeURIComponent(req.params.name ?? "").trim();
  const time = req.query.time as string | undefined;

  if (!name) {
    return res.status(400).json(fail("INVALID_PARAM", "역 이름이 필요합니다"));
  }

  const station = findByName(name);
  if (!station) {
    return res.status(404).json(
      fail(
        "STATION_NOT_FOUND",
        `'${name}'은(는) 4호선 역 목록에서 못 찾았어요. 다른 이름을 시도해주세요.`
      )
    );
  }

  try {
    const data = await getStationCongestion(
      {
        stinCd: station.stinCd,
        lnCd: station.lnCd,
        railOprIsttCd: station.railOprIsttCd,
      },
      time
    );
    // 매핑 메타도 함께 노출 (앱에서 역명/운영기관 표시용)
    const enriched = {
      ...data,
      stationName: station.appName,
      kricName: station.kricName,
      operator: station.operator,
    };
    res.json(ok(enriched, "kric"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error(`[congestion] station/${name} 에러:`, message);
    res.status(502).json(fail("UPSTREAM_ERROR", message));
  }
});

/**
 * GET /api/congestion/by-code/:stinCd
 * stinCd 직접 지정 (디버그/내부 호출용)
 *
 * 예: /api/congestion/by-code/433
 *     /api/congestion/by-code/433?time=08:00&lnCd=4
 */
router.get("/by-code/:stinCd", async (req: Request, res: Response) => {
  const stinCd = req.params.stinCd;
  const lnCd = (req.query.lnCd as string) || "4";
  const railOprIsttCd = (req.query.railOprIsttCd as string) || undefined;
  const time = req.query.time as string | undefined;

  if (!stinCd) {
    return res.status(400).json(fail("INVALID_PARAM", "stinCd가 필요합니다"));
  }

  // 매핑 테이블에서 메타 lookup (있으면 운영기관 코드도 자동)
  const known = findByCode(stinCd);
  const operatorCode = railOprIsttCd ?? known?.railOprIsttCd ?? "S1";

  try {
    const data = await getStationCongestion(
      { stinCd, lnCd: known?.lnCd ?? lnCd, railOprIsttCd: operatorCode },
      time
    );
    const enriched = known
      ? {
          ...data,
          stationName: known.appName,
          kricName: known.kricName,
          operator: known.operator,
        }
      : data;
    res.json(ok(enriched, "kric"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[congestion] by-code 에러:", message);
    res.status(502).json(fail("UPSTREAM_ERROR", message));
  }
});

export default router;
