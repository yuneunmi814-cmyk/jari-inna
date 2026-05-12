// 추천 결과 화면 (Phase 1)
//
// 구성:
//   1) 헤더: ← 뒤로 + "○○역 → ○○역 (방면)"
//   2) 추천 탑승 칸 카드 (Phase 1 더미 데이터)
//   3) 경로 요약 (도착역 있을 때): N정거장 · 약 M분
//   4) 다음 열차 — 선택한 방면만 필터링 (서울 API)
//   5) 환승 안내 (도착역이 환승역이면 더미 — Phase 2 예정)
//   6) 하단: "이 경로 즐겨찾기 추가"
//
// 데이터 소스:
//   - 출발역/도착역/방면: StationContext
//   - 도착 정보(실시간): 서울 열린데이터광장 (useArrivals)
//   - 추천 칸: utils/seatRecommender (더미). Phase 2 후 레일포털 데이터로 교체.

import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ArrivalCard from "../components/ArrivalCard";
import EmptyState from "../components/EmptyState";
import LineBadges from "../components/LineBadges";
import SectionHeader from "../components/SectionHeader";
import { getStationByName } from "../constants/line4Stations";
import { LINES, TRANSFER_STATIONS, type LineKey } from "../constants/lines";
import { useFavorites } from "../contexts/FavoritesContext";
import { useStation } from "../contexts/StationContext";
import { useArrivals } from "../hooks/useArrivals";
import { useCongestion } from "../hooks/useCongestion";
import type { CongestionLevel } from "../api/congestion";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { shadows } from "../theme/shadows";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import {
  calculateDirection,
  countStops,
  estimateTravelMinutes,
  findTransfer,
  getDirectionFromTerminus,
  type DirectionResult,
  type TransferInfo,
} from "../utils/directionCalculator";

/**
 * 혼잡도 레벨 → 화면 색상 키
 * very_low/low → success(녹), medium → warning(주황), high/very_high → danger(빨)
 */
function congestionColor(level: CongestionLevel): "success" | "warning" | "danger" {
  if (level === "very_low" || level === "low") return "success";
  if (level === "medium") return "warning";
  return "danger";
}

type NavProp = NativeStackNavigationProp<RootStackParamList, "Recommendation">;

