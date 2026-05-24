# -*- coding: utf-8 -*-
"""Convert calc/agreement.txt into a printable PDF preserving structure."""
from fpdf import FPDF
import re

SRC = r'D:\space\kamen\arr-max.github.io\calc\agreement.txt'
OUT = r'D:\space\kamen\arr-max.github.io\calc\agreement.pdf'

FONT_REG  = "C:/Windows/Fonts/arial.ttf"
FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"
FONT_ITAL = "C:/Windows/Fonts/ariali.ttf"

with open(SRC, encoding='utf-8') as f:
    raw = f.read()

# Normalize divider lines and visual rules
divider = '─' * 88

class PDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Arial", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 8, "Договор на укладку каменного покрытия TerraWay®", align="R",
                  new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def footer(self):
        self.set_y(-12)
        self.set_font("Arial", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 6, f"Страница {self.page_no()}", align="C")

pdf = PDF(format='A4')
pdf.add_font("Arial",  "", FONT_REG,  uni=True)
pdf.add_font("Arial",  "B", FONT_BOLD, uni=True)
pdf.add_font("Arial",  "I", FONT_ITAL, uni=True)
pdf.set_margins(18, 18, 18)
pdf.set_auto_page_break(True, margin=18)
pdf.add_page()

# Parse line-by-line. Recognize:
#  - title block (first non-empty lines)
#  - section headings (numbered) and divider patterns
#  - bullet points and indented blocks
#  - signature/box content (just print as is)
lines = raw.splitlines()

# State
buffer_blank = 0

def is_divider(s):
    s = s.strip()
    return len(s) >= 30 and (set(s) <= set('─-=_') or s.count('─') > 20)

def is_section_heading(s):
    # e.g. "1. ПРЕДМЕТ ДОГОВОРА", uppercase, perhaps with leading number
    t = s.strip()
    if not t:
        return False
    if re.match(r'^\d+\.\s+[А-ЯЁ ]{4,}$', t):
        return True
    if t.isupper() and len(t) > 6 and any(c.isalpha() for c in t):
        return True
    return False

is_title_block = True
title_lines_remaining = 2

for i, line in enumerate(lines):
    stripped = line.rstrip()

    if not stripped:
        # blank line
        if buffer_blank < 1:
            pdf.ln(2)
        buffer_blank += 1
        continue
    buffer_blank = 0

    if is_divider(stripped):
        # render as horizontal rule
        pdf.ln(1)
        pdf.set_draw_color(180, 150, 80)
        pdf.set_line_width(0.4)
        y = pdf.get_y()
        pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
        pdf.ln(2)
        continue

    if is_title_block and title_lines_remaining > 0:
        # Title — centred bold
        pdf.set_font("Arial", "B", 13)
        pdf.set_text_color(40, 40, 40)
        pdf.cell(0, 7, stripped.strip(), align="C", new_x="LMARGIN", new_y="NEXT")
        title_lines_remaining -= 1
        if title_lines_remaining == 0:
            is_title_block = False
            pdf.ln(2)
        continue

    if is_section_heading(stripped):
        pdf.ln(2)
        pdf.set_font("Arial", "B", 11)
        pdf.set_text_color(100, 70, 20)
        pdf.cell(0, 7, stripped.strip(), align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(1)
        continue

    # Normal body line — preserve leading whitespace as indent
    leading = len(line) - len(line.lstrip())
    indent = min(leading * 0.9, 30)
    pdf.set_x(pdf.l_margin + indent)
    pdf.set_font("Arial", "", 9.5)
    pdf.set_text_color(40, 40, 40)
    # Wrap long lines
    width = pdf.w - pdf.r_margin - (pdf.l_margin + indent)
    pdf.multi_cell(width, 5.2, stripped.strip(), new_x="LMARGIN", new_y="NEXT")

pdf.output(OUT)
print(f"Saved to {OUT}")
