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

router.put('/:id', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id as string);
        const userId = req.session.userId!

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

        const { title, category, description, status } = req.body;

        const updateData: Record<string, any> ={};
        if (title != undefined) updateData.title = title;
        if (category != undefined) updateData.category = category;
        if (description != undefined) updateData.description = description;
        if (status != undefined) updateData.status = status;
        
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
        const { title, description, category, status } = req.body;
        const userId = req.session.userId!;

        if (!title || !description || !category) {
            return res.status(400).json({ error: "Title, description, and category are required. "});
        }

        const [newListing] = await (db as any)
            .insertInto("listings")
            .values({
                title,
                description,
                category,
                status: status || "lost",
                user_id: userId,
            })
            .returningAll()
            .execute();
        res.status(201).json(newListing);
    } catch (err) {
        console.error("FAILED to create listing:", err);
        res.status(500).json({ error: "FAILED to create listing" });
    }
});

router.delete('/:id', requireAuth, async (req, res) => {
    try{
        const id = parseInt(req.params.id as string);
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