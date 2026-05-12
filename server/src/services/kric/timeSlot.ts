// KRIC 시간대 처리 유틸
//
// KRIC stationCongestion 응답의 msmtDttm 형식:
//   "2026-1/4 05:30"  →  분기(year-Q) + 30분 슬롯 시각
//
// 시간대 슬롯: 05:30 ~ 24:30 (반나절 단위 X, 30분 단위 39개)
// 24:00, 24:30 같은 25시-시각은 다음날 00:00, 00:30 의미.

/** 한국 출퇴근족 기준 시간대 라벨 */
export type HourLabel =
  | "심야"
  | "새벽"
  | "출근시간"
  | "오전"
  | "점심시간"
  | "오후"
  | "퇴근시간"
  | "저녁"
  | "막차시간";

/**
 * "07:30" 형식 시각을 한국 통근 시간대 라벨로 변환
 */
export function classifyHour(timeStr: string): HourLabel {
  // "07:30" → 시 부분만 추출
  const [hStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);

  if (h >= 0 && h < 5) return "심야";
  if (h >= 5 && h < 6) return "새벽";
  if (h >= 6 && h < 10) return "출근시간";    // 6~9시
  if (h >= 10 && h < 12) return "오전";
  if (h >= 12 && h < 14) return "점심시간";
  if (h >= 14 && h < 17) return "오후";
  if (h >= 17 && h < 20) return "퇴근시간";    // 17~19시
  if (h >= 20 && h < 23) return "저녁";
  // 23~24:30
  return "막차시간";
}

/**
 * 현재 시각을 30분 슬롯으로 반올림 (KRIC msmtDttm 슬롯 형식)
 *
 * @returns "HH:MM" 형식 (예: 08:23 → "08:30", 08:10 → "08:00")
 */
export function nearestSlot(date: Date = new Date()): string {
  const h = date.getHours();
  const m = date.getMinutes();
  // 0~15 → 00, 16~45 → 30, 46~59 → 다음 시간 00
  let slotH = h;
  let slotM = 0;
  if (m >= 46) {
    slotH = (h + 1) % 24;
    slotM = 0;
  } else if (m >= 16) {
    slotM = 30;
  }
  return `${String(slotH).padStart(2, "0")}:${String(slotM).padStart(2, "0")}`;
}

/**
 * KRIC msmtDttm 문자열에서 시각 부분만 추출
 * "2026-1/4 07:30" → "07:30"
 */
export function extractTime(msmtDttm: string): string {
  return msmtDttm.split(" ").pop() ?? msmtDttm;
}

/**
 * msmtDttm 문자열에서 분기 부분만 추출
 * "2026-1/4 07:30" → "2026-1/4"
 */
export function extractQuarter(msmtDttm: string): string {
  return msmtDttm.split(" ")[0] ?? msmtDttm;
}
