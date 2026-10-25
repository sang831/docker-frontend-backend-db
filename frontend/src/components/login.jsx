import { useState } from "react";
import { Alert, Button, Card, CardBody, CardTitle, Form, FormGroup, Input, Label } from "reactstrap";
import { api, getErrorMessage } from "../api";

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await api.post("/auth/login", { username, password });
      onLogin();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to sign in."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto mt-5" style={{ maxWidth: "28rem" }}>
      <CardBody>
        <CardTitle tag="h1">Sign in</CardTitle>
        <p>Enter the application credentials configured by the administrator.</p>
        {error && <Alert color="danger" role="alert">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label for="username">Username</Label>
            <Input id="username" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
          </FormGroup>
          <FormGroup>
            <Label for="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </FormGroup>
          <Button color="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </Form>
      </CardBody>
    </Card>
  );
};

export default Login;
