
import { useEffect, useState, type FormEvent } from "react";
import type { User } from "./auth";

type ProfileData = User & {
  createdAt: string;
};

type ProfileProps = {
  user: User;
  onProfileUpdated: (user: User) => void;
  onAccountDeleted: () => void;
};

// Send requests to the profile backend.
async function profileRequest<T>(
  method: "GET" | "PUT" | "DELETE",
  body?: object
): Promise<T> {
  const response = await fetch("/api/profile", {
    method,
    credentials: "same-origin",
    ...(body
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data as T;
}

export function Profile({
  user,
  onProfileUpdated,
  onAccountDeleted,
}: ProfileProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [createdAt, setCreatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showDelete, setShowDelete] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Load the signed-in student's profile.
  useEffect(() => {
    let active = true;

    profileRequest<{ user: ProfileData }>("GET")
      .then(({ user: profile }) => {
        if (!active) return;
        setName(profile.name);
        setEmail(profile.email);
        setCreatedAt(profile.createdAt);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user.id]);

  // Update only the allowed profile fields.
  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setSaving(true);

    try {
      const result = await profileRequest<{ user: User }>(
        "PUT",
        {
          name: name.trim(),
          email: email.trim(),
        }
      );

      setName(result.user.name);
      setEmail(result.user.email);
      onProfileUpdated(result.user);
      setMessage("Profile updated successfully!");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Update failed."
      );
    } finally {
      setSaving(false);
    }
  }

  // Delete the signed-in student's account.
  async function handleDelete() {
    setError("");
    setMessage("");

    if (confirmation !== "DELETE") {
      setError('Type DELETE to confirm account deletion.');
      return;
    }

    setDeleting(true);

    try {
      await profileRequest<{ message: string }>("DELETE", {
        confirmation: "DELETE",
      });

      onAccountDeleted();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Deletion failed."
      );
      setDeleting(false);
    }
  }

  if (loading) {
    return <p>Loading your profile...</p>;
  }

  return (
    <section className="profile-section">
      <h2>My Account</h2>

      <form onSubmit={(e) => void handleSave(e)}>
        <div>
          <label htmlFor="profile-name">Full Name</label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
          />
        </div>

        <div>
          <label htmlFor="profile-email">Email Address</label>
          <input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={255}
            required
          />
        </div>

        {createdAt && (
          <p>
            Member since:{" "}
            {new Date(createdAt).toLocaleDateString()}
          </p>
        )}

        <button type="submit" disabled={saving || deleting}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      <hr />

      <h3>Delete Account</h3>
      <p>
        Deleting your account is permanent and may remove
        your associated listings and comments.
      </p>

      {!showDelete ? (
        <button
          type="button"
          onClick={() => setShowDelete(true)}
        >
          Delete My Account
        </button>
      ) : (
        <div>
          <p>
            To confirm, type <strong>DELETE</strong> below.
          </p>

          <label htmlFor="delete-confirmation">
            Confirmation
          </label>
          <input
            id="delete-confirmation"
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />

          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={confirmation !== "DELETE" || deleting}
          >
            {deleting ? "Deleting..." : "Confirm Delete"}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowDelete(false);
              setConfirmation("");
              setError("");
            }}
            disabled={deleting}
          >
            Cancel
          </button>
        </div>
      )}

      {error && <p role="alert" style={{ color: "red" }}>{error}</p>}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
