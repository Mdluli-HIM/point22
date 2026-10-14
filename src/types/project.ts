export type ProjectCategory =
  | "photography"
  | "fashion"
  | "clothing"
  | "film"
  | "life";

export type ProjectMedia = {
  src: string;
  type: "image" | "video";
  alt?: string;
  poster?: string;
  width?: number;
  height?: number;
};

export type Project = {
  slug: string;
  title: string;
  category: ProjectCategory;
  year?: number;
  excerpt?: string;
  cover: ProjectMedia;
  gallery: ProjectMedia[];
  credits?: { role: string; name: string }[];
  featured?: boolean;
};
