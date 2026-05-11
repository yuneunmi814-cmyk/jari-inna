// 서울 지하철 공통 타입 정의
// 서버와 앱이 함께 import해서 사용

/**
 * 호선 번호 (서울 열린데이터광장 기준)
 * 4호선 = 1004
 */
export type LineCode = 1001 | 1002 | 1003 | 1004 | 1005 | 1006 | 1007 | 1008 | 1009;

export const LINE_4: LineCode = 1004;

/**
 * 혼잡도 레벨 (5단계)
 * Phase 1에서는 외부 API에서 받은 값을 그대로 사용하거나 자체 분류
 */
export type CongestionLevel =
  | "VERY_LOW"   // 여유 (좌석 많음)
  | "LOW"        // 보통
  | "MEDIUM"     // 약간 혼잡
  | "HIGH"       // 혼잡
  | "VERY_HIGH"; // 매우 혼잡

/**
 * 실시간 열차 위치 정보
 * 서울 열린데이터광장 realtimePosition API 응답 기반
 */
export interface TrainPosition {
  trainNo: string;          // 열차 번호
  lineCode: LineCode;       // 호선 코드
  statnId: string;          // 현재 역 ID
  statnNm: string;          // 현재 역 이름
  statnTid: string;         // 종착역 ID
  statnTnm: string;         // 종착역 이름
  trainSttus: TrainStatus;  // 열차 상태 (진입/도착/출발 등)
  directAt: string;         // 급행 여부 (1: 급행)
  lastRecptnDt: string;     // 최종 수신 시각
}

/**
 * 열차 상태 코드
 * 0: 진입, 1: 도착, 2: 출발, 3: 전역출발, 4: 전역진입, 5: 전역도착, 99: 운행중
 */
export type TrainStatus = "0" | "1" | "2" | "3" | "4" | "5" | "99";

/**
 * 실시간 역 도착 정보
 * 서울 열린데이터광장 realtimeStationArrival API 응답 기반
 */
export interface StationArrival {
  subwayId: LineCode;       // 호선 코드
  trainLineNm: string;      // 행선지 (예: "오이도행 - 한대앞방면")
  statnNm: string;          // 역 이름
  arvlMsg2: string;         // 도착 메시지 (예: "전역 출발")
  arvlMsg3: string;         // 현재 위치
  arvlCd: ArrivalCode;      // 도착 코드
  barvlDt: string;          // 도착 예정 시간 (초)
  recptnDt: string;         // 수신 시각
  updnLine: "상행" | "하행"; // 서울 API는 한글로 반환
}

/**
 * 도착 코드
 * 0: 진입, 1: 도착, 2: 출발, 3: 전역출발, 4: 전역진입, 5: 전역도착, 99: 운행중
 */
export type ArrivalCode = "0" | "1" | "2" | "3" | "4" | "5" | "99";

/**
 * 칸별 혼잡도 (Phase 1 핵심 기능)
 * 8량 또는 10량 편성에서 각 칸의 혼잡도를 표현
 */
export interface CarCongestion {
  carNo: number;              // 칸 번호 (1~10)
  level: CongestionLevel;
  passengerCount?: number;    // 추정 승객 수 (선택)
}

/**
 * 백엔드 → 앱 응답 표준 포맷
 * source 필드: 원본 데이터 출처 표시 (Phase 2부터 추가)
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  source?: DataSource;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

/**
 * 데이터 출처 식별자
 * - seoul: 서울 열린데이터광장 (서울교통공사 관할 구간)
 * - data_go_kr: 공공데이터포털 한국철도공사 API (안산선/과천선 구간)
 * - merged: 두 출처 데이터를 합쳐서 사용
 */
export type DataSource = "seoul" | "data_go_kr" | "merged";

/**
 * 공공데이터포털 한국철도공사 열차운행정보 API 타입
 * Base URL: http://apis.data.go.kr/B551457/run/v2
 *
 * 원본 응답 구조는 공공데이터포털 표준을 따른다:
 *   response.header (resultCode/resultMsg) + response.body.items.item[]
 *
 * ⚠️ 정확한 필드 이름은 실제 API 호출 후 보강 예정.
 * 현재 정의는 공공데이터포털 메타데이터 문서 기반 추정.
 */
export namespace DataGoKr {
  /** 표준 응답 헤더 */
  export interface ResponseHeader {
    resultCode: string; // "00" = 정상, 그 외는 에러
    resultMsg: string;
  }

  /**
   * 운행정보/운행계획 1건 (raw)
   * - 실제 호출 후 필드명 확정 전까지 모든 값 optional + 임의 키 허용
   */
  export interface RawTrainItem {
    runDt?: string;        // 운행일자 YYYYMMDD
    trnNo?: string;        // 열차번호
    trnRunSn?: string;     // 열차운행일련번호 (운행정보 only)
    stCd?: string;         // 역코드
    stNm?: string;         // 역명
    mlnCd?: string;        // 주운행선코드
    mlnNm?: string;        // 주운행선명
    updnCd?: string;       // 상행/하행구분 (0=상행, 1=하행 추정)
    stnCntyCd?: string;    // 정차구분코드
    stnCntyNm?: string;    // 정차구분명 (예: "정차역")
    trnDprtDt?: string;    // 열차출발일시
    trnArrvDt?: string;    // 열차도착일시
    dptStCd?: string;      // 출발역코드 (운행계획)
    dptStNm?: string;      // 출발역명
    arvStCd?: string;      // 도착역코드 (운행계획)
    arvStNm?: string;      // 도착역명
    [key: string]: unknown; // 안전망: 미확정 필드도 받아들임
  }

  /**
   * items가 비어있을 때 서버가 빈 문자열/객체를 반환할 수 있어 union으로 정의
   */
  export type RawItems = { item: RawTrainItem[] | RawTrainItem } | "" | null;

  /** 전체 응답 envelope */
  export interface Response {
    response: {
      header: ResponseHeader;
      body: {
        items: RawItems;
        numOfRows: number;
        pageNo: number;
        totalCount: number;
      };
    };
  }
}
