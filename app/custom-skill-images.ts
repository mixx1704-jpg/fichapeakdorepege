export const CUSTOM_SKILL_IMAGE_LIMIT = 160000;
export const CUSTOM_SKILL_IMAGE_FILE_LIMIT = 20 * 1024 * 1024;
export const CUSTOM_SKILL_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];

/** Only raster images and web addresses are persisted with authorial skills. */
export function normalizeCustomSkillImage(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const image = value.trim();
  if (!image) return undefined;
  if (/^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[a-z0-9+/]+=*$/i.test(image)) {
    return image.length <= CUSTOM_SKILL_IMAGE_LIMIT ? image : undefined;
  }
  if (image.length > 2048) return undefined;
  try {
    const url = new URL(image);
    return ["https:", "http:"].includes(url.protocol) ? image : undefined;
  } catch {
    return undefined;
  }
}

export function customSkillImageFileError(file: { type: string; size: number }): string {
  if (!CUSTOM_SKILL_IMAGE_TYPES.includes(file.type)) return "Selecione uma imagem JPG, PNG, WebP, GIF ou AVIF.";
  if (file.size > CUSTOM_SKILL_IMAGE_FILE_LIMIT) return "A imagem deve ter no máximo 20 MB.";
  return "";
}

export async function prepareCustomSkillImage(file: File): Promise<string> {
  const fileError = customSkillImageFileError(file);
  if (fileError) throw new Error(fileError);
  const objectUrl = URL.createObjectURL(file);
  try {
    const picture = new Image();
    await new Promise<void>((resolve, reject) => {
      picture.onload = () => resolve();
      picture.onerror = () => reject(new Error("Não foi possível ler essa imagem."));
      picture.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    let size = 640;
    for (let attempt = 0; attempt < 5; attempt++) {
      const scale = Math.min(1, size / Math.max(picture.naturalWidth, picture.naturalHeight));
      canvas.width = Math.max(1, Math.round(picture.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(picture.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("O navegador não conseguiu preparar a imagem.");
      context.drawImage(picture, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL("image/webp", .82 - attempt * .08);
      if (normalizeCustomSkillImage(image)) return image;
      size = Math.round(size * .75);
    }
    throw new Error("Use uma imagem menor para salvar na habilidade.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
