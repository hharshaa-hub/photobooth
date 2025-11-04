# Purikura Photo Booth (Web)

A responsive web app (mobile + desktop) that captures 3 photos with a countdown, lets the user pick a background afterward, composes a kawaii vertical layout, and generates a QR code link for downloading.

## Tech
- Frontend: HTML/CSS/JS (Camera via `getUserMedia`, Canvas for filters/layout, QR via qrcode.js)
- Backend: Flask for receiving final image uploads and serving static files

## Run locally
```bash
cd purikura-photo-booth
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python app.py
```
Open http://localhost:5000

> On mobile devices, camera access requires HTTPS (or `localhost`). Use `ngrok` or similar to expose HTTPS if testing from a phone on the same network.

## How it works
1. **Choose filter** (None / B&W / Sepia / Soft Pink)
2. **Take 3 photos** with a 3-second countdown
3. **Choose a background** or upload your own
4. **Remove plain background** (white/black) using client-side chroma key
5. **Compose final layout** into 1080×1920 canvas
6. **Download** or **Upload** → receive a **QR** for a shareable link

## Notes
- For more robust background removal (hair, shadows), you can add a server-side endpoint using `rembg` and post each captured photo for processing, then compose.
- Add more preset backgrounds by placing images into `static/backgrounds`.
- Tweak layout math in `composeFinal()` to match your exact template.
