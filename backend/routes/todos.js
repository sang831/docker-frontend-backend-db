const express = require("express");
const router = express.Router();
const Todo = require("../models/todo");

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const allowedFields = new Set(["title", "description", "is_complete", "due_date"]);

function validateTodoInput(body, { partial = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "A JSON object is required." };
  }
  const keys = Object.keys(body);
  const unknown = keys.find((key) => !allowedFields.has(key));
  if (unknown) return { error: `Unknown field: ${unknown}.` };
  if (partial && keys.length === 0) return { error: "At least one field must be provided." };

  const todo = {};
  if (!partial || Object.hasOwn(body, "title")) {
    if (typeof body.title !== "string" || !body.title.trim()) return { error: "Title is required." };
    if (body.title.trim().length > 120) return { error: "Title must be 120 characters or fewer." };
    todo.title = body.title.trim();
  }
  if (Object.hasOwn(body, "description")) {
    if (typeof body.description !== "string") return { error: "Description must be text." };
    if (body.description.length > 2000) return { error: "Description must be 2000 characters or fewer." };
    todo.description = body.description.trim();
  } else if (!partial) {
    todo.description = "";
  }
  if (Object.hasOwn(body, "is_complete")) {
    if (typeof body.is_complete !== "boolean") return { error: "is_complete must be a boolean." };
    todo.is_complete = body.is_complete;
  }
  if (Object.hasOwn(body, "due_date")) {
    if (body.due_date === null || body.due_date === "") {
      todo.due_date = null;
    } else {
      const date = new Date(body.due_date);
      if (Number.isNaN(date.getTime())) return { error: "due_date must be a valid date." };
      todo.due_date = date;
    }
  } else if (!partial) {
    todo.due_date = null;
  }
  if (!partial && !Object.hasOwn(body, "is_complete")) todo.is_complete = false;
  return { value: todo };
}

function validateId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}

// GET all todos
router.get("/", asyncRoute(async (req, res) => {
  const todos = await Todo.find({ is_complete: false }).sort({ due_date: 1, _id: 1 }).lean();
  res.json(todos);
}));

// GET todo based on ID
router.get("/:id", asyncRoute(async (req, res) => {
  if (!validateId(req.params.id)) return res.status(400).json({ error: "Invalid todo id." });
  const todo = await Todo.findById(req.params.id).lean();
  if (!todo) return res.status(404).json({ error: "Todo not found." });
  return res.json(todo);
}));

// POST create new todo
router.post("/", asyncRoute(async (req, res) => {
  const result = validateTodoInput(req.body);
  if (result.error) return res.status(400).json({ error: result.error });
  const todo = await Todo.create(result.value);
  return res.status(201).json(todo);
}));

// UPDATE todo
router.patch("/:id", asyncRoute(async (req, res) => {
  if (!validateId(req.params.id)) return res.status(400).json({ error: "Invalid todo id." });
  const result = validateTodoInput(req.body, { partial: true });
  if (result.error) return res.status(400).json({ error: result.error });
  const todo = await Todo.findByIdAndUpdate(req.params.id, result.value, { new: true, runValidators: true });
  if (!todo) return res.status(404).json({ error: "Todo not found." });
  return res.json(todo);
}));

// DELETE todo
router.delete("/:id", asyncRoute(async (req, res) => {
  if (!validateId(req.params.id)) return res.status(400).json({ error: "Invalid todo id." });
  const todo = await Todo.findByIdAndDelete(req.params.id);
  if (!todo) return res.status(404).json({ error: "Todo not found." });
  return res.status(204).end();
}));

module.exports = router;
module.exports.validateTodoInput = validateTodoInput;
