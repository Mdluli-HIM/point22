export type ProjectStory = {
  label: string;
  title: string;
  paragraphs: string[];
  closing: string;
};

export const PROJECT_STORIES: Record<string, ProjectStory> = {
  featured: {
    label: "01 / PROJECT NOTES",
    title: "The Unplanned Hours",
    paragraphs: [
      "It was never supposed to be a photoshoot. Just another afternoon, familiar faces, unfinished conversations, and a camera that happened to be there.",
      "Somewhere between the laughter, the silence, and the occasional flash, ordinary moments became something worth remembering.",
    ],
    closing: "A STUDY OF EVERYDAY LIFE — 2024",
  },

  street: {
    label: "02 / PROJECT NOTES",
    title: "Between the Streets",
    paragraphs: [
      "Every street has its own rhythm. From the morning rush to the quieter hours after sunset, the city is constantly creating stories that nobody planned.",
      "These photographs are fragments of that movement. People passing, places changing, and moments that exist for only a second.",
    ],
    closing: "FRAGMENTS OF THE CITY — 2025",
  },

  portrait: {
    label: "03 / PROJECT NOTES",
    title: "The Way We Are",
    paragraphs: [
      "There is something interesting about the moments when people forget the camera is there.",
      "This series explores the small gestures, expressions, and quiet details that make every person different. Nothing too polished. Nothing too perfect. Just people as they are.",
    ],
    closing: "PORTRAIT STUDIES — 2024",
  },
};

export function getProjectStory(slug: string): ProjectStory {
  return (
    PROJECT_STORIES[slug] ?? {
      label: "PROJECT NOTES",
      title: "An Unfinished Story",
      paragraphs: [
        "A collection of photographs documenting moments, places, and people through a personal perspective.",
      ],
      closing: "POINT22 / VISUAL ARCHIVE",
    }
  );
}