export default function RecommendationScreen() {
  const navigation = useNavigation<NavProp>();
  const { station, departureLine, destination, destinationLine, direction, resetTrip } = useStation();
  const { addFavorite, isFavorite } = useFavorites();

  // ─────────────────────────────────────────────────────────────
  // 자동 호선 매칭 — 환승역에서 출발할 때 도착 호선이 가용하면 그쪽으로
  //
  // 예) 사당(2,4) 4호선 선택 → 강남(2호선) 가야 함
  //     → 사당에서 2호선도 잡힘 → effectiveDepartureLine = '2'
  //     → 도착정보/정거장수/혼잡도 모두 2호선 기준 (한 번에 가는 trip)
  //
  // 매칭 안 되면 (노원(4,7) → 강남(2): 2가 노원에 없음) →
  //   사용자 선택 호선 유지 + 환승 카드 표시 (4→2 환승 필요)
  // ─────────────────────────────────────────────────────────────
  const effectiveDepartureLine = useMemo<LineKey>(() => {
    if (!destinationLine || destinationLine === departureLine) return departureLine;
    const availableAtStation = TRANSFER_STATIONS[station];
    if (availableAtStation && availableAtStation.includes(destinationLine)) {
      // 자동 매칭됨 — 사용자가 고른 호선 != 도착 호선이지만, 출발역에 도착 호선 잡힘
      console.log(
        `[RecommendationScreen] 자동 호선 매칭: ${departureLine} → ${destinationLine} (${station}에서 ${destinationLine} 잡힘)`
      );
      return destinationLine;
    }
    return departureLine;
  }, [station, departureLine, destinationLine]);

  /** 자동 매칭이 일어났는지 (UI 안내용) */
  const lineAutoMatched = effectiveDepartureLine !== departureLine;

  // 출발역 혼잡도 — KRIC stationCongestion (분기별 시간대 평균)
  const congestion = useCongestion(station);

  // 방면 정보 결정: 도착역 있으면 우선, 없으면 사용자가 고른 방면
  // effectiveDepartureLine 기반 (자동 매칭 적용)
  const dirResult: DirectionResult | null = useMemo(() => {
    if (destination) {
      return calculateDirection(station, destination, effectiveDepartureLine);
    }
    if (direction) {
      const terminus = direction === "up" ? "당고개" : "오이도"; // 4호선 fallback
      return getDirectionFromTerminus(station, terminus, effectiveDepartureLine);
    }
    return null;
  }, [station, destination, direction, effectiveDepartureLine]);

  // 헤더 타이틀 — 도착역 유무에 따라
  const headerTitle = destination
    ? `${station} → ${destination}`
    : `${station}${dirResult ? `, ${dirResult.directionText}` : ""}`;

  /**
   * 헤더 호선 뱃지 — 출발/도착 호선 모두 표시
   * - 같은 호선 (예: 사당 2호선 → 강남 2호선) → [2호선] 1개
   * - 환승 경로 (예: 노원 4호선 → 강남 2호선) → [4호선] [2호선] 2개
   * - 도착역 없으면 출발 호선만
   */
  const tripLineKeys: LineKey[] = useMemo(() => {
    const dep = effectiveDepartureLine;
    if (!destination || !destinationLine) return [dep];
    const dst = destinationLine as LineKey;
    return dep === dst ? [dep] : [dep, dst];
  }, [effectiveDepartureLine, destination, destinationLine]);

  /**
   * 사용자 선택 방면에 대응하는 plfNo
   *   - up(상행) = plfNo 1
   *   - down(하행) = plfNo 2
   * (사당역 platform 응답 검증된 매핑. 다른 역도 동일 가정)
   */
  const selectedPlfNo = useMemo<1 | 2 | null>(() => {
    if (!dirResult) return null;
    return dirResult.direction === "up" ? 1 : 2;
  }, [dirResult]);

  /** 다시 고를래요 — 도착역/방면 모두 초기화 + 홈으로 돌아가기 */
  const handleResetTrip = () => {
    resetTrip();
    navigation.goBack();
  };

  // 도착 정보 — 5초 폴링.
  // effectiveDepartureLine 기반 — 자동 매칭됐으면 그 호선 도착 정보 가져옴.
  // 예: 사당 4호선 선택했지만 강남(2호선)행이면 사당 2호선 도착 정보.
  const departureLineCode = 1000 + Number(effectiveDepartureLine);
  const arrivals = useArrivals(station, departureLineCode);

  // ─────────────────────────────────────────────────────────────
  // Pull-to-Refresh — 혼잡도 + 도착정보 동시 재조회
  // 5초 폴링과 별개로 사용자가 명시적으로 당겨 새로고침할 수 있게.
  // useArrivals/useCongestion 둘 다 자체 refreshing state 있지만
  // 화면 RefreshControl 은 별도 로컬 state 로 묶어 한 번에 토글.
  // ─────────────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    console.log("[RecommendationScreen] 새로고침 시작");
    setRefreshing(true);
    const startTime = Date.now();
    try {
      await Promise.all([congestion.refresh(), arrivals.refresh()]);
      console.log(
        "[RecommendationScreen] 새로고침 완료",
        Date.now() - startTime,
        "ms"
      );
    } catch (e) {
      console.error("[RecommendationScreen] 새로고침 실패:", e);
    } finally {
      setRefreshing(false);
    }
    // congestion/arrivals refresh 함수는 stationName/station 변경 시 재생성됨
  }, [congestion, arrivals]);

  // 방면 필터링 — 서울 API의 updnLine 사용
  // 호선별 라벨:
  //   - 일반 호선(1/3/4/5/6/7/8/9): "상행"/"하행"
  //   - 2호선 순환선: "내선"/"외선"
  // direction 값 매핑:
  //   "up" → "상행", "down" → "하행", "inner" → "내선", "outer" → "외선"
  //
  // 매칭 안전망:
  //   updnLine 이 비거나 누락 시 trainLineNm 의 "외선/내선/상행/하행" 키워드로 fallback.
  //   (강남역 실측 응답은 updnLine "외선"/"내선" 정확히 옴 → fallback 거의 안 탐)
  const filteredArrivals = useMemo(() => {
    if (!dirResult) return arrivals.data;
    const targetUpdn =
      dirResult.direction === "up" ? "상행" :
      dirResult.direction === "down" ? "하행" :
      dirResult.direction === "inner" ? "내선" :
      dirResult.direction === "outer" ? "외선" :
      "";
    const matched = arrivals.data.filter(
      (a) =>
        a.updnLine === targetUpdn ||
        (!a.updnLine && a.trainLineNm?.includes(targetUpdn))
    );
    // 디버그 로그 — 데이터가 있는데 매칭이 0이면 진단용 출력
    if (arrivals.data.length > 0) {
      console.log(
        `[Arrival] 매칭 로직: line=${departureLine}, direction=${dirResult.label}`
      );
      console.log(
        `[Arrival] 매칭됨: ${dirResult.label} ${matched.length}대 (전체 ${arrivals.data.length}대 중)`
      );
    }
    return matched;
  }, [arrivals.data, dirResult, departureLine]);

  // 도착역 환승역 여부
  const destInfo = destination ? getStationByName(destination) : undefined;
  const isDestinationTransfer = Boolean(destInfo?.isTransfer);

  /**
   * 환승 안내 — 출발/도착 호선이 다르거나(호선 환승) 2호선 지선 케이스(지선 환승)
   * effectiveDepartureLine 기반 — 자동 매칭됐으면 환승 카드 안 뜸 (같은 호선 trip)
   */
  const transferInfo: TransferInfo | null = useMemo(() => {
    if (!destination || !destinationLine) return null;
    return findTransfer(
      station,
      effectiveDepartureLine,
      destination,
      destinationLine as LineKey
    );
  }, [station, effectiveDepartureLine, destination, destinationLine]);

  /**
   * 환승역까지 정거장 수 / 시간 — 호선 환승(line-change) trip에서 의미 있음.
   * 같은 호선이면 출발→도착 전체 거리.
   * 다른 호선이면 출발→환승역 (출발 호선 안에서) 거리.
   */
  const stops = useMemo(() => {
    if (!destination) return 0;
    if (transferInfo?.reason === "line-change") {
      return countStops(station, transferInfo.at, effectiveDepartureLine);
    }
    return countStops(station, destination, effectiveDepartureLine);
  }, [station, destination, effectiveDepartureLine, transferInfo]);

  const travelMin = useMemo(() => {
    if (!destination) return 0;
    if (transferInfo?.reason === "line-change") {
      // 환승 trip: 출발→환승 거리 + 환승 후 거리 (대략 합산)
      const beforeTransfer = estimateTravelMinutes(
        station,
        transferInfo.at,
        effectiveDepartureLine
      );
      const afterTransfer = destinationLine
        ? estimateTravelMinutes(transferInfo.at, destination, destinationLine)
        : 0;
      // 환승 자체 소요 ~3분 가산
      return beforeTransfer + afterTransfer + 3;
    }
    return estimateTravelMinutes(station, destination, effectiveDepartureLine);
  }, [station, destination, effectiveDepartureLine, destinationLine, transferInfo]);

  // 즐겨찾기 추가 — Phase 1은 도착역 단순 즐겨찾기로 처리 (Phase 2에서 경로 즐겨찾기로 확장)
  const alreadyFav = destination ? isFavorite(destination) : false;
  const handleAddFav = () => {
    if (!destination) {
      Alert.alert("도착역이 없어요", "도착역을 골랐을 때 경로 즐겨찾기가 가능해요");
      return;
    }
    if (alreadyFav) {
      Alert.alert("이미 추가됨", `'${destination}'은(는) 이미 즐겨찾기에 있어요`);
      return;
    }
    addFavorite(destination, `${station} 출발`);
    Alert.alert("추가됨", `'${destination}'을(를) 즐겨찾기에 추가했어요`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* 헤더 — 좌측 "다시 고를래요"는 resetTrip + 홈으로 */}
      <View style={styles.header}>
        <Pressable
          onPress={handleResetTrip}
          hitSlop={8}
          style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.5 }]}
        >
          <Text style={styles.resetText}>← 다시 고를래요</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          {/* 호선 뱃지 — 출발/도착 호선 같으면 1개, 다르면 환승 경로 2개 */}
          <View style={styles.headerBadges}>
            <LineBadges lines={tripLineKeys} variant="pill" />
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {headerTitle}
          </Text>
          {dirResult && (
            <Text style={styles.headerSub}>{dirResult.label}</Text>
          )}
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            title="다시 가져오는 중..."
            titleColor={colors.primary}
          />
        }
      >
        {/* 0. 자동 호선 매칭 안내 — 환승역에서 도착 호선이 가용해서 자동 매칭됐을 때 */}
        {lineAutoMatched && destination && destinationLine && (
          <View style={styles.autoMatchBanner}>
            <Text style={styles.autoMatchText}>
              💡 {destination}이(가) {LINES[destinationLine as LineKey].name}이라{" "}
              {station} {LINES[destinationLine as LineKey].name}으로 안내해요
            </Text>
          </View>
        )}

        {/* 1. 혼잡도 카드 — KRIC 분기별 시간대 평균 (effective 호선 기반) */}
        {renderCongestionCard(congestion, selectedPlfNo, station, effectiveDepartureLine)}

        {/* 2. 경로 요약 — 같은 호선 trip 또는 지선(line2-branch) 만 표시.
              호선 환승(line-change) 은 환승 카드가 거리 정보 가져감. */}
        {destination && transferInfo?.reason !== "line-change" && (
          <View style={styles.tripSummary}>
            <View style={styles.tripStat}>
              <Text style={styles.tripStatValue}>{stops}</Text>
              <Text style={styles.tripStatLabel}>정거장</Text>
            </View>
            <View style={styles.tripDivider} />
            <View style={styles.tripStat}>
              <Text style={styles.tripStatValue}>약 {travelMin}</Text>
              <Text style={styles.tripStatLabel}>분</Text>
            </View>
            {isDestinationTransfer && (
              <>
                <View style={styles.tripDivider} />
                <View style={styles.tripStat}>
                  <Text style={styles.tripStatBadge}>환승역</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* 3. 다음 열차 — 방면 필터링 */}
        <SectionHeader
          title={dirResult ? `다음 ${dirResult.label} 열차` : "다음 열차"}
        />
        {renderArrivals(arrivals, filteredArrivals)}

        {/* 4-A. 환승 안내 — 호선 환승(line-change) 또는 2호선 지선(line2-branch) */}
        {transferInfo && (
          <View style={styles.transferCardActive}>
            <Text style={styles.transferIcon}>🔀</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.transferTitleActive}>환승 안내</Text>
              <Text style={styles.transferBig}>
                {transferInfo.at}역에서 갈아타세요
              </Text>
              <Text style={styles.transferRoute}>
                {transferInfo.fromLineLabel}
                {"  →  "}
                <Text style={styles.transferRouteEmph}>
                  {transferInfo.toLineLabel}
                </Text>
              </Text>
              {/* 호선 환승일 때만 거리/시간 표시 — 지선은 위 tripSummary가 같은 정보 표시 */}
              {transferInfo.reason === "line-change" && stops > 0 && (
                <Text style={styles.transferDistance}>
                  환승역까지 {stops}정거장 · 환승 포함 약 {travelMin}분
                </Text>
              )}
              <Text style={styles.transferHint}>
                {transferInfo.reason === "line2-branch"
                  ? "지선은 본선에서 갈라지는 짧은 노선이에요"
                  : "환승역 안내판 따라 이동하면 돼요"}
              </Text>
            </View>
          </View>
        )}

        {/* 4-B. 도착역이 환승역인 경우 — 도착 후 옵션 (별도 정보, 위 카드와 공존) */}
        {isDestinationTransfer && (
          <View style={styles.transferCard}>
            <Text style={styles.transferIcon}>🚉</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.transferTitle}>
                {destination}은(는) 환승역이에요
              </Text>
              <Text style={styles.transferDesc}>
                도착 후 다른 노선으로 갈아탈 수 있어요.
              </Text>
            </View>
          </View>
        )}

        {/* 5. 즐겨찾기 추가 */}
        <Pressable
          onPress={handleAddFav}
          style={({ pressed }) => [
            styles.favBtn,
            pressed && { opacity: 0.8 },
            alreadyFav && styles.favBtnDone,
          ]}
          android_ripple={{ color: colors.ripplePrimary, borderless: false }}
        >
          <Text style={styles.favIcon}>{alreadyFav ? "✓" : "⭐"}</Text>
          <Text style={styles.favText}>
            {alreadyFav
              ? "이미 즐겨찾기에 있어요"
              : destination
              ? "이 경로 즐겨찾기에 추가"
              : "도착역을 골라야 추가할 수 있어요"}
          </Text>
        </Pressable>

        <View style={styles.footerSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** 도착 정보 렌더링 — 로딩/에러/빈/정상 */
function renderArrivals(
  arrivals: ReturnType<typeof useArrivals>,
  filtered: typeof arrivals.data
) {
  if (arrivals.loading && arrivals.data.length === 0) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingText}>잠깐, 열차 정보 가져오는 중...</Text>
      </View>
    );
  }
  if (arrivals.error && arrivals.data.length === 0) {
    return <EmptyState emoji="😅" title={arrivals.error} />;
  }
  if (filtered.length === 0) {
    return (
      <EmptyState
        emoji="🌙"
        title="이 방면 다음 열차가 없어요"
        description="잠시 후 다시 확인해보세요"
      />
    );
  }
  return (
    <View>
      {filtered.slice(0, 6).map((arrival, idx) => (
        <ArrivalCard
          key={`${arrival.trainLineNm}-${arrival.recptnDt}-${idx}`}
          arrival={arrival}
        />
      ))}
    </View>
  );
}

