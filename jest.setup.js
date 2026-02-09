import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// Polyfill for pg library
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return "";
  },
}));

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock leaflet (since it requires browser APIs)
jest.mock("leaflet", () => ({
  divIcon: jest.fn(() => ({})),
  Icon: {
    Default: {
      mergeOptions: jest.fn(),
    },
  },
}));

// Mock react-leaflet
jest.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  Tooltip: ({ children }) => <div data-testid="tooltip">{children}</div>,
  useMap: () => ({
    flyTo: jest.fn(),
    getBounds: jest.fn(() => ({
      getSouth: () => 0,
      getWest: () => 0,
      getNorth: () => 0,
      getEast: () => 0,
    })),
  }),
  useMapEvents: () => ({}),
}));

// Global fetch mock
global.fetch = jest.fn();
