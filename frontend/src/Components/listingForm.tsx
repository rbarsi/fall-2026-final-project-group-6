import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ListingForm() {
    const [formData, setFormData] = useState ({
        title: '',
        category: '',
        description: '',
        status: 'lost',
        location: '',
        listing_date: '',
    });

    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch ('/api/listings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'FAILED TO CREATE LISTING');
            }
            navigate('/');
            // Redirects to new listing IF created listing.
            //window.location.href = '/listings/';
           // if (response.ok) {
           //     navigate('/listings');
           // } 
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    let buttonText = 'Submit New Listing';
        if (loading) {
        buttonText = 'Submitting...';
    }
    
    return (
        <form onSubmit={handleSubmit} className="listing-form">
            <h2>Report Lost or Found Item.</h2>

            {error && <div style={{ color: 'red' }}>{error}</div>}

            <label>Title / Item Name </label>
            <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
            />

            <label>Category</label>
            <input
                type="text"
                placeholder="Electronics, ID, Card, Car Keys"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value})}
                required
            />

            <label>Location</label>
            <input
                type="text"
                placeholder="Where was it lost or found?"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
            />

            <label>Date</label>
            <input
                type="date"
                value={formData.listing_date}
                onChange={(e) => setFormData({ ...formData, listing_date: e.target.value })}
                required
            />

            <label>Status</label>
            <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}
                >
                    <option value="lost">Lost</option>
                    <option value="found">Found</option>
                </select>

            <label>Description</label>
            <textarea
                    placeholder="Please provide as many details as you can including a photo."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value})}
                    required
            />

            <button type="submit" disabled={loading}>
                {buttonText}
            </button>
        </form>
    );
}
