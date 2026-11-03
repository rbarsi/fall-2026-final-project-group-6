import { Kysely } from "kysely";

// Campus locations students can pick from (coordinates from OpenStreetMap)
const campusLocations = [
  { name: "Atkins Library", latitude: 35.305771, longitude: -80.732110 },
  { name: "Popp Martin Student Union", latitude: 35.308613, longitude: -80.733727 },
  { name: "Woodward Hall", latitude: 35.307243, longitude: -80.735731 },
  { name: "Fretwell Building", latitude: 35.306170, longitude: -80.729051 },
  { name: "Cone University Center", latitude: 35.305299, longitude: -80.733169 },
  { name: "Belk Gym", latitude: 35.305327, longitude: -80.735695 },
  { name: "Barnhardt Student Activity Center", latitude: 35.306256, longitude: -80.734437 },
  { name: "Prospector Hall", latitude: 35.306814, longitude: -80.730845 },
  { name: "Kennedy Hall", latitude: 35.305985, longitude: -80.730941 },
  { name: "Cato Hall", latitude: 35.305458, longitude: -80.728728 },
  { name: "Burson Hall", latitude: 35.307573, longitude: -80.732463 },
  { name: "McEniry Hall", latitude: 35.307103, longitude: -80.730069 },
  { name: "EPIC Building", latitude: 35.308936, longitude: -80.741430 },
  { name: "Grigg Hall", latitude: 35.310919, longitude: -80.741495 },
  { name: "Duke Centennial Hall", latitude: 35.311954, longitude: -80.741103 },
  { name: "Union Deck", latitude: 35.309225, longitude: -80.735453 },
];

// Add selectable campus locations and link listings to them
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("campus_locations")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("name", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("latitude", "double precision", (col) => col.notNull())
    .addColumn("longitude", "double precision", (col) => col.notNull())
    .execute();

  await db.insertInto("campus_locations").values(campusLocations).execute();

  // Older listings keep their text location and have no location_id
  await db.schema
    .alterTable("listings")
    .addColumn("location_id", "integer", (col) =>
      col.references("campus_locations.id").onDelete("set null")
    )
    .execute();
}

// Undo these changes if necessary
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("listings").dropColumn("location_id").execute();
  await db.schema.dropTable("campus_locations").execute();
}
