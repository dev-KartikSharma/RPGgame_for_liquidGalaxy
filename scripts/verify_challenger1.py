import os
import re
import sys
import struct
import pathlib

# Ensure UTF-8 output even on Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

WORKSPACE = pathlib.Path(r"c:\Users\HP\Desktop\RPG Game\rpg-game-lg")
README_PATH = WORKSPACE / "README.md"
IMAGES_DIR = WORKSPACE / "docs" / "images"

EXPECTED_IMAGES = ["menu.png", "gameplay.png", "combat.png", "hud_closeup.png"]
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

print("=" * 70)
print("CHALLENGER 1 COMPREHENSIVE EMPIRICAL VERIFICATION HARNESS")
print("=" * 70)

# ==============================================================================
# 1. IMAGE ASSETS VERIFICATION
# ==============================================================================
print("\n[SECTION 1] Verifying Image Assets in docs/images/...")
all_images_valid = True
image_details = {}

for img_name in EXPECTED_IMAGES:
    img_path = IMAGES_DIR / img_name
    if not img_path.exists():
        print(f"  [FAIL] {img_name} does NOT exist at {img_path}")
        all_images_valid = False
        continue
    
    stat = img_path.stat()
    size = stat.st_size
    if size == 0:
        print(f"  [FAIL] {img_name} exists but is EMPTY (0 bytes)")
        all_images_valid = False
        continue
    
    with open(img_path, "rb") as f:
        data = f.read()
    
    if not data.startswith(PNG_SIGNATURE):
        print(f"  [FAIL] {img_name} has invalid PNG signature: {data[:8]!r}")
        all_images_valid = False
        continue
    
    # Verify IHDR and IEND chunks
    if len(data) < 33:
        print(f"  [FAIL] {img_name} too small for valid PNG: {len(data)} bytes")
        all_images_valid = False
        continue
        
    ihdr_length = struct.unpack(">I", data[8:12])[0]
    ihdr_type = data[12:16]
    if ihdr_type != b"IHDR" or ihdr_length != 13:
        print(f"  [FAIL] {img_name} invalid IHDR chunk")
        all_images_valid = False
        continue
        
    width, height, bit_depth, color_type, comp, filt, interlace = struct.unpack(">IIBBBBB", data[16:29])
    has_iend = data.endswith(b"IEND\xaeB`\x82")
    
    print(f"  [PASS] {img_name}")
    print(f"     - Size: {size:,} bytes")
    print(f"     - Resolution: {width} x {height} px")
    print(f"     - Color Type: {color_type} (RGBA={color_type==6}), Bit Depth: {bit_depth}")
    print(f"     - Valid IEND footer: {has_iend}")
    
    image_details[img_name] = {
        "size": size,
        "width": width,
        "height": height,
        "valid_png": True,
        "has_iend": has_iend
    }

# ==============================================================================
# 2. PARSE README.MD & EXTRACT SECTIONS / CODE BLOCKS
# ==============================================================================
print("\n[SECTION 2] Parsing README.md & Checking Links...")
if not README_PATH.exists():
    print(f"  [CRITICAL FAIL] README.md not found at {README_PATH}")
    sys.exit(1)

readme_raw = README_PATH.read_text(encoding="utf-8")
lines = readme_raw.splitlines()

# Separate lines inside code blocks vs outside
in_code_block = False
code_block_fence = ""
markdown_lines_outside_code = []
code_blocks = []
current_code_block = []

for line_idx, line in enumerate(lines, 1):
    stripped = line.strip()
    if stripped.startswith("```"):
        if not in_code_block:
            in_code_block = True
            code_block_fence = stripped
            current_code_block = [(line_idx, line)]
        else:
            in_code_block = False
            current_code_block.append((line_idx, line))
            code_blocks.append(current_code_block)
            current_code_block = []
    else:
        if in_code_block:
            current_code_block.append((line_idx, line))
        else:
            markdown_lines_outside_code.append((line_idx, line))

if in_code_block:
    print("  [FAIL] Unclosed code block detected in README.md!")

# Extract Markdown Images & Links outside code blocks
text_outside_code = "\n".join(l[1] for l in markdown_lines_outside_code)

# 1. Images: ![alt](url)
md_images = re.findall(r'!\[([^\]]*)\]\(([^)]+)\)', text_outside_code)
print(f"\n  Found {len(md_images)} markdown image tags outside code blocks:")
broken_images = []
for alt, url in md_images:
    url_clean = url.strip()
    if url_clean.startswith("http://") or url_clean.startswith("https://"):
        print(f"    - [REMOTE IMG] '{alt}': {url_clean}")
    else:
        target = (README_PATH.parent / url_clean).resolve()
        if target.exists():
            print(f"    - [PASS LOCAL IMG] '{alt}': {url_clean} -> {target} ({target.stat().st_size:,} bytes)")
        else:
            print(f"    - [FAIL LOCAL IMG] '{alt}': {url_clean} -> {target} (FILE NOT FOUND)")
            broken_images.append((alt, url_clean, target))

# 2. Hyperlinks: [text](url) - ignore if preceding is !
md_links = re.findall(r'(?<!\!)\[([^\]]+)\]\(([^)]+)\)', text_outside_code)
print(f"\n  Found {len(md_links)} markdown hyperlinks outside code blocks:")
broken_links = []
local_links_checked = 0
remote_links_checked = 0
anchor_links_checked = 0

