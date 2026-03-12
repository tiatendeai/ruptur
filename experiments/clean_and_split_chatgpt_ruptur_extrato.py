#!/usr/bin/env python3
from __future__ import annotations

import re
import textwrap
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass(frozen=True)
class Page:
    number: int
    text: str


PAGE_HEADER_RE = re.compile(r"^##\s+Página\s+(\d+)\s*$")


def normalize_spacing(text: str) -> str:
    text = text.replace("\u00a0", " ")

    # Insert missing spaces after punctuation.
    # Keep this conservative; URLs/code-like tokens are protected upstream.
    text = re.sub(r"([.!?…])([A-Za-zÀ-ÿ])", r"\1 \2", text)
    text = re.sub(r"([,;])([A-Za-zÀ-ÿ])", r"\1 \2", text)
    text = re.sub(r"([A-Za-zÀ-ÿ]):([A-Za-zÀ-ÿ])", r"\1: \2", text)

    # Ensure space after closing parenthesis/bracket when immediately followed by a letter.
    text = re.sub(r"([)\]])([A-Za-zÀ-ÿ])", r"\1 \2", text)

    # Compact whitespace
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def protect_spans(text: str) -> tuple[str, dict[str, str]]:
    spans: list[tuple[int, int]] = []
    protected: dict[str, str] = {}

    def add_span(start: int, end: int) -> None:
        if start < 0 or end <= start:
            return
        spans.append((start, end))

    # URLs with scheme
    for m in re.finditer(r"https?://[^\s)]+", text):
        add_span(m.start(), m.end())

    # Code-ish dotted identifiers / domains / SDK calls: foo.bar, foo.bar.baz, docs.example.com
    for m in re.finditer(r"\b[A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+){1,}\b", text):
        add_span(m.start(), m.end())

    # Paths/endpoints: /checkouts/create
    for m in re.finditer(r"\b/[A-Za-z0-9/_-]+\b", text):
        add_span(m.start(), m.end())

    # JSON-ish blocks: balanced braces on the same page chunk.
    # This is a lightweight scanner; it protects typical inline JSON samples.
    stack = []
    start = None
    for i, ch in enumerate(text):
        if ch == "{":
            if not stack:
                start = i
            stack.append("{")
        elif ch == "}":
            if stack:
                stack.pop()
                if not stack and start is not None:
                    end = i + 1
                    if end - start >= 40:  # avoid tiny brace uses
                        add_span(start, end)
                    start = None

    # Merge overlaps
    if not spans:
        return text, protected
    spans.sort()
    merged: list[tuple[int, int]] = []
    cur_s, cur_e = spans[0]
    for s, e in spans[1:]:
        if s <= cur_e:
            cur_e = max(cur_e, e)
        else:
            merged.append((cur_s, cur_e))
            cur_s, cur_e = s, e
    merged.append((cur_s, cur_e))

    # Replace from end to keep indices stable
    out = text
    counters: dict[str, int] = {"URL": 0, "JSON": 0, "PATH": 0, "DOT": 0}
    for (s, e) in reversed(merged):
        token = out[s:e]
        if token.startswith("http://") or token.startswith("https://"):
            kind = "URL"
        elif token.startswith("{"):
            kind = "JSON"
        elif token.startswith("/"):
            kind = "PATH"
        else:
            kind = "DOT"
        idx = counters[kind]
        counters[kind] += 1
        placeholder = f"@@@{kind}{idx}@@@"
        protected[placeholder] = token
        out = out[:s] + placeholder + out[e:]

    return out, protected


def restore_spans(text: str, protected: dict[str, str]) -> str:
    out = text
    for placeholder, token in protected.items():
        out = out.replace(placeholder, token)
    return out


def add_structure(text: str) -> str:
    # Break before URLs to keep them readable.
    text = re.sub(r"(?<!\s)(https?://)", r"\n\n\1", text)
    text = re.sub(r"(?<!\s)(@@@URL\d+@@@)", r"\n\n\1", text)

    # Common inline comment sample in the PDF.
    text = re.sub(r"(?<!\n)(?<!:)//", r"\n\n//", text)

    # Turn "7 — Algo" into a markdown heading (when it appears mid-paragraph).
    text = re.sub(r"(?<!#)\b(\d+)\s+—\s+", r"\n\n### \1 — ", text)

    # Highlight "Arquivo:" blocks.
    text = re.sub(r"\bArquivo:\s*", r"\n\n**Arquivo:** ", text)

    return text.strip()


def smart_wrap(text: str, width: int = 100) -> str:
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    wrapped: list[str] = []
    for p in paragraphs:
        if p.startswith("http://") or p.startswith("https://") or p.startswith("//"):
            wrapped.append(p)
            continue
        if "{" in p and "}" in p and len(p) > 200:
            # likely JSON-ish sample; keep as-is to avoid mangling braces
            wrapped.append(p)
            continue
        wrapped.append(textwrap.fill(p, width=width, break_long_words=False, break_on_hyphens=False))
    return "\n\n".join(wrapped)


