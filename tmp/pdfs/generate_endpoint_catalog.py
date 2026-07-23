from __future__ import annotations

import re
from collections import Counter, defaultdict
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, KeepTogether, PageBreak, PageTemplate,
    Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src/main/java"
OUT = ROOT / "output/pdf/cloudhrms-endpoints-only.pdf"

MAPPING_RE = re.compile(r"@(Get|Post|Put|Patch|Delete|Request)Mapping\b")
PARAM_ANN = ("PathVariable", "RequestParam", "RequestBody", "RequestPart", "RequestHeader", "ModelAttribute")


def balanced(text: str, start: int, opening="(", closing=")"):
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(text)):
        c = text[i]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
            continue
        if c == '"':
            in_str = True
        elif c == opening:
            depth += 1
        elif c == closing:
            depth -= 1
            if depth == 0:
                return text[start:i + 1], i + 1
    return "", start


def annotation_at(text: str, m: re.Match):
    end = m.end()
    if end < len(text) and text[end:].lstrip().startswith("("):
        p = end + len(text[end:]) - len(text[end:].lstrip())
        arg, end = balanced(text, p)
        return text[m.start():m.end()] + arg, end
    return text[m.start():m.end()], end


def quoted_values(s: str):
    return re.findall(r'"([^"\\]*(?:\\.[^"\\]*)*)"', s)


def mapping_info(ann: str):
    kind = re.search(r"@(Get|Post|Put|Patch|Delete|Request)Mapping", ann).group(1)
    methods = [kind.upper()] if kind != "Request" else re.findall(r"RequestMethod\.(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)", ann)
    if not methods:
        methods = ["ANY"]
    strings = quoted_values(ann)
    paths = [x for x in strings if x.startswith("/") or x == ""]
    if not paths:
        paths = [""]
    consumes = "multipart/form-data" if "MULTIPART_FORM_DATA" in ann else ("application/json" if "APPLICATION_JSON" in ann else "")
    produces = "application/pdf" if "APPLICATION_PDF" in ann else ("application/json" if "APPLICATION_JSON" in ann else "")
    return methods, paths, consumes, produces


def split_params(s: str):
    out, start, depth, in_str, esc = [], 0, 0, False, False
    for i, c in enumerate(s):
        if in_str:
            if esc: esc = False
            elif c == "\\": esc = True
            elif c == '"': in_str = False
        elif c == '"': in_str = True
        elif c in "(<[{": depth += 1
        elif c in ")>]}": depth -= 1
        elif c == "," and depth == 0:
            out.append(s[start:i].strip()); start = i + 1
    if s[start:].strip(): out.append(s[start:].strip())
    return out


def parse_param(raw: str):
    raw = re.sub(r"\s+", " ", raw.strip())
    ann_names = re.findall(r"@(\w+)(?:\([^)]*\))?", raw)
    clean = re.sub(r"@\w+(?:\([^)]*\))?\s*", "", raw).strip()
    toks = clean.split()
    name = toks[-1] if toks else ""
    typ = " ".join(toks[:-1]) if len(toks) > 1 else ""
    kind = next((x for x in PARAM_ANN if x in ann_names), "")
    alias = ""
    am = re.search(r"@(PathVariable|RequestParam|RequestPart|RequestHeader)\s*\(([^)]*)\)", raw)
    if am:
        vals = quoted_values(am.group(2))
        if vals: alias = vals[0]
    required = "required = false" not in raw
    return {"kind": kind, "name": alias or name, "java_name": name, "type": typ, "required": required}


def find_method_signature(text: str, pos: int):
    # Skip intervening annotations, then find a Java method declaration.
    chunk = text[pos:pos + 5000]
    m = re.search(r"\b(public|protected|private)\s+(?:static\s+)?(?:<[^>]+>\s+)?([\w.$<>?, \[\]]+)\s+(\w+)\s*\(", chunk)
    if not m:
        return None
    p = pos + m.end() - 1
    params, end = balanced(text, p)
    if not params:
        return None
    return m.group(2).strip(), m.group(3), params[1:-1], end


