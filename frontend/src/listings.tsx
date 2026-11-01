import { useEffect, useState } from "react";

export default function Listings() {

    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        //fetch('/api/listings')
        fetch('http://localhost:3000/api/listings')
        .then((res) => res.json())
        .then((data) => {
            setListings(data);
            setLoading(false);
        })
        .catch((err) => {
            console.error("FAILED TO FETCH LISTINGS:", err);
            setLoading(false);
        });
    }, []);

    if (loading) return <div>Loading listings..</div>

        return (
        <div style={{ padding: '20px' }}>
            <h2>Lost and Found Listings</h2>
            {listings.length == 0 ? (
                <p>No listings found in database yet...</p>
            ) : (
                listings.map((item) => (
                    <div key={item.id} style={{ border: '1px solid #ccc', margin: '10px 0', padding: '15px', borderRadius: '5px' }}>
                        <h3>{item.title}</h3>
                        <p><strong>Category:</strong> {item.category}</p>
                        <p>{item.description}</p>
                        </div>
                ))
            )}
        </div>
    );
}