import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

output_dir = r"c:\Users\asus\OneDrive\Desktop\CC\ieee_paper\IEEE-conference-template-062824"
os.makedirs(output_dir, exist_ok=True)

# Common styling for academic black-and-white publication
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['font.size'] = 8.5
plt.rcParams['axes.edgecolor'] = 'black'
plt.rcParams['axes.linewidth'] = 0.8

# ==============================================================================
# FIGURE 1: SYSTEM ARCHITECTURE (B&W ACADEMIC BOX-AND-ARROW DIAGRAM)
# ==============================================================================
fig, ax = plt.subplots(figsize=(7.2, 5.0), dpi=300)
ax.set_xlim(0, 100)
ax.set_ylim(0, 100)
ax.axis('off')

def draw_box(ax, x, y, w, h, title, subtitle=None, hatch=None, bold=True):
    rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="square,pad=0",
                                  linewidth=1.0, edgecolor='black', facecolor='white', hatch=hatch)
    ax.add_patch(rect)
    fontweight = 'bold' if bold else 'normal'
    if subtitle:
        ax.text(x + w/2, y + h*0.62, title, ha='center', va='center', fontsize=8.5, fontweight=fontweight, color='black')
        ax.text(x + w/2, y + h*0.30, subtitle, ha='center', va='center', fontsize=7.0, color='#222222', style='italic')
    else:
        ax.text(x + w/2, y + h/2, title, ha='center', va='center', fontsize=8.0, fontweight=fontweight, color='black')

def draw_subgraph(ax, x, y, w, h, label):
    rect = patches.Rectangle((x, y), w, h, linewidth=1.0, edgecolor='black',
                             facecolor='#FAFAFA', linestyle='--')
    ax.add_patch(rect)
    ax.text(x + 2, y + h - 3.5, label, fontsize=8.0, fontweight='bold', color='black')

# Top Layer: Client
draw_box(ax, 15, 87, 70, 9, "Client Presentation Layer (React 19 / TypeScript / Vite)",
         "Native File System Access API ('Save As' Dialog) + Asynchronous HUD")

# Gateway Container
draw_subgraph(ax, 5, 34, 90, 48, "FastAPI Application Server & Gateway (Dockerized Micro-Architecture)")

# Gateway core boxes
draw_box(ax, 8, 70, 26, 7.5, "FastAPI REST API", "Routers & Pydantic Validation")
draw_box(ax, 37, 70, 26, 7.5, "OAuth2 & JWT Service", "RFC 7519 Bearer Token (HS256)")
draw_box(ax, 66, 70, 26, 7.5, "Argon2id Hash Engine", "Memory-Hard KDF (m=64MB)")

# Intelligence Layer Subgraph
draw_subgraph(ax, 8, 36, 84, 29, "Autonomous Intelligence Layer (Pipeline Optimization)")

draw_box(ax, 11, 39, 18, 21, "Content-Addressable\nStorage (CAS)\n\n- SHA-256 Digest\n- Reference Counter\n- Zero-Byte Fastpath")
draw_box(ax, 31.5, 39, 18, 21, "Adaptive Gzip\nCompressor\n\n- MIME Filtering\n- Shannon Entropy\n- Transparent Stream")
draw_box(ax, 52, 39, 18, 21, "Cost-Aware Tiering\nEngine\n\n- 128KB Penalty Guard\n- S3 Pricing Model\n- Idle / Access Rules")
draw_box(ax, 72.5, 39, 18, 21, "Markov Chain\nPredictor\n\n- 45m Session Window\n- Hybrid Scoring\n- 300s TTL Prefetch")

# Persistence Layer Subgraph
draw_subgraph(ax, 5, 3, 90, 26, "Persistence Subsystem (Decoupled Relational & Object Storage)")

draw_box(ax, 8, 6, 40, 18, "Metadata Repository: PostgreSQL 15\n\n- users, folders (parent_id cascade)\n- files (logical file records & tiers)\n- storage_objects (CAS & ref counts)\n- activity_logs & prefetch_telemetry")

