// 지리 거리 계산 유틸 — GPS 자동 선택 (가장 가까운 역) 용도
//
// haversine 공식:
//   두 위경도 좌표 사이의 대원거리(great-circle distance) 계산.
//   지구 곡률 반영 — 도시 내 수백 미터 ~ 수십 km 범위에서 충분히 정확.
//
// 한반도 도시철도 범위(약 400km 내)에서 평면 근사도 가능하지만,
// 단순함/정확성 trade-off 에서 haversine 이 더 안정적.

import { STATION_LOCATIONS, type StationLocation } from "../constants/stationLocations";

/** 지구 반지름 (m) — WGS84 평균 */
const EARTH_RADIUS_M = 6_371_000;

/** 도 → 라디안 */
const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * 두 위경도 사이의 거리 (미터).
 * haversine 공식.
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/** 가장 가까운 역 1개 + 거리 */
export interface NearestStationResult {
  station: StationLocation;
  /** 미터 단위 */
  distanceM: number;
}

/**
 * 사용자 위경도 → 전국 도시철도역 중 가장 가까운 역.
 *
 * 단순 선형 검색 — 987개 역이라 O(N) 으로 충분히 빠름 (수 밀리초).
 * 추후 성능 이슈 시 quadtree / R-tree 도입 검토 가능.
 *
 * @param maxDistanceM 최대 허용 거리(미터). 이보다 멀면 null 반환.
 *                     기본 5km — 지하철 권역 벗어난 경우 fallback 처리용.
 */
export function findNearestStation(
  userLat: number,
  userLng: number,
  maxDistanceM = 5000
): NearestStationResult | null {
  let best: NearestStationResult | null = null;
  for (const s of STATION_LOCATIONS) {
    const d = haversineMeters(userLat, userLng, s.lat, s.lng);
    if (d > maxDistanceM) continue;
    if (!best || d < best.distanceM) {
      best = { station: s, distanceM: d };
    }
  }
  return best;
}

/**
 * 사용자 위경도 → 가까운 역 N개 (가까운 순).
 * StationPicker "📍 내 위치 근처 역" 섹션 등 다수 표시용.
 */
export function findNearestStations(
  userLat: number,
  userLng: number,
  count = 5,
  maxDistanceM = 10000
): NearestStationResult[] {
  const candidates: NearestStationResult[] = [];
  for (const s of STATION_LOCATIONS) {
    const d = haversineMeters(userLat, userLng, s.lat, s.lng);
    if (d > maxDistanceM) continue;
    candidates.push({ station: s, distanceM: d });
  }
  candidates.sort((a, b) => a.distanceM - b.distanceM);
  return candidates.slice(0, count);
}

/** 거리 → "X m" 또는 "X.Y km" 사람 친화 포맷 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
