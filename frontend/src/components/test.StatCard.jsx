import { render, screen } from "@testing-library/react";
import StatCard from "./StatCard";

describe("StatCard", () => {
test("renders label and value", () => {
render(<StatCard label="Users" value="150" />);

```
expect(screen.getByText("Users")).toBeInTheDocument();
expect(screen.getByText("150")).toBeInTheDocument();
```

});

test("uses blue accent by default", () => {
const { container } = render( <StatCard label="Users" value="150" />
);

```
expect(
  container.querySelector(".stat-card")
).toHaveClass("stat-blue");
```

});

test("applies custom accent class", () => {
const { container } = render( <StatCard
     label="Revenue"
     value="$5000"
     accent="green"
   />
);

```
expect(
  container.querySelector(".stat-card")
).toHaveClass("stat-green");
```

});
});
