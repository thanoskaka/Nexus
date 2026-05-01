# CAS Parser Service

Self-hosted FastAPI service for deterministic parsing of CAS PDFs without `casparser`.

## Endpoints

- `GET /health` -> `{ "status": "ok" }`
- `POST /v1/smart/parse` -> multipart form:
  - `pdf_file` (required): CAS PDF file
  - `password` (optional): PDF password for encrypted files (returns explicit invalid-password error when incorrect)

## Deterministic Parser Assumptions

- Input is text-based or OCR-readable CAS PDF.
- Investor fields are extracted from top sections using regex:
  - PAN, email, mobile, and name labels.
- Folios are detected from lines containing `Folio`, `Folio No`, `Folio Number`, etc.
- AMC context is inferred from lines containing terms like `Mutual Fund`, `Asset Management`, or `AMC`.
- Scheme rows are detected only when line contains:
  - a valid ISIN-like token (`INF...` / `INE...`)
  - sufficient numeric values for units/nav/value inference.
- Metrics (`units`, `nav`, `value`, `invested_value`) are inferred from trailing numeric tokens with deterministic fallback checks.

## Confidence and Fault Tolerance Behavior

- Parser skips noisy/invalid lines (headers, contact lines, transaction text, malformed rows).
- Duplicate scheme entries in same folio are ignored.
- Individual malformed lines never crash full parsing.
- If text extraction fails, API returns `400` with clear error.

## Known Limits

- Complex tabular layouts may produce partial extraction.
- Scanned PDFs without readable text can fail unless extraction backend can recover text.
- Scheme metric inference is heuristic and may be imperfect for non-standard statement formats.
- Date inference favors first valid statement-like date in document.

## Local Run

```bash
cd services/casparser-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

Example request:

```bash
curl -X POST "http://localhost:8000/v1/smart/parse" \
  -F "pdf_file=@/absolute/path/to/CAS.pdf" \
  -F "password="
```
