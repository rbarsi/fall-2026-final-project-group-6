
import { Router } from "express";
import { sql } from "kysely";
import { db } from "../db/database.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const profileRouter = Router();

interface ProfileRow {
  id: number;
  username: string;
  email: string;
  created_at: Date;
}

function safeProfile(user: ProfileRow) {
  return {
    id: user.id,
    name: user.username,
    email: user.email,
    createdAt: user.created_at
  };
}

// VIEW OWN PROFILE
profileRouter.get("/", requireAuth, async (req, res) => {
  try {
    const result = await sql<ProfileRow>`
      SELECT id, username, email, created_at
      FROM users
      WHERE id = ${req.session.userId}
    `.execute(db);

    const user = result.rows[0];

    if (!user) {
      res.status(404).json({ message: "Account not found" });
      return;
    }

    res.json({ user: safeProfile(user) });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ message: "Could not load profile" });
  }
});

// UPDATE OWN PROFILE
profileRouter.put("/", requireAuth, async (req, res) => {
  const body = req.body;

  // Only name and email can be changed.
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some(
      (key) => !["name", "email"].includes(key)
    )
  ) {
    res.status(400).json({ message: "Invalid profile fields" });
    return;
  }

  const { name, email } = body;

  if (typeof name !== "string" || typeof email !== "string") {
    res.status(400).json({ message: "Name and email are required" });
    return;
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (
    !cleanName ||
    cleanName.length > 100 ||
    cleanEmail.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
  ) {
    res.status(400).json({ message: "Invalid name or email" });
    return;
  }

  try {
    const result = await sql<ProfileRow>`
      UPDATE users
      SET username = ${cleanName}, email = ${cleanEmail}
      WHERE id = ${req.session.userId}
      RETURNING id, username, email, created_at
    `.execute(db);

    const user = result.rows[0];

    if (!user) {
      res.status(404).json({ message: "Account not found" });
      return;
    }

    res.json({
      message: "Profile updated successfully",
      user: safeProfile(user)
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      res.status(409).json({
        message: "Name or email is already in use"
      });
      return;
    }

    console.error("Update profile error:", error);
    res.status(500).json({ message: "Could not update profile" });
  }
});

// DELETE OWN ACCOUNT
profileRouter.delete("/", requireAuth, async (req, res) => {
  if (req.body?.confirmation !== "DELETE") {
    res.status(400).json({
      message: "Type DELETE to confirm account deletion"
    });
    return;
  }

  try {
    const result = await sql<{ id: number }>`
      DELETE FROM users
      WHERE id = ${req.session.userId}
      RETURNING id
    `.execute(db);

    if (result.rows.length === 0) {
      res.status(404).json({ message: "Account not found" });
      return;
    }

    req.session.destroy((error) => {
      if (error) {
        console.error("Session cleanup error:", error);
      }

      res.clearCookie("connect.sid");
      res.json({ message: "Account deleted successfully" });
    });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ message: "Could not delete account" });
  }
});