def parse_pages(md: str) -> tuple[str, list[Page]]:
    lines = md.splitlines()
    header_lines: list[str] = []
    pages: list[Page] = []

    cur_num: int | None = None
    cur_lines: list[str] = []

    def flush() -> None:
        nonlocal cur_num, cur_lines
        if cur_num is None:
            return
        text = "\n".join(cur_lines).strip()
        pages.append(Page(number=cur_num, text=text))
        cur_num = None
        cur_lines = []

    started_pages = False
    for line in lines:
        match = PAGE_HEADER_RE.match(line.strip())
        if match:
            started_pages = True
            flush()
            cur_num = int(match.group(1))
            continue

        if not started_pages:
            header_lines.append(line)
            continue

        cur_lines.append(line)

    flush()
    return "\n".join(header_lines).rstrip() + "\n", pages


def clean_page_text(text: str) -> str:
    masked, protected = protect_spans(text)
    masked = normalize_spacing(masked)
    masked = add_structure(masked)
    masked = smart_wrap(masked)
    return restore_spans(masked, protected)


def write_cleaned_extrato(repo_root: Path, header: str, pages: list[Page]) -> Path:
    out_path = repo_root / "docs/jornada/chatgpt_ruptur_extrato_limpo.md"
    extracted_at = datetime.now(timezone.utc).isoformat(timespec="seconds")

    cleaned_header = (
        header.replace("# ChatGPT - Ruptur (extrato)", "# ChatGPT - Ruptur (extrato limpo)")
        + f"\n\nLimpo em (UTC): {extracted_at}\n"
    ).strip() + "\n\n"

    parts: list[str] = [cleaned_header]
    for page in pages:
        cleaned = clean_page_text(page.text)
        parts.append(f"## Página {page.number}\n\n{cleaned}\n")

    out_path.write_text("\n".join(parts).rstrip() + "\n", encoding="utf-8")
    return out_path


def write_chapters(repo_root: Path, pages: list[Page]) -> Path:
    by_num = {p.number: p for p in pages}
    out_dir = repo_root / "docs/jornada/chatgpt_ruptur_capitulos"
    out_dir.mkdir(parents=True, exist_ok=True)

    chapters = [
        ("01_abacatepay_dx_first.md", "AbacatePay (DX-first)", range(1, 19)),
        ("02_decisoes_arquiteturais.md", "Decisões arquiteturais (Stripe/Twilio-style)", range(24, 26)),
        ("03_blueprint_mvp.md", "Blueprint do MVP (WhatsApp → backend → agentes)", range(176, 185)),
        ("04_codex_markdown_git.md", "Codex + Markdown/Git (fase 1 sem custos)", range(187, 215)),
        ("05_genesis.md", "Gênesis (1:2 → 1:3)", range(197, 210)),
    ]

    for filename, title, page_range in chapters:
        parts = [f"# {title}\n"]
        for n in page_range:
            page = by_num.get(n)
            if not page or not page.text.strip():
                continue
            parts.append(f"## Página {n}\n\n{clean_page_text(page.text)}\n")
        (out_dir / filename).write_text("\n".join(parts).rstrip() + "\n", encoding="utf-8")

    index = [
        "# ChatGPT - Ruptur (índice)\n",
        "- `docs/jornada/chatgpt_ruptur_extrato_limpo.md`",
        "- `docs/jornada/chatgpt_ruptur_capitulos/01_abacatepay_dx_first.md`",
        "- `docs/jornada/chatgpt_ruptur_capitulos/02_decisoes_arquiteturais.md`",
        "- `docs/jornada/chatgpt_ruptur_capitulos/03_blueprint_mvp.md`",
        "- `docs/jornada/chatgpt_ruptur_capitulos/04_codex_markdown_git.md`",
        "- `docs/jornada/chatgpt_ruptur_capitulos/05_genesis.md`",
    ]
    index_path = repo_root / "docs/jornada/chatgpt_ruptur_indice.md"
    index_path.write_text("\n".join(index).rstrip() + "\n", encoding="utf-8")

    return out_dir


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    src = repo_root / "docs/jornada/chatgpt_ruptur_extrato.md"
    if not src.exists():
        raise SystemExit(f"Arquivo não encontrado: {src}")

    header, pages = parse_pages(src.read_text(encoding="utf-8"))
    out_clean = write_cleaned_extrato(repo_root, header, pages)
    out_dir = write_chapters(repo_root, pages)

    print(f"Wrote {out_clean}")
    print(f"Wrote {out_dir}")


if __name__ == "__main__":
    main()
