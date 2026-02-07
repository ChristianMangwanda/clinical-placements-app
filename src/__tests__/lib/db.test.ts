import { escapeId } from "@/lib/db";

describe("Database Utilities", () => {
  describe("escapeId", () => {
    it("should wrap identifier in backticks", () => {
      expect(escapeId("table_name")).toBe("`table_name`");
    });

    it("should escape backticks within identifier", () => {
      expect(escapeId("table`name")).toBe("`table``name`");
    });

    it("should handle identifiers with spaces", () => {
      expect(escapeId("table name")).toBe("`table name`");
    });

    it("should handle empty string", () => {
      expect(escapeId("")).toBe("``");
    });

    it("should handle special characters", () => {
      expect(escapeId("table-name_123")).toBe("`table-name_123`");
    });
  });
});
