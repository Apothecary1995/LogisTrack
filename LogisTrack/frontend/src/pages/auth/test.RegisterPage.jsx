import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import RegisterPage from "./RegisterPage";

const mockRegister = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ register: mockRegister }),
}));

vi.mock("../../context/LanguageContext", () => ({
  useLanguage: () => ({ t: (key) => key }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

async function fillForm({ email = "user@example.com", full_name = "John Doe", password = "secret123", company_name = "Acme Inc" } = {}) {
  await userEvent.type(screen.getByRole("textbox", { name: /email/i }), email);
  await userEvent.type(screen.getByRole("textbox", { name: /full name/i }), full_name);
  await userEvent.type(screen.getByLabelText(/password/i), password);
  await userEvent.type(screen.getByRole("textbox", { name: /company name/i }), company_name);
}

describe("Rendering", () => {
  it("renders all four input fields", () => {
    renderPage();
    expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /full name/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /company name/i })).toBeInTheDocument();
  });

  it("renders the submit button", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /register/i })).toBeInTheDocument();
  });

  it("renders sign in and home links", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /giris ekranina don/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /app_name/i })).toBeInTheDocument();
  });

  it("does not show an error message initially", () => {
    renderPage();
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });

  it("all fields start empty", () => {
    renderPage();
    expect(screen.getByRole("textbox", { name: /email/i })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: /full name/i })).toHaveValue("");
    expect(screen.getByLabelText(/password/i)).toHaveValue("");
    expect(screen.getByRole("textbox", { name: /company name/i })).toHaveValue("");
  });
});

describe("Form input", () => {
  it("updates each field on change", async () => {
    renderPage();
    await fillForm();
    expect(screen.getByRole("textbox", { name: /email/i })).toHaveValue("user@example.com");
    expect(screen.getByRole("textbox", { name: /full name/i })).toHaveValue("John Doe");
    expect(screen.getByLabelText(/password/i)).toHaveValue("secret123");
    expect(screen.getByRole("textbox", { name: /company name/i })).toHaveValue("Acme Inc");
  });
});

describe("Successful registration", () => {
  it("calls register with correct form values", async () => {
    mockRegister.mockResolvedValue();
    renderPage();
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith({
        email: "user@example.com",
        full_name: "John Doe",
        password: "secret123",
        company_name: "Acme Inc",
      })
    );
  });

  it("navigates to dashboard after successful registration", async () => {
    mockRegister.mockResolvedValue();
    renderPage();
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/operation/dashboard", { replace: true })
    );
  });

  it("does not show an error on success", async () => {
    mockRegister.mockResolvedValue();
    renderPage();
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });
});

describe("Failed registration", () => {
  it("displays the error message returned from register", async () => {
    mockRegister.mockRejectedValue(new Error("Email already in use"));
    renderPage();
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() =>
      expect(screen.getByText("Email already in use")).toBeInTheDocument()
    );
  });

  it("does not navigate on failure", async () => {
    mockRegister.mockRejectedValue(new Error("Email already in use"));
    renderPage();
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => screen.getByText("Email already in use"));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("clears previous error on new submission", async () => {
    mockRegister
      .mockRejectedValueOnce(new Error("Email already in use"))
      .mockResolvedValueOnce();

    renderPage();
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: /register/i }));
    await waitFor(() => screen.getByText("Email already in use"));

    await userEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() =>
      expect(screen.queryByText("Email already in use")).not.toBeInTheDocument()
    );
  });
});

describe("Submitting state", () => {
  it("disables the button while submitting", async () => {
    mockRegister.mockReturnValue(new Promise(() => {}));
    renderPage();
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: /register/i }));

    expect(screen.getByRole("button", { name: /olusturuluyor/i })).toBeDisabled();
  });

  it("re-enables the button after successful submission", async () => {
    mockRegister.mockResolvedValue();
    renderPage();
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /register/i })).not.toBeDisabled()
    );
  });

  it("re-enables the button after a failed submission", async () => {
    mockRegister.mockRejectedValue(new Error("Server error"));
    renderPage();
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /register/i })).not.toBeDisabled()
    );
  });
});

describe("Navigation links", () => {
  it("sign in link points to /signin", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /giris ekranina don/i })).toHaveAttribute("href", "/signin");
  });

  it("home link points to /", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /app_name/i })).toHaveAttribute("href", "/");
  });
});