def parse_controller(path: Path):
    text = path.read_text(errors="replace")
    cls = re.search(r"\bclass\s+(\w+)", text)
    if not cls: return []
    class_pos = cls.start()
    prefix = ""
    for m in MAPPING_RE.finditer(text[:class_pos]):
        ann, _ = annotation_at(text, m)
        _, paths, _, _ = mapping_info(ann)
        prefix = paths[0]
    endpoints = []
    for mm in MAPPING_RE.finditer(text, class_pos):
        ann, end = annotation_at(text, mm)
        sig = find_method_signature(text, end)
        if not sig: continue
        ret, handler, params_raw, _ = sig
        methods, paths, consumes, produces = mapping_info(ann)
        params = [parse_param(x) for x in split_params(params_raw)]
        body = next((p for p in params if p["kind"] in ("RequestBody", "ModelAttribute")), None)
        parts = [p for p in params if p["kind"] == "RequestPart"]
        if parts: consumes = "multipart/form-data"
        if body and not consumes: consumes = "application/json"
        line = text.count("\n", 0, mm.start()) + 1
        module = path.relative_to(SRC).parts[-3] if len(path.relative_to(SRC).parts) >= 3 else "root"
        for method in methods:
            for suffix in paths:
                full = (prefix.rstrip("/") + "/" + suffix.lstrip("/")).rstrip("/") or "/"
                endpoints.append({
                    "module": module, "controller": cls.group(1), "method": method,
                    "path": full, "handler": handler, "return": ret, "params": params,
                    "body": body, "parts": parts, "consumes": consumes, "produces": produces,
                    "source": f"{path.relative_to(ROOT)}:{line}",
                })
    # Deduplicate artifacts from regex rebasing.
    unique = {}
    for e in endpoints:
        unique[(e["method"], e["path"], e["handler"], e["source"])] = e
    return list(unique.values())


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


class CatalogDoc(BaseDocTemplate):
    def __init__(self, filename, **kw):
        super().__init__(filename, **kw)
        frame = Frame(17 * mm, 17 * mm, A4[0] - 34 * mm, A4[1] - 32 * mm, id="main")
        self.addPageTemplates(PageTemplate(id="catalog", frames=frame, onPage=self.header_footer))

    def header_footer(self, canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(colors.HexColor("#64748B"))
        if doc.page > 1:
            canvas.drawString(17 * mm, A4[1] - 10 * mm, "CloudHRMS API - Postman Endpoint Catalog")
        canvas.drawRightString(A4[0] - 17 * mm, 9 * mm, f"Page {doc.page}")
        canvas.restoreState()

    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and flowable.style.name == "ControllerHeading":
            text = flowable.getPlainText()
            self.canv.bookmarkPage(text)
            self.canv.addOutlineEntry(text, text, level=0, closed=False)
            self.notify("TOCEntry", (0, text, self.page))


def build_pdf(endpoints):
    OUT.parent.mkdir(parents=True, exist_ok=True)
    body = ParagraphStyle("BodyX", fontName="Helvetica", fontSize=8, leading=10, textColor=colors.HexColor("#0F172A"))
    mono = ParagraphStyle("Mono", parent=body, fontName="Courier", fontSize=7.5, leading=9)
    method_colors = {"GET":"#0284C7", "POST":"#16A34A", "PUT":"#D97706", "PATCH":"#7C3AED", "DELETE":"#DC2626", "ANY":"#475569"}
    doc = SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=12*mm, leftMargin=12*mm, topMargin=12*mm, bottomMargin=12*mm, title="CloudHRMS Endpoints")
    rows = []
    seen = set()
    for e in sorted(endpoints, key=lambda x: (x["path"], x["method"])):
        key = (e["method"], e["path"])
        if key in seen:
            continue
        seen.add(key)
        color = method_colors.get(e["method"], "#475569")
        rows.append([Paragraph(f"<font color='{color}'><b>{e['method']}</b></font>", body), Paragraph(esc(e["path"]), mono)])
    table = Table(rows, colWidths=[20*mm, 162*mm], repeatRows=0)
    table.setStyle(TableStyle([
        ("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#CBD5E1")),
        ("BACKGROUND", (0,0), (-1,-1), colors.white),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING", (0,0), (-1,-1), 4),
        ("RIGHTPADDING", (0,0), (-1,-1), 4),
        ("TOPPADDING", (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
    ]))
    doc.build([table])


if __name__ == "__main__":
    endpoints = []
    for p in SRC.rglob("*.java"):
        t = p.read_text(errors="ignore")
        if "@RestController" in t or re.search(r"@Controller\b", t):
            endpoints.extend(parse_controller(p))
    build_pdf(endpoints)
    print(f"Generated {OUT} with {len(endpoints)} endpoints")
