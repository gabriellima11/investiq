CREATE TYPE "public"."asset_type" AS ENUM('STOCK', 'FII', 'ETF');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('BUY', 'SELL');--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"name" text NOT NULL,
	"type" "asset_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_cache" (
	"ticker" text PRIMARY KEY NOT NULL,
	"price" numeric(20, 8) NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"asset_id" uuid NOT NULL,
	"type" "transaction_type" NOT NULL,
	"quantity" numeric(20, 8) NOT NULL,
	"price" numeric(20, 8) NOT NULL,
	"fees" numeric(20, 8) DEFAULT '0' NOT NULL,
	"trade_date" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_quantity_positive" CHECK ("transactions"."quantity" > 0),
	CONSTRAINT "transactions_price_positive" CHECK ("transactions"."price" > 0),
	CONSTRAINT "transactions_fees_non_negative" CHECK ("transactions"."fees" >= 0)
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assets_ticker_unique" ON "assets" USING btree ("ticker");--> statement-breakpoint
CREATE INDEX "transactions_user_asset_idx" ON "transactions" USING btree ("user_id","asset_id");