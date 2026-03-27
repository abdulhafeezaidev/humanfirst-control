"""
Assignment PDF Generator
Generates a multi-page handwritten-style PDF using ReportLab with a custom TTF font.
Assumes 'handwriting.ttf' is in the same directory as this script.
"""

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os
import random

# ── Configuration ──────────────────────────────────────────────────────────────
FONT_FILE   = "handwriting.ttf"        # Place your handwriting TTF here
FONT_NAME   = "Handwriting"
OUTPUT_FILE = "assignment_output.pdf"

# Cobalt / fountain-pen blue  (R, G, B  as 0-1 floats)
PEN_R, PEN_G, PEN_B = 0.0, 0.18, 0.65

# Lighter blue for body text (lighter weight)
LIGHT_PEN_R, LIGHT_PEN_G, LIGHT_PEN_B = 0.2, 0.4, 0.8

# A4 dimensions
PAGE_W, PAGE_H = A4                   # 595.27 x 841.89 pt
MARGIN_L = 72                         # left margin
MARGIN_R = PAGE_W - 50               # right margin (working area end)
TEXT_RIGHT = 555                      # safe right boundary for text (extended to near border)
TEXT_LEFT = 75                        # left boundary for text
LINE_GAP = 22                         # ruled-line spacing in pt

# Random seed for consistent roughness
random.seed(42)

# Global page counter for progressive roughness effect
PAGE_COUNTER = [0]  # Use list to allow modification in nested functions

# ── Helpers ────────────────────────────────────────────────────────────────────

def draw_lined_background(c):
    """Draw light blue horizontal rules across the page, plus red left and right margin lines."""
    c.saveState()
    # Horizontal rules
    c.setStrokeColorRGB(0.75, 0.85, 0.95)
    c.setLineWidth(0.4)
    y = PAGE_H - 50
    while y > 30:
        c.line(0, y, PAGE_W, y)
        y -= LINE_GAP
    # Red left-margin vertical line
    c.setStrokeColorRGB(0.85, 0.2, 0.2)
    c.setLineWidth(0.8)
    c.line(MARGIN_L - 18, 0, MARGIN_L - 18, PAGE_H)
    # Red right-margin vertical line
    c.line(PAGE_W - 18, 0, PAGE_W - 18, PAGE_H)
    c.restoreState()


def set_pen_color(c):
    """Set color to dark blue for emphasis (diagrams, boxes)."""
    c.setFillColorRGB(PEN_R, PEN_G, PEN_B)
    c.setStrokeColorRGB(PEN_R, PEN_G, PEN_B)


def set_light_pen_color(c):
    """Set color to lighter blue for body text."""
    c.setFillColorRGB(LIGHT_PEN_R, LIGHT_PEN_G, LIGHT_PEN_B)
    c.setStrokeColorRGB(LIGHT_PEN_R, LIGHT_PEN_G, LIGHT_PEN_B)


def set_black_color(c):
    """Set color to black for headings."""
    c.setFillColorRGB(0.0, 0.0, 0.0)
    c.setStrokeColorRGB(0.0, 0.0, 0.0)


def add_roughness(val, amount=1.8):
    """Add slight random variation to simulate hand-written style."""
    return val + random.uniform(-amount, amount)


def get_roughness_multiplier():
    """Calculate roughness multiplier based on page number (0=neat, 1=very rough)."""
    # Pages 0-1: neat (0.5x), Pages 2-3: medium (1.0x), Pages 4-5: very rough (1.5x)
    if PAGE_COUNTER[0] < 2:
        return 0.5  # First pages: neat
    elif PAGE_COUNTER[0] < 4:
        return 1.0  # Middle pages: normal
    else:
        return 1.5  # Last pages: very rough (tired)


def get_baseline_shift():
    """Get baseline shift (slight up/down waviness) that increases with page number."""
    multiplier = get_roughness_multiplier()
    if multiplier < 1.0:
        return random.uniform(-0.3, 0.3)  # Neat: minimal shift
    elif multiplier < 1.3:
        return random.uniform(-1.0, 1.0)  # Medium: moderate shift
    else:
        return random.uniform(-2.0, 2.0)  # Rough: large shift


