import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import SignInPage from "./SignInPage";

const mockSignIn = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ signIn: mockSignIn }),
}));

vi.mock("../../context/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key) => key,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <SignInPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Rendering", () => {
  it("renders email and password inputs", () => {
    renderPage();
    expect(screen.getByRole("textbox", { name: /e-posta/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/sifre/i)).toBeInTheDocument();
  });

  it("renders the submit button", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("renders forgot password and register links", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /forgot password/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /register/i })).toBeInTheDocument();
  });

  it("does not show an error message initially", () => {
    renderPage();
    expect(screen.queryByRole("paragraph", { name: /error/i })).not.toBeInTheDocument();
  });
});

describe("Form input", () => {
  it("updates email field on change", async () => {
    renderPage();
    const emailInput = screen.getByRole("textbox", { name: /e-posta/i });
    await userEvent.type(emailInput, "user@example.com");
    expect(emailInput).toHaveValue("user@example.com");
  });

  it("updates password field on change", async () => {
    renderPage();
    const passwordInput = screen.getByLabelText(/sifre/i);
    await userEvent.type(passwordInput, "secret123");
    expect(passwordInput).toHaveValue("secret123");
  });
});

describe("Successful sign in", () => {
  it("calls signIn with form values", async () => {
    mockSignIn.mockResolvedValue();
    renderPage();

    await userEvent.type(screen.getByRole("textbox", { name: /e-posta/i }), "user@example.com");
    await userEvent.type(screen.getByLabelText(/sifre/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "secret123",
      })
    );
  });

  it("navigates to dashboard after successful sign in", async () => {
    mockSignIn.mockResolvedValue();
    renderPage();

    await userEvent.type(screen.getByRole("textbox", { name: /e-posta/i }), "user@example.com");
    await userEvent.type(screen.getByLabelText(/sifre/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/operation/dashboard", { replace: true })
    );
  });

  it("does not show an error message on success", async () => {
    mockSignIn.mockResolvedValue();
    renderPage();

    await userEvent.type(screen.getByRole("textbox", { name: /e-posta/i }), "user@example.com");
    await userEvent.type(screen.getByLabelText(/sifre/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument();
  });
});

describe("Failed sign in", () => {
  it("shows error message returned from signIn", async () => {
    mockSignIn.mockRejectedValue(new Error("Invalid credentials"));
    renderPage();

    await userEvent.type(screen.getByRole("textbox", { name: /e-posta/i }), "wrong@example.com");
    await userEvent.type(screen.getByLabelText(/sifre/i), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() =>
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument()
    );
  });

  it("does not navigate on failure", async () => {
    mockSignIn.mockRejectedValue(new Error("Invalid credentials"));
    renderPage();

    await userEvent.type(screen.getByRole("textbox", { name: /e-posta/i }), "wrong@example.com");
    await userEvent.type(screen.getByLabelText(/sifre/i), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => screen.getByText("Invalid credentials"));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("clears previous error on new submission", async () => {
    mockSignIn
      .mockRejectedValueOnce(new Error("Invalid credentials"))
      .mockResolvedValueOnce();

    renderPage();

    await userEvent.type(screen.getByRole("textbox", { name: /e-posta/i }), "user@example.com");
    await userEvent.type(screen.getByLabelText(/sifre/i), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => screen.getByText("Invalid credentials"));

    await userEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() =>
      expect(screen.queryByText("Invalid credentials")).not.toBeInTheDocument()
    );
  });
});

describe("Submitting state", () => {
  it("disables the button while submitting", async () => {
    mockSignIn.mockReturnValue(new Promise(() => {}));
    renderPage();

    await userEvent.type(screen.getByRole("textbox", { name: /e-posta/i }), "user@example.com");
    await userEvent.type(screen.getByLabelText(/sifre/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));

    expect(screen.getByRole("button", { name: /giris yapiliyor/i })).toBeDisabled();
  });

  it("re-enables the button after submission completes", async () => {
    mockSignIn.mockResolvedValue();
    renderPage();

    await userEvent.type(screen.getByRole("textbox", { name: /e-posta/i }), "user@example.com");
    await userEvent.type(screen.getByLabelText(/sifre/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /login/i })).not.toBeDisabled()
    );
  });

  it("re-enables the button after a failed submission", async () => {
    mockSignIn.mockRejectedValue(new Error("Invalid credentials"));
    renderPage();

    await userEvent.type(screen.getByRole("textbox", { name: /e-posta/i }), "user@example.com");
    await userEvent.type(screen.getByLabelText(/sifre/i), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /login/i })).not.toBeDisabled()
    );
  });
});

describe("Navigation links", () => {
  it("forgot password link points to /forgot-password", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /forgot password/i })).toHaveAttribute("href", "/forgot-password");
  });

  it("register link points to /register", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /register/i })).toHaveAttribute("href", "/register");
  });

  it("home link points to /", () => {
    renderPage();
    const homeLinks = screen.getAllByRole("link");
    const homeLink = homeLinks.find((l) => l.getAttribute("href") === "/");
    expect(homeLink).toBeInTheDocument();
  });
});