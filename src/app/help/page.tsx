import type { Metadata } from "next";
import HelpGuide from "./HelpGuide";

export const metadata: Metadata = {
  title: "Project Guide | Clinical Placements Database",
  description:
    "Learn how to use the Clinical Placements Database, where its data came from, and how the project works.",
};

export default function HelpPage() {
  return <HelpGuide />;
}
