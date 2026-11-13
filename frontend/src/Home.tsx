import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchLocations, type CampusLocation } from './locations';

interface Listing {
    id: number;
    title: string;
    category: string;
    description: string;
    status: 'lost' | 'found' | 'reunited';
    location: string | null;
    location_id: number | null;
    created_at: string;
}

export function Home() {
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [locations, setLocations] = useState<CampusLocation[]>([]);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState ({
        title: '',
        category: '',
        description: '',
        status: 'lost' as 'lost' | 'found' | 'reunited',
        location_id: '',
    });

    const getStatusStyle = (status: string): React.CSSProperties => {
        switch (status) {
            case 'lost': return { background: '#ffebee', color: '#62828' };
            case 'found': return { background: '#e8f5e9', color: '#2e7d32' };
            case 'reunited': return { background: '#e3f2fd', color: '#1565c0' };
            default: return { background: '#f5f5f5', color: '#667' };
        };
    }

    const handleStartEdit = (item: Listing) => {
        setEditingId(item.id);
        setEditForm({
            title: item.title,
            category: item.category,
            description: item.description,
            status: item.status,
            location_id: item.location_id ? String(item.location_id) : '',
        });
    };

    const handleSaveEdit = async (id: number) => {
        // Older listings may not have a campus location yet, so only send one if chosen
        const { location_id, ...fields } = editForm;
        const chosenLocation = locations.find(location => String(location.id) == location_id);

        try {
            const res  = await fetch(`/api/listings/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(chosenLocation ? { ...fields, location_id: chosenLocation.id } : fields),
            });

            if (!res.ok) throw new Error('Failed to update');

            setListings(listings.map(item => item.id == id ? {
                ...item,
                ...fields,
                ...(chosenLocation ? { location_id: chosenLocation.id, location: chosenLocation.name } : {}),
            } : item ));
            setEditingId(null);
        } catch (err) {
            alert('Could not update listing.');
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you SURE you want to PERMANENTLY DELETE this listing?')) {
            try {
                const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('FAILED to delete');
                setListings(listings.filter(item => item.id != id));
            } catch (err) {
                alert('Could not delete listing.');
            }
        }
    };
    
    useEffect(() => {
    async function fetchListings() {
        try {
            const response = await fetch('/api/listings');
            if (!response.ok) throw new Error('FAILED to fetch listings');
            const data = await response.json();
            setListings(data);
        } catch (err: any) {
            setError(err.message || 'Could not load listings');
        } finally {
            setLoading(false);
        }
       }

      fetchListings();

      // Campus locations for the edit form's dropdown
      fetchLocations()
        .then(setLocations)
        .catch(() => setLocations([]));

    }, []);

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>


        <h3>Recent listings...</h3>

        {loading && <p>Loading items...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {!loading && !error && listings.length == 0 && (
            <p>No lost or fond items posted yet. Be the first to post!</p>
        )}

        <div style={{ display: 'grid', gap: '15px' }}>
            {listings.map((item) => (
                <div key={item.id} style={{ border: '1px solid #e0e0e0', padding: '16px', borderRadius: '8px', background: '#fff' }}>
                    {editingId == item.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Title</label>
                            <input
                                type="text"
                                value={editForm.title}
                                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                                />

                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Category</label>
                            <input
                                type="text"
                                value={editForm.category}
                                onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                            />

                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Location</label>
                            <select
                                value={editForm.location_id}
                                onChange={e => setEditForm({ ...editForm, location_id: e.target.value })}
                                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                            >
                                <option value="">{item.location_id ? 'Choose a campus location' : (item.location || 'Choose a campus location')}</option>
                                {locations.map(location => (
                                    <option key={location.id} value={location.id}>{location.name}</option>
                                ))}
                            </select>

                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Status</label>
                            <select
                                value={editForm.status}
                                onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                            >

                            <option value="lost">Lost</option>
                            <option value="found">Found</option>
                            <option value="reunited">Reunited</option>
                        </select>

                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Description</label>
                            <input
                                type="text"
                                value={editForm.description}
                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                            />

                        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                            <button onClick={() => handleSaveEdit(item.id)} style={{ background: '#ccc', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                                Save
                            </button>
                            <button onClick={() => setEditingId(null)} style={{ background: '#ccc', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }} >
                                Cancel
                            </button>
                        </div>
                    </div>
                    ) : (
                        <>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase', ...getStatusStyle(item.status) }}>
                                {item.status || 'lost'}
                            </span>
                        <span style={{ fontSize: '12px', background: '#eef2f0', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                            {item.category}
                    </span>
                </div>
                            
                    <h4 style={{ margin: '8px 0 4px 0' }}>{item.title}</h4>
                    {item.location && (
                        <p style={{ color: '#555', fontSize: '13px', margin: '0 0 6px 0' }}>Location: {item.location}</p>
                    )}
                    <p style={{ color: '#667', margin: '0 0 10px 0' }}>{item.description}</p>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '12px' }}>
                        <Link to={`/listings/${item.id}`} style={{ color: '#0a4b32', fontWeight: 'bold', textDecoration: 'none' }}></Link>
                        <button
                            onClick={() => handleStartEdit(item)}
                            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '13px', padding: 0, textDecoration: 'underline' }}
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => void handleDelete(item.id)}
                                style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', fontSize: '13px', padding: 0 }}
                                >
                                    Permanent Delete
                                </button>
                        </div>
                    <Link to={`/listings/${item.id}`} style={{ color: '#0a4b32', fontWeight: 'bold', textDecoration: 'none' }}>
                    </Link>
                    </>
                  )}
                </div>
            ))}
        </div>
        </div>
    );
}

export default Home;