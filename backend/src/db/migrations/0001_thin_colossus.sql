ALTER TABLE "artwork" ADD COLUMN "image_caption" text;--> statement-breakpoint
ALTER TABLE "artwork" ADD COLUMN "embedding_summary" text;--> statement-breakpoint
ALTER TABLE "artwork" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "artwork" ADD COLUMN "processed_at" timestamp;