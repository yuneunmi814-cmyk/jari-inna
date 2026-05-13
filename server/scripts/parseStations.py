"""
xlsx → app/constants/stationLocations.ts 변환 스크립트

입력: server/src/data/stations-raw.xlsx (공공데이터 전국 도시철도역사 정보)
출력: app/constants/stationLocations.ts

전략:
- 같은 역명은 합쳐서 평균 위경도 (환승역 호선별 30cm 차이 분리 방지)
- 노선명도 합쳐서 array 로 저장
- 정렬: 역명 가나다 순

재실행 방법:
    python3 server/scripts/parseStations.py

(루트 디렉토리에서 실행해주세요)
"""

import re
import sys
from collections import defaultdict
from pathlib import Path

import openpyxl


def clean_name(raw: str) -> str:
    """역명 정규화 — xlsx 셀 안의 줄바꿈/탭/연속 공백 단일 공백으로."""
    if not raw:
        return ""
    # 줄바꿈/탭 제거 + 연속 공백 단일화
    return re.sub(r"\s+", " ", str(raw)).strip()

# 루트 디렉토리 기준 상대 경로
ROOT = Path(__file__).resolve().parents[2]
INPUT = ROOT / "server/src/data/stations-raw.xlsx"
OUTPUT = ROOT / "app/constants/stationLocations.ts"


def main() -> int:
    if not INPUT.exists():
        print(f"❌ 입력 파일 없음: {INPUT}", file=sys.stderr)
        return 1

    wb = openpyxl.load_workbook(INPUT, read_only=True)
    rows = list(wb.active.iter_rows(values_only=True))
    print(f"📂 {INPUT.name}: {len(rows) - 1} 행")

    # 역명 기준 그룹핑
    stations = defaultdict(lambda: {"lats": [], "lngs": [], "lines": set()})
    skipped = 0
    for r in rows[1:]:
        name = clean_name(r[1])
        line_name = clean_name(r[3])
        lat = r[9]
        lng = r[10]
        if not (name and lat is not None and lng is not None):
            skipped += 1
            continue
        try:
            lat = float(lat)
            lng = float(lng)
        except (ValueError, TypeError):
            skipped += 1
            continue
        stations[name]["lats"].append(lat)
        stations[name]["lngs"].append(lng)
        if line_name:
            stations[name]["lines"].add(line_name)

    # 평균 위경도 + 정렬
    result = []
    for name in sorted(stations.keys()):
        v = stations[name]
        result.append(
            {
                "name": name,
                "lat": round(sum(v["lats"]) / len(v["lats"]), 6),
                "lng": round(sum(v["lngs"]) / len(v["lngs"]), 6),
                "lines": sorted(v["lines"]),
            }
        )

    print(f"✅ 고유 역: {len(result)}개 (raw {len(rows) - 1} 행, skip {skipped})")

    # TS 파일 작성
    lines_out = []
    lines_out.append("// 자동 생성됨 — server/scripts/parseStations.py 가 생성")
    lines_out.append("// 원본: server/src/data/stations-raw.xlsx")
    lines_out.append("// 재생성: python3 server/scripts/parseStations.py")
    lines_out.append("//")
    lines_out.append("// 전국 도시철도역사 위경도 (역명 기준, 환승역은 호선별 평균)")
    lines_out.append("// GPS 자동 선택 — 사용자 현재 위치 → 가장 가까운 역 찾기 용도")
    lines_out.append("")
    lines_out.append("export interface StationLocation {")
    lines_out.append("  /** 역 이름 (단순 이름, 괄호 등 X) */")
    lines_out.append("  name: string;")
    lines_out.append("  /** 위도 (소수점 6자리) */")
    lines_out.append("  lat: number;")
    lines_out.append("  /** 경도 */")
    lines_out.append("  lng: number;")
    lines_out.append('  /** 이 역이 속한 노선명들 (예: ["2호선", "4호선"]) */')
    lines_out.append("  lines: string[];")
    lines_out.append("}")
    lines_out.append("")
    lines_out.append("export const STATION_LOCATIONS: ReadonlyArray<StationLocation> = [")

    for s in result:
        name_esc = s["name"].replace('\\', '\\\\').replace('"', '\\"')
        lines_str = ", ".join(
            '"' + line.replace('\\', '\\\\').replace('"', '\\"') + '"'
            for line in s["lines"]
        )
        lines_out.append(
            f'  {{ name: "{name_esc}", lat: {s["lat"]}, lng: {s["lng"]}, lines: [{lines_str}] }},'
        )
    lines_out.append("];")
    lines_out.append("")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text("\n".join(lines_out), encoding="utf-8")
    print(f"📝 출력: {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
