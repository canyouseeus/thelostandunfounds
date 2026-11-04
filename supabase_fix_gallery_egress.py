#!/usr/bin/env python3
"""
Fix Supabase cached-egress problem on the SCOT33 project (nonaqhllakrckbtbawrb).

What this script does
---------------------
1. Deletes 6 orphaned 10-11 MB DSCF camera originals from `gallery-photos`
   (frees ~68 MB and stops them being served from cached public URLs).

2. Downloads the 3 cover photos that are actually referenced by
   `photo_libraries.cover_image_url`, resizes each to max 1600 px wide WebP
   at quality 80, and uploads them under a new key.

3. Prints a SQL UPDATE block at the end. Run that block in the Supabase SQL
   editor (or via the MCP) to swap `cover_image_url` over to the new files.
   The old originals are then safe to delete (a final SQL line is included).

Before running
--------------
1. pip install pillow requests
2. Get your project's SERVICE ROLE key from
   https://supabase.com/dashboard/project/nonaqhllakrckbtbawrb/settings/api
3. Export env vars (do NOT commit the key):
       export SUPABASE_URL=https://nonaqhllakrckbtbawrb.supabase.co
       export SUPABASE_SERVICE_ROLE_KEY=eyJ...   # the secret one, not anon
4. python3 supabase_fix_gallery_egress.py

The script is idempotent: re-running it skips files that have already
been resized (it checks for the *_w1600.webp sibling).
"""

import io
import os
import sys
from typing import Iterable

import requests
from PIL import Image

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
BUCKET = "gallery-photos"
MAX_WIDTH = 1600
WEBP_QUALITY = 80

# Hardcoded from the audit so the script is self-contained.
ORPHANS = [
    "covers/1776046802546_DSCF6619.jpeg",
    "covers/1776047070529_DSCF6619.jpeg",
    "covers/1769920523666_DSCF1345.JPG",
    "6d78991a-f350-4221-9fb1-ede0e8a1c552/DSCF0319.JPG",
    "6d78991a-f350-4221-9fb1-ede0e8a1c552/DSCF0318.JPG",
    "6d78991a-f350-4221-9fb1-ede0e8a1c552/DSCF0320.JPG",
]

LIVE_COVERS = [
    "covers/1768620596006_DSCF1391.JPG",
    "covers/1770068827552_DSCF1621.jpeg",
    "covers/1770154223588_DSCF1820.JPG",
]


def storage_url(key: str) -> str:
    return f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{key}"


def public_url(key: str) -> str:
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{key}"


def auth_headers(extra: dict | None = None) -> dict:
    h = {
        "Authorization": f"Bearer {SERVICE_KEY}",
        "apikey": SERVICE_KEY,
    }
    if extra:
        h.update(extra)
    return h


def delete_object(key: str) -> None:
    r = requests.delete(storage_url(key), headers=auth_headers(), timeout=30)
    if r.status_code in (200, 204):
        print(f"  deleted: {key}")
    elif r.status_code == 404:
        print(f"  already gone: {key}")
    else:
        print(f"  FAILED to delete {key}: {r.status_code} {r.text[:200]}")


def file_exists(key: str) -> bool:
    # HEAD on the public URL is cheap and doesn't require auth
    r = requests.head(public_url(key), timeout=15)
    return r.status_code == 200


def download_bytes(key: str) -> bytes:
    r = requests.get(public_url(key), timeout=120)
    r.raise_for_status()
    return r.content


def resize_to_webp(raw: bytes) -> bytes:
    im = Image.open(io.BytesIO(raw))
    # honor EXIF orientation so portraits don't get rotated
    try:
        from PIL import ImageOps
        im = ImageOps.exif_transpose(im)
    except Exception:
        pass
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGB")
    if im.width > MAX_WIDTH:
        new_h = int(im.height * (MAX_WIDTH / im.width))
        im = im.resize((MAX_WIDTH, new_h), Image.LANCZOS)
    out = io.BytesIO()
    im.save(out, format="WEBP", quality=WEBP_QUALITY, method=6)
    return out.getvalue()


def upload_bytes(key: str, data: bytes, content_type: str = "image/webp") -> None:
    r = requests.post(
        storage_url(key),
        headers=auth_headers({
            "Content-Type": content_type,
            "x-upsert": "true",
            "cache-control": "public, max-age=31536000, immutable",
        }),
        data=data,
        timeout=120,
    )
    if r.status_code not in (200, 201):
        raise RuntimeError(f"upload of {key} failed: {r.status_code} {r.text[:300]}")
    print(f"  uploaded: {key}  ({len(data)/1024:.1f} KB)")


def resized_key_for(original_key: str) -> str:
    base = original_key.rsplit(".", 1)[0]
    return f"{base}_w{MAX_WIDTH}.webp"


def step_delete_orphans(keys: Iterable[str]) -> None:
    print("\n== Step 1/3: deleting orphaned originals ==")
    for k in keys:
        delete_object(k)


def step_resize_covers(keys: Iterable[str]) -> list[tuple[str, str]]:
    print("\n== Step 2/3: resizing live covers to WebP ==")
    mapping: list[tuple[str, str]] = []
    for k in keys:
        new_key = resized_key_for(k)
        if file_exists(new_key):
            print(f"  skip (already exists): {new_key}")
            mapping.append((k, new_key))
            continue
        print(f"  processing: {k}")
        raw = download_bytes(k)
        webp = resize_to_webp(raw)
        upload_bytes(new_key, webp)
        mapping.append((k, new_key))
        saved = (len(raw) - len(webp)) / 1024 / 1024
        print(f"    {len(raw)/1024/1024:.1f} MB -> {len(webp)/1024:.1f} KB  (saved {saved:.1f} MB / image)")
    return mapping


def step_print_sql(mapping: list[tuple[str, str]]) -> None:
    print("\n== Step 3/3: SQL to apply after you verify the new images look right ==")
    print("-- Copy and run this in the Supabase SQL editor.")
    print("-- It swaps every cover_image_url to the resized version, then deletes")
    print("-- the original 10+ MB files. Run the UPDATE first, eyeball the site,")
    print("-- then run the DELETE.\n")
    print("BEGIN;\n")
    for old, new in mapping:
        old_url = public_url(old)
        new_url = public_url(new)
        print(f"UPDATE public.photo_libraries")
        print(f"   SET cover_image_url = '{new_url}'")
        print(f" WHERE cover_image_url = '{old_url}';\n")
    print("COMMIT;\n")
    print("-- After confirming covers render correctly on the site, free the originals:")
    print("DELETE FROM storage.objects")
    print(" WHERE bucket_id = 'gallery-photos'")
    print("   AND name IN (")
    for old, _ in mapping:
        print(f"     '{old}',")
    print("   );")


def main() -> None:
    if not SUPABASE_URL or not SERVICE_KEY:
        print("ERROR: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.")
        sys.exit(1)
    if "supabase" not in SUPABASE_URL:
        print(f"ERROR: SUPABASE_URL looks wrong: {SUPABASE_URL!r}")
        sys.exit(1)

    print(f"Project: {SUPABASE_URL}")
    print(f"Bucket:  {BUCKET}")

    step_delete_orphans(ORPHANS)
    mapping = step_resize_covers(LIVE_COVERS)
    step_print_sql(mapping)

    print("\nDone. Bucket should now be ~31 MB -> ~1 MB after you run the final DELETE.")


if __name__ == "__main__":
    main()
