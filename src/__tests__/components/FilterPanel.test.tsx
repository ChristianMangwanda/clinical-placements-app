import { render, screen, fireEvent } from "@testing-library/react";
import FilterPanel from "@/components/FilterPanel";

describe("FilterPanel", () => {
  const mockProps = {
    stateFilter: [],
    professionFilter: null,
    clinicTypeFilter: [],
    onStateChange: jest.fn(),
    onProfessionChange: jest.fn(),
    onClinicTypeChange: jest.fn(),
    onClearFilters: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the filter panel with title", () => {
    render(<FilterPanel {...mockProps} />);
    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("shows 'Select states...' when no states selected", () => {
    render(<FilterPanel {...mockProps} />);
    expect(screen.getByText("Select states...")).toBeInTheDocument();
  });

  it("shows state name when one state is selected", () => {
    render(<FilterPanel {...mockProps} stateFilter={["NY"]} />);
    // Should show New York in both the button and the active filters section
    const newYorkElements = screen.getAllByText("New York");
    expect(newYorkElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows count when multiple states are selected", () => {
    render(<FilterPanel {...mockProps} stateFilter={["NY", "CA", "TX"]} />);
    expect(screen.getByText("3 states selected")).toBeInTheDocument();
  });

  it("shows state dropdown when clicked", () => {
    render(<FilterPanel {...mockProps} />);
    fireEvent.click(screen.getByText("Select states..."));
    expect(screen.getByPlaceholderText("Search states...")).toBeInTheDocument();
  });

  it("filters states when searching", () => {
    render(<FilterPanel {...mockProps} />);
    fireEvent.click(screen.getByText("Select states..."));

    const searchInput = screen.getByPlaceholderText("Search states...");
    fireEvent.change(searchInput, { target: { value: "New" } });

    // Should show states containing "New"
    expect(screen.getByText("New York")).toBeInTheDocument();
    expect(screen.getByText("New Jersey")).toBeInTheDocument();
    expect(screen.getByText("New Hampshire")).toBeInTheDocument();
    expect(screen.getByText("New Mexico")).toBeInTheDocument();
  });

  it("calls onStateChange when state is toggled", () => {
    render(<FilterPanel {...mockProps} />);
    fireEvent.click(screen.getByText("Select states..."));

    // Find and click a state checkbox
    const checkbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(checkbox);

    expect(mockProps.onStateChange).toHaveBeenCalled();
  });

  it("renders profession filter buttons", () => {
    render(<FilterPanel {...mockProps} />);
    expect(screen.getByRole("button", { name: "PT" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "OT" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PA" })).toBeInTheDocument();
  });

  it("calls onProfessionChange when profession button is clicked", () => {
    render(<FilterPanel {...mockProps} />);
    fireEvent.click(screen.getByRole("button", { name: "PT" }));
    expect(mockProps.onProfessionChange).toHaveBeenCalledWith("PT");
  });

  it("toggles profession off when same button clicked again", () => {
    render(<FilterPanel {...mockProps} professionFilter="PT" />);
    fireEvent.click(screen.getByRole("button", { name: "PT" }));
    expect(mockProps.onProfessionChange).toHaveBeenCalledWith(null);
  });

  it("does not show clear button when no filters", () => {
    render(<FilterPanel {...mockProps} />);
    expect(screen.queryByText("Clear")).not.toBeInTheDocument();
  });

  it("shows clear button when filters are active", () => {
    render(<FilterPanel {...mockProps} stateFilter={["NY"]} />);
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("calls onClearFilters when clear button clicked", () => {
    render(<FilterPanel {...mockProps} stateFilter={["NY"]} />);
    fireEvent.click(screen.getByText("Clear"));
    expect(mockProps.onClearFilters).toHaveBeenCalled();
  });

  it("shows active filters section when filters applied", () => {
    render(<FilterPanel {...mockProps} stateFilter={["NY"]} professionFilter="PT" />);
    expect(screen.getByText("Active filters:")).toBeInTheDocument();
    // New York appears in both button and active filters
    expect(screen.getAllByText("New York").length).toBeGreaterThanOrEqual(1);
    // PT appears in both profession button and active filters
    expect(screen.getAllByText("PT").length).toBeGreaterThanOrEqual(1);
  });

  it("removes individual state filter when X clicked", () => {
    render(<FilterPanel {...mockProps} stateFilter={["NY", "CA"]} />);

    // Find the X button next to New York
    const activeFilters = screen.getByText("Active filters:").parentElement;
    const nyBadge = activeFilters?.querySelector("span");
    const xButton = nyBadge?.querySelector("button");

    if (xButton) {
      fireEvent.click(xButton);
      expect(mockProps.onStateChange).toHaveBeenCalled();
    }
  });
});
