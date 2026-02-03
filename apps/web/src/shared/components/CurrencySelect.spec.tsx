import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { CurrencySelect } from "./CurrencySelect";
import userEvent from "@testing-library/user-event";

// Mock the Select UI components to avoid Radix Portal issues in tests
// and to ensure clean rendering.
vi.mock("@corely/ui", () => ({
  Select: ({ children }: any) => <div data-testid="select-root">{children}</div>,
  SelectTrigger: ({ children }: any) => <button role="combobox">{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder || "Select"}</span>,
  SelectContent: ({ children }: any) => (
    <div data-testid="select-content" role="listbox">
      {children}
    </div>
  ),
  SelectItem: ({ children, value, ...props }: any) => (
    <div role="option" data-value={value} {...props}>
      {children}
    </div>
  ),
}));

afterEach(() => {
  cleanup();
});

describe("CurrencySelect", () => {
  it("renders with default currencies", () => {
    const onValueChange = vi.fn();
    const { getByRole } = render(<CurrencySelect value="USD" onValueChange={onValueChange} />);
    const trigger = getByRole("combobox");
    expect(trigger).toBeInTheDocument();
  });

  it("displays currencies alphabetically", () => {
    const onValueChange = vi.fn();
    render(<CurrencySelect value="USD" onValueChange={onValueChange} />);

    // With our mock, content is always rendered inline
    const options = screen.getAllByRole("option");
    const codes = options.map((opt) => opt.textContent);

    // Filter out empty or non-code text if any
    const currencyCodes = codes.filter((code) => code && /^[A-Z]{3}/.test(code));
    const sorted = [...currencyCodes].sort();

    expect(currencyCodes).toEqual(sorted);
  });

  it("allows adding custom currency", async () => {
    const onValueChange = vi.fn();
    const onCustomAdded = vi.fn();

    render(
      <CurrencySelect
        value="USD"
        onValueChange={onValueChange}
        onCustomAdded={onCustomAdded}
        allowCustom={true}
      />
    );

    // Input is visible immediately in our mock
    const input = screen.getByPlaceholderText(/Add/i);
    await userEvent.type(input, "sgd");
    await userEvent.keyboard("{Enter}");

    expect(onValueChange).toHaveBeenCalledWith("SGD");
    expect(onCustomAdded).toHaveBeenCalledWith("SGD");
  });

  it("validates custom currency input", async () => {
    const onValueChange = vi.fn();

    render(<CurrencySelect value="USD" onValueChange={onValueChange} allowCustom={true} />);

    const input = screen.getByPlaceholderText(/Add/i);
    await userEvent.type(input, "EURO");
    await userEvent.keyboard("{Enter}");

    expect(screen.getByText(/Must be 3 letters/i)).toBeInTheDocument();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("prevents duplicate custom currencies", async () => {
    const onValueChange = vi.fn();

    render(<CurrencySelect value="USD" onValueChange={onValueChange} allowCustom={true} />);

    // USD is default, so it exists
    const input = screen.getByPlaceholderText(/Add/i);
    await userEvent.type(input, "USD");
    await userEvent.keyboard("{Enter}");

    // Should just select it without error
    expect(onValueChange).toHaveBeenCalledWith("USD");
    expect(screen.queryByText(/Must be 3 letters/i)).not.toBeInTheDocument();
  });

  it("supports custom currency list override", () => {
    const onValueChange = vi.fn();
    const customCurrencies = ["SGD", "THB", "MYR"];
    const { container } = render(
      <CurrencySelect value="SGD" onValueChange={onValueChange} currencies={customCurrencies} />
    );
    expect(container).toBeInTheDocument();
    // Verify one option
    expect(screen.getByText(/THB/)).toBeInTheDocument();
  });

  it("includes current value even if not in list", () => {
    const onValueChange = vi.fn();
    const { getByRole } = render(
      <CurrencySelect value="XYZ" onValueChange={onValueChange} currencies={["USD", "EUR"]} />
    );
    const trigger = getByRole("combobox");
    // SelectValue displays placeholder in our mock if no value handling in mock
    // But CurrencySelect passes `value` to Select.
    // Our Mock `Select` does not pass `value` to `SelectTrigger` or `SelectValue`.
    // However, `CurrencySelect` has `value` in props.
    // The `CurrencySelect` component code:
    // <Select value={value} ...>
    //   <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
    // </Select>

    // Real `SelectValue` automatically displays the selected item's label based on `value` context.
    // Our mock `SelectValue` only displays placeholder.
    // So `expect(trigger).toHaveTextContent("XYZ")` WILL FAIL with the mock.

    // Correction: We should inspect the `options` list to see if XYZ is present.
    // That's what "includes current value" logic does - it adds it to the options list.

    const options = screen.getAllByRole("option");
    const optionTexts = options.map((o) => o.textContent);
    expect(optionTexts).toContainEqual(expect.stringContaining("XYZ"));
  });
});
