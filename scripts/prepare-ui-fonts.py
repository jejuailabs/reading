"""Lossless WOFF2 packaging of official OFL fonts; originals remain intact."""
from pathlib import Path
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1] / "public" / "fonts"
for name in ("GowunDodum-Regular", "GowunBatang-Bold"):
    source = root / f"{name}.ttf"
    font = TTFont(source)
    font.flavor = "woff2"
    target = root / f"{name}.woff2"
    font.save(target)
    print(name, source.stat().st_size, target.stat().st_size)
