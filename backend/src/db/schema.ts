// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { index } from "drizzle-orm/pg-core";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
});

// Artwork table (stores each artwork once) - matches existing MET data dump
export const artwork = pgTable("artwork", {
  id: text("id").primaryKey(),
  object_id: integer("object_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"), // Rich description and context from HTML scraping
  artist: text("artist"),
  date: text("date"),
  medium: text("medium"),
  primary_image: text("primary_image"),
  department: text("department"),
  culture: text("culture"),
  created_at: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
  additional_images: text("additional_images"),
  object_url: text("object_url"),
  is_highlight: boolean("is_highlight").$defaultFn(() => false),
  artist_display_bio: text("artist_display_bio"),
  object_begin_date: integer("object_begin_date"),
  object_end_date: integer("object_end_date"),
  credit_line: text("credit_line"),
  classification: text("classification"),
  artist_nationality: text("artist_nationality"),
  primary_image_small: text("primary_image_small"),
});

// Junction table for user favorites
export const userFavorites = pgTable("user_favorites", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    artworkId: text("artwork_id").notNull().references(() => artwork.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
  },
  (table) => [
    index("user_favorites_user_id_idx").on(table.userId),
  ]
); 