from __future__ import annotations

import io
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import pdfplumber
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse
from pypdf import PdfReader

app = FastAPI(title="Nexus CAS Parser Service", version="0.2.0")

PAN_PATTERN = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")
EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
MOBILE_PATTERN = re.compile(r"(?:\+91[\s\-]?)?[6-9][0-9]{9}\b")
ISIN_PATTERN = re.compile(r"(?:INF|INE)[A-Z0-9]{8,}", re.IGNORECASE)
FOLIO_PATTERN = re.compile(r"\bFolio(?:\s*(?:No|Number|#|Nos?)\.?)?\s*[:\-]?\s*([A-Z0-9/\-]{5,})", re.IGNORECASE)
DATE_ON_PATTERN = re.compile(r"(?:as\s*(?:on|of)|statement\s+date)\s*[:\-]?\s*([0-9A-Za-z\-/]{6,20})", re.IGNORECASE)
LINE_DATE_PATTERN = re.compile(r"\b\d{1,2}[/-][A-Za-z0-9]{1,3}[/-]\d{2,4}\b")
NUM_PATTERN = re.compile(r"(?<![A-Za-z0-9])(?:\d{1,3}(?:,\d{2,3})*|\d+)(?:\.\d+)?")
INLINE_FOLIO_ROW_PATTERN = re.compile(r"^\s*([A-Z0-9/.-]{5,})\s+(.+?)\s*$")

IGNORE_LINE_TOKENS = (
  "transaction",
  "advisor",
  "registrar",
  "branch",
  "address",
  "phone",
  "email",
  "nominee",
  "bank",
)


@app.get("/health")
def health() -> Dict[str, str]:
  return {"status": "ok"}


def _safe_str(value: Any) -> Optional[str]:
  return value.strip() if isinstance(value, str) and value.strip() else None


def _safe_float(value: Any) -> Optional[float]:
  if isinstance(value, (int, float)):
    return float(value)
  if not isinstance(value, str):
    return None
  text = value.replace(",", "").strip()
  if not text:
    return None
  try:
    return float(text)
  except Exception:
    return None


def _normalize_date(value: str) -> Optional[str]:
  text = value.strip()
  if not text:
    return None
  formats = (
    "%d-%m-%Y",
    "%d/%m/%Y",
    "%d-%m-%y",
    "%d/%m/%y",
    "%d-%b-%Y",
    "%d/%b/%Y",
    "%d-%b-%y",
    "%d/%b/%y",
    "%d-%B-%Y",
    "%d/%B/%Y",
  )
  for fmt in formats:
    try:
      return datetime.strptime(text, fmt).strftime("%Y-%m-%d")
    except ValueError:
      continue
  return None


def _extract_pdf_text(raw: bytes, password: str) -> Tuple[str, str]:
  notes: List[str] = []
  text_chunks: List[str] = []

  try:
    reader = PdfReader(io.BytesIO(raw))
    if reader.is_encrypted:
      decrypt_status = reader.decrypt(password or "")
      if decrypt_status == 0:
        notes.append("invalid_password")
        raise ValueError("Invalid PDF password")
    for page in reader.pages:
      page_text = page.extract_text() or ""
      if page_text.strip():
        text_chunks.append(page_text)
    if text_chunks:
      notes.append("pypdf")
  except Exception:
    notes.append("pypdf_failed")

  combined = "\n".join(text_chunks).strip()
  if len(combined) >= 200:
    return combined, ",".join(notes)

  try:
    with pdfplumber.open(io.BytesIO(raw), password=(password or None)) as pdf:
      plumber_chunks: List[str] = []
      for page in pdf.pages:
        page_text = page.extract_text() or ""
        if page_text.strip():
          plumber_chunks.append(page_text)
      plumber_text = "\n".join(plumber_chunks).strip()
      if plumber_text:
        notes.append("pdfplumber")
      if len(plumber_text) > len(combined):
        combined = plumber_text
  except Exception:
    notes.append("pdfplumber_failed")

  return combined, ",".join(notes)


