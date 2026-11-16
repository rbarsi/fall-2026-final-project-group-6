
import { useEffect, useMemo, useState } from "react";

type Listing = {
  id: number;
  title: string;
  description: string;
  status: string;
  category: string;
  location: string | null;
  listing_date: string | null;
};

export function ListingSearch() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Load listings from the existing backend.
  useEffect(() => {
    const controller = new AbortController();

    async function loadListings() {
      try {
        const response = await fetch("/api/listings", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Could not load listings.");
        }

        const data: unknown = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Invalid listings response.");
        }

        if (!controller.signal.aborted) {
          setListings(data as Listing[]);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error ? err.message : "Loading failed."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadListings();
    return () => controller.abort();
  }, []);

  // Get available categories and locations.
  const categories = useMemo(
    () =>
      [...new Set(listings.map((item) => item.category))]
        .filter(Boolean)
        .sort(),
    [listings]
  );

  const locations = useMemo(
    () =>
      [...new Set(listings.map((item) => item.location))]
        .filter((value): value is string => Boolean(value))
        .sort(),
    [listings]
  );

  const invalidDates = Boolean(
    startDate && endDate && startDate > endDate
  );

  // Apply every active filter together.
  const filteredListings = useMemo(() => {
    if (invalidDates) return [];

    const query = search.trim().toLowerCase();

    return listings.filter((item) => {
      const text = `${item.title} ${item.description}`.toLowerCase();
      const itemDate = item.listing_date?.slice(0, 10) ?? "";

      const matchesSearch = !query || text.includes(query);

      const matchesStatus =
        !status || item.status.toLowerCase() === status;

      const matchesCategory =
        !category || item.category === category;

      const matchesLocation =
        !location || item.location === location;

      const matchesStart =
        !startDate || (itemDate !== "" && itemDate >= startDate);

      const matchesEnd =
        !endDate || (itemDate !== "" && itemDate <= endDate);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory &&
        matchesLocation &&
        matchesStart &&
        matchesEnd
      );
    });
  }, [
    listings,
    search,
    status,
    category,
    location,
    startDate,
    endDate,
    invalidDates,
  ]);

  function clearFilters() {
    setSearch("");
    setStatus("");
    setCategory("");
    setLocation("");
    setStartDate("");
    setEndDate("");
  }

  return (
    <section className="listing-search">
      <h2>Find Lost & Found Items</h2>

      <div className="listing-filters">
        <label>
          Search Listings
          <input
            type="search"
            placeholder="Search title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <label>
          Type
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Listings</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </select>
        </label>

        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          Location
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="">All Locations</option>
            {locations.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          From Date
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>

        <label>
          To Date
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
      </div>

      <button type="button" onClick={clearFilters}>
        Clear Filters
      </button>

      {invalidDates && (
        <p role="alert">
          End date must be on or after the start date.
        </p>
      )}

      {loading ? (
        <p>Loading listings...</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : !invalidDates ? (
        <>
          <p>{filteredListings.length} matching listings</p>

          {filteredListings.length === 0 ? (
            <p role="status">
              {listings.length === 0
                ? "No listings have been posted yet."
                : "No matching listings found. Try changing your search or clearing the filters."}
            </p>
          ) : (
            <div className="listing-results">
              {filteredListings.map((item) => (
                <article className="listing-card" key={item.id}>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <p>
                    <strong>Type:</strong> {item.status}
                  </p>
                  <p>
                    <strong>Category:</strong> {item.category}
                  </p>
                  <p>
                    <strong>Location:</strong>{" "}
                    {item.location || "Not specified"}
                  </p>
                  <p>
                    <strong>Date:</strong>{" "}
                    {item.listing_date?.slice(0, 10) || "Not specified"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
