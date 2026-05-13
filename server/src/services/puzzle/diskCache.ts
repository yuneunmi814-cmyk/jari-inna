// PUZZLE 캐시 디스크 영구화
//
// 목적:
//   - server/.cache/puzzle.json 으로 캐시 직렬화
//   - 서버 재시작/배포 후에도 12시간 캐시 유지 → SK API 호출 절감
//
// 동작:
//   - loadDiskCache: 시작 시 디스크 → 메모리 (expiresAt 만료 자동 필터)
//   - scheduleDiskSave: cache.set 후 1초 debounce → 디스크 쓰기
//     · 빈번한 set 에도 디스크 IO 는 1초당 1번만
//
// 호환:
//   - 우리 CacheEntry 는 expiresAt 만료시각 기준 (저장시각 X)
//   - 데이터 타입은 any — puzzleCongestion 외 다른 도메인 재사용 가능
//
// 위치: server/.cache/puzzle.json (gitignored)

import fs from "fs/promises";
import path from "path";

const CACHE_DIR = path.resolve(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "puzzle.json");

interface CacheEntry {
  data: any;
  expiresAt: number;
}

let saveTimer: NodeJS.Timeout | null = null;

/**
 * 시작 시 디스크에서 캐시 복원.
 * expiresAt 만료 항목은 자동으로 걸러냄.
 * 파일 없으면 빈 Map 반환 (첫 실행).
 */
export async function loadDiskCache(): Promise<Map<string, CacheEntry>> {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf-8");
    const obj = JSON.parse(raw) as Record<string, CacheEntry>;
    const now = Date.now();
    const valid = Object.entries(obj).filter(
      ([, v]) => v && typeof v.expiresAt === "number" && v.expiresAt > now
    );
    console.log(
      `[puzzle.cache] loaded ${valid.length}/${Object.keys(obj).length} entries from disk`
    );
    return new Map(valid);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      console.log("[puzzle.cache] no cache file (first run)");
    } else {
      console.error("[puzzle.cache] load failed:", err.message);
    }
    return new Map();
  }
}

/**
 * 1초 debounce 후 디스크 쓰기.
 * 빈번한 cache.set 호출에도 디스크 IO 는 1초마다 1번만.
 */
export function scheduleDiskSave(cache: Map<string, CacheEntry>): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      const obj = Object.fromEntries(cache.entries());
      await fs.writeFile(CACHE_FILE, JSON.stringify(obj));
      console.log(`[puzzle.cache] saved ${cache.size} entries to disk`);
    } catch (err) {
      console.error("[puzzle.cache] save failed:", err);
    }
  }, 1000);
}
