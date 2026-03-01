import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, CardContent, Input, Label } from "@corely/ui";
import { useAuth } from "@corely/web-shared/lib/auth-provider";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { signin, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await signin({ email, password });
      navigate("/overview", { replace: true });
    } catch {
      setError("Unable to sign in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <h1 className="text-2xl font-semibold">Freelancer Login</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your workspace.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {error || authError ? (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error || authError}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Need an account?{" "}
              <Link to="/auth/signup" className="text-accent">
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
