import { NextResponse } from "next/server";
import sharp from "sharp";
import JSZip from "jszip";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type Background = "transparent" | "white" | "dark";

function getBackground(value: FormDataEntryValue | null): Background {
  if (value === "white" || value === "dark") return value;
  return "transparent";
}

function getPadding(value: FormDataEntryValue | null): number {
  const parsed = Number(value ?? 15);
  return Number.isFinite(parsed) ? Math.min(35, Math.max(0, parsed)) : 15;
}

function safeFilename(name: string): string {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 50) || "logo"
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please upload a logo." },
        { status: 400 },
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "The image must be between 1 byte and 10 MB." },
        { status: 400 },
      );
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
    ];

    const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);

    if (
      !allowedTypes.includes(file.type) &&
      !/\.(png|jpe?g|webp|svg)$/i.test(file.name)
    ) {
      return NextResponse.json(
        { error: "Use PNG, JPG, WebP, or SVG." },
        { status: 415 },
      );
    }

    const input = Buffer.from(await file.arrayBuffer());

    // Reject SVG files containing scripts or external references.
    if (isSvg) {
      const svg = input.toString("utf8");

      if (
        /<script\b/i.test(svg) ||
        /\bon\w+\s*=/i.test(svg) ||
        /\b(?:href|xlink:href)\s*=\s*["']\s*(?:https?:|\/\/|file:|javascript:)/i.test(
          svg,
        ) ||
        /<!ENTITY\b/i.test(svg)
      ) {
        return NextResponse.json(
          {
            error: "This SVG contains unsupported active or external content.",
          },
          { status: 400 },
        );
      }
    }

    const background = getBackground(formData.get("background"));
    const padding = getPadding(formData.get("padding"));

    const backgroundColor =
      background === "white"
        ? { r: 255, g: 255, b: 255, alpha: 1 }
        : background === "dark"
          ? { r: 23, g: 35, b: 33, alpha: 1 }
          : { r: 0, g: 0, b: 0, alpha: 0 };

    // SVGs are rasterized; other formats are decoded by Sharp.
    const image = sharp(input, {
      limitInputPixels: 40_000_000,
      failOn: "error",
      ...(isSvg ? { density: 300 } : {}),
    }).rotate();

    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return NextResponse.json(
        { error: "Could not read this image." },
        { status: 400 },
      );
    }

    // Create a square master canvas and preserve the logo's aspect ratio.
    const canvasSize = 512;
    const innerSize = Math.max(
      1,
      Math.round(canvasSize * (1 - (padding * 2) / 100)),
    );

    const logoBuffer = await image
      .resize(innerSize, innerSize, { fit: "inside" })
      .png()
      .toBuffer();

    const logoMetadata = await sharp(logoBuffer).metadata();

    if (!logoMetadata.width || !logoMetadata.height) {
      return NextResponse.json(
        { error: "Could not process this logo." },
        { status: 400 },
      );
    }

    const master = await sharp({
      create: {
        width: canvasSize,
        height: canvasSize,
        channels: 4,
        background: backgroundColor,
      },
    })
      .composite([
        {
          input: logoBuffer,
          left: Math.floor((canvasSize - logoMetadata.width) / 2),
          top: Math.floor((canvasSize - logoMetadata.height) / 2),
        },
      ])
      .png()
      .toBuffer();

    const zip = new JSZip();
    const outputFiles = [
      { name: "favicon-16x16.png", size: 16 },
      { name: "favicon-32x32.png", size: 32 },
      { name: "favicon-48x48.png", size: 48 },
      { name: "apple-touch-icon.png", size: 180 },
      { name: "icon-192.png", size: 192 },
      { name: "icon-512.png", size: 512 },
    ];

    for (const asset of outputFiles) {
      const buffer = await sharp(master)
        .resize(asset.size, asset.size)
        .png()
        .toBuffer();

      zip.file(asset.name, buffer);
    }

    const manifest = {
      name: "My Website",
      short_name: "My Website",
      start_url: "/",
      display: "standalone",
      background_color: background === "dark" ? "#172321" : "#ffffff",
      theme_color: background === "dark" ? "#172321" : "#ffffff",
      icons: [
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    };

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    zip.file(
      "README.md",
      `# AssetKit export

Generated website assets.

## Files
- favicon-16x16.png
- favicon-32x32.png
- favicon-48x48.png
- apple-touch-icon.png
- icon-192.png
- icon-512.png
- manifest.json

## Next.js App Router
Place your icon files in the app/ directory or public/ directory.
Place manifest.json in public/manifest.json and reference it
in your Next.js metadata configuration.

Review the manifest name and colors before deploying.
`,
    );

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeFilename(file.name)}-asset-pack.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("AssetKit generation error:", error);

    return NextResponse.json(
      { error: "Asset generation failed. Please try another image." },
      { status: 500 },
    );
  }
}
