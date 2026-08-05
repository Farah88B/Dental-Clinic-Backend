# Seed media files (manual)

Place real files here so `npx prisma db seed` can register them in `MediaFile` and serve them at `/uploads/...`.

## Expected filenames (demo patient journey)

| Path | Used for |
|------|----------|
| `xrays/demo-xray-s2.jpg` | Session 2 XRAY |
| `reports/demo-report-s2.pdf` | Session 2 REPORT |
| `other/demo-photo-before.jpg` | Session 2 PHOTO (before) |
| `other/demo-photo-after.jpg` | Session 2 PHOTO (after) |
| `content/demo-content-1.jpg` | First content post image (optional) |

This folder is gitignored except `.gitkeep` files. Seed warns and continues if a file is missing.
