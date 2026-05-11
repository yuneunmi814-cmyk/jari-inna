// 공공데이터포털 한국철도공사 열차운행정보 API 서비스
//
// ⚠️ 현재 상태: 보류 (Phase 3에서 KTX/ITX 환승 안내 시 활용 예정)
//
// 보류 이유: 이 데이터셋은 간선철도(KTX/ITX/새마을/무궁화)만 다루고,
// 4호선 안산선/과천선 같은 광역철도는 totalCount=0으로 데이터가 없음.
// 검증: stn_nm=오이도/안산/한대앞/초지/사당 모두 0건. 수원(경부선) 150건.
// 광역철도 시간표/혼잡도는 레일포털(data.kric.go.kr)에서 별도 통합 예정 (Phase 2).
//
// 코드는 삭제하지 않고 보관 — Phase 3에서 "사당역에서 KTX 환승 안내" 같은
// 기능 만들 때 재사용. /debug 라우터도 유지하여 다른 공공API 테스트에 재활용.
//
// Base URL: http://apis.data.go.kr/B551457/run/v2  (2024 변경 후 v2)
// 변경 안내: https://www.data.go.kr/bbs/ntc/selectNotice.do?originId=NOTICE_0000000003772
//
// 오퍼레이션 (v2, 실측 검증됨):
//   - travelerTrainRunInfo2 : 여객열차 운행정보 (과거 운행 기록, 어제 ~ 3개월 전)
//   - travelerTrainRunPlan2 : 여객열차 운행계획 (향후 시간표, 1개월 전 ~ 3개월 후)
//   - codes2                : 코드정보 (역코드/노선코드 마스터) — 추후 사용 예정
//
// 쿼리 파라미터 패턴 (이 API 고유):
//   - returnType=JSON  (다른 공공API의 type=json과 다름)
//   - cond[필드명::연산자]=값  (예: cond[stn_nm::EQ]=오이도, cond[run_ymd::GTE]=20260510)
//   - 연산자: EQ, GTE, LTE, IN, LIKE 등
//
// 정상 응답 코드: "0" (다른 공공API의 "00"과 다름)
//
// 우리 앱에서의 역할 (옵션 A 전략):
//   - 실시간 도착/위치 → 서울 열린데이터광장 API 사용 (4호선 전 구간 커버됨)
//   - 시간표/첫차/막차 → 이 API 사용 (KORAIL 운행계획)

import axios, { AxiosError } from "axios";
import iconv from "iconv-lite";
import { DataGoKr } from "../../../shared/types/metro";

const BASE_URL = "http://apis.data.go.kr/B551457/run/v2";

// [진단] 모듈 로드 시점 키 상태 — config/env.ts 보다 먼저 로드되면 UNDEFINED로 찍힘
console.log(
  "[dataGoKr] 모듈 로드 시점 DATA_GO_KR_API_KEY:",
  process.env.DATA_GO_KR_API_KEY ? "SET" : "UNDEFINED"
);

/**
 * API 키를 매번 환경 변수에서 새로 읽음 (import 호이스팅 안전)
 */
function getApiKey(): string {
  const key = process.env.DATA_GO_KR_API_KEY;
  if (!key || key.trim() === "") {
    throw new Error(
      "DATA_GO_KR_API_KEY가 환경 변수에 없습니다. " +
        "루트 .env 파일에 공공데이터포털 인증키를 추가하고 서버를 재시작해주세요."
    );
  }
  return key.trim();
}

/** 로그용 키 마스킹 (앞 4자 + 뒤 2자) */
function maskKey(key: string): string {
  if (key.length <= 8) return "***";
  return `${key.slice(0, 4)}***${key.slice(-2)}`;
}

/**
 * 응답 buffer를 적절한 인코딩으로 디코드
 * - Content-Type에 EUC-KR 명시 → 그대로 변환
 * - 명시 없음 + UTF-8 결과에 깨진 문자(�) 많음 → EUC-KR 재시도
 */
