## TEST AGENT PROMPT – IMAGE INTEGRATION RULES ##
- Always use base64-encoded images (JPEG, PNG, WEBP).
- Do not use SVG, BMP, HEIC, blank/solid-color images.
- Ensure real visual features (objects, edges, textures).
- Transcode to PNG/JPEG if MIME mismatches.
- For animated formats, extract first frame only.
- Resize very large images.
