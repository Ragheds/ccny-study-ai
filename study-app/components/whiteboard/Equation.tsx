"use client";
import katex from "katex";
import "katex/dist/katex.min.css";
export default function Equation({ latex }: { latex: string }) {
  let html: string;
  try {
    html = katex.renderToString(latex, {
      throwOnError: true,
      trust: false,
      strict: "error",
      maxExpand: 100,
      maxSize: 10,
      output: "htmlAndMathml",
    });
  } catch {
    return <p>{latex}</p>;
  }
  return (
    <div
      className="overflow-x-auto py-2"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