function decodeResponse(buffer: Buffer, contentType?: string): string {
  if (contentType && /euc-kr/i.test(contentType)) {
    return iconv.decode(buffer, "euc-kr");
  }
  const utf8 = buffer.toString("utf-8");
  const replacementCount = (utf8.match(/�/g) || []).length;
  if (replacementCount > 3) {
    console.warn(
      `[dataGoKr] UTF-8 디코드 의심 (replacement ${replacementCount}건) → EUC-KR 재시도`
    );
    return iconv.decode(buffer, "euc-kr");
  }
  return utf8;
}

/**
 * 발급 인증키는 Encoding(이미 % 인코딩됨) / Decoding(원본 base64) 두 형태로 제공.
 * % 패턴 검출로 자동 분기 — 이미 인코딩됐으면 그대로, 아니면 인코딩 적용.
 */
function buildServiceKeyParam(apiKey: string): string {
  const isEncoded = /%[0-9A-Fa-f]{2}/.test(apiKey);
  return isEncoded ? apiKey : encodeURIComponent(apiKey);
}

/**
 * 이 API 특유의 cond[필드::연산자]=값 필터 표현
 */
export interface DataGoKrFilter {
  field: string; // 예: "stn_nm", "run_ymd", "mrnt_nm"
  op: "EQ" | "GTE" | "LTE" | "IN" | "LIKE" | "NE";
  value: string;
}

/**
 * 공공데이터포털 GET 호출 공통 래퍼
 */
async function callDataGoKr<T = DataGoKr.Response>(
  operation: string,
  options: {
    filters?: DataGoKrFilter[];
    pageNo?: number;
    numOfRows?: number;
  }
): Promise<{ raw: T; rawText: string }> {
  const apiKey = getApiKey();
  const url = `${BASE_URL}/${operation}`;

  // 1) 기본 파라미터
  const qs = new URLSearchParams();
  qs.set("returnType", "JSON");
  qs.set("pageNo", String(options.pageNo ?? 1));
  qs.set("numOfRows", String(options.numOfRows ?? 10));

  // 2) cond[...] 필터들 추가
  for (const f of options.filters ?? []) {
    qs.set(`cond[${f.field}::${f.op}]`, f.value);
  }

  // 3) serviceKey는 raw 처리 (URLSearchParams가 %를 재인코딩하는 것 방지)
  const serviceKeyParam = buildServiceKeyParam(apiKey);
  const fullUrl = `${url}?serviceKey=${serviceKeyParam}&${qs.toString()}`;
  const safeUrl = fullUrl.replace(serviceKeyParam, maskKey(apiKey));
  console.log(`[dataGoKr] ${operation} 호출: ${safeUrl}`);

  let response;
  try {
    response = await axios.get(fullUrl, {
      timeout: 10000,
      responseType: "arraybuffer",
    });
  } catch (err) {
    const ae = err as AxiosError;
    if (ae.response) {
      const bodyBuf = Buffer.isBuffer(ae.response.data)
        ? ae.response.data
        : Buffer.from(String(ae.response.data));
      const bodyText = decodeResponse(
        bodyBuf,
        ae.response.headers["content-type"] as string
      );
      console.error(
        `[dataGoKr] ${operation} HTTP ${ae.response.status}: ${bodyText.slice(0, 500)}`
      );
      throw new Error(
        `공공데이터포털 HTTP ${ae.response.status} (${operation}). 잠시 후 다시 시도해주세요.`
      );
    }
    console.error(`[dataGoKr] ${operation} 네트워크 에러: ${ae.message}`);
    throw new Error(
      `공공데이터포털과 통신이 안 돼요 (${operation}). 네트워크를 확인해주세요.`
    );
  }

  const bodyBuf = Buffer.isBuffer(response.data)
    ? response.data
    : Buffer.from(response.data);
  const rawText = decodeResponse(
    bodyBuf,
    response.headers["content-type"] as string
  );

  let raw: T;
  try {
    raw = JSON.parse(rawText) as T;
  } catch {
    console.error(
      `[dataGoKr] ${operation} JSON 파싱 실패. 원문 미리보기:`,
      rawText.slice(0, 500)
    );
    throw new Error(
      `공공데이터포털 응답이 이상해요 (JSON이 아님). 잠시 후 다시 시도해주세요.`
    );
  }

  // resultCode 검증 (이 API는 "0"이 정상, 다른 공공API는 "00")
  const NORMAL_CODES = new Set(["00", "0"]);
  const resp = (raw as any)?.response;
  if (resp?.header) {
    const { resultCode, resultMsg } = resp.header;
    if (!NORMAL_CODES.has(resultCode)) {
      console.error(
        `[dataGoKr] ${operation} API 에러: [${resultCode}] ${resultMsg}`
      );
      throw new Error(
        `공공데이터포털 응답 에러 (${operation}): [${resultCode}] ${resultMsg}`
      );
    }
  }

  console.log(
    `[dataGoKr] ${operation} 응답 OK, 미리보기:`,
    rawText.slice(0, 300)
  );

  return { raw, rawText };
}