draw_box(ax, 52, 6, 40, 18, "Physical Object Storage: Amazon S3\n\n- S3 Bucket (ap-southeast-2 Sydney)\n- Keys: cas/{prefix}/{sha256}\n- Storage Classes: Standard, IA, Glacier\n- Local POSIX Fallback Engine")

# Arrows
arrow_kw = dict(arrowstyle="->", lw=1.0, color="black")
ax.annotate("", xy=(50, 82), xytext=(50, 87), arrowprops=arrow_kw)
ax.annotate("", xy=(20, 65), xytext=(20, 70), arrowprops=arrow_kw)
ax.annotate("", xy=(28, 26), xytext=(28, 34), arrowprops=arrow_kw)
ax.annotate("", xy=(72, 26), xytext=(72, 34), arrowprops=arrow_kw)

plt.tight_layout()
fig.savefig(os.path.join(output_dir, "fig1_architecture.png"), dpi=300, bbox_inches='tight')
plt.close(fig)
print("Figure 1 generated successfully.")

# ==============================================================================
# FIGURE 2: CAS DEDUPLICATION FLOWCHART
# ==============================================================================
fig, ax = plt.subplots(figsize=(6.5, 7.2), dpi=300)
ax.set_xlim(0, 100)
ax.set_ylim(0, 100)
ax.axis('off')

def draw_oval(ax, x, y, w, h, text):
    box = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.2",
                                 linewidth=1.0, edgecolor='black', facecolor='white')
    ax.add_patch(box)
    ax.text(x + w/2, y + h/2, text, ha='center', va='center', fontsize=8.0, fontweight='bold')

def draw_rect(ax, x, y, w, h, text):
    rect = patches.Rectangle((x, y), w, h, linewidth=1.0, edgecolor='black', facecolor='white')
    ax.add_patch(rect)
    ax.text(x + w/2, y + h/2, text, ha='center', va='center', fontsize=7.5, color='black')

def draw_diamond(ax, x, y, w, h, text):
    pts = np.array([[x + w/2, y], [x + w, y + h/2], [x + w/2, y + h], [x, y + h/2]])
    poly = patches.Polygon(pts, closed=True, linewidth=1.0, edgecolor='black', facecolor='white')
    ax.add_patch(poly)
    ax.text(x + w/2, y + h/2, text, ha='center', va='center', fontsize=7.0, color='black', multialignment='center')

draw_oval(ax, 30, 92, 40, 6, "Client Upload Stream")
draw_rect(ax, 22, 81, 56, 7, "1. Read Stream & Ingest to Memory\nCompute SHA-256 Digest in Ingestion Path")
draw_diamond(ax, 25, 65, 50, 11, "2. Query PostgreSQL:\nstorage_objects WHERE\ncontent_hash = H ?")

# Match branch (Left)
draw_rect(ax, 2, 48, 42, 10, "CAS Deduplication Hit:\nIncrement Reference Counter\n(reference_count = reference_count + 1)\nZero Bytes Transferred to S3")
draw_rect(ax, 2, 32, 42, 9, "Link Logical File Record:\nInsert into 'files' with\nstorage_object_id = existing.id")

# New branch (Right)
draw_rect(ax, 56, 48, 42, 10, "New Unique Content:\nEvaluate Adaptive Compression\n(MIME Filter & Shannon Entropy Check)")
draw_rect(ax, 56, 32, 42, 9, "Write Physical Payload to S3:\nKey: cas/{prefix}/{sha256}\nInsert 'storage_objects' (ref=1)")

# Convergence
draw_rect(ax, 25, 16, 50, 9, "3. Commit Relational Transaction (ACID)\nLog Synchronous Audit Trail ('UPLOAD')\nTrigger Markov Transition Model Update")
draw_oval(ax, 30, 4, 40, 6, "Upload Finished (201 Created)")

# Connectors
arrow_kw = dict(arrowstyle="->", lw=1.0, color="black")
ax.annotate("", xy=(50, 88), xytext=(50, 92), arrowprops=arrow_kw)
ax.annotate("", xy=(50, 76), xytext=(50, 81), arrowprops=arrow_kw)

