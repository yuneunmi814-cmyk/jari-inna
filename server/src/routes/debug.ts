// 디버그 라우터 — 개발 단계 응답 구조 확인 전용
// ⚠️ 프로덕션에 절대 노출 금지. 추후 환경변수로 비활성화 조건 추가 예정.

import { Router } from "express";
import {
  getTrainRunInfo,
  getTrainRunPlan,
  todayYYYYMMDD,
  yesterdayYYYYMMDD,
} from "../services/dataGoKr";

const router = Router();

/**
 * GET /debug/data-go-kr/run-info
 * 여객열차 운행정보 raw 응답 — 과거 운행 기록 (어제까지)
 * 예: /debug/data-go-kr/run-info?stnNm=오이도&numOfRows=5
 *     /debug/data-go-kr/run-info?stnNm=오이도&mrntNm=안산선&numOfRows=5
 */
router.get("/data-go-kr/run-info", async (req, res) => {
  try {
    const result = await getTrainRunInfo({
      runYmd: (req.query.runYmd as string) || yesterdayYYYYMMDD(),
      stnNm: req.query.stnNm as string | undefined,
      mrntNm: req.query.mrntNm as string | undefined,
      trnNo: req.query.trnNo as string | undefined,
      numOfRows: Number(req.query.numOfRows) || 5,
    });
    res.json({
      operation: "travelerTrainRunInfo2",
      raw: result.raw,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: msg });
  }
});

/**
 * GET /debug/data-go-kr/run-plan
 * 여객열차 운행계획 raw 응답 — 향후 시간표
 * 예: /debug/data-go-kr/run-plan?dptreStnNm=사당&numOfRows=5
 */
router.get("/data-go-kr/run-plan", async (req, res) => {
  try {
    const result = await getTrainRunPlan({
      runYmd: (req.query.runYmd as string) || todayYYYYMMDD(),
      dptreStnNm: req.query.dptreStnNm as string | undefined,
      arvlStnNm: req.query.arvlStnNm as string | undefined,
      trnNo: req.query.trnNo as string | undefined,
      numOfRows: Number(req.query.numOfRows) || 5,
    });
    res.json({
      operation: "travelerTrainRunPlan2",
      raw: result.raw,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: msg });
  }
});

/**
 * GET /debug/data-go-kr/distinct-lines
 * 운행정보에서 distinct한 노선명(mrnt_nm) 추출 — 4호선 노선명 확인용
 * 특정 역(기본: 오이도)을 통과한 열차들의 노선명만 sampling
 */
router.get("/data-go-kr/distinct-lines", async (req, res) => {
  const stnNm = req.query.stnNm as string | undefined; // optional
  const numOfRows = Number(req.query.numOfRows) || 500;
  try {
    const result = await getTrainRunInfo({
      runYmd: yesterdayYYYYMMDD(),
      stnNm,
      numOfRows,
    });

    const body = (result.raw as any)?.response?.body;
    const items = body?.items?.item ?? [];
    const arr = Array.isArray(items) ? items : [items];

    const linesSet = new Set<string>();
    arr.forEach((item: any) => {
      if (item?.mrnt_nm) linesSet.add(item.mrnt_nm);
    });

    res.json({
      stnNm,
      runYmd: yesterdayYYYYMMDD(),
      totalSampled: arr.length,
      distinctLines: Array.from(linesSet).sort(),
      samples: arr.slice(0, 3), // 디버깅용 첫 3건
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: msg });
  }
});

export default router;
