import { Router } from "express";
import { db } from '../db/database.js';
import { listenerCount } from "process";

const router = Router();

router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
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

router.delete('/:id', async (req, res) => {
    try{
        const id = parseInt(req.params.id);

        await (db as any).deleteFrom('listings')
            .where('id', '=', id as any)
            .execute();

        res.json({ success: true, message: 'Listings deleted successfully!' });
    } catch (err) {
        console.error('Failed to delete listing:', err);
        res.status(500).json({ error: 'Failed to delete listing' });
    }
});

router.post('/', async (req, res) => {
    try {
    
    //THE || 1 BYPASSES LOGIN
    
    /*   if (!req.session) {
            return res.status(401).json({ error: 'ERROR. You are not signed in.'});
        }
    */
        const userId = req.session?.userId || 1;
        //req.session.userId

        if (!userId) {
            return res.status(401).json({ error: 'USER ID NOT FOUND.'});
        }

        const { title, description, price, category } = req.body;

        const newListing = await (db as any)
        .insertInto('listings')
        .values({
            user_id: userId,
            title,
            description,
            category,
        })
        .returningAll()
        .executeTakeFirst();
        
        return res.status(201).json(newListing);
    } catch (error) {
        console.error('ERROR CREATING LISTING:', error);
        return res.status(500).json({ error: 'INTERNAL SERVER ERROR'});
    }
});

router.get('/', async (req, res) => {
    try {
        const listings = await (db as any)
        .selectFrom('listings')
        .selectAll()
        .execute();

    return res.json(listings);
    } catch (error) {
        console.error('ERROR WHEN FETCHING LISTINGS:', error);
        return res.status(500).json({ error: 'INTERNAL SERVER ERROR'});
    }
});

export { router };