def _extract_investor(lines: List[str]) -> Dict[str, Optional[str]]:
  joined = "\n".join(lines[:120])
  name: Optional[str] = None
  pan = None
  email = None
  mobile = None

  for line in lines[:120]:
    lower = line.lower()
    if not name and lower.startswith("name"):
      parts = re.split(r"[:\-]", line, maxsplit=1)
      if len(parts) == 2:
        candidate = parts[1].strip()
        if candidate and len(candidate) >= 3 and not any(ch.isdigit() for ch in candidate):
          name = candidate[:100]

    if not pan:
      match = PAN_PATTERN.search(line.upper())
      if match:
        pan = match.group(0)
    if not email:
      match = EMAIL_PATTERN.search(line)
      if match:
        email = match.group(0)
    if not mobile:
      match = MOBILE_PATTERN.search(line.replace(" ", "").replace("-", ""))
      if match:
        mobile = re.sub(r"\D", "", match.group(0))[-10:]

  if not pan:
    pan_match = PAN_PATTERN.search(joined.upper())
    pan = pan_match.group(0) if pan_match else None
  if not email:
    email_match = EMAIL_PATTERN.search(joined)
    email = email_match.group(0) if email_match else None
  if not name:
    for line in lines[:40]:
      if EMAIL_PATTERN.search(line) or MOBILE_PATTERN.search(line):
        continue
      clean = line.strip()
      if len(clean) < 3 or len(clean) > 80:
        continue
      # Typical investor name line in CAS headers is uppercase words without punctuation.
      if clean.replace(" ", "").isalpha() and clean.upper() == clean:
        name = clean.title()
        break

  return {"name": name, "pan": pan, "email": email, "mobile": mobile}


def _extract_statement_date(lines: List[str]) -> Optional[str]:
  for line in lines[:150]:
    match = DATE_ON_PATTERN.search(line)
    if match:
      normalized = _normalize_date(match.group(1))
      if normalized:
        return normalized
  for line in lines:
    match = LINE_DATE_PATTERN.search(line)
    if not match:
      continue
    normalized = _normalize_date(match.group(0))
    if normalized:
      return normalized
  return None


def _looks_like_amc(line: str) -> bool:
  lower = line.lower()
  return (
    "mutual fund" in lower
    or "asset management" in lower
    or lower.endswith("amc")
    or "investment managers" in lower
  )


def _extract_numeric_values(line: str) -> List[float]:
  values: List[float] = []
  for token in NUM_PATTERN.findall(line):
    number = _safe_float(token)
    if number is None:
      continue
    values.append(number)
  return values


def _infer_scheme_metrics(numbers: List[float]) -> Tuple[Optional[float], Optional[float], Optional[float], Optional[float]]:
  if len(numbers) < 3:
    return None, None, None, None

  units = numbers[-3]
  nav = numbers[-2]
  value = numbers[-1]
  invested = numbers[-4] if len(numbers) >= 4 else None

  if value and nav and units:
    relative_error = abs((units * nav) - value) / max(abs(value), 1.0)
    if relative_error > 0.4 and len(numbers) >= 4:
      alt_units = numbers[-4]
      alt_nav = numbers[-3]
      alt_value = numbers[-2]
      alt_error = abs((alt_units * alt_nav) - alt_value) / max(abs(alt_value), 1.0)
      if alt_error < relative_error:
        units = alt_units
        nav = alt_nav
        value = alt_value
        invested = numbers[-1]

  if units is not None and units < 0:
    units = None
  if nav is not None and nav <= 0:
    nav = None
  if value is not None and value <= 0:
    value = None
  if invested is not None and invested <= 0:
    invested = None

  return units, nav, value, invested


def _is_invalid_scheme_line(line: str) -> bool:
  lower = line.lower()
  if len(line) < 12:
    return True
  if any(token in lower for token in IGNORE_LINE_TOKENS):
    return True
  return False


