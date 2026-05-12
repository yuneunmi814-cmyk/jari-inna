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
import { findByCode } from "../data/line4StationCodes";
import {
  findStationByName,
  LINE_META,
  type LineKey,
} from "../data/lineStationCodes";
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
 * 역명으로 1~9호선 자동 매핑 → KRIC stationCongestion 호출 → 정규화
 *
 * 환승역(예: "사당" — 2/4호선)은 ?line= 으로 호선 명시 권장.
 * 명시 안 하면 가장 먼저 매칭된 호선 사용.
 *
 * 예:
 *   /api/congestion/station/사당              ← 첫 매칭 (4호선)
 *   /api/congestion/station/사당?line=2       ← 2호선 사당
 *   /api/congestion/station/이수?time=08:00   ← 4호선 별칭
 */
router.get("/station/:name", async (req: Request, res: Response) => {
  const name = decodeURIComponent(req.params.name ?? "").trim();
  const time = req.query.time as string | undefined;
  const lineQuery = req.query.line as LineKey | undefined;

  if (!name) {
    return res.status(400).json(fail("INVALID_PARAM", "역 이름이 필요합니다"));
  }

  const station = findStationByName(name, lineQuery);
  if (!station) {
    return res.status(404).json(
      fail(
        "STATION_NOT_FOUND",
        `'${name}'은(는) 1~9호선 역 목록에서 못 찾았어요. 다른 이름을 시도해주세요.`
      )
    );
  }

  const meta = LINE_META[station.lnCd as LineKey];

  // 호선 자체가 KRIC stationCongestion 미지원(9호선)이면 즉시 안내
  if (!meta?.congestionSupported) {
    return res.status(404).json(
      fail(
        "LINE_NOT_SUPPORTED",
        `${meta?.name ?? station.lnCd + "호선"}은(는) 아직 혼잡도 데이터가 없어요`
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
    const enriched = {
      ...data,
      stationName: station.simpleName,
      kricName: station.stinNm,
      lineName: meta.name,
      operator: meta.railOprIsttCd === "S1" ? "서울교통공사" : "서울메트로9호선",
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
