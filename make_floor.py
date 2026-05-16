"""Composite a realistic stone carpet texture onto the gravel area of the photo."""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import random

SRC = r'C:\Users\user\.claude\image-cache\98ea1e3d-ca37-434a-bdbb-6ba70926be5c\4.jpeg'
OUT = r'D:\space\kamen\arr-max.github.io\floor.jpg'

random.seed(42)
np.random.seed(42)

img = Image.open(SRC).convert('RGB')
W, H = img.size  # 640 x 853

# ── 1. Build polygon mask for the gravel area ──────────────────────────────
# Visually traced from the photo: щебень/gravel rectangle with wooden border
poly = [
    (222, 172),   # top-left
    (598, 162),   # top-right
    (634, 732),   # bottom-right
    (152, 740),   # bottom-left
]

mask = Image.new('L', (W, H), 0)
ImageDraw.Draw(mask).polygon(poly, fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(2))  # soft edges

# ── 2. Generate TerraWay stone carpet texture ──────────────────────────────
# Stone carpet = small pebbles 3-5mm bound with resin
# Warm sandy/beige palette with natural variation
tex = Image.new('RGB', (W, H), (0, 0, 0))
tdraw = ImageDraw.Draw(tex)

# Base fill — warm sandy beige
base_r, base_g, base_b = 172, 152, 118
tdraw.rectangle([0, 0, W, H], fill=(base_r, base_g, base_b))

# Stone colors: warm beige, golden, gray-beige, light tan
stone_palettes = [
    (195, 175, 135),  # warm beige
    (210, 190, 148),  # light tan
    (155, 138, 108),  # darker beige
    (185, 165, 125),  # mid beige
    (220, 198, 158),  # very light
    (142, 128,  98),  # dark brown-beige
    (200, 180, 140),  # sandy
    (168, 150, 115),  # gray-beige
]

# Scatter small filled circles (stones)
n_stones = 55000
for _ in range(n_stones):
    sx = random.randint(0, W - 1)
    sy = random.randint(0, H - 1)
    r  = random.randint(2, 5)
    col = list(random.choice(stone_palettes))
    # Add variation
    col = [min(255, max(0, c + random.randint(-18, 18))) for c in col]
    tdraw.ellipse([sx - r, sy - r, sx + r, sy + r], fill=tuple(col))

# Very thin grout lines — tiny darker gaps already implied by stone overlap
# Add micro-shadow dots for depth
for _ in range(8000):
    sx = random.randint(0, W - 1)
    sy = random.randint(0, H - 1)
    r  = random.randint(1, 2)
    shade = random.randint(60, 90)
    tdraw.ellipse([sx - r, sy - r, sx + r, sy + r],
                  fill=(shade, shade - 8, shade - 20))

# Slight gaussian for resin-bound smoothness
tex = tex.filter(ImageFilter.GaussianBlur(0.6))

# ── 3. Borrow lighting from original (preserve shadows/highlights) ─────────
orig_arr = np.array(img, dtype=np.float32)
tex_arr  = np.array(tex, dtype=np.float32)

# Luminance of original gravel area (used as lighting map)
orig_lum = orig_arr.mean(axis=2, keepdims=True) / 255.0  # 0..1

# Target average luminance of stone carpet texture
tex_lum = tex_arr.mean(axis=2, keepdims=True) / 255.0

# Modulate texture by relative lighting from original
lit_tex = tex_arr * (orig_lum / (tex_lum.mean() + 0.01)).clip(0.5, 1.6)
lit_tex = lit_tex.clip(0, 255).astype(np.uint8)
lit_tex_img = Image.fromarray(lit_tex)

# ── 4. Composite: blend textured layer into original using mask ────────────
result = img.copy()
result.paste(lit_tex_img, mask=mask)

# Slight saturation boost to make carpet colours pop
result = ImageEnhance.Color(result).enhance(1.08)
result = ImageEnhance.Contrast(result).enhance(1.04)

result.save(OUT, 'JPEG', quality=92)
print(f'Saved to {OUT}')
