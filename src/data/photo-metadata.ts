export type PhotoMetadata = {
  date: string;
  time: string;
  location: string;
};

export const photoMetadata: Record<string, PhotoMetadata> = {
  /*
    Add your real image metadata here.

    Example:
    "/images/stories/featured/image.png": {
      date: "14 OCT 2026",
      time: "16:42",
      location: "JOHANNESBURG, ZA",
    },
  */
};

const FALLBACK_METADATA: PhotoMetadata = {
  date: "DATE TBD",
  time: "--:--",
  location: "LOCATION TBD",
};

export function getPhotoMetadata(src: string): PhotoMetadata {
  return photoMetadata[src] ?? FALLBACK_METADATA;
}
