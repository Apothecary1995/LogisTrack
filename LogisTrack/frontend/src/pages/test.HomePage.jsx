import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import HomePage from "./HomePage";

const mockLogout = vi.fn();

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../context/LanguageContext", () => ({
  useLanguage: () => ({ t: (key) => key }),
}));

vi.mock("../lib/apiClient", () => ({
  publicRequest: vi.fn(),
}));

vi.mock("../components/UserMenu", () => ({
  default: ({ user, onLogout }) => (
    <div>
      <span data-testid="user-menu">{user?.email}</span>
      <button onClick={onLogout}>Logout</button>
    </div>
  ),
}));

import { useAuth } from "../context/AuthContext";
import { publicRequest } from "../lib/apiClient";

function renderPage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
}

const GUEST_AUTH = { isAuthenticated: false, user: null, logout: mockLogout };
const LOGGED_IN_AUTH = {
  isAuthenticated: true,
  user: { email: "user@example.com" },
  logout: mockLogout,
};

beforeEach(() => {
  vi.clearAllMocks();
  publicRequest.mockResolvedValue({ registered_user_count: 42 });
  useAuth.mockReturnValue(GUEST_AUTH);
});

describe("Rendering — guest", () => {
  it("renders app_name and tagline", async () => {
    renderPage();
    const appNames = await screen.findAllByText("app_name");
    expect(appNames.length).toBeGreaterThan(0);
  });

  it("renders sign in and register links for unauthenticated user", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /register/i })).toBeInTheDocument();
  });

  it("does not render dashboard link or UserMenu for guest", () => {
    renderPage();
    expect(screen.queryByRole("link", { name: /open_dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("user-menu")).not.toBeInTheDocument();
  });

  it("sign in link points to /signin", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /login/i })).toHaveAttribute("href", "/signin");
  });

  it("register link points to /register", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /register/i })).toHaveAttribute("href", "/register");
  });
});

describe("Rendering — authenticated", () => {
  beforeEach(() => {
    useAuth.mockReturnValue(LOGGED_IN_AUTH);
  });

  it("renders dashboard link for authenticated user", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /open_dashboard/i })).toBeInTheDocument();
  });

  it("dashboard link points to /operation/dashboard", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /open_dashboard/i })).toHaveAttribute(
      "href",
      "/operation/dashboard"
    );
  });

  it("renders UserMenu with user email", () => {
    renderPage();
    expect(screen.getByTestId("user-menu")).toHaveTextContent("user@example.com");
  });

  it("does not render sign in or register links", () => {
    renderPage();
    expect(screen.queryByRole("link", { name: /login/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /register/i })).not.toBeInTheDocument();
  });

  it("calls logout when UserMenu logout button clicked", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /logout/i }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});

describe("User count", () => {
  it("fetches and displays user count", async () => {
    publicRequest.mockResolvedValue({ registered_user_count: 128 });
    renderPage();
    await waitFor(() => expect(screen.getByText("128")).toBeInTheDocument());
  });

  it("calls the correct endpoint", async () => {
    renderPage();
    await waitFor(() => expect(publicRequest).toHaveBeenCalledWith("/users/count/"));
  });

  it("displays 0 when API returns no count field", async () => {
    publicRequest.mockResolvedValue({});
    renderPage();
    await waitFor(() => expect(screen.getByText("0")).toBeInTheDocument());
  });

  it("displays 0 when API returns null", async () => {
    publicRequest.mockResolvedValue(null);
    renderPage();
    await waitFor(() => expect(screen.getByText("0")).toBeInTheDocument());
  });

  it("displays 0 when API call fails", async () => {
    publicRequest.mockRejectedValue(new Error("Network error"));
    renderPage();
    await waitFor(() => expect(screen.getByText("0")).toBeInTheDocument());
  });

  it("shows registered_user_count label", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("registered_user_count")).toBeInTheDocument()
    );
  });
});

describe("Unmount cleanup", () => {
  it("does not update state after unmount", async () => {
    let resolveRequest;
    publicRequest.mockReturnValue(new Promise((res) => { resolveRequest = res; }));

    const { unmount } = renderPage();
    unmount();

    const consoleSpy = vi.spyOn(console, "error");
    resolveRequest({ registered_user_count: 99 });
    await new Promise((r) => setTimeout(r, 50));

    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Can't perform a React state update")
    );
    consoleSpy.mockRestore();
  });
});