import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ServiceRepairPage from "./ServiceRepairPage";

const authRequest = jest.fn();

jest.mock("./../../context/AuthContext", () => ({
  useAuth: () => ({ authRequest }),
}));

jest.mock("./../../components/PageHeader", () => ({ title, subtitle }) => (
  <div>
    <h1>{title}</h1>
    <p>{subtitle}</p>
  </div>
));

jest.mock("./../../components/TableWrap", () => ({ children }) => <div>{children}</div>);

jest.mock("./../../lib/formatters", () => ({
  formatCurrency: (value) => `$${Number(value).toFixed(2)}`,
  formatDate: (value) => `D:${value}`,
}));

const vehicles = [
  { id: 1, plate_number: "34 ABC 001" },
  { id: 2, plate_number: "06 XYZ 999" },
];

const entries = [
  {
    id: 10,
    date: "2024-03-01",
    plate_number: "34 ABC 001",
    operation_details: "Oil change",
    entry_km: 52000,
    cost: 350,
  },
  {
    id: 11,
    date: "2024-03-10",
    plate_number: "06 XYZ 999",
    operation_details: "Brake pads",
    entry_km: 87000,
    cost: 1200,
  },
];

function mockSuccess() {
  authRequest.mockImplementation((url) => {
    if (url === "/vehicles/") return Promise.resolve(vehicles);
    if (url === "/service-repairs/") return Promise.resolve(entries);
    return Promise.resolve({});
  });
}

beforeEach(() => {
  authRequest.mockReset();
});

describe("ServiceRepairPage initial load", () => {
  test("fetches vehicles and service entries on mount", async () => {
    mockSuccess();
    render(<ServiceRepairPage />);

    await waitFor(() => {
      expect(authRequest).toHaveBeenCalledWith("/vehicles/");
      expect(authRequest).toHaveBeenCalledWith("/service-repairs/");
    });
  });

  test("renders service entry rows with formatted values", async () => {
    mockSuccess();
    render(<ServiceRepairPage />);

    expect(await screen.findByText("D:2024-03-01")).toBeInTheDocument();
    expect(screen.getByText("Oil change")).toBeInTheDocument();
    expect(screen.getByText("$350.00")).toBeInTheDocument();

    expect(screen.getByText("D:2024-03-10")).toBeInTheDocument();
    expect(screen.getByText("Brake pads")).toBeInTheDocument();
    expect(screen.getByText("$1200.00")).toBeInTheDocument();
  });

  test("populates vehicle select with loaded plates", async () => {
    mockSuccess();
    render(<ServiceRepairPage />);

    expect(await screen.findByRole("option", { name: "34 ABC 001" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "06 XYZ 999" })).toBeInTheDocument();
  });

  test("preselects first vehicle in the form", async () => {
    mockSuccess();
    render(<ServiceRepairPage />);

    const select = await screen.findByRole("combobox", { name: /plate/i });
    await waitFor(() => expect(select).toHaveValue("1"));
  });
});

describe("ServiceRepairPage form submission", () => {
  test("posts correct payload and shows success message", async () => {
    mockSuccess();
    render(<ServiceRepairPage />);
    await screen.findByText("Oil change");

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { name: "date", value: "2024-04-01" },
    });
    fireEvent.change(screen.getByLabelText(/operation details/i), {
      target: { name: "operation_details", value: "Tyre rotation" },
    });
    fireEvent.change(screen.getByLabelText(/entry km/i), {
      target: { name: "entry_km", value: "60000" },
    });
    fireEvent.change(screen.getByLabelText(/cost/i), {
      target: { name: "cost", value: "200" },
    });

    fireEvent.click(screen.getByRole("button", { name: /service entry ekle/i }));

    await waitFor(() => {
      expect(authRequest).toHaveBeenCalledWith(
        "/service-repairs/",
        expect.objectContaining({ method: "POST" })
      );
    });

    const call = authRequest.mock.calls.find(
      ([url, opts]) => url === "/service-repairs/" && opts?.method === "POST"
    );
    const payload = JSON.parse(call[1].body);

    expect(payload.vehicle).toBe(1);
    expect(typeof payload.vehicle).toBe("number");
    expect(payload.date).toBe("2024-04-01");
    expect(payload.operation_details).toBe("Tyre rotation");
    expect(payload.entry_km).toBe("60000");
    expect(payload.cost).toBe("200");

    expect(await screen.findByText(/servis kaydi olusturuldu/i)).toBeInTheDocument();
  });

  test("falls back to 0 when entry_km and cost are empty", async () => {
    mockSuccess();
    render(<ServiceRepairPage />);
    await screen.findByText("Oil change");

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { name: "date", value: "2024-04-02" },
    });
    fireEvent.change(screen.getByLabelText(/operation details/i), {
      target: { name: "operation_details", value: "Inspection" },
    });

    fireEvent.click(screen.getByRole("button", { name: /service entry ekle/i }));

    await waitFor(() => {
      expect(authRequest).toHaveBeenCalledWith(
        "/service-repairs/",
        expect.objectContaining({ method: "POST" })
      );
    });

    const call = authRequest.mock.calls.find(
      ([url, opts]) => url === "/service-repairs/" && opts?.method === "POST"
    );
    const payload = JSON.parse(call[1].body);

    expect(payload.entry_km).toBe(0);
    expect(payload.cost).toBe(0);
  });

  test("retains selected vehicle after successful submit", async () => {
    mockSuccess();
    render(<ServiceRepairPage />);
    await screen.findByText("Oil change");

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { name: "date", value: "2024-04-03" },
    });
    fireEvent.change(screen.getByLabelText(/operation details/i), {
      target: { name: "operation_details", value: "Filter" },
    });
    fireEvent.click(screen.getByRole("button", { name: /service entry ekle/i }));

    await screen.findByText(/servis kaydi olusturuldu/i);

    const select = screen.getByRole("combobox", { name: /plate/i });
    expect(select).toHaveValue("1");
  });

  test("shows error message when submission fails", async () => {
    mockSuccess();
    render(<ServiceRepairPage />);
    await screen.findByText("Oil change");

    authRequest.mockRejectedValueOnce(new Error("server error"));

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { name: "date", value: "2024-04-04" },
    });
    fireEvent.change(screen.getByLabelText(/operation details/i), {
      target: { name: "operation_details", value: "Check" },
    });
    fireEvent.click(screen.getByRole("button", { name: /service entry ekle/i }));

    expect(await screen.findByText("server error")).toBeInTheDocument();
  });
});

describe("ServiceRepairPage error and empty states", () => {
  test("shows error when initial load fails", async () => {
    authRequest.mockRejectedValue(new Error("network failure"));
    render(<ServiceRepairPage />);

    expect(await screen.findByText("network failure")).toBeInTheDocument();
  });

  test("shows empty row when no service entries exist", async () => {
    authRequest.mockImplementation((url) => {
      if (url === "/vehicles/") return Promise.resolve(vehicles);
      if (url === "/service-repairs/") return Promise.resolve([]);
      return Promise.resolve({});
    });
    render(<ServiceRepairPage />);

    expect(await screen.findByText(/kayit bulunamadi/i)).toBeInTheDocument();
  });
});