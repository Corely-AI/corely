import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, CardContent, Input, Label } from "@corely/ui";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { ensureDefaultWorkspace } from "./ensure-default-workspace";

export const SignupPage = () => {
  const navigate = useNavigate();
  const { signup, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      await signup({ email, password });
      await ensureDefaultWorkspace(email);
      navigate("/overview", { replace: true });
    } catch {
      setError("Unable to create account or initialize workspace.");
    } finally {
      setIsLoading(false);
    }
  };

  const displayError = error || authError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <h1 className="text-2xl font-semibold">Create Freelancer Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign up to start your workspace.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {displayError ? (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {displayError}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Sign up"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/auth/login" className="text-accent">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignupPage;
