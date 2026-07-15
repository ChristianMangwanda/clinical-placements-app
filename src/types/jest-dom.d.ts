// Makes @testing-library/jest-dom's custom matchers (toBeInTheDocument,
// toHaveValue, ...) visible to tsc. jest.setup.js imports the package at
// runtime, but that is a .js file, so the type augmentation was never picked up
// and `npx tsc --noEmit` reported ~50 phantom errors across the test files.
import "@testing-library/jest-dom";
