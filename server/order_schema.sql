CREATE TABLE "consignee_address" (
  "id" integer NOT NULL,
  "user_id" INTEGER NOT NULL,
  "consignee" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "region" TEXT,
  "detail_address" TEXT,
  "is_default" INTEGER DEFAULT 0,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER, shop_id INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY ("id")
)
CREATE TABLE "order_items" (
  "id" integer NOT NULL,
  "order_id" integer NOT NULL,
  "product_id" integer NOT NULL,
  "product_name" TEXT NOT NULL,
  "image" TEXT,
  "sales_price" REAL NOT NULL,
  "quantity" INTEGER NOT NULL,
  "sub_total" REAL NOT NULL,
  "created_at" INTEGER NOT NULL, insurance_detail TEXT DEFAULT '[]', insurance_fee REAL DEFAULT 0, is_deleted INTEGER NOT NULL DEFAULT 0, shop_id INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
)
CREATE TABLE "cart" (
  "id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "product_id" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "name" TEXT NOT NULL DEFAULT '',
  "image" TEXT,
  "price" REAL NOT NULL DEFAULT 0,
  "description" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER, insurance_detail TEXT DEFAULT '[]', insurance_fee REAL DEFAULT 0, shop_id INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  UNIQUE ("user_id" ASC, "product_id" ASC)
)
CREATE TABLE "orders" (
  "id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "order_no" text NOT NULL,
  "is_deleted" INTEGER NOT NULL DEFAULT 0,
  "pay_amount" real,
  "pay_type" TEXT,
  "order_status" TEXT,
  "remark" TEXT,
  "consignee" TEXT,
  "phone" TEXT,
  "region" TEXT,
  "detail_address" TEXT,
  "created_at" INTEGER,
  "pay_at" INTEGER,
  "updated_at" INTEGER,
  "confirm_at" INTEGER,
  "ship_at" INTEGER,
  "finish_at" INTEGER,
  "shipping_type" TEXT DEFAULT '商家配送',
  "courier" TEXT,
  "tracking_number" TEXT,
  "sign_status" TEXT NOT NULL DEFAULT 'unsigned', shop_id INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY ("id")
)
