// 레일포털(KRIC) Open API 공통 클라이언트
//
// Base URL: https://openapi.kric.go.kr/openapi/
// 공통 파라미터:
//   - serviceKey  (인증키 — API별로 다른 키)
//   - format      ('json' | 'xml' — JSON 권장)
//   - railOprIsttCd (운영기관 코드 — 서울교통공사: 'S1')
//   - lnCd        (노선 코드 — 호선 번호)
//   - stinCd      (역사 코드)
//
// 각 API는 자체 환경 변수에서 키를 읽도록 매핑 — KRIC_API_KEYS 객체 참조.
// process.env는 매번 새로 읽음 (import 호이스팅 안전, 어제 dataGoKr와 동일 패턴).

import axios, { AxiosError } from "axios";
import { promises as dnsPromises } from "dns";
import https from "https";
import iconv from "iconv-lite";

const BASE_URL = "https://openapi.kric.go.kr/openapi";

// ─────────────────────────────────────────────────────────────
// DNS 우회: KT DNS가 openapi.kric.go.kr에 SERVFAIL 반환하는 이슈
//
// 전략: IP 직접 박기
//   1. 자체 Resolver(Google DNS)로 IP 알아냄 → 30분 캐시
//   2. axios URL의 hostname을 IP로 치환
//   3. Host 헤더 + SNI(servername)에 진짜 호스트명 명시 → TLS 인증서 정상 검증
//
// custom lookup 옵션은 Node 버전에 따라 동작 불안정 → IP 직접 박는 게 가장 robust.
// ─────────────────────────────────────────────────────────────

const KRIC_HOSTNAME = "openapi.kric.go.kr";

const kricResolver = new dnsPromises.Resolver();
kricResolver.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4", "1.0.0.1"]);

/** 30분 메모리 캐시 */
let kricIpCache: { ip: string; expiresAt: number } | null = null;

/** Google DNS로 KRIC IP 알아내기 (캐시 적용) */
async function getKricIp(): Promise<string> {
  if (kricIpCache && kricIpCache.expiresAt > Date.now()) {
    return kricIpCache.ip;
  }
  const addresses = await kricResolver.resolve4(KRIC_HOSTNAME);
  if (!addresses || addresses.length === 0) {
    throw new Error(`No A record for ${KRIC_HOSTNAME}`);
  }
  kricIpCache = {
    ip: addresses[0],
    expiresAt: Date.now() + 30 * 60 * 1000,
  };
  console.log(`[kric/dns] ${KRIC_HOSTNAME} → ${addresses[0]} (Google DNS, 30분 캐시)`);
  return addresses[0];
}

/** SNI를 진짜 호스트명으로 명시하는 https.Agent (IP 직접 박을 때 인증서 검증) */
const kricHttpsAgent = new https.Agent({
  servername: KRIC_HOSTNAME,
  keepAlive: true,
});

/**
 * API 식별자 → 호출 메타 매핑
 *   - service / operation : URL path 조립용
 *   - keyEnv              : 어느 환경 변수에서 인증키 읽는지
 */
export const KRIC_APIS = {
  stationCongestion: {
    service: "convenientInfo",
    operation: "stationCongestion",
    keyEnv: "KRIC_STATION_CONGESTION_KEY",
    label: "역사별 혼잡도",
  },
  trainEnvironment: {
    service: "trainUseInfo",
    operation: "subwayEnvironmental",
    keyEnv: "KRIC_TRAIN_ENVIRONMENT_KEY",
    label: "열차별 환경정보",
  },
  timetable: {
    service: "trainUseInfo",
    operation: "subwayTimetable",
    keyEnv: "KRIC_TIMETABLE_KEY",
    label: "열차별 운행시각표",
  },
  timetableExpress: {
    service: "trainUseInfo",
    operation: "subwayTimetableExp",
    keyEnv: "KRIC_TIMETABLE_EXPRESS_KEY",
    label: "급행 시각표",
  },
  transferRoute: {
    service: "vulnerableUserInfo",
    operation: "transferMovement",
    keyEnv: "KRIC_TRANSFER_ROUTE_KEY",
    label: "환승 이동경로",
  },
  platform: {
    service: "convenientInfo",
    operation: "stPlf",
    keyEnv: "KRIC_PLATFORM_KEY",
    label: "승강장 정보",
  },
  exitRoute: {
    service: "handicapped",
    operation: "stationMovement",
    keyEnv: "KRIC_EXIT_ROUTE_KEY",
    label: "출입구 승강장 이동경로",
  },
  facility: {
    service: "convenientInfo",
    operation: "stationCnvFacl",
    keyEnv: "KRIC_FACILITY_KEY",
    label: "편의정보",
  },
} as const;

export type KricApiId = keyof typeof KRIC_APIS;

// [진단] 모듈 로드 시점에 각 키의 SET/UNSET 상태 로깅 — 트러블슈팅 보조
(function logKeyStatus() {
  const status = Object.entries(KRIC_APIS).map(([id, meta]) => {
    const has = Boolean(process.env[meta.keyEnv]?.trim());
    return `${id}=${has ? "SET" : "UNSET"}`;
  });
  console.log("[kric] 모듈 로드 시점 키 상태:", status.join(", "));
})();