# Diamond to Left
ax.plot([25, 18, 18], [70.5, 70.5, 58], 'k-', lw=1.0)
ax.annotate("", xy=(18, 58), xytext=(18, 60), arrowprops=arrow_kw)
ax.text(12, 72, "Match Found\n(Duplicate)", fontsize=7.0, fontweight='bold')

# Diamond to Right
ax.plot([75, 82, 82], [70.5, 70.5, 58], 'k-', lw=1.0)
ax.annotate("", xy=(82, 58), xytext=(82, 60), arrowprops=arrow_kw)
ax.text(83, 72, "Not Found\n(Unique)", fontsize=7.0, fontweight='bold')

# Left Down
ax.annotate("", xy=(23, 41), xytext=(23, 48), arrowprops=arrow_kw)
ax.plot([23, 23, 40], [32, 23, 23], 'k-', lw=1.0)
ax.annotate("", xy=(40, 23), xytext=(38, 23), arrowprops=arrow_kw)

# Right Down
ax.annotate("", xy=(77, 41), xytext=(77, 48), arrowprops=arrow_kw)
ax.plot([77, 77, 60], [32, 23, 23], 'k-', lw=1.0)
ax.annotate("", xy=(60, 23), xytext=(62, 23), arrowprops=arrow_kw)

# Convergence to End
ax.annotate("", xy=(50, 10), xytext=(50, 16), arrowprops=arrow_kw)

plt.tight_layout()
fig.savefig(os.path.join(output_dir, "fig2_cas_flowchart.png"), dpi=300, bbox_inches='tight')
plt.close(fig)
print("Figure 2 generated successfully.")

# ==============================================================================
# FIGURE 3: TIERING DECISION FLOWCHART
# ==============================================================================
fig, ax = plt.subplots(figsize=(6.5, 7.5), dpi=300)
ax.set_xlim(0, 100)
ax.set_ylim(0, 100)
ax.axis('off')

draw_oval(ax, 30, 93, 40, 5.5, "Input: FileRecord Metadata")
draw_diamond(ax, 28, 80, 44, 9, "Rule 1: File Size < 128 KB?")
draw_rect(ax, 76, 80, 22, 9, "S3 STANDARD\n(Small File Guard:\nZero Padding Penalty)")

draw_diamond(ax, 28, 64, 44, 9, "Rule 2: Idle >= 90 Days\nAND Accesses <= 2 ?")
draw_rect(ax, 76, 64, 22, 9, "GLACIER DEEP ARCHIVE\n($0.00099/GB/mo;\n95.7% Cost Reduction)")

draw_diamond(ax, 28, 48, 44, 9, "Rule 3: Idle >= 30 Days\nAND Accesses <= 5 ?")
draw_rect(ax, 76, 48, 22, 9, "GLACIER INSTANT RET.\n($0.0040/GB/mo;\n82.6% Cost Reduction)")

draw_diamond(ax, 28, 32, 44, 9, "Rule 4: Idle >= 14 Days\nAND Accesses <= 10 ?")
draw_rect(ax, 76, 32, 22, 9, "S3 STANDARD-IA\n($0.0125/GB/mo;\n45.7% Cost Reduction)")

draw_rect(ax, 28, 16, 44, 9, "Rule 5: Active Workflow (Fallback)\nRecommend S3 STANDARD\n(Zero Retrieval Surcharge; Active Reads)")

draw_oval(ax, 25, 4, 50, 6, "Execute Boto3 S3 copy_object\nUpdate storage_tier in PostgreSQL")

# Connectors
ax.annotate("", xy=(50, 89), xytext=(50, 93), arrowprops=arrow_kw)

# Rule 1
ax.annotate("", xy=(76, 84.5), xytext=(72, 84.5), arrowprops=arrow_kw)
ax.text(72.5, 86, "Yes", fontsize=7.0, fontweight='bold')
ax.annotate("", xy=(50, 73), xytext=(50, 80), arrowprops=arrow_kw)
ax.text(51, 76, "No", fontsize=7.0, fontweight='bold')