def write_line(c, x, y, text, size=15):
    """Write a single line of handwriting-font text with progressive roughness."""
    c.setFont(FONT_NAME, size)
    set_light_pen_color(c)  # Use lighter blue for body text
    
    # Get roughness based on page progression
    multiplier = get_roughness_multiplier()
    x_roughness = 2.5 * multiplier
    y_roughness = 1.0 * multiplier
    baseline_shift = get_baseline_shift()
    
    # Add roughness for hand-written feel - increases with fatigue
    roughed_x = add_roughness(x, x_roughness)
    roughed_y = add_roughness(y + baseline_shift, y_roughness)
    
    # Slight size variation on later pages (tired writing)
    if multiplier > 1.2:
        size_variation = random.uniform(-0.5, 0.5)
        c.setFont(FONT_NAME, max(13, size - size_variation))  # Don't go below 13pt
    
    c.drawString(roughed_x, roughed_y, text)


def underline_text(c, x, y, text, size=15):
    """Write text with a manual underline in black color with progressive roughness."""
    c.setFont(FONT_NAME, size)
    set_black_color(c)
    
    # Get roughness based on page progression
    multiplier = get_roughness_multiplier()
    x_roughness = 2.5 * multiplier
    y_roughness = 1.0 * multiplier
    baseline_shift = get_baseline_shift()
    
    roughed_x = add_roughness(x, x_roughness)
    roughed_y = add_roughness(y + baseline_shift, y_roughness)
    
    # Slight size variation on later pages
    if multiplier > 1.2:
        size_variation = random.uniform(-0.5, 0.5)
        c.setFont(FONT_NAME, max(13, size - size_variation))
    
    c.drawString(roughed_x, roughed_y, text)
    c.setLineWidth(0.8)
    text_width = pdfmetrics.stringWidth(text, FONT_NAME, size)
    # Rough underline with slight variation - more wavy on later pages
    underline_y = roughed_y - 2 - (baseline_shift * 0.5)
    c.line(roughed_x, underline_y, roughed_x + text_width, underline_y + baseline_shift)
    set_pen_color(c)  # Reset to blue for body text


def draw_box(c, x, y, w, h, label, font_size=11):
    """Draw a hand-drawn-style rectangle with a label inside."""
    set_pen_color(c)
    c.setLineWidth(1.2)
    c.rect(x, y, w, h)
    c.setFont(FONT_NAME, font_size)
    c.drawCentredString(x + w / 2, y + h / 2 - font_size / 3, label)


def draw_line(c, x1, y1, x2, y2):
    set_pen_color(c)
    c.setLineWidth(1.0)
    c.line(x1, y1, x2, y2)


def draw_arrow_down(c, x, y_top, y_bot):
    """Vertical line with small arrowhead pointing down."""
    draw_line(c, x, y_top, x, y_bot)
    c.setLineWidth(1.0)
    c.line(x - 4, y_bot + 6, x, y_bot)
    c.line(x + 4, y_bot + 6, x, y_bot)


# ── Page builders ──────────────────────────────────────────────────────────────

def page_cover(c):
    PAGE_COUNTER[0] = 0
    draw_lined_background(c)
    cx = PAGE_W / 2
    y = PAGE_H - 120

    # Title
    underline_text(c, cx - 90, y, "Assignment #2", 22)
    y -= 60

    # Info table rows
    rows = [
        ("SUBMITTED BY :", "Abdul Hafeez"),
        ("Roll No.       :", "9248919"),
        ("CLASS          :", "BSCS(B) 4th"),
        ("SUBJECT        :", "Coal"),
        ("SUBMITTED TO   :", "Ms. Arfa Khanum"),
    ]
    for label, value in rows:
        write_line(c, TEXT_LEFT + 10, y, label, 16)
        write_line(c, TEXT_LEFT + 190, y, value, 16)
        y -= 40
    
    # Add submission date to cover page
    y -= 30
    underline_text(c, TEXT_LEFT + 10, y, "Date  Submitted:", 15)
    y -= LINE_GAP
    write_line(c, TEXT_LEFT + 180, y, "24-03-2026", 15)


