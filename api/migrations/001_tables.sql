-- The API's state as tables. Each row keeps the record as JSON (data) plus typed columns for lookups and reports.
-- seq orders rows the way the API lists them (orders, tickets and applications newest first; the rest in creation
-- order). Applied by the API at start-up (and `npm run db:migrate`); never edit an applied file, add a new one.

CREATE TABLE meta (
  key text PRIMARY KEY,
  data jsonb NOT NULL
);

CREATE TABLE merchants (
  id text PRIMARY KEY,
  seq integer NOT NULL,
  name text NOT NULL,
  zone text NOT NULL,
  data jsonb NOT NULL
);

CREATE TABLE products (
  id text PRIMARY KEY,
  seq integer NOT NULL,
  merchant_id text NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX products_merchant ON products (merchant_id);

CREATE TABLE option_sets (
  id text PRIMARY KEY,
  seq integer NOT NULL,
  data jsonb NOT NULL
);

CREATE TABLE merchant_staff (
  id text PRIMARY KEY,
  seq integer NOT NULL,
  merchant_id text NOT NULL,
  phone text NOT NULL,
  data jsonb NOT NULL
);

CREATE TABLE couriers (
  id text PRIMARY KEY,
  seq integer NOT NULL,
  phone text NOT NULL,
  status text NOT NULL,
  data jsonb NOT NULL
);

CREATE TABLE orders (
  id text PRIMARY KEY,
  seq integer NOT NULL,
  merchant_id text NOT NULL,
  courier_id text,
  customer_id text,
  status text NOT NULL,
  placed_t integer,
  data jsonb NOT NULL
);
CREATE INDEX orders_merchant ON orders (merchant_id);
CREATE INDEX orders_courier ON orders (courier_id);
CREATE INDEX orders_customer ON orders (customer_id);
CREATE INDEX orders_status ON orders (status);

CREATE TABLE tickets (
  id text PRIMARY KEY,
  seq integer NOT NULL,
  requester_id text,
  resolved boolean NOT NULL,
  data jsonb NOT NULL
);

CREATE TABLE courier_applications (
  id text PRIMARY KEY,
  seq integer NOT NULL,
  phone text NOT NULL,
  status text NOT NULL,
  data jsonb NOT NULL
);

CREATE TABLE payout_lines (
  id text PRIMARY KEY,
  seq integer NOT NULL,
  kind text NOT NULL,
  party_id text NOT NULL,
  data jsonb NOT NULL
);

CREATE TABLE users (
  id text PRIMARY KEY,
  seq integer NOT NULL,
  role text NOT NULL,
  phone text NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX users_phone ON users (phone);

CREATE TABLE sessions (
  id text PRIMARY KEY,
  seq integer NOT NULL,
  user_id text NOT NULL,
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX sessions_user ON sessions (user_id);
