"""Fill the website's placeholders in place.

Usage:
  python scripts/fill-website.py --developer "Your Name or Company" \
      --email support@example.com --law "Ireland"

Any subset of the options can be given. Replaces __DEVELOPER_NAME__, __CONTACT_EMAIL__ and __GOVERNING_LAW__ in every
website/*.html file. The Pages workflow refuses to deploy until this is done.
"""
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "website"

parser = argparse.ArgumentParser()
parser.add_argument("--developer")
parser.add_argument("--email")
parser.add_argument("--law", help='e.g. "Bangladesh" or "England and Wales"')
args = parser.parse_args()

tokens = {
    k: v
    for k, v in {"__DEVELOPER_NAME__": args.developer, "__CONTACT_EMAIL__": args.email, "__GOVERNING_LAW__": args.law}.items()
    if v
}
for page in sorted(ROOT.glob("*.html")):
    text = page.read_text(encoding="utf-8")
    new = text
    for token, value in tokens.items():
        new = new.replace(token, value)
    if new != text:
        page.write_text(new, encoding="utf-8")
        print("filled", page.name)
