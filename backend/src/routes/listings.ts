import { Router } from "express";
import { db } from '../db/database.js';
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.get("/", async (_req, res) => {
    try {
        const listings = await (db as any).selectFrom("listings").selectAll().execute();
        res.json(listings);
    } catch (err) {
        res.status(500).json({ error: "FAILED to fetch listings" });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        // Check for a valid ID
        if (
            !Number.isInteger(id) ||
            id <= 0 ||
            id > 2147483647
        ) {
            res.status(400).json({
                error: "Invalid listing ID"
            });
            return;
        }

        // Find the listing
        const listing = await (db as any)
            .selectFrom("listings")
            .selectAll()
            .where("id", "=", id)
            .executeTakeFirst();

        // Listing doesn't exist
        if (!listing) {
            res.status(404).json({
                error: "Listing not found"
            });
            return;
        }

        // Return the listing
        res.status(200).json(listing);

    } catch (err) {
        console.error("Failed to retrieve listing:", err);

        res.status(500).json({
            error: "Failed to retrieve listing"
        });
    }
});

router.put('/:id', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id as string);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid listing ID format. Must be a number.' });
        }
        const userId = req.session.userId!
        const { title, category, description, status } = req.body;

        const existingListing = await (db as any)
            .selectFrom('listings')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirst();

        if (!existingListing) {
            return res.status(404).json({ error: 'Listing NOT found' });
        }

        if (existingListing.user_id != userId) {
            return res.status(403).json({ error: 'FORBIDDEN. You can only edit your own listings!' });
        }

        const updateData: Record<string, any> ={};
        if (title != undefined) updateData.title = title;
        if (category != undefined) updateData.category = category;
        if (description != undefined) updateData.description = description;
        if (status != undefined) updateData.status = status;

        if (Object.keys(updateData).length == 0) {
            return res.status(400).json({ error: 'No update fields provided.' });
        }

        await (db as any).updateTable('listings')
            .set(updateData)
            .where('id', '=', id)
            .execute();

        res.json({ success: true, message: 'Listing updated successfully! '});
    } catch (err) {
        console.error('Failed to update listing:', err);
        res.status(500).json({ error: 'Failed to update listing' });
    }
});


router.post("/", requireAuth, async (req, res) => {
    try {
        // Get information from the request
        const {
            title,
            description,
            category,
            status,
            location,
            listing_date
        } = req.body;

        // Get the logged-in user's ID
        const userId = req.session.userId;

        // Check that all required fields are provided
        if (
            typeof title !== "string" ||
            typeof description !== "string" ||
            typeof category !== "string" ||
            typeof status !== "string" ||
            typeof location !== "string" ||
            typeof listing_date !== "string" ||
            !title.trim() ||
            !description.trim() ||
            !category.trim() ||
            !status.trim() ||
            !location.trim() ||
            !listing_date.trim()
        ) {
            return res.status(400).json({
                error: "Title, description, category, status, location, and date are required."
            });
        }

        // Check maximum field lengths
        if (
            title.trim().length > 255 ||
            description.trim().length > 5000 ||
            category.trim().length > 50 ||
            location.trim().length > 255
        ) {
            return res.status(400).json({
                error: "One or more fields are too long."
            });
        }

        // Make sure status is lost or found
        const cleanStatus = status.trim().toLowerCase();

        if (cleanStatus !== "lost" && cleanStatus !== "found") {
            return res.status(400).json({
                error: "Status must be lost or found."
            });
        }

        // Validate the date
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;

        if (!datePattern.test(listing_date)) {
            return res.status(400).json({
                error: "Date must be in YYYY-MM-DD format."
            });
        }

        const date = new Date(listing_date + "T00:00:00Z");

        if (
            Number.isNaN(date.getTime()) ||
            date.toISOString().slice(0, 10) !== listing_date
        ) {
            return res.status(400).json({
                error: "Please enter a valid date."
            });
        }

        // Make sure the user is logged in
        if (!userId) {
            return res.status(401).json({
                error: "Please log in first."
            });
        }

        // Create the new listing in PostgreSQL
        const [newListing] = await (db as any)
            .insertInto("listings")
            .values({
                title: title.trim(),
                description: description.trim(),
                category: category.trim(),
                status: cleanStatus,
                location: location.trim(),
                listing_date: listing_date,
                user_id: userId
            })
            .returningAll()
            .execute();

        // Return the newly created listing
        return res.status(201).json(newListing);

    } catch (err) {
        console.error("FAILED to create listing:", err);

        return res.status(500).json({
            error: "FAILED to create listing"
        });
    }
});


router.delete('/:id', requireAuth, async (req, res) => {
    try{
        const id = parseInt(req.params.id as string);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid listing ID format. Must be a number.' });
        }

        const userId = req.session.userId!;

        const existingListing = await (db as any)
            .selectFrom("listings")
            .selectAll()
            .where("id", "=", id)
            .executeTakeFirst();
        
        if (!existingListing) {
            return res.status(404).json({ error: "Listing NOT found" });
        }

        if (existingListing.user_id != userId) {
            return res.status(403).json({ error: "FORBIDDEN: You can only delete your own posts!" });
        }

        await (db as any).deleteFrom('listings')
            .where('id', '=', id as any)
            .execute();

        res.json({ success: true, message: 'Listings deleted successfully!' });
    } catch (err) {
        console.error('Failed to delete listing:', err);
        res.status(500).json({ error: 'Failed to delete listing' });
    }
});

export { router };