def _parse_cams_compact_rows(lines: List[str], statement_date: Optional[str]) -> List[Dict[str, Any]]:
  """Parse CAMS compact table format where each holding spans 2 lines.

  Example:
  91082787024/0 62,231.73 128TSDGG - Axis ELSS Tax Saver Fund - Direct Growth
  582.531 22-Apr-2026 106.8299 KFINTECHINF846K01EW2 37,000.000
  """
  rows: List[Dict[str, Any]] = []

  i = 0
  while i < len(lines):
    header_line = lines[i]
    if "total " in header_line.lower():
      break

    m = INLINE_FOLIO_ROW_PATTERN.match(header_line)
    if not m:
      i += 1
      continue

    folio = m.group(1).strip()
    remainder = m.group(2).strip()
    market_value: Optional[float] = None
    scheme_head = remainder

    # Prefer amount with two decimals; CAMS rows often glue product code right after amount.
    exact_value_match = re.match(r"^([0-9,]+\.\d{2})(.*)$", remainder)
    if exact_value_match:
      market_value = _safe_float(exact_value_match.group(1))
      scheme_head = exact_value_match.group(2).strip()
    else:
      generic_value_match = re.match(r"^([0-9,]+\.\d+)\s+(.*)$", remainder)
      if generic_value_match:
        market_value = _safe_float(generic_value_match.group(1))
        scheme_head = generic_value_match.group(2).strip()

    scheme_parts = [scheme_head] if scheme_head else []

    metric_idx: Optional[int] = None
    for j in range(i + 1, min(i + 6, len(lines))):
      candidate = lines[j]
      if LINE_DATE_PATTERN.search(candidate):
        metric_idx = j
        break
      if "total " in candidate.lower():
        break
      scheme_parts.append(candidate)

    if metric_idx is None:
      i += 1
      continue

    metric_line = lines[metric_idx]
    scheme_blob = " ".join(part for part in scheme_parts if part).strip()
    if not folio or not scheme_blob:
      i = metric_idx + 1
      continue

    # Strip short product code prefix like "128TSDGG - ".
    if " - " in scheme_blob:
      left, right = scheme_blob.split(" - ", 1)
      scheme_name = right.strip() if re.match(r"^[A-Z0-9]{4,}$", left.strip()) else scheme_blob
    else:
      scheme_name = scheme_blob

    isin_match = ISIN_PATTERN.search(metric_line.upper())
    isin = isin_match.group(0).upper() if isin_match else None

    units_match = re.match(r"^\s*([0-9,]+\.\d+)", metric_line)
    units = _safe_float(units_match.group(1)) if units_match else None

    line_date_match = LINE_DATE_PATTERN.search(metric_line)
    nav = None
    if line_date_match:
      nav_slice = metric_line[line_date_match.end():]
      nav_match = re.search(r"([0-9,]+\.\d+)", nav_slice)
      nav = _safe_float(nav_match.group(1)) if nav_match else None

    invested_matches = re.findall(r"([0-9,]+\.\d+)", metric_line)
    invested_value = _safe_float(invested_matches[-1]) if invested_matches else None

    as_of = _normalize_date(line_date_match.group(0)) if line_date_match else statement_date
    if not as_of:
      as_of = statement_date

    if units is None and market_value is None:
      i = metric_idx + 1
      continue

    rows.append(
      {
        "folio_number": folio,
        "amc": None,
        "schemes": [
          {
            "name": scheme_name[:200],
            "isin": isin,
            "units": units,
            "nav": nav,
            "value": market_value,
            "invested_value": invested_value,
            "as_of": as_of,
          }
        ],
      }
    )
    i = metric_idx + 1

  return rows


