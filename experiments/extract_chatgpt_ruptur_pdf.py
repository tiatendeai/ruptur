#!/usr/bin/env python3
from __future__ import annotations

import re
import zlib
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass(frozen=True)
class PdfObject:
    number: int
    raw: bytes


OBJ_RE = re.compile(rb"\n?(\d+)\s+(\d+)\s+obj\b(.*?)\bendobj\b", re.S)


def build_object_table(pdf_bytes: bytes) -> dict[int, PdfObject]:
    objects: dict[int, PdfObject] = {}
    for match in OBJ_RE.finditer(pdf_bytes):
        obj_num = int(match.group(1))
        gen = int(match.group(2))
        if gen != 0:
            continue
        objects[obj_num] = PdfObject(number=obj_num, raw=match.group(3).strip(b"\r\n"))
    return objects


def first_ref(raw: bytes, key: bytes) -> int | None:
    match = re.search(rb"/%s\s+(\d+)\s+0\s+R" % re.escape(key), raw)
    return int(match.group(1)) if match else None


def refs_array(raw: bytes, key: bytes) -> list[int]:
    match = re.search(rb"/%s\s*\[(.*?)\]" % re.escape(key), raw, re.S)
    if not match:
        return []
    return [int(x) for x in re.findall(rb"(\d+)\s+0\s+R", match.group(1))]


def stream_data(raw: bytes) -> bytes | None:
    match = re.search(rb"\bstream\r?\n", raw)
    if not match:
        return None
    start = match.end()
    end = raw.find(b"endstream", start)
    if end == -1:
        return None
    return raw[start:end].rstrip(b"\r\n")


def flate_decompress(raw: bytes) -> bytes | None:
    data = stream_data(raw)
    if not data:
        return None
    try:
        return zlib.decompress(data)
    except Exception:
        return None


def find_catalog(objects: dict[int, PdfObject]) -> int | None:
    for obj_num, obj in objects.items():
        if re.search(rb"/Type\s*/Catalog\b", obj.raw):
            return obj_num
    return None


def walk_pages(objects: dict[int, PdfObject], pages_root: int) -> list[int]:
    pages: list[int] = []

    def walk(node: int) -> None:
        raw = objects.get(node, PdfObject(node, b"")).raw
        if re.search(rb"/Type\s*/Pages\b", raw):
            for kid in refs_array(raw, b"Kids"):
                walk(kid)
            return
        if re.search(rb"/Type\s*/Page\b", raw):
            pages.append(node)

    walk(pages_root)
    return pages


def parse_font_dict(container: bytes, objects: dict[int, PdfObject]) -> dict[str, int]:
    font_ref = first_ref(container, b"Font")
    if font_ref:
        container = objects.get(font_ref, PdfObject(font_ref, b"")).raw or container

    match = re.search(rb"/Font\s*<<(.+?)>>", container, re.S)
    if not match:
        return {}

    body = match.group(1)
    out: dict[str, int] = {}
    for name, ref in re.findall(rb"/([A-Za-z0-9_.-]+)\s+(\d+)\s+0\s+R", body):
        out[name.decode("ascii", errors="ignore")] = int(ref)
    return out


def to_unicode_map(objects: dict[int, PdfObject]) -> dict[int, int]:
    font_to_unicode: dict[int, int] = {}
    for obj_num, obj in objects.items():
        if b"/Type /Font" not in obj.raw:
            continue
        match = re.search(rb"/ToUnicode\s+(\d+)\s+0\s+R", obj.raw)
        if match:
            font_to_unicode[obj_num] = int(match.group(1))
    return font_to_unicode


def parse_cmap_stream(objects: dict[int, PdfObject], cmap_obj_num: int) -> dict[int, str]:
    cmap_obj = objects.get(cmap_obj_num)
    if not cmap_obj or b"/FlateDecode" not in cmap_obj.raw:
        return {}

    dec = flate_decompress(cmap_obj.raw)
    if not dec or b"begincmap" not in dec:
        return {}

    text = dec.decode("latin-1", errors="ignore")
    mapping: dict[int, str] = {}

    for block in re.finditer(r"\d+\s+beginbfchar(.*?)endbfchar", text, re.S):
        for a, b_ in re.findall(r"<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>", block.group(1)):
            src = bytes.fromhex(a)
            dst = bytes.fromhex(b_)
            if len(src) == 1 and len(dst) in (2, 4):
                cp = int.from_bytes(dst, "big")
                if 0 <= cp <= 0x10FFFF and not (0xD800 <= cp <= 0xDFFF):
                    mapping[src[0]] = chr(cp)

    for block in re.finditer(r"\d+\s+beginbfrange(.*?)endbfrange", text, re.S):
        for a, b_, c in re.findall(
            r"<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>", block.group(1)
        ):
            start = bytes.fromhex(a)
            end = bytes.fromhex(b_)
            base = bytes.fromhex(c)
            if len(start) == len(end) == 1 and len(base) in (2, 4):
                base_cp = int.from_bytes(base, "big")
                for i, code in enumerate(range(start[0], end[0] + 1)):
                    cp = base_cp + i
                    if 0 <= cp <= 0x10FFFF and not (0xD800 <= cp <= 0xDFFF):
                        mapping[code] = chr(cp)

    return mapping


