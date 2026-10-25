import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  ListGroup,
  ListGroupItem,
  Modal,
  ModalBody,
  ModalHeader,
} from "reactstrap";
import { api, getErrorMessage } from "../api";
import TodoForm from "./todo-form";

function formatDueDate(value) {
  const localDate = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(localDate.getTime()) ? "" : localDate.toLocaleDateString();
}

const Home = ({ onLogout }) => {
  const [todos, setTodos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [completingId, setCompletingId] = useState(null);
  const [error, setError] = useState("");

  const loadTodos = useCallback(async () => {
    try {
      const response = await api.get("/todos");
      setTodos(response.data);
      setError("");
      return true;
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onLogout();
      } else {
        setError(getErrorMessage(requestError, "Could not load your todos."));
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const handleComplete = async (id) => {
    setCompletingId(id);
    setError("");
    try {
      await api.patch(`/todos/${id}`, { is_complete: true });
      await loadTodos();
    } catch (requestError) {
      if (requestError.response?.status === 401) onLogout();
      else setError(getErrorMessage(requestError, "Could not update this todo."));
    } finally {
      setCompletingId(null);
    }
  };

  const handleNewTodo = async (todo) => {
    setError("");
    try {
      await api.post("/todos", todo);
      setModalOpen(false);
      await loadTodos();
      return true;
    } catch (requestError) {
      if (requestError.response?.status === 401) onLogout();
      else {
        const message = getErrorMessage(requestError, "Could not save this todo.");
        setError(message);
        return message;
      }
      return false;
    }
  };

  return (
    <Card className="mt-5">
      <CardBody>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <CardTitle tag="h1" className="mb-0">Todos</CardTitle>
          <Button color="secondary" outline onClick={onLogout}>Sign out</Button>
        </div>
        {error && <Alert color="danger" role="alert">{error}</Alert>}
        {isLoading ? (
          <p role="status">Loading todos…</p>
        ) : todos.length === 0 ? (
          <p>No open todos yet.</p>
        ) : (
          <ListGroup className="mb-3">
            {todos.map((todo) => (
              <ListGroupItem key={todo._id}>
                <div className="d-flex gap-3 align-items-start">
                  <input
                    className="form-check-input mt-1"
                    type="checkbox"
                    aria-label={`Complete ${todo.title}`}
                    checked={todo.is_complete}
                    disabled={completingId === todo._id}
                    onChange={() => handleComplete(todo._id)}
                  />
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between gap-3">
                      <h2 className="h5 mb-1">{todo.title}</h2>
                      {todo.due_date && <small>Due: {formatDueDate(todo.due_date)}</small>}
                    </div>
                    {todo.description && <p className="mb-0">{todo.description}</p>}
                  </div>
                </div>
              </ListGroupItem>
            ))}
          </ListGroup>
        )}
        <Button color="primary" onClick={() => setModalOpen(true)}>Add Todo</Button>
      </CardBody>
      <Modal isOpen={modalOpen} toggle={() => setModalOpen((open) => !open)}>
        <ModalHeader toggle={() => setModalOpen(false)}>Add new Todo</ModalHeader>
        <ModalBody>
          <TodoForm saveTodo={handleNewTodo} />
        </ModalBody>
      </Modal>
    </Card>
  );
};

export default Home;
