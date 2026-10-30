# Asset generator guide

## Purpose

The asset generator is a utility API for converting a logo or image into a ZIP package of browser-ready icon files.

## Route

- /api/generate

## Supported inputs

- PNG
- JPG / JPEG
- WebP
- SVG

## Security checks

The route validates more than just MIME type. It also rejects unsafe SVG content, including:

- script tags
- inline event handlers
- external URL references
- unsupported SVG XML features

This helps keep the export experience safer when processing uploaded files.

## Output

The generated Zip includes:

- favicon-16x16.png
- favicon-32x32.png
- favicon-48x48.png
- apple-touch-icon.png
- icon-192.png
- icon-512.png
- manifest.json
- README.md

## Processing details

The flow is:

1. accept form upload
2. validate file size and file type
3. detect SVG-specific risk
4. decode and/or rasterize image
5. place logo onto a square canvas with padding
6. generate multiple icon sizes
7. create manifest metadata
8. return ZIP response

## Example usage

A front-end form can send a file under the field name file, along with optional values for background and padding. The API then returns the ZIP package, which the browser can download directly.

## Practical use

This endpoint is best used when preparing a basic icon set for a website or small app launch. It is not a full brand asset pipeline, but it is a strong utility for rapid iteration.

## Notes

The logic is intentionally lightweight and self-contained, making it easy to extend or replace with a more advanced asset pipeline later.
