export type PhotoMetadata = {
  date: string;
  time: string;
  location: string;
};

type PhotoLike = {
  src?: string;
  image?: string;
  slug?: string;
  date?: string;
  time?: string;
  location?: string;
};

const PLACEHOLDER_LOCATIONS = [
  "Johannesburg, Braamfontein",
  "Pretoria, Sunnyside",
  "Pretoria, Central",
  "Giyani, Limpopo",
  "Johannesburg, CBD",
];

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

/**
 * Later, when you have real data,
 * add exact per-image overrides here.
 *
 * Example:
 * "/images/stories/featured/R1-09144-0000.JPG": {
 *   date: "14 FEB 2025",
 *   time: "16:24",
 *   location: "Johannesburg, Braamfontein",
 * }
 */
const MANUAL_OVERRIDES: Record<string, Partial<PhotoMetadata>> = {};

function getPhotoKey(photo: PhotoLike | string): string {
  if (typeof photo === "string") return photo;

  return (
    photo.src ||
    photo.image ||
    photo.slug ||
    JSON.stringify(photo)
  );
}

function hashString(value: string): number {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS[date.getMonth()];
  const year = String(date.getFullYear());

  return `${day} ${month} ${year}`;
}

function buildPlaceholderDate(seed: number): string {
  // Date range roughly across 2023–2025
  const base = new Date(2023, 0, 8);
  const offsetDays = seed % 760;

  const date = new Date(base);
  date.setDate(base.getDate() + offsetDays);

  return formatDate(date);
}

function buildPlaceholderTime(seed: number): string {
  // Times mostly between 08:00 and 19:59
  const hour = 8 + (seed % 12);
  const minute = (seed * 7) % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function buildPlaceholderLocation(seed: number): string {
  return PLACEHOLDER_LOCATIONS[
    seed % PLACEHOLDER_LOCATIONS.length
  ];
}

export function getPhotoMetadata(
  photo: PhotoLike | string
): PhotoMetadata {
  const key = getPhotoKey(photo);
  const seed = hashString(key);

  const explicit =
    typeof photo === "string"
      ? {}
      : {
          date: photo.date,
          time: photo.time,
          location: photo.location,
        };

  const override = MANUAL_OVERRIDES[key] ?? {};

  return {
    date:
      override.date ||
      explicit.date ||
      buildPlaceholderDate(seed),
    time:
      override.time ||
      explicit.time ||
      buildPlaceholderTime(seed),
    location:
      override.location ||
      explicit.location ||
      buildPlaceholderLocation(seed),
  };
}
