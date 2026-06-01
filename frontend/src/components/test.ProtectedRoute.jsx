import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "../context/AuthContext";

jest.mock("../context/AuthContext");

describe("ProtectedRoute", () => {
test("renders loading state while authentication is being initialized", () => {
useAuth.mockReturnValue({
isAuthenticated: false,
isBootstrapping: true,
});

```
render(
  <MemoryRouter>
    <ProtectedRoute>
      <div>Dashboard</div>
    </ProtectedRoute>
  </MemoryRouter>
);

expect(screen.getByText("Oturum doğrulanıyor...")).toBeInTheDocument();
```

});

test("renders protected content when user is authenticated", () => {
useAuth.mockReturnValue({
isAuthenticated: true,
isBootstrapping: false,
});

```
render(
  <MemoryRouter>
    <ProtectedRoute>
      <div>Dashboard</div>
    </ProtectedRoute>
  </MemoryRouter>
);

expect(screen.getByText("Dashboard")).toBeInTheDocument();
```

});

test("redirects to signin when user is not authenticated", () => {
useAuth.mockReturnValue({
isAuthenticated: false,
isBootstrapping: false,
});

```
render(
  <MemoryRouter initialEntries={["/protected"]}>
    <ProtectedRoute>
      <div>Dashboard</div>
    </ProtectedRoute>
  </MemoryRouter>
);

expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
```

});
});
