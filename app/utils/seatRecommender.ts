// 추천 칸 계산 — Phase 1 더미 로직
//
// 실제 칸별 혼잡도 데이터는 Phase 2 (레일포털 통합) 후 적용 예정.
// 그 전까지는 출발역/방면 기반 의사 결정으로 "그럴듯한" 추천 제공.
//
// 4호선 1편성은 10량. 일반적으로:
//   - 가운데 칸(4~6호차)이 가장 붐비고 양 끝(1, 10호차)이 비교적 한산
//   - 환승역 위치에 따라 한 쪽이 더 붐빔 (서울역, 명동, 사당, 동대문역사문화공원 등)
//
// Phase 1 단순 규칙:
//   - 출발역 이름의 해시값 + 시간대(시) 조합으로 의사난수 칸 추천 (3~8호차 사이)
//   - 같은 역+같은 시간이면 일관된 결과 → 5초마다 추천이 막 바뀌는 어색함 방지
//   - 혼잡도 라벨은 "한산해요"/"여유로워요"/"보통이에요" 중 의사난수

import { CongestionLevel } from "../../shared/types/metro";

export interface SeatRecommendation {
  carNo: number;             // 1~10 (4호선 10량 편성)
  congestion: CongestionLevel;
  congestionLabel: string;   // "한산해요" / "보통이에요" 등
  tip: string;               // 사용자에게 한 마디 ("뒤쪽이 비어요" 같은)
}

/**
 * 문자열 해시 (단순 djb2 변형) — 0~99 범위
 */
function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h % 100;
}

/**
 * 더미 추천 — 출발역 + 현재 시(hour) + nonce 기반
 * 같은 입력엔 같은 결과 (잦은 변동 방지). 사용자가 새로고침 누르면 nonce 증가.
 *
 * @param nonce 0이면 기본 추천, 새로고침 카운터 증가 시 다른 결과
 */
export function recommendSeat(
  fromStation: string,
  hour: number,
  nonce: number = 0
): SeatRecommendation {
  const seed = simpleHash(`${fromStation}_${hour}_${nonce}`);

  // 칸: 3~8호차 사이 (양 끝은 추천 빈도 낮춤 — 보통 출입구가 멀어서)
  const carNo = 3 + (seed % 6);

  // 혼잡도 분포
  const congestionPool: { level: CongestionLevel; label: string }[] = [
    { level: "VERY_LOW", label: "여유로워요" },
    { level: "LOW", label: "한산해요" },
    { level: "MEDIUM", label: "보통이에요" },
  ];
  const cong = congestionPool[seed % congestionPool.length];

  // 위치 힌트 (앞/뒤/가운데)
  const tipPool: string[] = [
    "앞쪽 출입문 근처가 비어 있을 거예요",
    "뒤쪽 칸이 한산한 시간대예요",
    "이 칸 가운데 자리가 비교적 여유로워요",
    "환승객이 적은 칸이에요",
  ];
  const tip = tipPool[seed % tipPool.length];

  return {
    carNo,
    congestion: cong.level,
    congestionLabel: cong.label,
    tip,
  };
}

/**
 * 혼잡도 레벨에 맞는 색상 키 ("success"/"warning"/"danger" 등)
 * UI에서 colors[key]로 사용
 */
export function congestionColorKey(level: CongestionLevel): "success" | "warning" | "danger" {
  switch (level) {
    case "VERY_LOW":
    case "LOW":
      return "success";
    case "MEDIUM":
      return "warning";
    default:
      return "danger";
  }
}
