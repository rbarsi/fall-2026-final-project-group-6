import { Router } from "express";
import { db } from "../db/database.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// GET - View a public user profile
router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (
            !Number.isInteger(id) ||
            id <= 0 ||
            id > 2147483647
        ) {
            return res.status(400).json({
                error: "Invalid user ID"
            });
        }

        // Only select public account fields
        const user = await (db as any)
            .selectFrom("users")
            .select(["id", "username"])
            .where("id", "=", id)
            .executeTakeFirst();

        if (!user) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        return res.status(200).json(user);

    } catch (err) {
        console.error("Failed to retrieve user:", err);

        return res.status(500).json({
            error: "Failed to retrieve user"
        });
    }
});

// PUT - Update your own account
router.put("/:id", requireAuth, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const userId = req.session.userId;
        const { username } = req.body ?? {};

        // Validate user ID
        if (
            !Number.isInteger(id) ||
            id <= 0 ||
            id > 2147483647
        ) {
            return res.status(400).json({
                error: "Invalid user ID"
            });
        }

        // Users can only modify their own account
        if (id !== userId) {
            return res.status(403).json({
                error: "You can only modify your own account"
            });
        }

        // Validate username
        if (
            typeof username !== "string" ||
            username.trim() === "" ||
            username.trim().length > 255
        ) {
            return res.status(400).json({
                error: "Please enter a valid username"
            });
        }

        // Only update the allowed field
        const updatedUser = await (db as any)
            .updateTable("users")
            .set({
                username: username.trim()
            })
            .where("id", "=", userId)
            .returning(["id", "username"])
            .executeTakeFirst();

        if (!updatedUser) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        return res.status(200).json(updatedUser);

    } catch (err) {
        const dbError = err as { code?: string };

        // Duplicate username
        if (dbError.code === "23505") {
            return res.status(409).json({
                error: "Username is already taken"
            });
        }

        console.error("Failed to update account:", err);

        return res.status(500).json({
            error: "Failed to update account"
        });
    }
});

export { router };
