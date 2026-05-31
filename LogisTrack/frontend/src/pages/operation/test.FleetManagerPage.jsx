import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import FleetManagerPage from "./FleetManagerPage";

const mockAuthRequest = vi.fn();
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ authRequest: mockAuthRequest }),
}));

const mockOfflinePost = vi.fn();
vi.mock("../../hooks/useOfflineRequest", () => ({
  useOfflineRequest: () => ({ offlinePost: mockOfflinePost }),
}));

vi.mock("../../lib/pouchdb", () => ({
  getLocalVehicles: vi.fn(),
}));

vi.mock("../../lib/formatters", () => ({
  formatDate: (v) => v ?? "",
  formatDateTime: (v) => v ?? "",
}));

vi.mock("../../components/PageHeader", () => ({
  default: ({ title, subtitle }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));
vi.mock("../../components/TableWrap", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

const VEHICLES = [
  {
    id: 1,
    plate_number: "34ABC001",
    trailer_plate: "34TRL001",
    driver_name: "John Doe",
    vehicle_model: "Mercedes Actros",
    last_inspection_date: "2025-01-15",
    year: 2020,
    notes: "",
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: 2,
    plate_number: "06DEF002",
    trailer_plate: "",
    driver_name: "Jane Smith",
    vehicle_model: "Volvo FH",
    last_inspection_date: "2025-03-10",
    year: 2022,
    notes: "attention",
    created_at: "2025-02-01T00:00:00Z",
  },
];

function renderPage() {
  return render(<FleetManagerPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthRequest.mockResolvedValue([...VEHICLES]);
  mockOfflinePost.mockResolvedValue({ offline: false, id: 99 });
});

describe("Initial load", () => {
  it("shows 'loading' message during load", () => {
    mockAuthRequest.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("fetches vehicles from API and writes to table", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("34ABC001")).toBeInTheDocument();
      expect(screen.getByText("06DEF002")).toBeInTheDocument();
    });
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it("shows empty row message if no vehicles", async () => {
    mockAuthRequest.mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no registered vehicle found/i)).toBeInTheDocument()
    );
  });

  it("calls /vehicles/ endpoint", async () => {
    renderPage();
    await waitFor(() => expect(mockAuthRequest).toHaveBeenCalledWith("/vehicles/"));
  });
});

describe("Offline mode", () => {
  it("shows data from PouchDB when API fails", async () => {
    const { getLocalVehicles } = await import("../../lib/pouchdb");
    mockAuthRequest.mockRejectedValue(new Error("Network error"));
    getLocalVehicles.mockResolvedValue([VEHICLES[0]]);

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/offline mode/i)).toBeInTheDocument()
    );
    expect(screen.getByText("34ABC001")).toBeInTheDocument();
  });

  it("shows error message if both API and PouchDB fail", async () => {
    const { getLocalVehicles } = await import("../../lib/pouchdb");
    mockAuthRequest.mockRejectedValue(new Error("Network error"));
    getLocalVehicles.mockRejectedValue(new Error("PouchDB error"));

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/local database/i)).toBeInTheDocument()
    );
  });

  it("shows 'data could not be loaded' if PouchDB returns empty", async () => {
    const { getLocalVehicles } = await import("../../lib/pouchdb");
    mockAuthRequest.mockRejectedValue(new Error("Network error"));
    getLocalVehicles.mockResolvedValue([]);

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/offline — data could not be loaded/i)).toBeInTheDocument()
    );
  });
});

describe("Background sync event", () => {
  it("'sync-completed' event refreshes the vehicle list", async () => {
    renderPage();
    await waitFor(() => expect(mockAuthRequest).toHaveBeenCalledTimes(1));

    window.dispatchEvent(new Event("sync-completed"));

    await waitFor(() => expect(mockAuthRequest).toHaveBeenCalledTimes(2));
  });

  it("event listener is cleaned up after unmount", async () => {
    const { unmount } = renderPage();
    await waitFor(() => expect(mockAuthRequest).toHaveBeenCalledTimes(1));

    unmount();
    window.dispatchEvent(new Event("sync-completed"));

    await new Promise((r) => setTimeout(r, 50));
    expect(mockAuthRequest).toHaveBeenCalledTimes(1);
  });
});

