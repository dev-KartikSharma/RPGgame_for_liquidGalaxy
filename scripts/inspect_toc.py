import re
import sys
import pathlib

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

readme = pathlib.Path("README.md").read_text(encoding="utf-8")
lines = readme.splitlines()

print("--- Headings in README.md ---")
headings = []
for i, l in enumerate(lines, 1):
    if l.startswith("#"):
        headings.append((i, l))
        print(f"{i:3d}: {l}")

print("\n--- TOC entries (lines 17-53) ---")
for i in range(16, 53):
    print(f"{i+1:3d}: {lines[i]}")
