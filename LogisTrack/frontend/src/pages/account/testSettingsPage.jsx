import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SettingsPage from "./SettingsPage";

const updatePreferences = jest.fn();
const changePassword = jest.fn();
const changeLanguage = jest.fn();
const t = (key) => key;

const languages = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
];

jest.mock("./../../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("./../../context/LanguageContext", () => ({
  useLanguage: jest.fn(),
}));

jest.mock("./../../components/PageHeader", () => ({ title, subtitle }) => (
  <div>
    <h1>{title}</h1>
    <p>{subtitle}</p>
  </div>
));

const { useAuth } = require("./../../context/AuthContext");
const { useLanguage } = require("./../../context/LanguageContext");

const mockUser = { notify_email: true, notify_push: false };

beforeEach(() => {
  useAuth.mockReturnValue({ user: mockUser, updatePreferences, changePassword });
  useLanguage.mockReturnValue({ language: "tr", changeLanguage, t, languages });
  updatePreferences.mockReset();
  changePassword.mockReset();
  changeLanguage.mockReset();
  updatePreferences.mockResolvedValue({});
  changePassword.mockResolvedValue({});
  changeLanguage.mockResolvedValue({});
});

describe("SettingsPage rendering", () => {
  test("renders translated section headings", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("settings");
    expect(screen.getByText("language")).toBeInTheDocument();
    expect(screen.getByText("notifications")).toBeInTheDocument();
    expect(screen.getByText("change_password")).toBeInTheDocument();
  });

  test("renders language options from context", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("option", { name: "Türkçe" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
  });

  test("sets current language as selected", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("combobox")).toHaveValue("tr");
  });

  test("initialises notify_email checkbox from user context", () => {
    render(<SettingsPage />);
    const [emailCheckbox] = screen.getAllByRole("checkbox");
    expect(emailCheckbox).toBeChecked();
  });

  test("initialises notify_push checkbox from user context", () => {
    render(<SettingsPage />);
    const [, pushCheckbox] = screen.getAllByRole("checkbox");
    expect(pushCheckbox).not.toBeChecked();
  });
});

describe("SettingsPage language change", () => {
  test("calls changeLanguage with selected value", async () => {
    render(<SettingsPage />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "en" } });

    await waitFor(() => expect(changeLanguage).toHaveBeenCalledWith("en"));
  });

  test("shows success message after language change", async () => {
    render(<SettingsPage />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "en" } });

    expect(await screen.findByText("Dil tercihi guncellendi.")).toBeInTheDocument();
  });

  test("shows error message when changeLanguage fails", async () => {
    changeLanguage.mockRejectedValueOnce(new Error("lang error"));
    render(<SettingsPage />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "en" } });

    expect(await screen.findByText("lang error")).toBeInTheDocument();
  });
});

describe("SettingsPage notification preferences", () => {
  test("toggles notify_email checkbox", () => {
    render(<SettingsPage />);
    const [emailCheckbox] = screen.getAllByRole("checkbox");
    fireEvent.click(emailCheckbox);
    expect(emailCheckbox).not.toBeChecked();
  });

  test("toggles notify_push checkbox", () => {
    render(<SettingsPage />);
    const [, pushCheckbox] = screen.getAllByRole("checkbox");
    fireEvent.click(pushCheckbox);
    expect(pushCheckbox).toBeChecked();
  });

  test("calls updatePreferences with current checkbox state", async () => {
    render(<SettingsPage />);
    const [, pushCheckbox] = screen.getAllByRole("checkbox");
    fireEvent.click(pushCheckbox);
    fireEvent.click(screen.getByRole("button", { name: "save_settings" }));

    await waitFor(() =>
      expect(updatePreferences).toHaveBeenCalledWith({
        notify_email: true,
        notify_push: true,
      })
    );
  });

  test("shows success message after saving preferences", async () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "save_settings" }));

    expect(await screen.findByText("Tercihler guncellendi.")).toBeInTheDocument();
  });

  test("shows error message when updatePreferences fails", async () => {
    updatePreferences.mockRejectedValueOnce(new Error("pref error"));
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "save_settings" }));

    expect(await screen.findByText("pref error")).toBeInTheDocument();
  });
});

describe("SettingsPage password change", () => {
  function fillPasswordForm(current = "oldpass1", next = "newpass1") {
    fireEvent.change(screen.getByLabelText("current_password"), {
      target: { name: "current_password", value: current },
    });
    fireEvent.change(screen.getByLabelText("new_password"), {
      target: { name: "new_password", value: next },
    });
  }

  test("calls changePassword with form values", async () => {
    render(<SettingsPage />);
    fillPasswordForm("oldpass1", "newpass1");
    fireEvent.click(screen.getByRole("button", { name: "update_password" }));

    await waitFor(() =>
      expect(changePassword).toHaveBeenCalledWith({
        current_password: "oldpass1",
        new_password: "newpass1",
      })
    );
  });

  test("clears password fields after successful submit", async () => {
    render(<SettingsPage />);
    fillPasswordForm("oldpass1", "newpass1");
    fireEvent.click(screen.getByRole("button", { name: "update_password" }));

    await waitFor(() => {
      expect(screen.getByLabelText("current_password")).toHaveValue("");
      expect(screen.getByLabelText("new_password")).toHaveValue("");
    });
  });

  test("shows success message after password update", async () => {
    render(<SettingsPage />);
    fillPasswordForm();
    fireEvent.click(screen.getByRole("button", { name: "update_password" }));

    expect(await screen.findByText("Sifre basariyla guncellendi.")).toBeInTheDocument();
  });

  test("shows error message when changePassword fails", async () => {
    changePassword.mockRejectedValueOnce(new Error("wrong password"));
    render(<SettingsPage />);
    fillPasswordForm();
    fireEvent.click(screen.getByRole("button", { name: "update_password" }));

    expect(await screen.findByText("wrong password")).toBeInTheDocument();
  });
});

describe("SettingsPage user context sync", () => {
  test("updates checkboxes when user object changes", () => {
    useAuth.mockReturnValue({
      user: { notify_email: false, notify_push: false },
      updatePreferences,
      changePassword,
    });
    const { rerender } = render(<SettingsPage />);

    useAuth.mockReturnValue({
      user: { notify_email: true, notify_push: true },
      updatePreferences,
      changePassword,
    });
    rerender(<SettingsPage />);

    const [emailCheckbox, pushCheckbox] = screen.getAllByRole("checkbox");
    expect(emailCheckbox).toBeChecked();
    expect(pushCheckbox).toBeChecked();
  });

  test("handles null user without crashing", () => {
    useAuth.mockReturnValue({ user: null, updatePreferences, changePassword });
    expect(() => render(<SettingsPage />)).not.toThrow();
  });
});