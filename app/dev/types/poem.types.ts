export type Tononkalo = {
  id: string;
  title: string;
  author: string;
  source: string;
  url: string;

  // afaka vakiana amin'ny navigateur
  access: "online";

  // tsy midika hoe azo adika ao amin'ny app ny texte
  redistribution:
  | "public-domain"
  | "allowed"
  | "link-only"
  | "unknown";
};