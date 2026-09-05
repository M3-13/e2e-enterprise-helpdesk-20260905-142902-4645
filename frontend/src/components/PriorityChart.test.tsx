import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PriorityChart from "./PriorityChart";

describe("PriorityChart", () => {
  it("renders every priority label and its numeric value", () => {
    const data = { low: 1, medium: 2, high: 3, critical: 4 };
    const html = renderToStaticMarkup(<PriorityChart data={data} />);

    expect(html).toContain("Kritisch");
    expect(html).toContain("Hoch");
    expect(html).toContain("Mittel");
    expect(html).toContain("Niedrig");

    expect(html).toContain(">4<");
    expect(html).toContain(">3<");
    expect(html).toContain(">2<");
    expect(html).toContain(">1<");
  });

  it("scales bar widths relative to the maximum value", () => {
    const data = { low: 1, medium: 2, high: 3, critical: 4 };
    const html = renderToStaticMarkup(<PriorityChart data={data} />);

    expect(html).toContain("width:100%");
    expect(html).toContain("width:75%");
    expect(html).toContain("width:50%");
    expect(html).toContain("width:25%");
  });

  it("renders empty bars when every value is zero", () => {
    const data = { low: 0, medium: 0, high: 0, critical: 0 };
    const html = renderToStaticMarkup(<PriorityChart data={data} />);

    expect(html).toContain("width:0%");
    expect(html).toContain(">0<");
  });

  it("treats missing keys as zero", () => {
    const html = renderToStaticMarkup(
      <PriorityChart data={{ low: 5 } as Record<"low" | "medium" | "high" | "critical", number>} />,
    );

    expect(html).toContain("width:100%");
    expect(html).toContain(">5<");
  });
});
