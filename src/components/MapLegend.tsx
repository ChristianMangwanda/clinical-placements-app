"use client";

interface MapLegendProps {
  layer: "pop_change" | "coverage_ratio" | null;
}

interface LegendItem {
  color: string;
  label: string;
}

const popChangeLegend: LegendItem[] = [
  { color: "#1E8449", label: "> +5% (Significant growth)" },
  { color: "#27AE60", label: "+2% to +5%" },
  { color: "#D5F5E3", label: "0% to +2% (Slight growth)" },
  { color: "#FADBD8", label: "-2% to 0% (Slight decline)" },
  { color: "#E74C3C", label: "-5% to -2%" },
  { color: "#C0392B", label: "< -5% (Significant decline)" },
  { color: "#CCCCCC", label: "No data" },
];

const coverageLegend: LegendItem[] = [
  { color: "#27AE60", label: "< 500 (Well-covered)" },
  { color: "#7DCEA0", label: "500 - 1,000" },
  { color: "#F9E79F", label: "1,000 - 2,500 (Moderate)" },
  { color: "#E74C3C", label: "2,500 - 5,000 (Underserved)" },
  { color: "#922B21", label: "> 5,000 (Highly underserved)" },
  { color: "#4A235A", label: "No facilities" },
];

export default function MapLegend({ layer }: MapLegendProps) {
  if (!layer) return null;

  const isPopChange = layer === "pop_change";
  const title = isPopChange ? "Population Change" : "Healthcare Coverage";
  const subtitle = isPopChange ? "(Year-over-year %)" : "(People per facility)";
  const items = isPopChange ? popChangeLegend : coverageLegend;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "20px",
        left: "10px",
        zIndex: 1000,
        backgroundColor: "rgba(13, 67, 59, 0.92)",
        color: "white",
        padding: "12px 14px",
        borderRadius: "6px",
        fontSize: "12px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        minWidth: "180px",
        maxWidth: "220px",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: "13px",
          marginBottom: "2px",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: "10px",
          opacity: 0.8,
          marginBottom: "8px",
        }}
      >
        {subtitle}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                backgroundColor: item.color,
                borderRadius: "2px",
                flexShrink: 0,
                border: item.color === "#CCCCCC" ? "1px solid #999" : "none",
              }}
            />
            <span style={{ fontSize: "11px", lineHeight: 1.3 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