# Rule 2
ax.annotate("", xy=(76, 68.5), xytext=(72, 68.5), arrowprops=arrow_kw)
ax.text(72.5, 70, "Yes", fontsize=7.0, fontweight='bold')
ax.annotate("", xy=(50, 57), xytext=(50, 64), arrowprops=arrow_kw)
ax.text(51, 60, "No", fontsize=7.0, fontweight='bold')

# Rule 3
ax.annotate("", xy=(76, 52.5), xytext=(72, 52.5), arrowprops=arrow_kw)
ax.text(72.5, 54, "Yes", fontsize=7.0, fontweight='bold')
ax.annotate("", xy=(50, 41), xytext=(50, 48), arrowprops=arrow_kw)
ax.text(51, 44, "No", fontsize=7.0, fontweight='bold')

# Rule 4
ax.annotate("", xy=(76, 36.5), xytext=(72, 36.5), arrowprops=arrow_kw)
ax.text(72.5, 38, "Yes", fontsize=7.0, fontweight='bold')
ax.annotate("", xy=(50, 25), xytext=(50, 32), arrowprops=arrow_kw)
ax.text(51, 28, "No", fontsize=7.0, fontweight='bold')

# Rule 5 to End
ax.annotate("", xy=(50, 10), xytext=(50, 16), arrowprops=arrow_kw)

# Side outcomes down to execute
ax.plot([87, 87, 75], [80, 10, 10], 'k--', lw=0.8)
ax.plot([87, 87], [64, 10], 'k--', lw=0.8)
ax.plot([87, 87], [48, 10], 'k--', lw=0.8)
ax.plot([87, 87], [32, 10], 'k--', lw=0.8)

plt.tight_layout()
fig.savefig(os.path.join(output_dir, "fig3_tiering_flowchart.png"), dpi=300, bbox_inches='tight')
plt.close(fig)
print("Figure 3 generated successfully.")

# ==============================================================================
# FIGURE 4: MARKOV CHAIN STATE PREDICTION
# ==============================================================================
fig, ax = plt.subplots(figsize=(6.8, 3.8), dpi=300)
ax.set_xlim(0, 100)
ax.set_ylim(0, 60)
ax.axis('off')

# States (Files A, B, C, D)
def draw_state(ax, x, y, r, label, sub):
    circ = patches.Circle((x, y), r, linewidth=1.2, edgecolor='black', facecolor='white')
    ax.add_patch(circ)
    ax.text(x, y + 1.2, label, ha='center', va='center', fontsize=9.0, fontweight='bold')
    ax.text(x, y - 2.5, sub, ha='center', va='center', fontsize=6.5, style='italic')

draw_state(ax, 15, 30, 8, "File A", "Overview.pdf")
draw_state(ax, 42, 45, 8, "File B", "Dataset.csv")
draw_state(ax, 42, 15, 8, "File C", "Analysis.py")
draw_state(ax, 75, 30, 8, "File D", "Summary.docx")

# Transitions with probabilities
def draw_arrow_curve(ax, x1, y1, x2, y2, rad, text, text_pos):
    arrow = patches.FancyArrowPatch((x1, y1), (x2, y2),
                                   connectionstyle=f"arc3,rad={rad}",
                                   arrowstyle="->", mutation_scale=10,
                                   linewidth=1.0, color='black')
    ax.add_patch(arrow)
    ax.text(text_pos[0], text_pos[1], text, fontsize=7.5, fontweight='bold',
            bbox=dict(boxstyle="square,pad=0.15", facecolor="white", edgecolor="none"))

draw_arrow_curve(ax, 21, 35, 35, 47, -0.15, "P_AB = 0.65", (24, 46))
draw_arrow_curve(ax, 21, 25, 35, 13, 0.15, "P_AC = 0.35", (24, 15))
draw_arrow_curve(ax, 49, 47, 68, 34, -0.15, "P_BD = 0.80", (58, 47))
draw_arrow_curve(ax, 49, 13, 68, 26, 0.15, "P_CD = 0.70", (58, 15))
draw_arrow_curve(ax, 42, 37, 42, 23, 0.0, "P_BC = 0.20", (43.5, 30))

# Prefetch Box on Right
draw_box(ax, 86, 12, 13, 36, "Prefetch\nQueue\n\nTop-K\nPresigned\nS3 URLs\n\n(TTL=300s)", None, None, False)