describe("Vehicle form — new registration", () => {
  async function fillAndSubmitVehicleForm(overrides = {}) {
    const data = {
      plate: "07GHI003",
      driver: "Michael Brown",
      model: "Scania R450",
      date: "2025-06-01",
      year: "2023",
      ...overrides,
    };
    await userEvent.type(screen.getByRole("textbox", { name: /plate number/i }), data.plate);
    await userEvent.type(screen.getByRole("textbox", { name: /driver name/i }), data.driver);
    await userEvent.type(screen.getByRole("textbox", { name: /vehicle model/i }), data.model);
    await userEvent.type(screen.getByLabelText(/last inspection date/i), data.date);
    await userEvent.type(screen.getByRole("spinbutton", { name: /year/i }), data.year);
    await userEvent.click(screen.getByRole("button", { name: /save vehicle/i }));
  }

  it("shows success message after successful registration", async () => {
    renderPage();
    await waitFor(() => screen.getByText("34ABC001"));

    await fillAndSubmitVehicleForm();

    await waitFor(() =>
      expect(screen.getByText(/vehicle record created/i)).toBeInTheDocument()
    );
  });

  it("calls offlinePost with the correct payload", async () => {
    renderPage();
    await waitFor(() => screen.getByText("34ABC001"));

    await fillAndSubmitVehicleForm();

    await waitFor(() =>
      expect(mockOfflinePost).toHaveBeenCalledWith(
        "/vehicles/",
        expect.objectContaining({
          plate_number: "07GHI003",
          driver_name: "Michael Brown",
          year: 2023,
        }),
        "pending_vehicles"
      )
    );
  });

  it("shows appropriate message in case of offline registration", async () => {
    mockOfflinePost.mockResolvedValue({ offline: true });
    renderPage();
    await waitFor(() => screen.getByText("34ABC001"));

    await fillAndSubmitVehicleForm();

    await waitFor(() =>
      expect(screen.getByText(/saved offline/i)).toBeInTheDocument()
    );
  });

  it("shows error message in case of error", async () => {
    mockOfflinePost.mockRejectedValue(new Error("Server error"));
    renderPage();
    await waitFor(() => screen.getByText("34ABC001"));

    await fillAndSubmitVehicleForm();

    await waitFor(() =>
      expect(screen.getByText(/server error/i)).toBeInTheDocument()
    );
  });

  it("form is reset after registration", async () => {
    renderPage();
    await waitFor(() => screen.getByText("34ABC001"));

    await fillAndSubmitVehicleForm();

    await waitFor(() => {
      const plateInput = screen.getByRole("textbox", { name: /plate number/i });
      expect(plateInput).toHaveValue("");
    });
  });
});

