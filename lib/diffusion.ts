/**
 * Diffussed messages: detect @diffussion-photo and @diffussion-video tags.
 * These tag the AI for image/video generation. The prompt is the message with tags removed.
 */

export const DIFFUSSION_PHOTO = "@diffussion-photo";
export const DIFFUSSION_VIDEO = "@diffussion-video";

export type DiffusionType = "photo" | "video" | null;

export function parseDiffussedMessage(text: string): {
  isDiffussed: boolean;
  type: DiffusionType;
  prompt: string;
  displayText: string;
} {
  const trimmed = text.trim();
  const hasPhoto = trimmed.includes(DIFFUSSION_PHOTO);
  const hasVideo = trimmed.includes(DIFFUSSION_VIDEO);

  if (!hasPhoto && !hasVideo) {
    return {
      isDiffussed: false,
      type: null,
      prompt: trimmed,
      displayText: trimmed,
    };
  }

  // Photo takes precedence if both are present
  const type: DiffusionType = hasPhoto ? "photo" : "video";
  const tag = type === "photo" ? DIFFUSSION_PHOTO : DIFFUSSION_VIDEO;

  // Prompt = full text with the tag removed (user can write naturally: "A sunset @diffussion-photo")
  const prompt = trimmed.replace(new RegExp(`\\s*${tag.replace("@", "\\@")}\\s*`, "gi"), " ").trim();
  const displayText = trimmed; // Keep full text for display (including tag)

  return {
    isDiffussed: true,
    type,
    prompt: prompt || "Create an image", // Fallback if user only typed the tag
    displayText,
  };
}