plt.tight_layout()
fig.savefig(os.path.join(output_dir, "fig4_markov_prefetch.png"), dpi=300, bbox_inches='tight')
plt.close(fig)
print("Figure 4 generated successfully.")

# ==============================================================================
# FIGURE 5: EMPIRICAL BENCHMARKS (ACADEMIC PLOTS)
# ==============================================================================
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(7.2, 3.2), dpi=300)

# Plot 1: Deduplication Ratio & Ingestion Speedup
x = np.array([0, 25, 50, 75, 100])
dr = np.array([0, 25, 50, 75, 99])
speedup = np.array([1.0, 1.3, 1.9, 3.3, 8.8])

color = 'black'
ax1.set_xlabel('Corpus Duplicate Density (%)', fontsize=8.0, fontweight='bold')
ax1.set_ylabel('Storage Deduplication Ratio (%)', color=color, fontsize=8.0, fontweight='bold')
line1 = ax1.plot(x, dr, color='black', marker='o', linewidth=1.2, markersize=4, label='Deduplication Ratio (%)')
ax1.tick_params(axis='y', labelcolor=color)
ax1.set_ylim(-5, 105)
ax1.grid(True, linestyle=':', alpha=0.6)

ax1_twin = ax1.twinx()
ax1_twin.set_ylabel('Upload Ingestion Speedup (x)', color='#444444', fontsize=8.0, fontweight='bold')
line2 = ax1_twin.plot(x, speedup, color='#555555', linestyle='--', marker='s', linewidth=1.2, markersize=4, label='Ingestion Speedup (x)')
ax1_twin.tick_params(axis='y', labelcolor='#444444')
ax1_twin.set_ylim(0, 10)

lines = line1 + line2
labels = [l.get_label() for l in lines]
ax1.legend(lines, labels, loc='upper left', fontsize=7.0, frameon=True, edgecolor='black')
ax1.set_title('(a) CAS Deduplication & Throughput', fontsize=8.5, fontweight='bold', pad=8)

# Plot 2: Cost Comparison with Padding Penalty
categories = ['Policy A\n(Baseline)', 'Policy B\n(Naive IA)', 'Policy C\n(Cost-Aware)']
active_cost = [2.30, 0.46, 0.56]
tiered_cost = [0.00, 1.00, 0.45]
padding_penalty = [0.00, 4.12, 0.00]

ind = np.arange(len(categories))
width = 0.5

p1 = ax2.bar(ind, active_cost, width, color='#E0E0E0', edgecolor='black', linewidth=0.8, label='S3 Standard Active')
p2 = ax2.bar(ind, tiered_cost, width, bottom=active_cost, color='#999999', edgecolor='black', linewidth=0.8, label='Tiered Storage Class')
p3 = ax2.bar(ind, padding_penalty, width, bottom=np.array(active_cost) + np.array(tiered_cost),
             color='black', hatch='//', edgecolor='black', linewidth=0.8, label='128KB Padding Penalty')

ax2.set_ylabel('Monthly Cloud Invoice ($USD / 100 GB)', fontsize=8.0, fontweight='bold')
ax2.set_xticks(ind)
ax2.set_xticklabels(categories, fontsize=7.5)
ax2.set_ylim(0, 7.5)
ax2.grid(True, linestyle=':', alpha=0.6, axis='y')
ax2.legend(loc='upper left', fontsize=7.0, frameon=True, edgecolor='black')
ax2.set_title('(b) Tiering Economics & Penalty Guard', fontsize=8.5, fontweight='bold', pad=8)

# Label net savings on bar 3
ax2.text(2, 1.15, "-56.1%", ha='center', va='bottom', fontsize=7.5, fontweight='bold', color='black')
ax2.text(1, 5.70, "+142%\n(Failure)", ha='center', va='bottom', fontsize=7.0, fontweight='bold', color='black')

plt.tight_layout()
fig.savefig(os.path.join(output_dir, "fig5_experimental_benchmarks.png"), dpi=300, bbox_inches='tight')
plt.close(fig)
print("Figure 5 generated successfully.")
