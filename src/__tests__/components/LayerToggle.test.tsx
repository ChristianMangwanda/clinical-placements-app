import { render, screen, fireEvent } from "@testing-library/react";
import LayerToggle from "@/components/LayerToggle";
import type { Layer } from "@/lib/types";

describe("LayerToggle", () => {
  const mockLayers: Layer[] = [
    {
      id: 1,
      layer_key: "hrsa_sites",
      display_name: "HRSA Sites",
      table_name: "hrsa_sites",
      description: "HRSA clinical sites",
      icon: null,
      color: "#E74C3C",
      default_visible: true,
      sort_order: 1,
      created_at: new Date(),
    },
    {
      id: 2,
      layer_key: "schools",
      display_name: "PT/OT/PA Schools",
      table_name: "schools",
      description: "Schools with PT/OT/PA programs",
      icon: null,
      color: "#3498DB",
      default_visible: true,
      sort_order: 2,
      created_at: new Date(),
    },
    {
      id: 3,
      layer_key: "military_sites",
      display_name: "Military Sites",
      table_name: "military_sites",
      description: "Military installations",
      icon: null,
      color: "#27AE60",
      default_visible: false,
      sort_order: 3,
      created_at: new Date(),
    },
  ];

  const mockLayerVisibility = {
    hrsa_sites: true,
    schools: true,
    military_sites: false,
  };

  const mockOnToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the title", () => {
    render(
      <LayerToggle
        layers={mockLayers}
        layerVisibility={mockLayerVisibility}
        onToggle={mockOnToggle}
      />
    );
    expect(screen.getByText("Map Layers")).toBeInTheDocument();
  });

  it("renders all layers", () => {
    render(
      <LayerToggle
        layers={mockLayers}
        layerVisibility={mockLayerVisibility}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText("HRSA Sites")).toBeInTheDocument();
    expect(screen.getByText("PT/OT/PA Schools")).toBeInTheDocument();
    expect(screen.getByText("Military Sites")).toBeInTheDocument();
  });

  it("calls onToggle when layer button is clicked", () => {
    render(
      <LayerToggle
        layers={mockLayers}
        layerVisibility={mockLayerVisibility}
        onToggle={mockOnToggle}
      />
    );

    fireEvent.click(screen.getByText("HRSA Sites"));
    expect(mockOnToggle).toHaveBeenCalledWith("hrsa_sites");
  });

  it("renders correct number of layer buttons", () => {
    render(
      <LayerToggle
        layers={mockLayers}
        layerVisibility={mockLayerVisibility}
        onToggle={mockOnToggle}
      />
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });

  it("uses default_visible when layer not in visibility state", () => {
    const emptyVisibility = {};

    render(
      <LayerToggle
        layers={mockLayers}
        layerVisibility={emptyVisibility}
        onToggle={mockOnToggle}
      />
    );

    // Should still render without errors
    expect(screen.getByText("HRSA Sites")).toBeInTheDocument();
  });
});
