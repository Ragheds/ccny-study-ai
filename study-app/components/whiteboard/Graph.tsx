"use client";
import { useId } from "react";
import type { GraphBlock } from "@/lib/whiteboard/schema";
import { sampleFunction } from "@/lib/whiteboard/graphs";
export function Graph({ block }: { block: GraphBlock }) {
  const clip = useId().replaceAll(":", "");
  const [xmin, xmax] = block.xRange,
    [ymin, ymax] = block.yRange;
  const X = (x: number) => 40 + ((x - xmin) / (xmax - xmin)) * 280;
  const Y = (y: number) => 240 - ((y - ymin) / (ymax - ymin)) * 210;
  const colors = ["#2563eb", "#dc2626", "#059669", "#9333ea", "#d97706"];
  const ticks = Array.from({ length: 6 }, (_, i) => i);
  const invalid: string[] = [];
  const plots = block.plots.map((plot, index) => {
    const stroke = colors[index];
    if (plot.kind === "function") {
      try {
        return (
          <g key={index}>
            {sampleFunction(plot.expr, block.xRange, block.yRange).map(
              (segment, i) => (
                <path
                  key={i}
                  d={segment
                    .map(
                      ([x, y], n) =>
                        `${n ? "L" : "M"}${X(x).toFixed(2)},${Y(y).toFixed(2)}`,
                    )
                    .join(" ")}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={2.5}
                />
              ),
            )}
          </g>
        );
      } catch {
        invalid.push(plot.expr);
        return null;
      }
    }
    if (plot.kind === "points")
      return (
        <g key={index}>
          {plot.pts.map(([x, y], i) => (
            <circle key={i} cx={X(x)} cy={Y(y)} r={4} fill={stroke} />
          ))}
        </g>
      );
    return plot.kind === "vline" ? (
      <line
        key={index}
        x1={X(plot.at)}
        x2={X(plot.at)}
        y1={30}
        y2={240}
        stroke={stroke}
        strokeWidth={2}
      />
    ) : (
      <line
        key={index}
        x1={40}
        x2={320}
        y1={Y(plot.at)}
        y2={Y(plot.at)}
        stroke={stroke}
        strokeWidth={2}
      />
    );
  });
  return (
    <figure>
      <svg
        viewBox="0 0 360 280"
        role="img"
        aria-label={`Graph. x from ${xmin} to ${xmax}; y from ${ymin} to ${ymax}`}
        className="w-full rounded-xl bg-white text-slate-800"
      >
        <defs>
          <clipPath id={clip}>
            <rect x={40} y={30} width={280} height={210} />
          </clipPath>
        </defs>
        {ticks.map((i) => (
          <g key={i} stroke="#cbd5e1" strokeWidth={0.6}>
            <line x1={40 + i * 56} x2={40 + i * 56} y1={30} y2={240} />
            <line x1={40} x2={320} y1={30 + i * 42} y2={30 + i * 42} />
            <text
              x={40 + i * 56}
              y={256}
              textAnchor="middle"
              fill="currentColor"
              stroke="none"
              fontSize={10}
            >
              {Number((xmin + ((xmax - xmin) * i) / 5).toFixed(2))}
            </text>
            <text
              x={34}
              y={244 - i * 42}
              textAnchor="end"
              fill="currentColor"
              stroke="none"
              fontSize={10}
            >
              {Number((ymin + ((ymax - ymin) * i) / 5).toFixed(2))}
            </text>
          </g>
        ))}
        {xmin <= 0 && xmax >= 0 && (
          <line x1={X(0)} x2={X(0)} y1={30} y2={240} stroke="#334155" />
        )}
        {ymin <= 0 && ymax >= 0 && (
          <line x1={40} x2={320} y1={Y(0)} y2={Y(0)} stroke="#334155" />
        )}
        <text x={328} y={256} fontSize={12}>
          x
        </text>
        <text x={22} y={20} fontSize={12}>
          y
        </text>
        <g
          clipPath={`url(#${clip})`}
          className={block.reveal === "axes-then-plots" ? "board-plots" : ""}
        >
          {plots}
          {block.highlight?.map((point, i) => (
            <g key={i}>
              <circle cx={X(point.x)} cy={Y(point.y)} r={5} fill="#b45309" />
              <text
                x={X(point.x) + 8}
                y={Y(point.y) - 8}
                fontSize={11}
                fill="#1e293b"
              >
                {point.label ?? `(${point.x}, ${point.y})`}
              </text>
            </g>
          ))}
        </g>
      </svg>
      <figcaption className="text-sm">
        {block.plots.map((plot, i) => (
          <span key={i} className="mr-3" style={{ color: colors[i] }}>
            {("label" in plot && plot.label) ||
              ("expr" in plot ? `y = ${plot.expr}` : plot.kind)}
          </span>
        ))}
        {invalid.length > 0 && (
          <p>
            Could not plot {invalid.join(", ")}. Use the point values or text
            explanation.
          </p>
        )}
      </figcaption>
    </figure>
  );
}