/**
 * 혼잡도 카드 렌더링
 * - 로딩 / 미지원(KORAIL/남양주) / 에러 / 정상 4가지 상태
 * - 정상: 사용자가 선택한 방면 + 반대 방면 둘 다 표시, 추천 메시지 강조
 */
function renderCongestionCard(
  congestion: ReturnType<typeof useCongestion>,
  selectedPlfNo: 1 | 2 | null,
  stationName: string,
  departureLine: LineKey
) {
  // 1) 미지원 — 호선별 친근 안내 분기
  //    - 9호선: 9호선 전체 미지원
  //    - 4호선 KORAIL/남양주: 안산선/과천선/진접 연장 구간
  if (congestion.isUnsupported) {
    const isLine9 = departureLine === "9";
    return (
      <View style={styles.recoCard}>
        <Text style={styles.recoLabel}>혼잡도</Text>
        <View style={styles.unsupportedBox}>
          <Text style={styles.unsupportedEmoji}>😴</Text>
          <Text style={styles.unsupportedTitle}>
            {isLine9
              ? "9호선은 KRIC 데이터가 없어요"
              : `${stationName}역은 아직 혼잡도 데이터가 없어요`}
          </Text>
          <Text style={styles.unsupportedDesc}>
            {isLine9
              ? "자리잡이가 졸고 있어요 — 9호선 혼잡도는 조만간 추가될 예정이에요!\n도착 정보는 그대로 보여드릴게요."
              : `서울교통공사 관할 구간에서만 제공돼요.\n다른 출처에서 보강 예정이에요.`}
          </Text>
        </View>
      </View>
    );
  }

  // 2) 로딩
  if (congestion.loading) {
    return (
      <View style={styles.recoCard}>
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>혼잡도 가져오는 중...</Text>
        </View>
      </View>
    );
  }

  // 3) 에러
  if (congestion.error || !congestion.data) {
    return (
      <View style={styles.recoCard}>
        <Text style={styles.recoLabel}>혼잡도</Text>
        <View style={styles.unsupportedBox}>
          <Text style={styles.unsupportedEmoji}>😅</Text>
          <Text style={styles.unsupportedTitle}>
            {congestion.error ?? "혼잡도를 가져오지 못했어요"}
          </Text>
        </View>
      </View>
    );
  }

  // 4) 정상 — KRIC 데이터 표시
  const data = congestion.data;
  const cur = data.current;
  const selected = selectedPlfNo
    ? cur.directions.find((d) => d.plfNo === selectedPlfNo)
    : null;
  const other = selected
    ? cur.directions.find((d) => d.plfNo !== selected.plfNo)
    : null;

  // 추천 메시지 — 사용자가 선택한 방면이 추천 방면과 다를 때만 노출
  // (백엔드가 이미 "stinLofa 차이가 있을 때만" recommended를 채워주므로
  //  여기선 사용자 선택과 다른지만 확인하면 충분)
  const showRecommendHint = !!(
    cur.recommended &&
    selected &&
    cur.recommended.plfNo !== selected.plfNo
  );

  return (
    <View style={styles.recoCard}>
      <View style={styles.recoHeader}>
        <Text style={styles.recoLabel}>
          {cur.hourLabel} ({cur.time}) 혼잡도
        </Text>
      </View>

      {/* 사용자 선택 방면 — 큰 강조 */}
      {selected ? (
        <View style={styles.directionBig}>
          <Text style={styles.bigStation}>🚇 {stationName}</Text>
          <Text style={styles.bigDirection}>
            {selected.directionLabel}
            <Text style={styles.bigDirectionFaded}>  (내가 갈 방향)</Text>
          </Text>
          <View style={styles.congestionRow}>
            <View
              style={[
                styles.congestionDot,
                { backgroundColor: colors[congestionColor(selected.level)] },
              ]}
            />
            <Text
              style={[
                styles.congestionLabel,
                { color: colors[congestionColor(selected.level)] },
              ]}
            >
              {selected.label}
            </Text>
            <Text style={styles.lofaValue}> · {Math.round(selected.stinLofa)}</Text>
          </View>
        </View>
      ) : (
        // 방면 미선택 — 두 방면을 동등하게
        <Text style={styles.recoTip}>
          방면을 골라야 혼잡도를 더 정확히 볼 수 있어요
        </Text>
      )}

      {/* 반대 방면 (참고) */}
      {other && (
        <View style={styles.directionSmall}>
          <Text style={styles.smallLabel}>
            {other.directionLabel} (반대 방면)
          </Text>
          <View style={styles.congestionRowSmall}>
            <View
              style={[
                styles.congestionDotSmall,
                { backgroundColor: colors[congestionColor(other.level)] },
              ]}
            />
            <Text
              style={[
                styles.smallCongestionLabel,
                { color: colors[congestionColor(other.level)] },
              ]}
            >
              {other.label}
            </Text>
            <Text style={styles.lofaValueSmall}>
              {" "}· {Math.round(other.stinLofa)}
            </Text>
          </View>
        </View>
      )}

      {/* 추천 메시지 — 사용자 선택보다 추천이 더 한산할 때 */}
      {showRecommendHint && cur.recommended && (
        <View style={styles.recommendHint}>
          <Text style={styles.recommendHintText}>
            💡 {cur.recommended.reason}
          </Text>
        </View>
      )}

      {/* Disclosure — 데이터 출처 */}
      <View style={styles.disclosure}>
        <Text style={styles.disclosureText}>
          KRIC {data.quarter} 평균 데이터예요
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // 헤더
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  resetBtn: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  resetText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerBadges: { marginBottom: 4 }, // 호선 뱃지 row — 타이틀 위에 작게
  headerRightSpacer: { width: 88 }, // resetBtn 텍스트 폭과 비슷하게 — 중앙 타이틀 균형
  headerTitle: { ...typography.h3, color: colors.textPrimary, fontSize: 18 },
  headerSub: { ...typography.caption, color: colors.accent, marginTop: 2 },

  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  // 추천 칸 카드
  recoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },

  // 사용자 선택 방면 — 강조 영역
  directionBig: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  bigStation: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  bigDirection: {
    ...typography.h3,
    color: colors.textPrimary,
    fontSize: 22,
    marginBottom: spacing.sm,
  },
  bigDirectionFaded: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "400",
  },
  lofaValue: {
    ...typography.caption,
    color: colors.textTertiary,
    fontWeight: "500",
  },

  // 반대 방면 — 작게 참고
  directionSmall: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  smallLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  congestionRowSmall: {
    flexDirection: "row",
    alignItems: "center",
  },
  congestionDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.sm,
  },
  smallCongestionLabel: {
    ...typography.body,
    fontWeight: "600",
  },
  lofaValueSmall: {
    ...typography.caption,
    color: colors.textTertiary,
  },

  // 추천 메시지
  recommendHint: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  recommendHintText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },

  // 미지원 / 에러 박스
  unsupportedBox: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  unsupportedEmoji: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  unsupportedTitle: {
    ...typography.bodyLg,
    color: colors.textPrimary,
    textAlign: "center",
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  unsupportedDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  recoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  recoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  rerollBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  rerollIcon: { fontSize: 14, color: colors.accent, fontWeight: "700" },
  rerollText: { ...typography.micro, color: colors.accent, fontWeight: "600" },
  recoMain: { flexDirection: "row", alignItems: "center" },
  carEmoji: { fontSize: 56, marginRight: spacing.lg },
  recoTextBlock: { flex: 1 },
  carNumber: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  congestionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  congestionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  congestionLabel: { ...typography.bodyLg, fontWeight: "600" },
  recoTip: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  disclosure: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  disclosureText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: "center",
  },

  // 경로 요약
  tripSummary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tripStat: { flex: 1, alignItems: "center" },
  tripStatValue: {
    ...typography.h2,
    color: colors.accent,
  },
  tripStatLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // "환승역" 뱃지 — 4호선 노선 컬러
  tripStatBadge: {
    ...typography.caption,
    color: colors.line4,
    fontWeight: "700",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.line4 + "20",
  },
  tripDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },

  // 환승 카드 — 도착역이 환승역 (보조 정보)
  transferCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  transferIcon: { fontSize: 24, marginTop: 2 },
  transferTitle: {
    ...typography.bodyLg,
    color: colors.textPrimary,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  transferDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // 환승 카드 — Active (실제 환승 필요한 경로). 오렌지 강조 + 큰 텍스트
  transferCardActive: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    gap: spacing.md,
  },
  transferTitleActive: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "700",
    marginBottom: 2,
  },
  transferBig: {
    ...typography.h3,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  transferRoute: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  transferRouteEmph: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  transferDistance: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  transferHint: {
    ...typography.caption,
    color: colors.textTertiary,
    lineHeight: 18,
  },

  // 자동 호선 매칭 안내 배너 — 사당(4선택) → 강남(2) 자동 매칭 같은 케이스
  autoMatchBanner: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  autoMatchText: {
    ...typography.caption,
    color: colors.textPrimary,
    lineHeight: 18,
  },

  // 즐겨찾기 버튼
  favBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  favBtnDone: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  favIcon: { fontSize: 18, color: colors.textPrimary },
  favText: { ...typography.button, color: colors.textPrimary, fontWeight: "700" },

  loadingBox: { alignItems: "center", paddingVertical: spacing.xl },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  footerSpacer: { height: spacing.xxl },
});