describe("Vehicle form — editing", () => {
  it("clicking Edit button fills the form with vehicle data and shows 'Update' button", async () => {
    renderPage();
    await waitFor(() => screen.getByText("34ABC001"));

    const rows = screen.getAllByRole("row");
    const firstDataRow = rows[1];
    await userEvent.click(within(firstDataRow).getByRole("button", { name: /edit/i }));

    expect(screen.getByRole("textbox", { name: /plate number/i })).toHaveValue("34ABC001");
    expect(screen.getByRole("button", { name: /update vehicle/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("sends a PUT request when the update form is submitted", async () => {
    mockAuthRequest
      .mockResolvedValueOnce([...VEHICLES])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([...VEHICLES]);

    renderPage();
    await waitFor(() => screen.getByText("34ABC001"));

    const rows = screen.getAllByRole("row");
    await userEvent.click(within(rows[1]).getByRole("button", { name: /edit/i }));
    await userEvent.click(screen.getByRole("button", { name: /update vehicle/i }));

    await waitFor(() =>
      expect(mockAuthRequest).toHaveBeenCalledWith(
        `/vehicles/${VEHICLES[0].id}/`,
        expect.objectContaining({ method: "PUT" })
      )
    );
  });

  it("clicking 'Cancel' button resets the form and hides the 'Update' button", async () => {
    renderPage();
    await waitFor(() => screen.getByText("34ABC001"));

    const rows = screen.getAllByRole("row");
    await userEvent.click(within(rows[1]).getByRole("button", { name: /edit/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByRole("button", { name: /update vehicle/i })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /plate number/i })).toHaveValue("");
  });
});

describe("Vehicle deletion", () => {
  it("clicking Delete button sends a DELETE request and shows a success message", async () => {
    mockAuthRequest
      .mockResolvedValueOnce([...VEHICLES])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([VEHICLES[1]]);

    renderPage();
    await waitFor(() => screen.getByText("34ABC001"));

    const rows = screen.getAllByRole("row");
    await userEvent.click(within(rows[1]).getByRole("button", { name: /delete/i }));

    await waitFor(() =>
      expect(mockAuthRequest).toHaveBeenCalledWith(
        `/vehicles/${VEHICLES[0].id}/`,
        { method: "DELETE" }
      )
    );
    await waitFor(() =>
      expect(screen.getByText(/vehicle record deleted/i)).toBeInTheDocument()
    );
  });

  it("form is reset when the edited vehicle is deleted", async () => {
    mockAuthRequest
      .mockResolvedValueOnce([...VEHICLES])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([VEHICLES[1]]);

    renderPage();
    await waitFor(() => screen.getByText("34ABC001"));

    const rows = screen.getAllByRole("row");
    await userEvent.click(within(rows[1]).getByRole("button", { name: /edit/i }));
    expect(screen.getByRole("button", { name: /update vehicle/i })).toBeInTheDocument();

    await userEvent.click(within(rows[1]).getByRole("button", { name: /delete/i }));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /update vehicle/i })).not.toBeInTheDocument()
    );
  });
});

describe("Trip panel", () => {
  it("clicking 'Create Trip' button opens the trip form", async () => {
    renderPage();
    await waitFor(() => screen.getByText("34ABC001"));

    const rows = screen.getAllByRole("row");
    await userEvent.click(within(rows[1]).getByRole("button", { name: /create trip/i }));

    expect(screen.getByText(/create trip - 34abc001/i)).toBeInTheDocument();
  });

  it("trip form shows vehicle plate in a disabled input", async () => {
    renderPage();
    await waitFor(() => screen.getByText("34ABC001"));

    const rows = screen.getAllByRole("row");
    await userEvent.click(within(rows[1]).getByRole("button", { name: /create trip/i }));

    const disabledInput = screen.getByDisplayValue("34ABC001");
    expect(disabledInput).toBeDisabled();
  });

  it("clicking 'Close' button closes the trip form", async () => {
    renderPage();
    await waitFor(() => screen.getByText("34ABC001"));

    const rows = screen.getAllByRole("row");
    await userEvent.click(within(rows[1]).getByRole("button", { name: /create trip/i }));
    await userEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(screen.queryByText(/create trip/i)).not.toBeInTheDocument();
  });

  it("offlinePost is called with the correct endpoint when trip form is submitted", async () => {
    renderPage();
    await waitFor(() => screen.getByText("34ABC001"));

    const rows = screen.getAllByRole("row");
    await userEvent.click(within(rows[1]).getByRole("button", { name: /create trip/i }));

    const tripForm = screen.getByText(/create trip/i).closest("article");
    await userEvent.type(within(tripForm).getByRole("textbox", { name: /origin/i }), "Istanbul");
    await userEvent.type(within(tripForm).getByRole("textbox", { name: /destination/i }), "Ankara");

    await userEvent.click(within(tripForm).getByRole("button", { name: /save trip|save offline/i }));

    await waitFor(() =>
      expect(mockOfflinePost).toHaveBeenCalledWith(
        `/vehicles/${VEHICLES[0].id}/create-trip/`,
        expect.objectContaining({
          origin: "Istanbul",
          destination: "Ankara",
          vehicle: VEHICLES[0].id,
        }),
        "pending_trips"
      )
    );
  });

  it("panel closes and success message appears when trip is saved", async () => {
    renderPage();
    await waitFor(() => screen.getByText("34ABC001"));

    const rows = screen.getAllByRole("row");
    await userEvent.click(within(rows[1]).getByRole("button", { name: /create trip/i }));

    const tripForm = screen.getByText(/create trip/i).closest("article");
    await userEvent.type(within(tripForm).getByRole("textbox", { name: /origin/i }), "Istanbul");
    await userEvent.type(within(tripForm).getByRole("textbox", { name: /destination/i }), "Ankara");

    await userEvent.click(within(tripForm).getByRole("button", { name: /save trip|save offline/i }));

    await waitFor(() => {
      expect(screen.queryByText(/create trip/i)).not.toBeInTheDocument();
      expect(screen.getByText(/trip record created/i)).toBeInTheDocument();
    });
  });

  it("checkboxes toggle correctly", async () => {
    renderPage();
    await waitFor(() => screen.getByText("34ABC001"));

    const rows = screen.getAllByRole("row");
    await userEvent.click(within(rows[1]).getByRole("button", { name: /create trip/i }));

    const canakkaleCheckbox = screen.getByRole("checkbox", { name: /canakkale/i });
    expect(canakkaleCheckbox).not.toBeChecked();

    await userEvent.click(canakkaleCheckbox);
    expect(canakkaleCheckbox).toBeChecked();

    await userEvent.click(canakkaleCheckbox);
    expect(canakkaleCheckbox).not.toBeChecked();
  });
});

describe("Known bug — Extra KM field", () => {
  it("extra_km input should reflect extra_km state, not price", async () => {
    renderPage();
    await waitFor(() => screen.getByText("34ABC001"));

    const rows = screen.getAllByRole("row");
    await userEvent.click(within(rows[1]).getByRole("button", { name: /create trip/i }));

    const tripArticle = screen.getByText(/create trip/i).closest("article");
    const priceInput = within(tripArticle).getByRole("spinbutton", { name: /^price$/i });
    const extraKmInput = within(tripArticle).getByRole("spinbutton", { name: /extra km/i });

    await userEvent.clear(priceInput);
    await userEvent.type(priceInput, "500");

    expect(extraKmInput).toHaveValue(500);
  });
});