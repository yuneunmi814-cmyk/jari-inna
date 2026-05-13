#!/usr/bin/env python3
"""
Play Store 피처 그래픽 생성기 (1024x500).
- 좌측 35%: 시티드 픽토그램 (앉은 사람)
- 우측 65%: 카피 (메인 / 서브 / 라벨)
- 배경: #00A4E4 → #0088C4 살짝 대각 그라데이션

사용법: python3 generate-feature-graphic.py
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ─────────────────────────────────────────────────────────────
# 출력 / 레이아웃
# ─────────────────────────────────────────────────────────────
HOME = Path.home()
OUT_PATH = HOME / "jari-inna/docs/screenshots/store/feature-graphic.png"

W, H = 1024, 500
LEFT_W = int(W * 0.35)                     # 358
RIGHT_W = W - LEFT_W                       # 666

BG_TOP = (0, 164, 228)                     # #00A4E4
BG_BOTTOM = (0, 136, 196)                  # #0088C4
TEXT_WHITE = (255, 255, 255)
LABEL_WHITE = (255, 255, 255, 204)         # 흰색 80%

# 우측 텍스트 영역 좌우 패딩 (중앙 분리선 기준)
RIGHT_PAD_L = 40
RIGHT_PAD_R = 60

# ─────────────────────────────────────────────────────────────
# 카피
# ─────────────────────────────────────────────────────────────
COPY = {
    "main": "아, 앉아서 가고 싶다.",
    "sub": "제발.",
    "label": "시티드 - 출퇴근 메이트",
}

# 폰트
FONT_PATH = "/System/Library/Fonts/AppleSDGothicNeo.ttc"
FONT_IDX_BOLD = 6
FONT_IDX_REGULAR = 3

MAIN_MAX, MAIN_MIN = 110, 60
SUB_SIZE = 60
LABEL_SIZE = 30
GAP_MAIN_SUB = 18
GAP_SUB_LABEL = 36


def load_font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    idx = FONT_IDX_BOLD if bold else FONT_IDX_REGULAR
    return ImageFont.truetype(FONT_PATH, size, index=idx)


def fit_font(text: str, max_w: int, max_size: int, min_size: int,
             bold: bool = True) -> ImageFont.FreeTypeFont:
    for size in range(max_size, min_size - 1, -2):
        font = load_font(size, bold)
        bbox = font.getbbox(text)
        if (bbox[2] - bbox[0]) <= max_w:
            return font
    return load_font(min_size, bold)


# ─────────────────────────────────────────────────────────────
# 배경 (대각 그라데이션)
# ─────────────────────────────────────────────────────────────
def make_background() -> Image.Image:
    bg = Image.new("RGB", (W, H), BG_TOP)
    px = bg.load()
    diag = W + H
    for y in range(H):
        for x in range(W):
            t = (x + y) / diag
            r = int(BG_TOP[0] * (1 - t) + BG_BOTTOM[0] * t)
            g = int(BG_TOP[1] * (1 - t) + BG_BOTTOM[1] * t)
            b = int(BG_TOP[2] * (1 - t) + BG_BOTTOM[2] * t)
            px[x, y] = (r, g, b)
    return bg


# ─────────────────────────────────────────────────────────────
# 픽토그램 (SVG path → polygon)
# 원본 좌표는 1024x1024 캔버스 기준.
#   - 머리: circle(512, 350, r=88)
#   - 몸:  M 370 480 L 654 480 Q 690 480 690 516
#          L 690 696 Q 690 732 654 732
#          L 580 732 L 580 800 L 370 800
#          Q 334 800 334 764 L 334 516 Q 334 480 370 480 Z
# ─────────────────────────────────────────────────────────────
HEAD = {"cx": 512, "cy": 350, "r": 88}

BODY_PATH = [
    ("M", 370, 480),
    ("L", 654, 480),
    ("Q", 690, 480, 690, 516),
    ("L", 690, 696),
    ("Q", 690, 732, 654, 732),
    ("L", 580, 732),
    ("L", 580, 800),
    ("L", 370, 800),
    ("Q", 334, 800, 334, 764),
    ("L", 334, 516),
    ("Q", 334, 480, 370, 480),
]


def quadratic_points(p0, p1, p2, steps: int = 16):
    pts = []
    for i in range(1, steps + 1):
        t = i / steps
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]
        pts.append((x, y))
    return pts


def body_polygon() -> list:
    poly, cur = [], None
    for cmd in BODY_PATH:
        if cmd[0] == "M":
            cur = (cmd[1], cmd[2])
            poly.append(cur)
        elif cmd[0] == "L":
            cur = (cmd[1], cmd[2])
            poly.append(cur)
        elif cmd[0] == "Q":
            ctrl = (cmd[1], cmd[2])
            end = (cmd[3], cmd[4])
            poly.extend(quadratic_points(cur, ctrl, end))
            cur = end
    return poly


def draw_pictogram(canvas: Image.Image) -> None:
    """원본 1024x1024 좌표를 좌측 영역에 맞게 스케일링해서 합성."""
    # 원본 아이콘 바운딩 박스: x[334,690], y[262(=350-88),800]
    src_x0, src_y0 = 334, HEAD["cy"] - HEAD["r"]      # 334, 262
    src_x1, src_y1 = 690, 800
    src_w = src_x1 - src_x0                            # 356
    src_h = src_y1 - src_y0                            # 538

    # 좌측 영역(0~LEFT_W, 0~H) 안에서 여백 두고 비례 스케일
    pad = 40
    target_w = LEFT_W - 2 * pad
    target_h = H - 2 * pad
    scale = min(target_w / src_w, target_h / src_h)

    # 4배 슈퍼샘플링 후 다운스케일 → 깨끗한 에지
    SS = 4
    icon_w = int(src_w * scale * SS)
    icon_h = int(src_h * scale * SS)
    icon = Image.new("RGBA", (icon_w, icon_h), (0, 0, 0, 0))
    d = ImageDraw.Draw(icon)

    def remap(p):
        x = (p[0] - src_x0) * scale * SS
        y = (p[1] - src_y0) * scale * SS
        return (x, y)

    # 몸통
    poly = [remap(p) for p in body_polygon()]
    d.polygon(poly, fill=(255, 255, 255, 255))

    # 머리
    hx = (HEAD["cx"] - src_x0) * scale * SS
    hy = (HEAD["cy"] - src_y0) * scale * SS
    hr = HEAD["r"] * scale * SS
    d.ellipse((hx - hr, hy - hr, hx + hr, hy + hr), fill=(255, 255, 255, 255))

    final_w = int(src_w * scale)
    final_h = int(src_h * scale)
    icon = icon.resize((final_w, final_h), Image.LANCZOS)

    # 좌측 영역 가운데 배치
    cx = LEFT_W // 2
    cy = H // 2
    canvas.alpha_composite(icon, (cx - final_w // 2, cy - final_h // 2))


# ─────────────────────────────────────────────────────────────
# 우측 카피
# ─────────────────────────────────────────────────────────────
def draw_text(canvas: Image.Image) -> None:
    text_x0 = LEFT_W + RIGHT_PAD_L
    text_x1 = W - RIGHT_PAD_R
    max_w = text_x1 - text_x0

    main_font = fit_font(COPY["main"], max_w, MAIN_MAX, MAIN_MIN, bold=True)
    sub_font = load_font(SUB_SIZE, bold=True)
    label_font = load_font(LABEL_SIZE, bold=False)

    def measure(font, text):
        b = font.getbbox(text)
        return b, b[2] - b[0], b[3] - b[1]

    mb, mw, mh = measure(main_font, COPY["main"])
    sb, sw, sh = measure(sub_font, COPY["sub"])
    lb, lw, lh = measure(label_font, COPY["label"])

    block_h = mh + GAP_MAIN_SUB + sh + GAP_SUB_LABEL + lh
    block_top = (H - block_h) // 2

    # RGBA 레이어로 그려서 라벨 알파 적용
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)

    y = block_top - mb[1]
    ld.text((text_x0 - mb[0], y), COPY["main"], font=main_font, fill=TEXT_WHITE)

    y = block_top + mh + GAP_MAIN_SUB - sb[1]
    ld.text((text_x0 - sb[0], y), COPY["sub"], font=sub_font, fill=TEXT_WHITE)

    y = block_top + mh + GAP_MAIN_SUB + sh + GAP_SUB_LABEL - lb[1]
    ld.text((text_x0 - lb[0], y), COPY["label"], font=label_font, fill=LABEL_WHITE)

    canvas.alpha_composite(layer)


# ─────────────────────────────────────────────────────────────
# 조립
# ─────────────────────────────────────────────────────────────
def main() -> None:
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    bg = make_background().convert("RGBA")

    draw_pictogram(bg)
    draw_text(bg)

    bg.convert("RGB").save(OUT_PATH, "PNG", optimize=True)
    print(f"✓ {OUT_PATH}")


if __name__ == "__main__":
    main()