/**
 * API 식별자로 인증키를 매번 새로 읽음.
 * 모듈 로드 시점에 const로 캡처하면 dotenv보다 먼저 import될 때 빈 값이 굳어버림 (어제 디버깅 케이스).
 */
function getApiKey(apiId: KricApiId): string {
  const meta = KRIC_APIS[apiId];
  const key = process.env[meta.keyEnv];
  if (!key || key.trim() === "") {
    throw new Error(
      `${meta.label} 인증키(${meta.keyEnv})가 환경 변수에 없습니다. ` +
        ".env 파일을 확인하고 서버를 재시작해주세요."
    );
  }
  return key.trim();
}

/**
 * 로그용 키 마스킹 — 앞 4자 + 뒤 2자만 노출
 */
function maskKey(key: string): string {
  if (key.length <= 8) return "***";
  return `${key.slice(0, 4)}***${key.slice(-2)}`;
}

/**
 * 발급 인증키는 Encoding(이미 % 인코딩)/Decoding(원본) 두 형태로 제공될 수 있음.
 * % 패턴 검출로 자동 분기 — encodeURIComponent 중복 적용 방지.
 */
function buildServiceKeyParam(apiKey: string): string {
  const isEncoded = /%[0-9A-Fa-f]{2}/.test(apiKey);
  return isEncoded ? apiKey : encodeURIComponent(apiKey);
}

/**
 * 응답 buffer를 적절한 인코딩으로 디코드
 * - Content-Type에 EUC-KR이 명시되어 있거나 UTF-8 결과에 깨진 문자가 많으면 EUC-KR 재시도
 * - 한국 공공 API의 옛 인코딩 대비 안전망
 */
function decodeResponse(buffer: Buffer, contentType?: string): string {
  if (contentType && /euc-kr/i.test(contentType)) {
    return iconv.decode(buffer, "euc-kr");
  }
  const utf8 = buffer.toString("utf-8");
  const replacementCount = (utf8.match(/�/g) || []).length;
  if (replacementCount > 3) {
    console.warn(
      `[kric] UTF-8 디코드 의심 (replacement ${replacementCount}건) → EUC-KR 재시도`
    );
    return iconv.decode(buffer, "euc-kr");
  }
  return utf8;
}

/**
 * KRIC API 호출 공통 래퍼
 *
 * @param apiId   KRIC_APIS의 식별자 (예: 'stationCongestion')
 * @param params  쿼리 파라미터 (railOprIsttCd, lnCd, stinCd 등)
 * @returns       { raw: 파싱된 응답, rawText: 원문 문자열 }
 */
export async function callKric<T = any>(
  apiId: KricApiId,
  params: Record<string, string | number | undefined>
): Promise<{ raw: T; rawText: string }> {
  const meta = KRIC_APIS[apiId];
  const apiKey = getApiKey(apiId);

  // serviceKey 외 파라미터만 URLSearchParams로 (URLSearchParams는 %를 재인코딩하므로 키 raw 처리는 별도)
  const otherQS = new URLSearchParams();
  otherQS.set("format", "json"); // 기본 JSON 응답
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      otherQS.set(k, String(v));
    }
  }

  const serviceKeyParam = buildServiceKeyParam(apiKey);
  const url = `${BASE_URL}/${meta.service}/${meta.operation}`;
  const fullUrl = `${url}?serviceKey=${serviceKeyParam}&${otherQS.toString()}`;
  const safeUrl = fullUrl.replace(serviceKeyParam, maskKey(apiKey));

  console.log(`[kric] ${apiId} 호출: ${safeUrl}`);

  // HTTP 호출
  let response;
  try {
    // KT DNS SERVFAIL 우회: IP 직접 박고 Host 헤더 + SNI(servername) 명시
    const kricIp = await getKricIp();
    const ipUrl = fullUrl.replace(KRIC_HOSTNAME, kricIp);

    response = await axios.get(ipUrl, {
      timeout: 10000,
      responseType: "arraybuffer",
      headers: { Host: KRIC_HOSTNAME },
      httpsAgent: kricHttpsAgent,
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
        `[kric] ${apiId} HTTP ${ae.response.status} 본문: ${bodyText.slice(0, 500)}`
      );
      throw new Error(
        `레일포털 HTTP ${ae.response.status} (${meta.label}). 잠시 후 다시 시도해주세요.`
      );
    }
    console.error(`[kric] ${apiId} 네트워크 에러: ${ae.message}`);
    throw new Error(
      `레일포털과 통신이 안 돼요 (${meta.label}). 네트워크를 확인해주세요.`
    );
  }

  // 응답 디코드
  const bodyBuf = Buffer.isBuffer(response.data)
    ? response.data
    : Buffer.from(response.data);
  const rawText = decodeResponse(
    bodyBuf,
    response.headers["content-type"] as string
  );

  // JSON 파싱 시도. 인증 실패 등은 XML/HTML로 올 수 있음.
  let raw: T;
  try {
    raw = JSON.parse(rawText) as T;
  } catch {
    console.error(
      `[kric] ${apiId} JSON 파싱 실패. 원문 미리보기:`,
      rawText.slice(0, 500)
    );
    throw new Error(
      `레일포털 응답이 이상해요 (JSON이 아님). 잠시 후 다시 시도해주세요.`
    );
  }

  console.log(
    `[kric] ${apiId} 응답 OK, 미리보기:`,
    rawText.slice(0, 300)
  );

  return { raw, rawText };
}
