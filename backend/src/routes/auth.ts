
import { Router } from "express";
import bcrypt from "bcrypt";
import { sql } from "kysely";
import { db } from "../db/database.js";
import { requireAuth } from "../middleware/requireAuth.js";

// Create router for authentication endpoints
export const authRouter = Router();

// Define what a user looks like
interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
}

// Remove password hash from API responses
function safeUser(user: User) {
  return {
    id: user.id,
    name: user.username,
    email: user.email
  };
}

// ===================================
// SIGNUP - ISSUE #9
// ===================================

authRouter.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Check that all fields were provided
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      res.status(400).json({
        message: "All fields are required"
      });
      return;
    }

    // 2. Clean up input
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // 3. Validate name and email lengths
    if (
      cleanName.length > 100 ||
      cleanEmail.length > 255
    ) {
      res.status(400).json({
        message: "Name or email is too long"
      });
      return;
    }

    // 4. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      res.status(400).json({
        message: "Please enter a valid email"
      });
      return;
    }

    // 5. Validate password length
    if (password.length < 8 || password.length > 72) {
      res.status(400).json({
        message: "Password must be 8 to 72 characters"
      });
      return;
    }

    // 6. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 7. Save new user to PostgreSQL
    // ON CONFLICT prevents duplicate emails
    const result = await sql<User>`
      INSERT INTO users (username, email, password_hash)
      VALUES (${cleanName}, ${cleanEmail}, ${hashedPassword})
      ON CONFLICT (email) DO NOTHING
      RETURNING id, username, email
    `.execute(db);

    const newUser = result.rows[0];

    // 8. Check if email was already registered
    if (!newUser) {
      res.status(409).json({
        message: "Email is already registered"
      });
      return;
    }

    // 9. Send success response
    res.status(201).json({
      message: "Account created successfully",
      user: safeUser(newUser)
    });

  } catch (error) {
    console.error("Signup error:", error);

    res.status(500).json({
      message: "Something went wrong"
    });
  }
});


// ===================================
// LOGIN - ISSUE #10
// ===================================

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate the inputs
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      res.status(400).json({
        message: "Email and password are required"
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // 2. Find the user in the database
    const result = await sql<User>`
      SELECT id, username, email, password_hash
      FROM users
      WHERE email = ${cleanEmail}
    `.execute(db);

    const user = result.rows[0];

    // 3. Check whether the user exists
    if (!user.password_hash) {
      res.status(401).json({
        message: "Invalid email or password"
      });
      return;
    }

    // 4. Compare the entered password to the saved hash
    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      res.status(401).json({
        message: "Invalid email or password"
      });
      return;
    }

    // 5. Create a new session
    req.session.regenerate((error) => {
      if (error) {
        res.status(500).json({
          message: "Could not create session"
        });
        return;
      }

      // Store the user's ID in the session
      req.session.userId = user.id;

      // Save the session
      req.session.save((saveError) => {
        if (saveError) {
          res.status(500).json({
            message: "Could not save session"
          });
          return;
        }

        res.status(200).json({
          message: "Login successful",
          user: safeUser(user)
        });
      });
    });

  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Something went wrong"
    });
  }
});


// ===================================
// LOGOUT - ISSUE #10
// ===================================

authRouter.post("/logout", (req, res) => {
  // Destroy the session
  req.session.destroy((error) => {
    if (error) {
      res.status(500).json({
        message: "Logout failed"
      });
      return;
    }

    // Remove the session cookie
    res.clearCookie("connect.sid");

    res.status(200).json({
      message: "Logged out successfully"
    });
  });
});


// ===================================
// CURRENT USER - ISSUE #10
// ===================================

authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    // Find the currently logged-in user
    const result = await sql<User>`
      SELECT id, username, email, password_hash
      FROM users
      WHERE id = ${req.session.userId}
    `.execute(db);

    const user = result.rows[0];

    if (!user) {
      res.status(401).json({
        message: "User no longer exists"
      });
      return;
    }

    // Return safe user information
    res.status(200).json({
      user: safeUser(user)
    });

  } catch (error) {
    console.error("Current user error:", error);

    res.status(500).json({
      message: "Something went wrong"
    });
  }
});
