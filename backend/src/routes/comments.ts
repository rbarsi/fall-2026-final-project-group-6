import { Router } from "express";
import { db } from "../db/database.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// GET comments associated with a listing
router.get("/listing/:listingId", async (req, res) => {
    try {
        const listingId = Number(req.params.listingId);

        // Check if the listing ID is valid
        if (
            !Number.isInteger(listingId) ||
            listingId <= 0 ||
            listingId > 2147483647
        ) {
            return res.status(400).json({
                error: "Invalid listing ID"
            });
        }

        // Check if the listing exists
        const listing = await (db as any)
            .selectFrom("listings")
            .select("id")
            .where("id", "=", listingId)
            .executeTakeFirst();

        if (!listing) {
            return res.status(404).json({
                error: "Listing not found"
            });
        }

        // Retrieve comments for this listing
        const comments = await (db as any)
            .selectFrom("comments")
            .selectAll()
            .where("listing_id", "=", listingId)
            .orderBy("created_at", "asc")
            .execute();

        return res.status(200).json(comments);

    } catch (err) {
        console.error("Failed to retrieve comments:", err);

        return res.status(500).json({
            error: "Failed to retrieve comments"
        });
    }
});

// POST - Create a comment
router.post("/", requireAuth, async (req, res) => {
    try {
        const { content, listing_id } = req.body ?? {};

        // Get the author from the current session
        const userId = req.session.userId;

        if (!userId) {
            return res.status(401).json({
                error: "Please log in first"
            });
        }

        // Reject empty comments
        if (
            typeof content !== "string" ||
            content.trim() === ""
        ) {
            return res.status(400).json({
                error: "Comment content is required"
            });
        }

        // Limit comment length
        if (content.trim().length > 2000) {
            return res.status(400).json({
                error: "Comment is too long"
            });
        }

        // Validate listing ID
        if (
            !Number.isInteger(listing_id) ||
            listing_id <= 0 ||
            listing_id > 2147483647
        ) {
            return res.status(400).json({
                error: "Invalid listing ID"
            });
        }

        // Make sure the listing exists
        const listing = await (db as any)
            .selectFrom("listings")
            .select("id")
            .where("id", "=", listing_id)
            .executeTakeFirst();

        if (!listing) {
            return res.status(404).json({
                error: "Listing not found"
            });
        }

        // Save the new comment
        const [newComment] = await (db as any)
            .insertInto("comments")
            .values({
                content: content.trim(),
                user_id: userId,
                listing_id: listing_id
            })
            .returningAll()
            .execute();

        return res.status(201).json(newComment);

    } catch (err) {
        console.error("Failed to create comment:", err);

        return res.status(500).json({
            error: "Failed to create comment"
        });
    }
});

// PUT - Edit an existing comment
router.put("/:id", requireAuth, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const userId = req.session.userId;
        const { content } = req.body ?? {};

        // Validate comment ID
        if (
            !Number.isInteger(id) ||
            id <= 0 ||
            id > 2147483647
        ) {
            return res.status(400).json({
                error: "Invalid comment ID"
            });
        }

        // Find the existing comment
        const existingComment = await (db as any)
            .selectFrom("comments")
            .selectAll()
            .where("id", "=", id)
            .executeTakeFirst();

        if (!existingComment) {
            return res.status(404).json({
                error: "Comment not found"
            });
        }

        // Only the author can edit the comment
        if (existingComment.user_id !== userId) {
            return res.status(403).json({
                error: "You can only edit your own comments"
            });
        }

        // Reject empty comments
        if (
            typeof content !== "string" ||
            content.trim() === ""
        ) {
            return res.status(400).json({
                error: "Comment content is required"
            });
        }

        if (content.trim().length > 2000) {
            return res.status(400).json({
                error: "Comment is too long"
            });
        }

        // Update only the comment content
        const updatedComment = await (db as any)
            .updateTable("comments")
            .set({
                content: content.trim()
            })
            .where("id", "=", id)
            .where("user_id", "=", userId)
            .returningAll()
            .executeTakeFirst();

        if (!updatedComment) {
            return res.status(404).json({
                error: "Comment no longer exists"
            });
        }

        return res.status(200).json(updatedComment);

    } catch (err) {
        console.error("Failed to update comment:", err);

        return res.status(500).json({
            error: "Failed to update comment"
        });
    }
});

// DELETE - Delete a comment
router.delete("/:id", requireAuth, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const userId = req.session.userId;

        // Validate comment ID
        if (
            !Number.isInteger(id) ||
            id <= 0 ||
            id > 2147483647
        ) {
            return res.status(400).json({
                error: "Invalid comment ID"
            });
        }

        // Find the comment
        const existingComment = await (db as any)
            .selectFrom("comments")
            .selectAll()
            .where("id", "=", id)
            .executeTakeFirst();

        if (!existingComment) {
            return res.status(404).json({
                error: "Comment not found"
            });
        }

        // Check ownership
        if (existingComment.user_id !== userId) {
            return res.status(403).json({
                error: "You can only delete your own comments"
            });
        }

        // Delete the comment
        const deletedComment = await (db as any)
            .deleteFrom("comments")
            .where("id", "=", id)
            .where("user_id", "=", userId)
            .returning("id")
            .executeTakeFirst();

        if (!deletedComment) {
            return res.status(404).json({
                error: "Comment no longer exists"
            });
        }

        return res.status(200).json({
            message: "Comment deleted successfully"
        });

    } catch (err) {
        console.error("Failed to delete comment:", err);

        return res.status(500).json({
            error: "Failed to delete comment"
        });
    }
});

export { router };
