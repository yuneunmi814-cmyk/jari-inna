// 서울 열린데이터광장 실시간 지하철 API 서비스
// 공식 문서: https://data.seoul.go.kr/dataList/OA-12601/A/1/datasetView.do (실시간 위치)
//          https://data.seoul.go.kr/dataList/OA-12764/A/1/datasetView.do (실시간 도착)

import axios, { AxiosError } from "axios";
import {
  TrainPosition,
  StationArrival,
  LineCode,
  LINE_4,
} from "../../../shared/types/metro";

// 서울 열린데이터광장 SwOpenAPI 베이스 URL
const BASE_URL = "http://swopenapi.seoul.go.kr/api/subway";

// [진단 로그] 모듈 로드 시점의 환경 변수 상태
// 만약 "UNDEFINED"가 찍히면 dotenv보다 먼저 모듈이 로드된 것 → config/env.ts import 순서 문제
console.log(
  "[seoulMetro] 모듈 로드 시점 SEOUL_OPEN_API_KEY:",
  process.env.SEOUL_OPEN_API_KEY ? "SET" : "UNDEFINED"
);

/**
 * API 키를 매번 환경 변수에서 새로 읽는다.
 * 모듈 로드 시점에 const로 캡처하면 import 호이스팅 영향을 받을 수 있어,
 * 함수 호출 시점에 읽어서 안정성을 확보한다.
 */
function getApiKey(): string {
  const key = process.env.SEOUL_OPEN_API_KEY;
  if (!key || key.trim() === "") {
    throw new Error(
      "SEOUL_OPEN_API_KEY가 환경 변수에 없습니다. " +
        "루트 .env 파일에 키를 입력하고 서버를 재시작해주세요."
    );
  }
  return key.trim();
}

/**
 * 호선 코드 → 한글 호선명 매핑 (API가 요구하는 형식)
 */
const LINE_CODE_TO_NAME: Record<LineCode, string> = {
  1001: "1호선",
  1002: "2호선",
  1003: "3호선",
  1004: "4호선",
  1005: "5호선",
  1006: "6호선",
  1007: "7호선",
  1008: "8호선",
  1009: "9호선",
};

/**
 * 로그에서 API 키를 노출하지 않도록 마스킹
 */
function maskKey(key: string): string {
  if (key.length <= 8) return "***";
  return `${key.slice(0, 4)}***${key.slice(-2)}`;
}

/**
 * 서울 API 호출 공통 래퍼
 * - 키 누락 → 명확한 메시지
 * - HTTP 4xx/5xx → 상태 코드 + 응답 본문 스니펫
 * - 정상 응답이지만 서울 API status.code가 INFO-000이 아니면 → 그 코드/메시지 노출
 * - 응답 본문 일부를 콘솔에 로깅하여 디버깅 가능
 */
async function callSeoulApi<T>(pathSegment: string, label: string): Promise<T> {
  const apiKey = getApiKey();
  const url = `${BASE_URL}/${apiKey}/json/${pathSegment}`;
  const safeUrl = url.replace(apiKey, maskKey(apiKey));

  console.log(`[seoulMetro] ${label} 호출: ${safeUrl}`);

  let response;
  try {
    response = await axios.get(url, { timeout: 8000 });
  } catch (err) {
    const ae = err as AxiosError;
    // 서버가 응답은 했지만 4xx/5xx인 경우
    if (ae.response) {
      const bodySnippet = JSON.stringify(ae.response.data).slice(0, 500);
      console.error(
        `[seoulMetro] ${label} HTTP ${ae.response.status} 본문: ${bodySnippet}`
      );
      throw new Error(
        `서울 API HTTP ${ae.response.status} 응답 (${label}): ${bodySnippet}`
      );
    }
    // 네트워크/타임아웃 등
    console.error(`[seoulMetro] ${label} 네트워크 에러: ${ae.message}`);
    throw new Error(`서울 API 네트워크 에러 (${label}): ${ae.message}`);
  }

  const data = response.data as any;

  // 서울 API는 정상 200 응답에도 본문에 status 객체로 에러를 담아 보낼 때가 있다.
  // 정상 코드: "INFO-000". 그 외(예: INFO-100=인증실패, INFO-200=데이터없음 등)는 에러 처리.
  if (data?.status?.code && data.status.code !== "INFO-000") {
    const codeMsg = `[${data.status.code}] ${data.status.message ?? "메시지 없음"}`;
    console.error(`[seoulMetro] ${label} API 상태 에러: ${codeMsg}`);
    throw new Error(`서울 API 응답 에러 (${label}): ${codeMsg}`);
  }

  // 정상 응답: 미리보기 로깅 (디버깅 용이성)
  console.log(
    `[seoulMetro] ${label} 응답 OK, 미리보기:`,
    JSON.stringify(data).slice(0, 300)
  );

  return data as T;
}

