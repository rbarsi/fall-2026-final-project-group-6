# Find My Item! (Campus Lost and Found)

Group 6 final project, built with TypeScript.

**Find My Item!** is the release name for **Campus Lost and Found**, a mobile-friendly website that helps UNC Charlotte students find lost belongings and return items they have found on campus.

## Project overview

Students often lose personal items such as keys, wallets, water bottles, and electronics. Today they rely on social media, group chats, or word of mouth to find them.

Our goal is one central website where students can post lost or found items, search existing listings, and communicate privately to arrange the return of belongings.

This project is a student-built prototype and is not an official UNC Charlotte service.

## Features

- Sign up, log in, and log out (passwords are hashed; sessions are stored in Postgres)
- View, edit, and delete your own account
- Post lost or found items with a category, campus location, and date
- Browse all listings or view a single listing
- Search listing titles and descriptions by keyword, with the best matches first
- Filter listings by lost or found, category, location, and date range on the **Search Listings** page
- See, edit, and delete your own listings on the **My Listings** page (other users cannot change them)
- Mark a listing as reunited; it shows the date it was reunited
- Comment on listings, and edit or delete your own comments (API only for now)

## Local development

Requirements: Node.js 22.12 or newer and Docker Compose. Run commands from the repository root.

```bash
npm install
cp backend/.env.example backend/.env
# Open backend/.env and set SESSION_SECRET to any long random string
docker compose up -d
npm run db:migrate --workspace backend
npm run dev:backend
```

In a second terminal:

```bash
npm run dev:frontend
```

Open the URL printed by Vite (normally http://localhost:5173) and click **Check connection**. The backend runs on port 3000. Postgres uses host port 5433 to avoid conflicting with earlier class databases. These database credentials are for local development only.

The Vite development proxy forwards `/api` requests to Express, so frontend code should call `/api/...` rather than `http://localhost:3000`. Production hosting will need its own API routing configuration.

### Database migrations

Run `npm run db:migrate --workspace backend` again whenever you pull new migrations.

Migrations run in alphabetical order of their file names. Never edit or rename a migration after it is merged; add a new one instead.

Older local databases may still have a `price` column; the `zzzzzzzz_remove_listing_price` migration removes it.

If `db:migrate` fails because of corrupted or out-of-order migrations (for example, you ran a migration from a branch before another migration was merged into `main`), reset your local database once (this erases local data):

```bash
docker compose down -v
docker compose up -d
npm run db:migrate --workspace backend
```

Stop the database with `docker compose stop`. This preserves local data. Keep `.env` private; commit only `.env.example`.

## API

| Method | Route | Login required |
|---|---|---|
| GET | `/api/health`, `/api/health/database` | No |
| POST | `/api/auth/signup`, `/api/auth/login`, `/api/auth/logout` | No |
| GET | `/api/auth/me` | Yes |
| GET / PUT / DELETE | `/api/profile` | Yes (your own account) |
| GET | `/api/listings`, `/api/listings/:id` | No |
| GET | `/api/listings/user/mine` | Yes (your own listings) |
| POST | `/api/listings` | Yes |
| PUT / DELETE | `/api/listings/:id` | Yes (owner only) |
| GET | `/api/locations` | No |
| GET | `/api/comments/listing/:listingId` | No |
| POST | `/api/comments` | Yes |
| PUT / DELETE | `/api/comments/:id` | Yes (author only) |
| GET | `/api/users/:id` | No (returns only `id` and `username`) |
| PUT | `/api/users/:id` | Yes (your own account) |

Creating a listing requires `title`, `description`, `category`, `status` (`lost` or `found`), `location_id`, and `listing_date` (`YYYY-MM-DD`).

When editing a listing, `status` can be `lost`, `found`, or `reunited`. Changing it to `reunited` records today's date in `reunited_on`; changing it back clears it.

Creating a comment requires `content` (up to 2,000 characters) and `listing_id`. The author is always the logged-in user.

`location_id` must be one of the campus locations from `/api/locations`. Listings include the location's name in `location` and its `latitude` and `longitude` (these are `null` for listings created before campus locations were added).

### Search

`GET /api/listings?q=water bottle` returns only listings whose title or description match, best matches first. It uses Postgres full-text search: a `search_vector` column (kept up to date by Postgres) with a GIN index. Words in the title count more than words in the description, and different forms of a word match (`keys` finds `key`). Users can type phrases in quotes, `or`, and `-word` to exclude a word. Without `q`, all listings are returned. Searches longer than 200 characters return 400.

The **Search Listings** page (`/search`) loads all listings and filters them in the browser by text, lost or found, category, location, and date range.

`/api/health` checks Express; `/api/health/database` checks Postgres.

## Checks

```bash
npm run typecheck
npm run build
```

## Backend tests

Tests use a separate Postgres database named `campus_lost_found_test`. The tests clear its tables, so never point them at your development database.

With the local database running, create the test database once:

```bash
sudo docker compose exec db createdb -U postgres campus_lost_found_test
```

Run migrations and tests from the repository root:

```bash
export TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5433/campus_lost_found_test"
DATABASE_URL="$TEST_DATABASE_URL" npm run db:migrate --workspace backend
npm test --workspace backend
```

GitHub Actions runs backend TypeScript checks, migrations, tests, and the build on pushes and pull requests using a temporary Postgres database.

## UI mockups

- [UI mockup PDF](docs/ui/Campus_Lost_and_Found_UI_Mockups.pdf)
- [Editable Figma mockups](https://www.figma.com/design/j8zK1GFZyarZG81fkDPPL4)

The mockups use "Campus Lost and Found" as the working product name.

## Releases

Releases are published as **Find My Item!** on the [Releases page](https://github.com/rbarsi/fall-2026-final-project-group-6/releases). Tags use the `V0.x.y` format.