def page_q1_part1(c):
    """Q1 – Computer Buses introduction and bus types."""
    PAGE_COUNTER[0] = 1
    draw_lined_background(c)
    x = TEXT_LEFT
    y = PAGE_H - 70

    underline_text(c, x, y, "Q#1:  Identify  Computer  Busses  and  its  types", 15)
    y -= LINE_GAP
    write_line(c, x, y, "A  Computer  Bus  is  a  communication  system  containing  physical  connections", 15)
    y -= LINE_GAP
    write_line(c, x, y, "and  protocols  for  data  transfer  between  CPU,  memory  and  I/O  devices.", 15)
    y -= LINE_GAP + 5

    body = (
        "A Computer Bus is a communication system containing a set of physical",
        "connections and protocols that allow data transfer between different",
        "components such as CPU, memory, and I/O devices. Buses are essential",
        "for system performance and data integrity.",
    )
    for line in body:
        write_line(c, x, y, line, 15)
        y -= LINE_GAP

    y -= 10
    underline_text(c, x, y, "Data Bus :", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Transfers  actual  data  between  components  during  read/write  operations.", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Can  be  unidirectional  or  bidirectional  with  width  8,16,32,64  bits.", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Higher  bus  width  means  higher  bandwidth  for  faster  simultaneous  transfers.", 15)

    y -= 10
    underline_text(c, x, y, "Address Bus :", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Carries  memory  address  or  I/O  port  address  unidirectionally  from  CPU.", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Width  determines  maximum  addressable  memory  space.  Example:  32-bit  address", 15)
    y -= LINE_GAP
    write_line(c, x, y, "bus  allows  4GB  maximum  memory  addressing  with  proper  calculations.", 15)

    y -= 10
    underline_text(c, x, y, "Control Bus :", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Sends  control  signals  to  manage  operations  of  memory  and  I/O  devices.", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Signals  include  Read,  Write,  Interrupt  Request,  Clock,  and  Reset  for", 15)
    y -= LINE_GAP
    write_line(c, x, y, "proper  system  synchronization  and  coordination  of  all  components.", 15)


def page_q1_part2(c):
    """Bus Elements + diagram + Bus Interconnection Schemes intro."""
    PAGE_COUNTER[0] = 2
    draw_lined_background(c)
    x = TEXT_LEFT
    y = PAGE_H - 70

    underline_text(c, x, y, "Bus Elements :", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Basic  bus  elements  are  components  that  make  a  bus  functional  and  efficient.", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Transceivers  –  Devices  that  allow  data  flow  in  both  directions  safely.", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Buffers  –  Temporarily  store  data  for  proper  timing  and  electrical  isolation.", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Registers  –  Store  data  temporarily  during  processing  and  transfer  operations.", 15)

    y -= 20
    underline_text(c, PAGE_W / 2 - 30, y, "Diagram", 15)
    y -= 30

    # CPU box at top centre
    bw, bh = 70, 24
    cpu_x = PAGE_W / 2 - bw / 2
    draw_box(c, cpu_x, y - bh, bw, bh, "CPU", 12)
    cpu_cx = cpu_x + bw / 2
    cpu_bot = y - bh

    # Three lines down from CPU
    y_fork = cpu_bot - 35
    xs = [cpu_cx - 140, cpu_cx, cpu_cx + 140]

    # Actually draw individual vertical drops
    draw_line(c, cpu_cx, cpu_bot, cpu_cx, y_fork)
    draw_line(c, cpu_cx, y_fork, xs[0], y_fork)
    draw_line(c, cpu_cx, y_fork, xs[2], y_fork)

    # Labels for bus types
    labels_top = ["Data Bus", "Address Bus", "Control Bus"]
    for lx, lbl in zip(xs, labels_top):
        write_line(c, lx - 28, y_fork - 4, lbl, 12)

    # Lines down to bottom boxes
    y_box = y_fork - 55
    box_labels = ["Memory", "I/O", "Control"]
    for lx, lbl in zip(xs, box_labels):
        draw_line(c, lx, y_fork, lx, y_box + 24)
        draw_box(c, lx - 28, y_box, 56, 24, lbl, 11)

    y = y_box - 30

    underline_text(c, x, y, "Bus  Interconnection  Schemes :", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Three  main  bus  architectures  used  in  computer  systems  are  single  bus,", 15)
    y -= LINE_GAP
    write_line(c, x, y, "multi-bus,  and  crossbar  switch  architectures  with  varying  complexity.", 15)
    y -= LINE_GAP
    underline_text(c, x, y, "1.  Single  Bus:", 15)
    y -= LINE_GAP
    write_line(c, x, y, "One  main  bus  shared  by  all  components.  Simple  and  cheap  but  has  slower", 15)
    y -= LINE_GAP
    write_line(c, x, y, "performance  due  to  bus  congestion  when  multiple  devices  try  to  communicate.", 15)


def page_q1_part3(c):
    """Multi Bus + Crossbar Switch + diagrams + more details."""
    PAGE_COUNTER[0] = 3
    draw_lined_background(c)
    x = TEXT_LEFT
    y = PAGE_H - 70

    underline_text(c, x, y, "2.  Multi  Bus  Architecture :", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Two  or  more  buses  connecting  CPU,  memory  and  I/O  separately  for  parallel", 15)
    y -= LINE_GAP
    write_line(c, x, y, "transfers.  Faster  performance  with  multiple  simultaneous  transfers.  More  complex", 15)
    y -= LINE_GAP
    write_line(c, x, y, "and  costly  design  but  provides  better  scalability  and  throughput.", 15)
    
    y -= 15
    underline_text(c, x, y, "3.  Crossbar  Switch  Architecture :", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Direct  connection  between  all  pairs  of  components  using  switching  matrix.", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Very  fast  performance  with  multiple  simultaneous  transfers  without  conflicts.", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Expensive  and  complex  wiring  preferred  only  in  specialized  high-end  systems.", 15)

    y -= 20
    underline_text(c, PAGE_W / 2 - 25, y, "Diagram", 14)
    y -= 15

    # ── Diagram (a): Single Bus ─────────────────────────────────────────────
    ax = x
    ay = y
    write_line(c, ax, ay, "a)  Single  Bus", 11)
    ay -= 5
    draw_box(c, ax + 10, ay - 24, 55, 24, "CPU", 11)
    draw_line(c, ax + 37, ay - 24, ax + 37, ay - 55)
    draw_box(c, ax - 5, ay - 79, 55, 24, "Bus", 11)
    draw_line(c, ax + 22, ay - 79, ax + 22, ay - 109)
    draw_line(c, ax + 22, ay - 109, ax - 5, ay - 109)
    draw_line(c, ax + 22, ay - 109, ax + 55, ay - 109)
    draw_box(c, ax - 25, ay - 133, 55, 24, "Memory", 11)
    draw_box(c, ax + 35, ay - 133, 40, 24, "I/O", 11)

    # ── Diagram (b): Multi Bus ──────────────────────────────────────────────
    bx = PAGE_W / 2 - 20
    by = y
    write_line(c, bx, by, "b)  Multi  Bus", 11)
    by -= 5
    draw_box(c, bx + 10, by - 24, 50, 24, "cpu", 11)
    draw_box(c, bx + 100, by - 24, 40, 24, "I/o", 11)

    # B1..B4 bus nodes
    b_labels = ["B1", "B2", "B3", "B4"]
    bxs = [bx, bx + 35, bx + 70, bx + 105]
    by2 = by - 70
    for i, (blx, blbl) in enumerate(zip(bxs, b_labels)):
        draw_box(c, blx, by2, 28, 18, blbl, 9)

    by3 = by2 - 50
    draw_box(c, bx, by3, 55, 24, "Memory", 11)
    draw_box(c, bx + 75, by3, 55, 24, "Memory", 11)

    # ── Diagram (c): Crossbar Switch ────────────────────────────────────────
    cx2 = x
    cy = ay - 155
    write_line(c, cx2, cy, "c)  Crossbar  Switch", 11)
    cy -= 15
    cpu_labels = ["CPU1", "CPU2", "CPU3"]
    for i, lbl in enumerate(cpu_labels):
        cy_i = cy - i * 35
        write_line(c, cx2, cy_i, lbl, 11)
        draw_line(c, cx2 + 40, cy_i + 7, cx2 + 120, cy_i + 7)

    cb_x = cx2 + 120
    cb_y = cy - 65
    draw_box(c, cb_x, cb_y, 100, 80, "crossbar switch", 10)

    right_labels = ["Memory 1", "Memory 2", "I/o1", "I/o2"]
    for i, lbl in enumerate(right_labels):
        ry = cy - i * 20 - 5
        draw_line(c, cb_x + 100, ry, cb_x + 165, ry)
        write_line(c, cb_x + 168, ry - 4, lbl, 10)


def page_q2(c):
    """Q2 – Program Flow Control in Assembly Language - Extended."""
    PAGE_COUNTER[0] = 4
    draw_lined_background(c)
    x = TEXT_LEFT
    y = PAGE_H - 70

    underline_text(c, x, y, "Q#2:  Program  Flow  Control  in  Assembly  Language", 15)
    y -= LINE_GAP
    write_line(c, x + 10, y, "Program  flow  control  determines  the  order  in  which  instructions", 15)
    y -= LINE_GAP
    write_line(c, x + 10, y, "are  executed  in  a  CPU.  Crucial  for  decision  making  and  repetitive", 15)
    y -= LINE_GAP
    write_line(c, x + 10, y, "operations  in  programs.  Key  types  include  sequential,  branching,  and", 15)
    y -= LINE_GAP
    write_line(c, x + 10, y, "looping  mechanisms  that  direct  execution  flow.", 15)
    y -= LINE_GAP * 1.5
    
    underline_text(c, x, y, "Types  of  Program  Flow  Control:", 15)
    y -= LINE_GAP * 1.3
    
    underline_text(c, x, y, "1.  Sequential  Flow:", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Instructions  execute  one  after  another  in  the  order  they  appear  in  program  memory.", 15)
    y -= LINE_GAP
    write_line(c, x, y, "No  jumps,  branches,  or  interrupts  occur  during  normal  sequential  execution.", 15)
    
    y -= LINE_GAP * 0.8
    underline_text(c, x, y, "2.  Branching  (Conditional):", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Execution  jumps  to  different  memory  addresses  based  on  conditional  flags", 15)
    y -= LINE_GAP
    write_line(c, x, y, "like  Zero,  Carry,  or  Sign.  Examples:  JE  (equals),  JNE  (not  equal),  JL  (less).", 15)
    
    y -= LINE_GAP * 0.8
    underline_text(c, x, y, "3.  Unconditional  Jump:", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Program  jumps  to  a  specified  memory  address  unconditionally  without  checking", 15)
    y -= LINE_GAP
    write_line(c, x, y, "any  condition  flags.  Example:  JMP  START_LOOP  transfers  control  immediately.", 15)
    
    y -= LINE_GAP * 0.8
    underline_text(c, x, y, "4.  Looping:", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Instructions  are  repeated  multiple  times  until  a  specific  condition  is  satisfied.", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Uses  LOOP,  REPEAT-UNTIL,  and  similar  instructions  to  control  iteration  flow.", 15)
    
    y -= LINE_GAP * 0.8
    underline_text(c, x, y, "5.  Subroutine  Call:", 15)
    y -= LINE_GAP
    write_line(c, x, y, "Calls  a  separate  code  block  stored  in  memory  and  automatically  returns  to  the", 15)
    y -= LINE_GAP
    write_line(c, x, y, "calling  point  after  execution  completes  using  CALL  and  RET  instructions.", 15)


def page_q2_flowchart(c):
    """Q2 – Code example + flowchart diagram."""
    PAGE_COUNTER[0] = 5
    draw_lined_background(c)
    x = TEXT_LEFT
    y = PAGE_H - 70

    underline_text(c, x, y, "Code  Example  -  Loop  with  Conditional  Jump:", 15)
    y -= LINE_GAP
    write_line(c, x, y, "MOV  AX,  0              ; Initialize  counter  register  AX  to  zero", 15)
    y -= LINE_GAP
    write_line(c, x, y, "MOV  CX,  5              ; Set  loop  limit  in  counter  register  to  5", 15)
    y -= LINE_GAP * 1.2
    write_line(c, x, y, "LOOP_START:", 15)
    y -= LINE_GAP
    write_line(c, x, y, "ADD  AX,  1              ; Increment  counter  by  adding  1  to  AX", 15)
    y -= LINE_GAP
    write_line(c, x, y, "CMP  AX,  3              ; Compare  AX  value  with  3  and  set  flags", 15)
    y -= LINE_GAP
    write_line(c, x, y, "JE   EQUAL               ; Jump  to  EQUAL  label  if  values  are  equal", 15)
    y -= LINE_GAP
    write_line(c, x, y, "JMP  CONTINUE            ; Otherwise  jump  directly  to  CONTINUE  label", 15)
    y -= LINE_GAP
    write_line(c, x, y, "EQUAL:", 15)
    y -= LINE_GAP
    write_line(c, x, y, "NOP                      ; No  operation  placeholder  for  equal  condition", 15)
    y -= LINE_GAP
    write_line(c, x, y, "CONTINUE:", 15)
    y -= LINE_GAP
    write_line(c, x, y, "LOOP  LOOP_START         ; Repeat  until  done", 15)
    y -= 25

    # ── Flowchart ─────────────────────────────────────────────────────────
    underline_text(c, PAGE_W / 2 - 35, y, "Flowchart  Diagram:", 15)
    y -= 30

    cx = PAGE_W / 2
    bw, bh = 90, 22

    def fc_box(label, yy):
        draw_box(c, cx - bw / 2, yy - bh, bw, bh, label, 11)
        return yy - bh

    def fc_arrow(yy, gap=18):
        draw_arrow_down(c, cx, yy, yy - gap)
        return yy - gap

    # START
    bot = fc_box("START", y)
    bot = fc_arrow(bot)
    bot = fc_box("AX  =  0  /  CX  =  5", bot)
    bot = fc_arrow(bot)
    
    loop_start = bot
    bot = fc_box("ADD  AX,  1", bot)
    bot = fc_arrow(bot)
    cmp_top = bot
    bot = fc_box("CMP  AX,  3", bot)
    cmp_bot = bot

    # Branch left (JE) and right (JNE/CONTINUE)
    branch_y = cmp_bot - 18
    # left arm
    lx = cx - 80
    rx = cx + 80
    draw_line(c, cx - bw / 2, cmp_bot - bh / 2, lx, cmp_bot - bh / 2)
    draw_line(c, lx, cmp_bot - bh / 2, lx, branch_y)
    draw_line(c, cx + bw / 2, cmp_bot - bh / 2, rx, cmp_bot - bh / 2)
    draw_line(c, rx, cmp_bot - bh / 2, rx, branch_y)

    write_line(c, lx - 15, cmp_bot - bh / 2 + 4, "JE", 10)
    write_line(c, rx + 3, cmp_bot - bh / 2 + 4, "JNE", 10)

    # Equal box
    eq_y = branch_y - 8
    draw_box(c, lx - 30, eq_y - 22, 60, 22, "EQUAL", 11)
    # Continue box
    draw_box(c, rx - 30, eq_y - 22, 60, 22, "CONTINUE", 11)

    # Both converge down to Loop/END
    end_y = eq_y - 50
    draw_line(c, lx, eq_y - 22, lx, end_y + 22)
    draw_line(c, rx, eq_y - 22, rx, end_y + 22)
    draw_line(c, lx, end_y + 22, cx, end_y + 22)
    draw_line(c, rx, end_y + 22, cx, end_y + 22)
    
    # Loop back arrow
    draw_line(c, cx, end_y + 22, cx - 110, end_y + 22)
    draw_line(c, cx - 110, end_y + 22, cx - 110, loop_start)
    draw_line(c, cx - 110, loop_start, cx - bw / 2, loop_start)
    write_line(c, cx - 135, loop_start + 5, "LOOP", 10)
    
    # Down to END
    draw_arrow_down(c, cx, end_y + 22, end_y)
    draw_box(c, cx - 35, end_y - 22, 70, 22, "END", 11)


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    # Register custom font
    if not os.path.exists(FONT_FILE):
        raise FileNotFoundError(
            f"Font file '{FONT_FILE}' not found.\n"
            "Please place your handwriting TTF file in the same folder as this script\n"
            "and rename it to 'handwriting.ttf'  (or update FONT_FILE above)."
        )
    pdfmetrics.registerFont(TTFont(FONT_NAME, FONT_FILE))

    c = canvas.Canvas(OUTPUT_FILE, pagesize=A4)

    pages = [
        page_cover,
        page_q1_part1,
        page_q1_part2,
        page_q1_part3,
        page_q2,
        page_q2_flowchart,
    ]

    for i, page_fn in enumerate(pages):
        page_fn(c)
        if i < len(pages) - 1:
            c.showPage()

    c.save()
    print(f"✅  PDF saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
