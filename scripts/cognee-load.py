"""Load Pantry's event memory into Cognee Cloud, then ask it questions.

  COGNEE_SERVICE_URL=... COGNEE_API_KEY=... python scripts/cognee-load.py load
  COGNEE_SERVICE_URL=... COGNEE_API_KEY=... python scripts/cognee-load.py ask "Which caterer billed more than it quoted?"

COGNEE_SERVICE_URL is the API Base URL from Cognee Cloud's API Keys page (https://tenant-<uuid>.aws.cognee.ai),
and COGNEE_API_KEY is a key from the same page. Graph building runs on the Cognee tenant, on its credits.
Documents come from scripts/cognee-docs.js: aggregate counts and documents only, no guest names or emails.
"""
import asyncio
import os
import pathlib
import sys

import cognee

DATASET = "pantry-events"
DOCS = pathlib.Path(__file__).resolve().parent.parent / "data" / "events" / "cognee"


async def connect():
    url, key = os.environ.get("COGNEE_SERVICE_URL"), os.environ.get("COGNEE_API_KEY")
    if not url or not key:
        sys.exit("Set COGNEE_SERVICE_URL and COGNEE_API_KEY (from Cognee Cloud → API Keys).")
    await cognee.serve(url=url, api_key=key)


async def load():
    files = sorted(DOCS.glob("*.md"))
    if not files:
        sys.exit("No documents. Run: node scripts/cognee-docs.js")
    texts = [f.read_text() for f in files]
    result = await cognee.remember(texts, dataset_name=DATASET)
    print(f"Sent {len(texts)} documents to dataset {DATASET}: {getattr(result, 'status', result)}")


async def ask(question):
    for r in await cognee.recall(question, datasets=[DATASET]):
        print(getattr(r, "answer", None) or getattr(r, "text", None) or r)


async def main():
    await connect()
    if sys.argv[1:2] == ["load"]:
        await load()
    elif sys.argv[1:2] == ["ask"] and len(sys.argv) > 2:
        await ask(" ".join(sys.argv[2:]))
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    asyncio.run(main())