def _parse_from_text(text: str) -> Dict[str, Any]:
  lines = [re.sub(r"\s+", " ", ln).strip() for ln in text.splitlines()]
  lines = [ln for ln in lines if ln]

  investor = _extract_investor(lines)
  statement_date = _extract_statement_date(lines)

  folio_map: Dict[str, Dict[str, Any]] = {}
  current_folio = "UNKNOWN"
  current_amc: Optional[str] = None
  folio_order: List[str] = []

  def ensure_folio(folio_number: str, amc: Optional[str]) -> Dict[str, Any]:
    number = folio_number or "UNKNOWN"
    if number not in folio_map:
      folio_map[number] = {
        "folio_number": number,
        "amc": amc,
        "schemes": [],
        "_scheme_keys": set(),
      }
      folio_order.append(number)
    elif amc and not folio_map[number].get("amc"):
      folio_map[number]["amc"] = amc
    return folio_map[number]

  ensure_folio(current_folio, None)

  for line in lines:
    try:
      if _looks_like_amc(line):
        current_amc = line[:120]
        ensure_folio(current_folio, current_amc)
        continue

      folio_match = FOLIO_PATTERN.search(line)
      if folio_match:
        current_folio = folio_match.group(1).strip().rstrip(".")
        ensure_folio(current_folio, current_amc)
        continue

      isin_match = ISIN_PATTERN.search(line)
      if not isin_match:
        continue
      if _is_invalid_scheme_line(line):
        continue

      numbers = _extract_numeric_values(line)
      units, nav, value, invested = _infer_scheme_metrics(numbers)
      if value is None and units is None and nav is None:
        continue

      isin = isin_match.group(0).upper()
      name_part = line[: isin_match.start()].strip(" -:|")
      if not name_part or len(name_part) < 3:
        continue

      folio = ensure_folio(current_folio, current_amc)
      scheme_key = f"{name_part.lower()}::{isin}"
      if scheme_key in folio["_scheme_keys"]:
        continue

      folio["schemes"].append(
        {
          "name": name_part[:200],
          "isin": isin,
          "units": units,
          "nav": nav,
          "value": value,
          "invested_value": invested,
          "as_of": statement_date,
        }
      )
      folio["_scheme_keys"].add(scheme_key)
    except Exception:
      continue

  mutual_funds: List[Dict[str, Any]] = []
  total_value = 0.0

  for folio_number in folio_order:
    folio = folio_map[folio_number]
    schemes = folio["schemes"]
    if not schemes:
      continue
    for scheme in schemes:
      if isinstance(scheme.get("value"), (int, float)):
        total_value += float(scheme["value"])
    mutual_funds.append(
      {
        "folio_number": folio["folio_number"],
        "amc": _safe_str(folio.get("amc")),
        "schemes": schemes,
      }
    )

  # Prefer compact CAMS parsing when it yields richer structure than generic extraction.
  compact_rows = _parse_cams_compact_rows(lines, statement_date)
  generic_scheme_count = sum(len(f.get("schemes", [])) for f in mutual_funds)
  compact_scheme_count = sum(len(f.get("schemes", [])) for f in compact_rows)
  generic_folio_count = len(mutual_funds)
  compact_folio_count = len(compact_rows)
  should_use_compact = (
    compact_scheme_count > generic_scheme_count
    or (
      compact_scheme_count == generic_scheme_count
      and compact_folio_count > generic_folio_count
    )
  )
  if should_use_compact:
    mutual_funds = compact_rows
    total_value = 0.0
    for folio in mutual_funds:
      for scheme in folio.get("schemes", []):
        if isinstance(scheme.get("value"), (int, float)):
          total_value += float(scheme["value"])

  return {
    "meta": {
      "cas_type": "Consolidated Account Statement",
      "parser": "nexus_deterministic_v1",
    },
    "investor": investor,
    "summary": {
      "total_value": round(total_value, 2),
      "folio_count": len(mutual_funds),
      "scheme_count": sum(len(f["schemes"]) for f in mutual_funds),
      "as_of": statement_date,
    },
    "mutual_funds": mutual_funds,
  }


@app.post("/v1/smart/parse")
async def smart_parse(
  pdf_file: UploadFile = File(...),
  password: str = Form(""),
) -> Dict[str, Any]:
  content_type = pdf_file.content_type or ""
  if "pdf" not in content_type and not (pdf_file.filename or "").lower().endswith(".pdf"):
    return JSONResponse(status_code=400, content={"error": "Please upload a PDF file."})

  raw = await pdf_file.read()
  if not raw:
    return JSONResponse(status_code=400, content={"error": "Empty file."})

  text, extraction_path = _extract_pdf_text(raw, password)
  if not text.strip():
    if "invalid_password" in extraction_path:
      return JSONResponse(
        status_code=400,
        content={"error": "Invalid PDF password. Please provide the correct CAS password/PAN.", "meta": {"extractor": extraction_path}},
      )
    return JSONResponse(
      status_code=400,
      content={"error": "Unable to extract readable text from PDF.", "meta": {"extractor": extraction_path}},
    )

  try:
    result = _parse_from_text(text)
    result["meta"]["extractor"] = extraction_path
    return result
  except Exception:
    return JSONResponse(status_code=400, content={"error": "CAS parse failed"})
