import type { Metadata } from "next";
import { IdeaValidator } from "./IdeaValidator";

export const metadata: Metadata = { title: "Fikir Doğrulayıcı" };

export default function IdeaValidatorPage() {
  return <IdeaValidator />;
}