/**
 * 여객열차 운행정보 (과거 운행 기록 — 어제까지)
 * 사용처: 분석/통계용. 실시간이 필요하면 서울 API 사용.
 */
export async function getTrainRunInfo(params: {
  runYmd?: string;      // 단일 날짜 (cond[run_ymd::EQ])
  runYmdGte?: string;   // 범위 시작
  runYmdLte?: string;   // 범위 끝
  stnNm?: string;       // 역명
  mrntNm?: string;      // 노선명 (예: "안산선", "과천선")
  trnNo?: string;       // 열차번호
  extraFilters?: DataGoKrFilter[];
  pageNo?: number;
  numOfRows?: number;
}) {
  const filters: DataGoKrFilter[] = [];
  if (params.runYmd) filters.push({ field: "run_ymd", op: "EQ", value: params.runYmd });
  if (params.runYmdGte) filters.push({ field: "run_ymd", op: "GTE", value: params.runYmdGte });
  if (params.runYmdLte) filters.push({ field: "run_ymd", op: "LTE", value: params.runYmdLte });
  if (params.stnNm) filters.push({ field: "stn_nm", op: "EQ", value: params.stnNm });
  if (params.mrntNm) filters.push({ field: "mrnt_nm", op: "EQ", value: params.mrntNm });
  if (params.trnNo) filters.push({ field: "trn_no", op: "EQ", value: params.trnNo });
  if (params.extraFilters) filters.push(...params.extraFilters);

  return callDataGoKr<DataGoKr.Response>("travelerTrainRunInfo2", {
    filters,
    pageNo: params.pageNo,
    numOfRows: params.numOfRows,
  });
}

/**
 * 여객열차 운행계획 (향후 시간표)
 * 사용처: 첫차/막차/시간표 정보. 우리 앱의 핵심 활용처.
 */
export async function getTrainRunPlan(params: {
  runYmd?: string;
  runYmdGte?: string;
  runYmdLte?: string;
  dptreStnNm?: string;  // 출발역명
  arvlStnNm?: string;   // 도착역명
  trnNo?: string;
  extraFilters?: DataGoKrFilter[];
  pageNo?: number;
  numOfRows?: number;
}) {
  const filters: DataGoKrFilter[] = [];
  if (params.runYmd) filters.push({ field: "run_ymd", op: "EQ", value: params.runYmd });
  if (params.runYmdGte) filters.push({ field: "run_ymd", op: "GTE", value: params.runYmdGte });
  if (params.runYmdLte) filters.push({ field: "run_ymd", op: "LTE", value: params.runYmdLte });
  if (params.dptreStnNm) filters.push({ field: "dptre_stn_nm", op: "EQ", value: params.dptreStnNm });
  if (params.arvlStnNm) filters.push({ field: "arvl_stn_nm", op: "EQ", value: params.arvlStnNm });
  if (params.trnNo) filters.push({ field: "trn_no", op: "EQ", value: params.trnNo });
  if (params.extraFilters) filters.push(...params.extraFilters);

  return callDataGoKr<DataGoKr.Response>("travelerTrainRunPlan2", {
    filters,
    pageNo: params.pageNo,
    numOfRows: params.numOfRows,
  });
}

/** 오늘 날짜 YYYYMMDD */
export function todayYYYYMMDD(): string {
  return formatYYYYMMDD(new Date());
}

/** 어제 날짜 YYYYMMDD — 운행정보는 어제 데이터까지만 존재 */
export function yesterdayYYYYMMDD(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatYYYYMMDD(d);
}

function formatYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}
