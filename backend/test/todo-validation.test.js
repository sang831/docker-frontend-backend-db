const test = require("node:test");
const assert = require("node:assert/strict");
const { validateTodoInput } = require("../routes/todos");

test("create validation requires and trims a title", () => {
  assert.match(validateTodoInput({}).error, /Title is required/);
  assert.deepEqual(validateTodoInput({ title: "  Buy milk  " }).value, {
    title: "Buy milk",
    description: "",
    due_date: null,
    is_complete: false,
  });
});

test("partial validation preserves false and allows clearing optional fields", () => {
  const result = validateTodoInput({ is_complete: false, description: "", due_date: null }, { partial: true });
  assert.deepEqual(result.value, { description: "", is_complete: false, due_date: null });
});

test("validation rejects invalid dates, booleans, empty patches, and unknown fields", () => {
  assert.match(validateTodoInput({ title: "Task", due_date: "not-a-date" }).error, /valid date/);
  assert.match(validateTodoInput({ title: "Task", is_complete: "false" }).error, /boolean/);
  assert.match(validateTodoInput({}, { partial: true }).error, /At least one field/);
  assert.match(validateTodoInput({ title: "Task", owner: "someone" }).error, /Unknown field/);
});

test("title and description are limited to safe lengths", () => {
  assert.match(validateTodoInput({ title: "x".repeat(121) }).error, /120 characters/);
  assert.match(validateTodoInput({ title: "Task", description: "x".repeat(2001) }).error, /2000 characters/);
});