for text, url in md_links:
    url_clean = url.strip()
    if url_clean.startswith("#"):
        anchor_links_checked += 1
    elif url_clean.startswith("http://") or url_clean.startswith("https://"):
        remote_links_checked += 1
    else:
        local_links_checked += 1
        target = (README_PATH.parent / url_clean).resolve()
        if target.exists():
            print(f"    - [PASS LOCAL LINK] text='{text}', target='{url_clean}' -> {target}")
        else:
            print(f"    - [FAIL LOCAL LINK] text='{text}', target='{url_clean}' -> {target} (TARGET MISSING)")
            broken_links.append((text, url_clean, target))

print(f"\n  Hyperlink Summary: {anchor_links_checked} anchors, {remote_links_checked} remote URLs, {local_links_checked} local files ({len(broken_links)} broken).")

# ==============================================================================
# 3. TABLE FORMATTING & SYNTAX VALIDATION
# ==============================================================================
print("\n[SECTION 3] Validating Markdown Tables (Outside Code Blocks)...")
table_count = 0
table_errors = []
current_table = []

for line_no, line in markdown_lines_outside_code:
    stripped = line.strip()
    if stripped.startswith("|") and stripped.endswith("|"):
        current_table.append((line_no, line))
    else:
        if current_table:
            table_count += 1
            start_l = current_table[0][0]
            if len(current_table) < 2:
                table_errors.append(f"Table at line {start_l}: less than 2 rows (missing delimiter)")
            else:
                header_raw = current_table[0][1].strip()[1:-1]
                header_cols = [c.strip() for c in header_raw.split("|")]
                delim_raw = current_table[1][1].strip()[1:-1]
                delim_cols = [c.strip() for c in delim_raw.split("|")]
                
                # Check delimiter validity (must contain dashes and colons)
                for d_idx, d_col in enumerate(delim_cols):
                    if not re.match(r'^:?-+:?$', d_col):
                        table_errors.append(f"Table at line {start_l}, delimiter col {d_idx+1} '{d_col}' is invalid")
                
                if len(header_cols) != len(delim_cols):
                    table_errors.append(f"Table at line {start_l}: Header cols ({len(header_cols)}) != Delimiter cols ({len(delim_cols)})")
                
                for r_idx, (r_no, r_line) in enumerate(current_table[2:], 3):
                    r_raw = r_line.strip()[1:-1]
                    r_cols = [c.strip() for c in r_raw.split("|")]
                    if len(r_cols) != len(header_cols):
                        table_errors.append(f"Table at line {start_l}, row {r_idx} (line {r_no}): Col count ({len(r_cols)}) != Header count ({len(header_cols)})")
            current_table = []

if current_table:
    table_count += 1
    start_l = current_table[0][0]
    if len(current_table) < 2:
        table_errors.append(f"Table at line {start_l}: less than 2 rows (missing delimiter)")

if table_errors:
    print(f"  [FAIL] Found {len(table_errors)} table syntax issues:")
    for err in table_errors:
        print(f"    - {err}")
else:
    print(f"  [PASS] All {table_count} tables in README.md are syntactically valid and well-formed.")

# ==============================================================================
# 4. TABLE OF CONTENTS & ANCHOR INTEGRITY
# ==============================================================================
print("\n[SECTION 4] Validating Table of Contents (TOC) Anchors...")

def github_slugify(title: str) -> str:
    t = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', title)
    t = re.sub(r'<[^>]+>', '', t)
    t = t.lower()
    t = re.sub(r'[^\w\s-]', '', t)
    t = re.sub(r'\s+', '-', t.strip())
    return t

headings = []
for line_no, line in markdown_lines_outside_code:
    m = re.match(r'^(#{1,6})\s+(.+)$', line.strip())
    if m:
        level = len(m.group(1))
        h_text = m.group(2).strip()
        slug = github_slugify(h_text)
        headings.append((line_no, level, h_text, slug))

heading_slug_set = {h[3] for h in headings}

toc_links = re.findall(r'\[([^\]]+)\]\(#([^)]+)\)', text_outside_code)
print(f"  Found {len(toc_links)} anchor links to validate.")
broken_anchors = []
for anchor_text, anchor_slug in toc_links:
    clean_target = anchor_slug.lower()
    if clean_target in heading_slug_set:
        pass
    else:
        matching = [h for h in headings if h[3] == clean_target or clean_target in h[3] or h[3] in clean_target]
        if not matching:
            print(f"    - [FAIL ANCHOR]: text='{anchor_text}', target='#{anchor_slug}'")
            broken_anchors.append((anchor_text, anchor_slug))

if broken_anchors:
    print(f"  [FAIL] {len(broken_anchors)} anchor links do not match any heading!")
else:
    print(f"  [PASS] All {len(toc_links)} TOC anchor links resolve to valid headings.")

# ==============================================================================
# SUMMARY VERDICT
# ==============================================================================
print("\n" + "=" * 70)
print("EMPIRICAL AUDIT SUMMARY:")
print(f"  - Image Assets on Disk: {'PASS' if all_images_valid else 'FAIL'}")
print(f"  - Broken Local Images in Markdown: {len(broken_images)}")
print(f"  - Broken Local Hyperlinks in Markdown: {len(broken_links)}")
if broken_links:
    for text, url, target in broken_links:
        print(f"      * Missing file target: '{url}' (referenced as '{text}') -> {target}")
print(f"  - Table Syntax Errors: {len(table_errors)}")
print(f"  - Broken Anchors: {len(broken_anchors)}")
print("=" * 70)
