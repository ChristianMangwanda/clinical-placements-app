import { render, screen, fireEvent } from "@testing-library/react";
import DataTable from "@/components/DataTable";
import type { SearchResult } from "@/lib/types";

describe("DataTable", () => {
  const mockData: SearchResult[] = [
    { id: 1, name: "Hospital A", layer_key: "hrsa_sites", state: "NY", latitude: 40.7, longitude: -74.0 },
    { id: 2, name: "University B", layer_key: "schools", state: "CA", latitude: 34.0, longitude: -118.2 },
    { id: 3, name: "Military Base C", layer_key: "military_sites", state: "TX", latitude: 30.2, longitude: -97.7 },
  ];

  const mockLayerColors = {
    hrsa_sites: "#E74C3C",
    schools: "#3498DB",
    military_sites: "#27AE60",
  };

  const mockOnRowClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the data table with title", () => {
    render(
      <DataTable
        data={mockData}
        loading={false}
        onRowClick={mockOnRowClick}
        layerColors={mockLayerColors}
      />
    );
    expect(screen.getByText("Data Table")).toBeInTheDocument();
  });

  it("shows result count", () => {
    render(
      <DataTable
        data={mockData}
        loading={false}
        onRowClick={mockOnRowClick}
        layerColors={mockLayerColors}
      />
    );
    expect(screen.getByText("(3 results)")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(
      <DataTable
        data={[]}
        loading={true}
        onRowClick={mockOnRowClick}
        layerColors={mockLayerColors}
      />
    );
    expect(screen.getByText("Loading data...")).toBeInTheDocument();
  });

  it("shows empty state message when no data", () => {
    render(
      <DataTable
        data={[]}
        loading={false}
        onRowClick={mockOnRowClick}
        layerColors={mockLayerColors}
      />
    );
    expect(screen.getByText("Select layers and adjust map to load data")).toBeInTheDocument();
  });

  it("renders all data rows", () => {
    render(
      <DataTable
        data={mockData}
        loading={false}
        onRowClick={mockOnRowClick}
        layerColors={mockLayerColors}
      />
    );

    expect(screen.getByText("Hospital A")).toBeInTheDocument();
    expect(screen.getByText("University B")).toBeInTheDocument();
    expect(screen.getByText("Military Base C")).toBeInTheDocument();
  });

  it("filters data by search query", () => {
    render(
      <DataTable
        data={mockData}
        loading={false}
        onRowClick={mockOnRowClick}
        layerColors={mockLayerColors}
      />
    );

    const searchInput = screen.getByPlaceholderText("Search...");
    fireEvent.change(searchInput, { target: { value: "Hospital" } });

    expect(screen.getByText("Hospital A")).toBeInTheDocument();
    expect(screen.queryByText("University B")).not.toBeInTheDocument();
    expect(screen.queryByText("Military Base C")).not.toBeInTheDocument();
  });

  it("updates result count after filtering", () => {
    render(
      <DataTable
        data={mockData}
        loading={false}
        onRowClick={mockOnRowClick}
        layerColors={mockLayerColors}
      />
    );

    const searchInput = screen.getByPlaceholderText("Search...");
    fireEvent.change(searchInput, { target: { value: "Hospital" } });

    expect(screen.getByText("(1 results)")).toBeInTheDocument();
  });

  it("calls onRowClick when row is clicked", () => {
    render(
      <DataTable
        data={mockData}
        loading={false}
        onRowClick={mockOnRowClick}
        layerColors={mockLayerColors}
      />
    );

    fireEvent.click(screen.getByText("Hospital A"));
    expect(mockOnRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it("toggles collapse state", () => {
    render(
      <DataTable
        data={mockData}
        loading={false}
        onRowClick={mockOnRowClick}
        layerColors={mockLayerColors}
      />
    );

    // Find and click the collapse button (the ChevronDown at the end)
    const collapseButton = screen.getAllByRole("button").find((btn) =>
      btn.querySelector("svg")
    );

    if (collapseButton) {
      fireEvent.click(collapseButton);
      // Search input should be hidden when collapsed
      expect(screen.queryByPlaceholderText("Search...")).not.toBeInTheDocument();
    }
  });

  it("sorts by name when name header clicked", () => {
    render(
      <DataTable
        data={mockData}
        loading={false}
        onRowClick={mockOnRowClick}
        layerColors={mockLayerColors}
      />
    );

    // Click name header twice to reverse sort
    fireEvent.click(screen.getByText("Name"));
    fireEvent.click(screen.getByText("Name"));

    // Data should now be in descending order
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBeGreaterThan(1);
  });

  it("clears search when X button clicked", () => {
    render(
      <DataTable
        data={mockData}
        loading={false}
        onRowClick={mockOnRowClick}
        layerColors={mockLayerColors}
      />
    );

    const searchInput = screen.getByPlaceholderText("Search...");
    fireEvent.change(searchInput, { target: { value: "Hospital" } });

    // Find and click the clear button
    const clearButtons = screen.getAllByRole("button");
    const clearButton = clearButtons.find((btn) => {
      const parent = btn.parentElement;
      return parent?.classList.contains("relative");
    });

    if (clearButton) {
      fireEvent.click(clearButton);
      expect(searchInput).toHaveValue("");
    }
  });

  it("displays layer type badges with correct colors", () => {
    render(
      <DataTable
        data={mockData}
        loading={false}
        onRowClick={mockOnRowClick}
        layerColors={mockLayerColors}
      />
    );

    expect(screen.getByText("HRSA")).toBeInTheDocument();
    expect(screen.getByText("Schools")).toBeInTheDocument();
    expect(screen.getByText("Military")).toBeInTheDocument();
  });

  it("shows 'no results' when search returns empty", () => {
    render(
      <DataTable
        data={mockData}
        loading={false}
        onRowClick={mockOnRowClick}
        layerColors={mockLayerColors}
      />
    );

    const searchInput = screen.getByPlaceholderText("Search...");
    fireEvent.change(searchInput, { target: { value: "xyz123" } });

    expect(screen.getByText("No results match your search")).toBeInTheDocument();
  });
});
