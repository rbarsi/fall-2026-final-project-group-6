import { Router } from "express";
import { db } from "../db/database.js";

const router = Router();

// List the campus locations students can pick from
router.get("/", async (_req, res) => {
    try {
        const locations = await (db as any)
            .selectFrom("campus_locations")
            .select(["id", "name", "latitude", "longitude"])
            .orderBy("name")
            .execute();

        res.json(locations);
    } catch (err) {
        console.error("Failed to fetch locations:", err);
        res.status(500).json({ error: "Failed to fetch locations" });
    }
});

// Find a campus location by ID, or undefined if the ID is invalid or unknown
export async function findCampusLocation(locationId: unknown) {
    if (typeof locationId !== "number" && typeof locationId !== "string") {
        return undefined;
    }

    const id = Number(locationId);

    if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
        return undefined;
    }

    return (db as any)
        .selectFrom("campus_locations")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
}

export { router };
