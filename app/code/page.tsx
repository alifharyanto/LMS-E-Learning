import type { Metadata } from "next";
import OneCompilerEditor from "@/components/onecompiler-editor";

export const metadata: Metadata = {
	title: "Code Editor",
	description: "Online code editor for Java, HTML, CSS, JavaScript, and more.",
};

export default function CodePage() {
	return <OneCompilerEditor />;
}