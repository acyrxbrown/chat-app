import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const IMAGE_MODEL = "imagen-3.0-generate-002";
const IMAGE_MODEL_FALLBACK = "imagen-4.0-generate-001";
const VIDEO_MODEL = "veo-2.0-generate-001";

export async function POST(request: Request) {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY for diffusion" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { prompt, type } = body as { prompt: string; type: "photo" | "video" };

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "prompt (string) is required" },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    if (type === "photo") {
      let response;
      try {
        response = await ai.models.generateImages({
          model: IMAGE_MODEL_FALLBACK,
          prompt: prompt.trim(),
          config: { numberOfImages: 1 },
        });
      } catch {
        try {
          response = await ai.models.generateImages({
            model: IMAGE_MODEL,
            prompt: prompt.trim(),
            config: { numberOfImages: 1 },
          });
        } catch (e) {
          console.error("Image generation failed:", e);
          return NextResponse.json(
            { error: "Image generation failed. Imagen may require Vertex AI or a paid plan." },
            { status: 502 }
          );
        }
      }

      const imageBytes = response?.generatedImages?.[0]?.image?.imageBytes;
      if (!imageBytes) {
        return NextResponse.json(
          { error: "No image in response" },
          { status: 502 }
        );
      }

      const base64 = typeof imageBytes === "string" ? imageBytes : Buffer.from(imageBytes).toString("base64");

      return NextResponse.json({
        type: "photo",
        imageBase64: base64,
        text: `Generated image: "${prompt.slice(0, 50)}${prompt.length > 50 ? "…" : ""}"`,
      });
    }

    if (type === "video") {
      try {
        const operation = await ai.models.generateVideos({
          model: VIDEO_MODEL,
          source: { prompt: prompt.trim() },
          config: { numberOfVideos: 1 },
        });

        const ops = (ai as unknown as { operations?: { getVideosOperation?: (p: { operation: unknown }) => Promise<unknown> } }).operations;
        const getOp = ops?.getVideosOperation?.bind(ops);

        let op = operation as { done?: boolean; response?: { generatedVideos?: { video?: { uri?: string } }[] } };
        for (let i = 0; i < 60 && getOp && !op?.done; i++) {
          await new Promise((r) => setTimeout(r, 5000));
          op = (await getOp({ operation: op })) as typeof op;
        }

        const videoUri = op?.response?.generatedVideos?.[0]?.video?.uri;
        if (videoUri) {
          return NextResponse.json({
            type: "video",
            videoUri,
            text: `Generated video: "${prompt.slice(0, 50)}${prompt.length > 50 ? "…" : ""}"`,
          });
        }

        return NextResponse.json(
          { error: "Video generation timed out or requires Vertex AI. Try @diffussion-photo for images." },
          { status: 502 }
        );
      } catch (e) {
        console.error("Video generation failed:", e);
        return NextResponse.json(
          { error: "Video generation requires Vertex AI or Veo access. Try @diffussion-photo for images." },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (e) {
    console.error("Diffusion API error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Diffusion failed" },
      { status: 500 }
    );
  }
}
