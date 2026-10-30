import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { api } from "./api";

vi.mock("./api", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  getErrorMessage: (error, fallback) => error.response?.data?.error || fallback,
}));

describe("application sign-in", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("signs in and loads the todo screen", async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { authenticated: true } });
    api.get.mockImplementation((path) => path === "/auth/session"
      ? Promise.reject({ response: { status: 401 } })
      : Promise.resolve({ data: [] }));

    render(<App />);
    await user.type(await screen.findByLabelText("Username"), "todo-admin");
    await user.type(screen.getByLabelText("Password"), "a-secure-test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("heading", { name: "Todos" })).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith("/auth/login", {
      username: "todo-admin",
      password: "a-secure-test-password",
    });
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/todos"));
  });

  it("shows a useful error when credentials are rejected", async () => {
    const user = userEvent.setup();
    api.get.mockRejectedValue({ response: { status: 401 } });
    api.post.mockRejectedValue({ response: { data: { error: "Invalid username or password." } } });

    render(<App />);
    await user.type(await screen.findByLabelText("Username"), "wrong-user");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid username or password.");
  });

  it("creates a todo and marks it complete", async () => {
    const user = userEvent.setup();
    const todo = { _id: "507f1f77bcf86cd799439011", title: "Review deploy plan", description: "Check the API", due_date: null, is_complete: false };
    let created = false;
    let completed = false;
    api.get.mockImplementation((path) => path === "/auth/session"
      ? Promise.reject({ response: { status: 401 } })
      : Promise.resolve({ data: created && !completed ? [todo] : [] }));
    api.post.mockImplementation((path) => {
      if (path === "/auth/login") return Promise.resolve({ data: { authenticated: true } });
      created = true;
      return Promise.resolve({ data: todo });
    });
    api.patch.mockImplementation(() => {
      completed = true;
      return Promise.resolve({ data: { ...todo, is_complete: true } });
    });

    render(<App />);
    await user.type(await screen.findByLabelText("Username"), "todo-admin");
    await user.type(screen.getByLabelText("Password"), "a-secure-test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await user.click(await screen.findByRole("button", { name: "Add Todo" }));
    await user.type(screen.getByLabelText("Title"), todo.title);
    await user.type(screen.getByLabelText("Description"), todo.description);
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("heading", { name: todo.title })).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith("/todos", {
      title: todo.title,
      description: todo.description,
    });

    await user.click(screen.getByRole("checkbox", { name: `Complete ${todo.title}` }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith(`/todos/${todo._id}`, { is_complete: true }));
    expect(await screen.findByText("No open todos yet.")).toBeInTheDocument();
  });
});
