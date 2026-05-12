// SK Open API PUZZLE 클라이언트 — 지하철 칸별 혼잡도 통계
//
// Base URL: https://apis.openapi.sk.com/puzzle/
// 인증: HTTP 헤더 `appKey: <PUZZLE_API_KEY>`
//
// 환경 변수: PUZZLE_API_KEY (.env / eas.json)
//
// KRIC client.ts 와 동일한 DNS 우회 패턴 적용 (혹시 KT DNS 이슈 대비).
// 모든 API 호출에서 인증 헤더 + 30분 IP 캐시 + SNI servername 사용.

import axios, { AxiosError } from "axios";
import { promises as dnsPromises } from "dns";
import https from "https";

const BASE_URL = "https://apis.openapi.sk.com";
const PUZZLE_HOSTNAME = "apis.openapi.sk.com";

// ─────────────────────────────────────────────────────────────
// DNS 우회 — KRIC 와 동일 패턴 (KT DNS SERVFAIL 방어)
// ─────────────────────────────────────────────────────────────

const puzzleResolver = new dnsPromises.Resolver();
puzzleResolver.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4", "1.0.0.1"]);

let puzzleIpCache: { ip: string; expiresAt: number } | null = null;

async function getPuzzleIp(): Promise<string> {
  if (puzzleIpCache && puzzleIpCache.expiresAt > Date.now()) {
    return puzzleIpCache.ip;
  }
  const addresses = await puzzleResolver.resolve4(PUZZLE_HOSTNAME);
  if (!addresses || addresses.length === 0) {
    throw new Error(`No A record for ${PUZZLE_HOSTNAME}`);
  }
  puzzleIpCache = {
    ip: addresses[0],
    expiresAt: Date.now() + 30 * 60 * 1000,
  };
  console.log(
    `[puzzle/dns] ${PUZZLE_HOSTNAME} → ${addresses[0]} (Google DNS, 30분 캐시)`
  );
  return addresses[0];
}

const puzzleHttpsAgent = new https.Agent({
  servername: PUZZLE_HOSTNAME,
  keepAlive: true,
});

// ─────────────────────────────────────────────────────────────
// 응답 타입
// ─────────────────────────────────────────────────────────────

export interface PuzzleCarCongestionRaw {
  status: { code: string; message: string; totalCount: number };
  contents: {
    subwayLine: string;
    stationName: string;
    stationCode: string;
    /** 운행 패턴별 통계 (시발/종착/이전역 조합) */
    stat: PuzzleStatRow[];
    statStartDate: string;
    statEndDate: string;
  };
}

export interface PuzzleStatRow {
  startStationCode: string;
  startStationName: string;
  endStationCode: string;
  endStationName: string;
  prevStationCode: string;
  prevStationName: string;
  /** 0 = 외선/하행, 1 = 내선/상행 (호선별 다름) */
  updnLine: 0 | 1;
  /** 0 = 일반, 1 = 급행 */
  directAt: 0 | 1;
  /** 10분 단위 시간대별 데이터 */
  data: PuzzleTimeBucket[];
}

export interface PuzzleTimeBucket {
  /** 요일: MON/TUE/.../SUN */
  dow: string;
  hh: string; // "00"~"23"
  mm: string; // "00","10","20","30","40","50"
  /** 1~10칸 각 칸의 혼잡도 % */
  congestionCar: number[];
}

// ─────────────────────────────────────────────────────────────
// API 키 (런타임 검증)
// ─────────────────────────────────────────────────────────────

function getPuzzleApiKey(): string {
  const key = process.env.PUZZLE_API_KEY;
  if (!key || key.trim() === "") {
    throw new Error(
      "PUZZLE_API_KEY가 환경 변수에 없습니다. .env에 추가 후 서버 재시작해주세요."
    );
  }
  return key.trim();
}

function maskKey(key: string): string {
  if (key.length <= 8) return "***";
  return `${key.slice(0, 4)}***${key.slice(-4)}`;
}

// ─────────────────────────────────────────────────────────────
// 메인 API — 역별 칸별 혼잡도 통계
// ─────────────────────────────────────────────────────────────

/**
 * 역별 칸별 혼잡도 통계 조회
 *
 * @param stationCode KRIC stinCd 형식 (강남=222, 사당=226 등)
 *
 * SK Open API endpoint:
 *   GET /puzzle/subway/congestion/stat/car/stations/{stationCode}
 *   Header: appKey: <PUZZLE_API_KEY>
 */
export async function getCarCongestion(
  stationCode: string
): Promise<PuzzleCarCongestionRaw> {
  const apiKey = getPuzzleApiKey();
  const path = `/puzzle/subway/congestion/stat/car/stations/${encodeURIComponent(
    stationCode
  )}`;
  const fullUrl = `${BASE_URL}${path}`;
  const safeUrl = `${fullUrl} (appKey: ${maskKey(apiKey)})`;

  console.log(`[puzzle] carCongestion 호출: ${safeUrl}`);

  try {
    // DNS 우회 — IP 직접 박기 + Host 헤더 + SNI
    const ip = await getPuzzleIp();
    const ipUrl = fullUrl.replace(PUZZLE_HOSTNAME, ip);

    const response = await axios.get<PuzzleCarCongestionRaw>(ipUrl, {
      timeout: 10000,
      headers: {
        Host: PUZZLE_HOSTNAME,
        appKey: apiKey,
        Accept: "application/json",
      },
      httpsAgent: puzzleHttpsAgent,
    });

    const data = response.data;
    if (!data?.status || data.status.code !== "00") {
      const code = data?.status?.code ?? "?";
      const msg = data?.status?.message ?? "no message";
      throw new Error(`PUZZLE API 응답 에러 [${code}] ${msg}`);
    }

    console.log(
      `[puzzle] carCongestion OK: ${data.contents.stationName} (${data.contents.stationCode}), stat ${data.contents.stat.length}건`
    );
    return data;
  } catch (err) {
    const ae = err as AxiosError;
    if (ae.response) {
      const bodySnippet = JSON.stringify(ae.response.data).slice(0, 500);
      console.error(
        `[puzzle] HTTP ${ae.response.status} 본문: ${bodySnippet}`
      );
      throw new Error(
        `PUZZLE HTTP ${ae.response.status}: ${bodySnippet.slice(0, 200)}`
      );
    }
    console.error(`[puzzle] 네트워크/타임아웃: ${(err as Error).message}`);
    throw err;
  }
}
