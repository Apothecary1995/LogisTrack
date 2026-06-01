import { render, screen } from "@testing-library/react";
import ProfilePage from "./ProfilePage";

const mockUser = {
  email: "alice@example.com",
  full_name: "Alice Smith",
  company_name: "Acme Ltd",
  date_joined: "2023-06-15",
};

const t = (key) => key;

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

jest.mock("./../../lib/formatters", () => ({
  formatDate: (value) => `D:${value}`,
}));

const { useAuth } = require("./../../context/AuthContext");
const { useLanguage } = require("./../../context/LanguageContext");

beforeEach(() => {
  useAuth.mockReturnValue({ user: mockUser });
  useLanguage.mockReturnValue({ t });
});

describe("ProfilePage with full user data", () => {
  test("renders email", () => {
    render(<ProfilePage />);
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  test("renders full name", () => {
    render(<ProfilePage />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  test("renders company name", () => {
    render(<ProfilePage />);
    expect(screen.getByText("Acme Ltd")).toBeInTheDocument();
  });

  test("renders formatted date_joined via formatDate", () => {
    render(<ProfilePage />);
    expect(screen.getByText("D:2023-06-15")).toBeInTheDocument();
  });

  test("passes translated title and subtitle to PageHeader", () => {
    render(<ProfilePage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("profile");
    expect(screen.getByText(/kullanici profili/i)).toBeInTheDocument();
  });

  test("renders translated label keys for company and member_since", () => {
    render(<ProfilePage />);
    expect(screen.getByText("company")).toBeInTheDocument();
    expect(screen.getByText("member_since")).toBeInTheDocument();
  });
});

describe("ProfilePage with missing user fields", () => {
  test("shows dash when email is missing", () => {
    useAuth.mockReturnValue({ user: { ...mockUser, email: null } });
    render(<ProfilePage />);
    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(1);
  });

  test("shows dash when full_name is missing", () => {
    useAuth.mockReturnValue({ user: { ...mockUser, full_name: "" } });
    render(<ProfilePage />);
    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(1);
  });

  test("shows dash when company_name is missing", () => {
    useAuth.mockReturnValue({ user: { ...mockUser, company_name: undefined } });
    render(<ProfilePage />);
    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(1);
  });

  test("renders formatDate result even when date_joined is undefined", () => {
    useAuth.mockReturnValue({ user: { ...mockUser, date_joined: undefined } });
    render(<ProfilePage />);
    expect(screen.getByText("D:undefined")).toBeInTheDocument();
  });

  test("renders dashes when user is null", () => {
    useAuth.mockReturnValue({ user: null });
    render(<ProfilePage />);
    expect(screen.getAllByText("-")).toHaveLength(3);
  });
});