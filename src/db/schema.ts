import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==========================================
// Auth.js tables
// ==========================================

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  password: text("password"), // nullable for OAuth users
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// ==========================================
// App tables
// ==========================================

export const photos = pgTable(
  "photos",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    originalFilename: text("original_filename").notNull(),
    fileHash: text("file_hash").notNull(),
    uploadthingUrl: text("uploadthing_url"),
    uploadthingKey: text("uploadthing_key"),
    telegramFileId: text("telegram_file_id"),
    width: integer("width"),
    height: integer("height"),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    takenAt: timestamp("taken_at", { mode: "date" }),
    uploadedAt: timestamp("uploaded_at", { mode: "date" }).defaultNow().notNull(),
    status: text("status", {
      enum: ["processing", "ready", "failed", "retrying"],
    })
      .default("processing")
      .notNull(),
  },
  (photo) => [
    index("photos_user_uploaded_idx").on(photo.userId, photo.uploadedAt),
    index("photos_file_hash_idx").on(photo.userId, photo.fileHash),
    index("photos_taken_at_idx").on(photo.userId, photo.takenAt),
  ]
);

export const albums = pgTable(
  "albums",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    coverPhotoId: text("cover_photo_id"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (album) => [index("albums_user_idx").on(album.userId)]
);

export const albumPhotos = pgTable(
  "album_photos",
  {
    albumId: text("album_id")
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    photoId: text("photo_id")
      .notNull()
      .references(() => photos.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { mode: "date" }).defaultNow().notNull(),
  },
  (ap) => [primaryKey({ columns: [ap.albumId, ap.photoId] })]
);

export const sharedLinks = pgTable(
  "shared_links",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    albumId: text("album_id")
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    isActive: boolean("is_active").default(true).notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (sl) => [uniqueIndex("shared_links_token_idx").on(sl.token)]
);

// ==========================================
// Relations
// ==========================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  photos: many(photos),
  albums: many(albums),
}));

export const photosRelations = relations(photos, ({ one, many }) => ({
  user: one(users, { fields: [photos.userId], references: [users.id] }),
  albumPhotos: many(albumPhotos),
}));

export const albumsRelations = relations(albums, ({ one, many }) => ({
  user: one(users, { fields: [albums.userId], references: [users.id] }),
  coverPhoto: one(photos, {
    fields: [albums.coverPhotoId],
    references: [photos.id],
  }),
  albumPhotos: many(albumPhotos),
  sharedLinks: many(sharedLinks),
}));

export const albumPhotosRelations = relations(albumPhotos, ({ one }) => ({
  album: one(albums, { fields: [albumPhotos.albumId], references: [albums.id] }),
  photo: one(photos, { fields: [albumPhotos.photoId], references: [photos.id] }),
}));

export const sharedLinksRelations = relations(sharedLinks, ({ one }) => ({
  album: one(albums, {
    fields: [sharedLinks.albumId],
    references: [albums.id],
  }),
}));