/**
 * 실시간 열차 위치 조회
 */
export async function getRealtimePosition(
  lineNumber: LineCode
): Promise<TrainPosition[]> {
  const lineName = LINE_CODE_TO_NAME[lineNumber];
  const data = await callSeoulApi<any>(
    `realtimePosition/0/100/${encodeURIComponent(lineName)}`,
    `realtimePosition(${lineName})`
  );

  if (!Array.isArray(data.realtimePositionList)) {
    throw new Error(
      `예상치 못한 응답 구조 (realtimePositionList 누락): ${JSON.stringify(data).slice(0, 300)}`
    );
  }

  return data.realtimePositionList.map((item: any): TrainPosition => ({
    trainNo: item.trainNo,
    lineCode: Number(item.subwayId) as LineCode,
    statnId: item.statnId,
    statnNm: item.statnNm,
    statnTid: item.statnTid,
    statnTnm: item.statnTnm,
    trainSttus: item.trainSttus,
    directAt: item.directAt,
    lastRecptnDt: item.lastRecptnDt,
  }));
}

/**
 * 실시간 역 도착 정보 조회
 */
export async function getRealtimeArrival(
  stationName: string
): Promise<StationArrival[]> {
  const data = await callSeoulApi<any>(
    `realtimeStationArrival/0/20/${encodeURIComponent(stationName)}`,
    `realtimeStationArrival(${stationName})`
  );

  if (!Array.isArray(data.realtimeArrivalList)) {
    throw new Error(
      `예상치 못한 응답 구조 (realtimeArrivalList 누락): ${JSON.stringify(data).slice(0, 300)}`
    );
  }

  return data.realtimeArrivalList.map((item: any): StationArrival => ({
    subwayId: Number(item.subwayId) as LineCode,
    trainLineNm: item.trainLineNm,
    statnNm: item.statnNm,
    arvlMsg2: item.arvlMsg2,
    arvlMsg3: item.arvlMsg3,
    arvlCd: item.arvlCd,
    barvlDt: item.barvlDt,
    recptnDt: item.recptnDt,
    updnLine: item.updnLine,
  }));
}

/**
 * 호선별 필터 유틸 — 1001~1009 모두 지원
 *
 * 서울 API 응답에서 다른 호선/타 사업자(신분당선 1077 등)를 걸러낸다.
 * 강남역 호출 시 1002(2호선)+1077(신분당) 섞여 오므로,
 * 사용자가 출발 호선으로 고른 호선만 골라낸다.
 */
export function filterByLineCode<
  T extends { subwayId?: LineCode | number; lineCode?: LineCode | number }
>(items: T[], lineCode: LineCode): T[] {
  return items.filter(
    (item) =>
      Number(item.subwayId) === lineCode || Number(item.lineCode) === lineCode
  );
}

/**
 * 4호선 전용 필터 — 기존 호출처 호환용 (filterByLineCode 를 호출)
 */
export function filterLine4<
  T extends { subwayId?: LineCode | number; lineCode?: LineCode | number }
>(items: T[]): T[] {
  return filterByLineCode(items, LINE_4);
}
