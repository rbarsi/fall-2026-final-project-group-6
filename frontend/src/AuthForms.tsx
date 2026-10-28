
import { Profile } from "./Profile";
import { useEffect, useState, type FormEvent } from "react";
import {
  signup,
  login,
  logout,
  getCurrentUser,
  type User
} from "./auth";

export function AuthForms() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [user, setUser] = useState<User | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if the student is already logged in
  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) setError("Could not check login status.");
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function switchMode(nextMode: "login" | "signup") {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (mode === "signup") {
      if (!name.trim()) {
        setError("Please enter your name.");
        return;
      }

      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        await signup(name.trim(), email.trim(), password);

        setMode("login");
        setPassword("");
        setConfirmPassword("");
        setMessage("Account created! Please sign in.");
      } else {
        await login(email.trim(), password);

        const currentUser = await getCurrentUser();

        if (!currentUser) {
          throw new Error("Unable to load your login session.");
        }

        setUser(currentUser);
        setPassword("");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    setError("");

    try {
      await logout();
      setUser(null);
      setPassword("");
      setMode("login");
      setMessage("You have successfully logged out.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Logout failed."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return <p>Checking login status...</p>;
  }

  return (
    <section>
      {user ? (
        <div>
          <h2>Welcome, {user.name}!</h2>
          <p>Signed in as: {user.email}</p>

          <button onClick={() => void handleLogout()} disabled={loading}>
            {loading ? "Logging out..." : "Log Out"}
          </button>
          <Profile
        user={user}
        onProfileUpdated={setUser}
        onAccountDeleted={() => {
          setUser(null);
          setMode("login");
          setName("");
          setEmail("");
          setPassword("");
          setConfirmPassword("");
          setError("");
          setMessage("Your account has been deleted");
        }}
        />
        </div>
        
      ) : (
        <div>
          <h2>{mode === "signup" ? "Create Account" : "Sign In"}</h2>

          <form onSubmit={(e) => void handleSubmit(e)}>
            {mode === "signup" && (
              <div>
                <label htmlFor="signup-name">Full Name</label>
                <input
                  id="signup-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                required
              />
            </div>

            {mode === "signup" && (
              <div>
                <label htmlFor="confirm-password">Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}

            <button type="submit" disabled={loading}>
              {loading
                ? "Please wait..."
                : mode === "signup"
                  ? "Create Account"
                  : "Sign In"}
            </button>
          </form>

          <p>
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}
          </p>

          <button
            type="button"
            onClick={() => switchMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Sign Up" : "Sign In"}
          </button>
        </div>
      )}

      {error && <p role="alert" style={{ color: "red" }}>{error}</p>}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
