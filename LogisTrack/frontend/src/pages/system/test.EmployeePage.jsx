import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import EmployeePage from "./EmployeePage";

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
  formatNumber: (value, digits) => Number(value).toFixed(digits),
  formatDate: (value) => `D:${value}`,
}));

const drivers = [
  { id: 1, full_name: "Alice", phone: "111", is_active: true },
  { id: 2, full_name: "Bob", phone: "222", is_active: true },
];

const insight = {
  drivers: [
    { driver_name: "Alice", total_km: 1000, total_amount: 500, efficiency: 0.5 },
  ],
  leaves: [
    { id: 9, driver_name: "Bob", start_date: "2024-01-01", end_date: "2024-01-05", notes: "trip" },
  ],
};

function mockSuccess() {
  authRequest.mockImplementation((url) => {
    if (url === "/drivers/") return Promise.resolve(drivers);
    if (url.startsWith("/employees/insights/")) return Promise.resolve(insight);
    return Promise.resolve({});
  });
}

beforeEach(() => {
  authRequest.mockReset();
});

describe("EmployeePage initial load", () => {
  test("loads drivers and insights on mount", async () => {
    mockSuccess();
    render(<EmployeePage />);

    await waitFor(() => {
      expect(authRequest).toHaveBeenCalledWith("/drivers/");
    });
    expect(authRequest).toHaveBeenCalledWith("/employees/insights/?metric=most_km");
    expect(await screen.findByText("Alice")).toBeInTheDocument();
  });

  test("renders performance row values via formatters", async () => {
    mockSuccess();
    render(<EmployeePage />);

    expect(await screen.findByText("1000.00")).toBeInTheDocument();
    expect(screen.getByText("500.00")).toBeInTheDocument();
    expect(screen.getByText("0.5000")).toBeInTheDocument();
  });

  test("renders leave records via formatDate", async () => {
    mockSuccess();
    render(<EmployeePage />);

    expect(await screen.findByText("D:2024-01-01")).toBeInTheDocument();
    expect(screen.getByText("D:2024-01-05")).toBeInTheDocument();
    expect(screen.getByText("trip")).toBeInTheDocument();
  });

  test("preselects first driver in leave form", async () => {
    mockSuccess();
    render(<EmployeePage />);

    const select = await screen.findByRole("combobox", { name: /driver/i });
    await waitFor(() => expect(select).toHaveValue("1"));
  });
});

describe("EmployeePage metric filter", () => {
  test("reloads insights when metric changes", async () => {
    mockSuccess();
    render(<EmployeePage />);
    await screen.findByText("Alice");

    fireEvent.change(screen.getByRole("combobox", { name: /filter/i }), {
      target: { value: "least_km" },
    });

    await waitFor(() => {
      expect(authRequest).toHaveBeenCalledWith("/employees/insights/?metric=least_km");
    });
  });
});

describe("EmployeePage driver form", () => {
  test("submits driver payload and shows success", async () => {
    mockSuccess();
    render(<EmployeePage />);
    await screen.findByText("Alice");

    fireEvent.change(screen.getByRole("textbox", { name: /full name/i }), {
      target: { name: "full_name", value: "Carol" },
    });
    fireEvent.click(screen.getByRole("button", { name: /kaydet/i }));

    await waitFor(() => {
      expect(authRequest).toHaveBeenCalledWith(
        "/drivers/",
        expect.objectContaining({ method: "POST" })
      );
    });

    const call = authRequest.mock.calls.find(
      ([url, opts]) => url === "/drivers/" && opts?.method === "POST"
    );
    expect(JSON.parse(call[1].body)).toMatchObject({ full_name: "Carol", is_active: true });
    expect(await screen.findByText(/olusturuldu/i)).toBeInTheDocument();
  });
});

describe("EmployeePage leave form", () => {
  test("submits leave payload with numeric driver id", async () => {
    mockSuccess();
    render(<EmployeePage />);
    await screen.findByText("Alice");

    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { name: "start_date", value: "2024-02-01" },
    });
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { name: "end_date", value: "2024-02-03" },
    });
    fireEvent.click(screen.getByRole("button", { name: /izin ekle/i }));

    await waitFor(() => {
      expect(authRequest).toHaveBeenCalledWith(
        "/driver-leaves/",
        expect.objectContaining({ method: "POST" })
      );
    });

    const call = authRequest.mock.calls.find(([url]) => url === "/driver-leaves/");
    const payload = JSON.parse(call[1].body);
    expect(payload.driver).toBe(1);
    expect(typeof payload.driver).toBe("number");
    expect(payload.start_date).toBe("2024-02-01");
  });
});

describe("EmployeePage error and empty states", () => {
  test("shows error message when load fails", async () => {
    authRequest.mockRejectedValue(new Error("boom"));
    render(<EmployeePage />);

    expect(await screen.findByText("boom")).toBeInTheDocument();
  });

  test("shows empty rows when there is no data", async () => {
    authRequest.mockImplementation((url) => {
      if (url === "/drivers/") return Promise.resolve([]);
      return Promise.resolve({ drivers: [], leaves: [] });
    });
    render(<EmployeePage />);

    expect(await screen.findByText(/surucu performans verisi yok/i)).toBeInTheDocument();
    expect(screen.getByText(/izin kaydi bulunamadi/i)).toBeInTheDocument();
  });
});