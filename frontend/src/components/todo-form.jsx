import { useState } from "react";
import { Button, Form, FormGroup, Input, Label } from "reactstrap";

const TodoForm = ({ saveTodo }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Enter a title for this todo.");
      return;
    }
    if (trimmedTitle.length > 120) {
      setError("Title must be 120 characters or fewer.");
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      const saved = await saveTodo({
        title: trimmedTitle,
        description: description.trim(),
        ...(dueDate ? { due_date: dueDate } : {}),
      });
      if (saved) {
        setTitle("");
        setDescription("");
        setDueDate("");
      } else {
        setError("Could not save this todo. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form onSubmit={onSubmit}>
      {error && <p className="text-danger" role="alert">{error}</p>}
      <FormGroup>
        <Label for="title">Title</Label>
        <Input id="title" name="title" placeholder="Enter a title" type="text" maxLength="120" value={title} onChange={(event) => setTitle(event.target.value)} required autoFocus />
      </FormGroup>
      <FormGroup>
        <Label for="description">Description</Label>
        <Input id="description" name="description" placeholder="Enter a description" type="textarea" maxLength="2000" value={description} onChange={(event) => setDescription(event.target.value)} />
      </FormGroup>
      <FormGroup>
        <Label for="due-date">Due date</Label>
        <Input id="due-date" name="due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
      </FormGroup>
      <Button color="primary" type="submit" disabled={isSaving}>
        {isSaving ? "Saving…" : "Save"}
      </Button>
    </Form>
  );
};

export default TodoForm;