def extract_text_from_content(content: bytes, font_cmaps: dict[str, dict[int, str]]) -> str:
    s = content.decode("latin-1", errors="ignore")
    cur_font: str | None = None
    out: list[str] = []

    td_pat = re.compile(r"(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Td\b")

    def decode_hex(hexstr: str) -> str:
        cmap = font_cmaps.get(cur_font or "", {})
        try:
            data = bytes.fromhex(hexstr)
        except Exception:
            return ""
        if not cmap:
            return ""
        chars: list[str] = []
        for b in data:
            ch = cmap.get(b)
            if ch is None:
                # Heurística útil para PDFs gerados pelo Chrome/Skia:
                # vários ToUnicode CMaps mapeiam 0x03 -> espaço.
                if b == 0x03:
                    chars.append(" ")
                continue
            chars.append(ch)
        return "".join(chars)

    for line in s.splitlines():
        match = re.search(r"/([A-Za-z0-9_.-]+)\s+\d+(?:\.\d+)?\s+Tf", line)
        if match:
            cur_font = match.group(1)

        for hx in re.findall(r"<([0-9A-Fa-f]+)>\s*Tj", line):
            out.append(decode_hex(hx))

        if " TJ" in line and "[" in line:
            arr = re.search(r"\[(.*)\]\s*TJ", line)
            if arr:
                body = arr.group(1)
                out.append("".join(decode_hex(hx) for hx in re.findall(r"<([0-9A-Fa-f]+)>", body)))

        if re.search(r"\bT\*\b", line):
            out.append("\n")
        else:
            mtd = td_pat.search(line)
            if mtd:
                y = float(mtd.group(2))
                if abs(y) > 1e-6:
                    out.append("\n")

    text = "".join(out)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s+", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    # juntar quebras simples em espaço, preservando parágrafos
    text = re.sub(r"(?<!\n)\n(?!\n)", " ", text)
    text = re.sub(r"\n\n+", "\n\n", text)
    return text.strip()


def extract_pdf_text(pdf_path: Path) -> list[str]:
    pdf_bytes = pdf_path.read_bytes()
    objects = build_object_table(pdf_bytes)

    catalog = find_catalog(objects)
    if not catalog:
        raise SystemExit("Não encontrei /Type /Catalog no PDF.")

    pages_root = first_ref(objects[catalog].raw, b"Pages")
    if not pages_root:
        raise SystemExit("Não encontrei /Pages no Catalog.")

    pages = walk_pages(objects, pages_root)

    font_to_unicode = to_unicode_map(objects)
    cmap_cache: dict[int, dict[int, str]] = {}

    def cmap_for_font(font_obj: int) -> dict[int, str]:
        cmap_obj = font_to_unicode.get(font_obj)
        if not cmap_obj:
            return {}
        if cmap_obj not in cmap_cache:
            cmap_cache[cmap_obj] = parse_cmap_stream(objects, cmap_obj)
        return cmap_cache[cmap_obj]

    page_texts: list[str] = []

    for page_num, page_obj_num in enumerate(pages, 1):
        page_obj = objects[page_obj_num].raw

        resources_ref = first_ref(page_obj, b"Resources")
        resources_obj = objects.get(resources_ref, PdfObject(-1, b"")).raw if resources_ref else page_obj

        fonts = parse_font_dict(resources_obj, objects)
        font_cmaps = {font_name: cmap_for_font(font_obj) for font_name, font_obj in fonts.items()}

        contents = []
        contents_ref = first_ref(page_obj, b"Contents")
        if contents_ref:
            contents = [contents_ref]
        else:
            contents = refs_array(page_obj, b"Contents")

        parts: list[str] = []
        for cref in contents:
            cobj = objects.get(cref)
            if not cobj:
                continue
            raw = cobj.raw
            data = stream_data(raw)
            if not data:
                continue

            if b"/FlateDecode" in raw:
                dec = flate_decompress(raw)
                if dec is None:
                    continue
                parts.append(extract_text_from_content(dec, font_cmaps))
            else:
                parts.append(extract_text_from_content(data, font_cmaps))

        page_text = "\n\n".join(p for p in parts if p).strip()
        if page_text:
            page_texts.append(f"## Página {page_num}\n\n{page_text}\n")

    return page_texts


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    pdf_path = repo_root / "docs/jornada/ChatGPT - Ruptur.pdf"
    out_md = repo_root / "docs/jornada/chatgpt_ruptur_extrato.md"

    page_texts = extract_pdf_text(pdf_path)
    extracted_at = datetime.now(timezone.utc).isoformat(timespec="seconds")

    header = "\n".join(
        [
            "# ChatGPT - Ruptur (extrato)",
            "",
            f"Fonte: `{pdf_path.relative_to(repo_root)}`",
            f"Extraído em (UTC): {extracted_at}",
            "",
            "> Observação: extração heurística (PDF gerado por navegador). Pode haver pequenos erros de acentuação/espaçamento.",
            "",
        ]
    )

    out_md.write_text(header + "\n".join(page_texts), encoding="utf-8")
    print(f"Wrote {out_md}")


if __name__ == "__main__":
    main()
