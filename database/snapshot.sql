--
-- PostgreSQL database dump
--

\restrict Wndho7GFWIuPhehB4OPBzF81mxInizIpFp3pytgjfAtoVzvXwULfJJdZvOIZZA1

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_provider_id_providers_id_fk;
ALTER TABLE IF EXISTS ONLY public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_provider_id_providers_id_fk;
ALTER TABLE IF EXISTS ONLY public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_provider_id_providers_id_fk;
ALTER TABLE IF EXISTS ONLY public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_package_id_packages_id_fk;
ALTER TABLE IF EXISTS ONLY public.subcategories DROP CONSTRAINT IF EXISTS subcategories_category_id_categories_id_fk;
ALTER TABLE IF EXISTS ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.services DROP CONSTRAINT IF EXISTS services_provider_id_providers_id_fk;
ALTER TABLE IF EXISTS ONLY public.services DROP CONSTRAINT IF EXISTS services_category_id_categories_id_fk;
ALTER TABLE IF EXISTS ONLY public.service_items DROP CONSTRAINT IF EXISTS service_items_subcategory_id_subcategories_id_fk;
ALTER TABLE IF EXISTS ONLY public.saved_searches DROP CONSTRAINT IF EXISTS saved_searches_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_provider_id_providers_id_fk;
ALTER TABLE IF EXISTS ONLY public.reset_tokens DROP CONSTRAINT IF EXISTS reset_tokens_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.requests DROP CONSTRAINT IF EXISTS requests_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.requests DROP CONSTRAINT IF EXISTS requests_service_id_services_id_fk;
ALTER TABLE IF EXISTS ONLY public.requests DROP CONSTRAINT IF EXISTS requests_provider_id_providers_id_fk;
ALTER TABLE IF EXISTS ONLY public.requests DROP CONSTRAINT IF EXISTS requests_fault_id_faults_id_fk;
ALTER TABLE IF EXISTS ONLY public.requests DROP CONSTRAINT IF EXISTS requests_assigned_company_id_providers_id_fk;
ALTER TABLE IF EXISTS ONLY public.providers DROP CONSTRAINT IF EXISTS providers_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.providers DROP CONSTRAINT IF EXISTS providers_category_id_categories_id_fk;
ALTER TABLE IF EXISTS ONLY public.provider_service_areas DROP CONSTRAINT IF EXISTS provider_service_areas_region_id_regions_id_fk;
ALTER TABLE IF EXISTS ONLY public.provider_service_areas DROP CONSTRAINT IF EXISTS provider_service_areas_city_id_cities_id_fk;
ALTER TABLE IF EXISTS ONLY public.provider_service_areas DROP CONSTRAINT IF EXISTS provider_service_areas_area_id_areas_id_fk;
ALTER TABLE IF EXISTS ONLY public.provider_balances DROP CONSTRAINT IF EXISTS provider_balances_provider_id_providers_id_fk;
ALTER TABLE IF EXISTS ONLY public.property_favorites DROP CONSTRAINT IF EXISTS property_favorites_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.property_favorites DROP CONSTRAINT IF EXISTS property_favorites_property_id_properties_id_fk;
ALTER TABLE IF EXISTS ONLY public.properties DROP CONSTRAINT IF EXISTS properties_provider_id_providers_id_fk;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_provider_id_providers_id_fk;
ALTER TABLE IF EXISTS ONLY public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_provider_id_providers_id_fk;
ALTER TABLE IF EXISTS ONLY public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_package_id_packages_id_fk;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_receiver_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.interactions DROP CONSTRAINT IF EXISTS interactions_provider_id_providers_id_fk;
ALTER TABLE IF EXISTS ONLY public.favorites DROP CONSTRAINT IF EXISTS favorites_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.favorites DROP CONSTRAINT IF EXISTS favorites_provider_id_providers_id_fk;
ALTER TABLE IF EXISTS ONLY public.faults DROP CONSTRAINT IF EXISTS faults_service_item_id_service_items_id_fk;
ALTER TABLE IF EXISTS ONLY public.company_pricing DROP CONSTRAINT IF EXISTS company_pricing_service_item_id_service_items_id_fk;
ALTER TABLE IF EXISTS ONLY public.company_pricing DROP CONSTRAINT IF EXISTS company_pricing_fault_id_faults_id_fk;
ALTER TABLE IF EXISTS ONLY public.company_pricing DROP CONSTRAINT IF EXISTS company_pricing_company_id_providers_id_fk;
ALTER TABLE IF EXISTS ONLY public.cities DROP CONSTRAINT IF EXISTS cities_region_id_regions_id_fk;
ALTER TABLE IF EXISTS ONLY public.areas DROP CONSTRAINT IF EXISTS areas_city_id_cities_id_fk;
ALTER TABLE IF EXISTS ONLY public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_google_id_unique;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_unique;
ALTER TABLE IF EXISTS ONLY public.favorites DROP CONSTRAINT IF EXISTS uq_favorites_user_provider;
ALTER TABLE IF EXISTS ONLY public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_public_id_unique;
ALTER TABLE IF EXISTS ONLY public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_pkey;
ALTER TABLE IF EXISTS ONLY public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_pkey;
ALTER TABLE IF EXISTS ONLY public.subcategories DROP CONSTRAINT IF EXISTS subcategories_pkey;
ALTER TABLE IF EXISTS ONLY public.site_settings DROP CONSTRAINT IF EXISTS site_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.site_settings DROP CONSTRAINT IF EXISTS site_settings_key_unique;
ALTER TABLE IF EXISTS ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.services DROP CONSTRAINT IF EXISTS services_pkey;
ALTER TABLE IF EXISTS ONLY public.service_items DROP CONSTRAINT IF EXISTS service_items_pkey;
ALTER TABLE IF EXISTS ONLY public.saved_searches DROP CONSTRAINT IF EXISTS saved_searches_pkey;
ALTER TABLE IF EXISTS ONLY public.reviews DROP CONSTRAINT IF EXISTS reviews_pkey;
ALTER TABLE IF EXISTS ONLY public.reset_tokens DROP CONSTRAINT IF EXISTS reset_tokens_pkey;
ALTER TABLE IF EXISTS ONLY public.requests DROP CONSTRAINT IF EXISTS requests_pkey;
ALTER TABLE IF EXISTS ONLY public.regions DROP CONSTRAINT IF EXISTS regions_pkey;
ALTER TABLE IF EXISTS ONLY public.providers DROP CONSTRAINT IF EXISTS providers_pkey;
ALTER TABLE IF EXISTS ONLY public.provider_service_areas DROP CONSTRAINT IF EXISTS provider_service_areas_pkey;
ALTER TABLE IF EXISTS ONLY public.provider_balances DROP CONSTRAINT IF EXISTS provider_balances_pkey;
ALTER TABLE IF EXISTS ONLY public.property_favorites DROP CONSTRAINT IF EXISTS property_favorites_user_prop;
ALTER TABLE IF EXISTS ONLY public.property_favorites DROP CONSTRAINT IF EXISTS property_favorites_pkey;
ALTER TABLE IF EXISTS ONLY public.properties DROP CONSTRAINT IF EXISTS properties_pkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_ref_id_unique;
ALTER TABLE IF EXISTS ONLY public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.packages DROP CONSTRAINT IF EXISTS packages_pkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY public.interactions DROP CONSTRAINT IF EXISTS interactions_pkey;
ALTER TABLE IF EXISTS ONLY public.favorites DROP CONSTRAINT IF EXISTS favorites_pkey;
ALTER TABLE IF EXISTS ONLY public.faults DROP CONSTRAINT IF EXISTS faults_pkey;
ALTER TABLE IF EXISTS ONLY public.email_templates DROP CONSTRAINT IF EXISTS email_templates_slug_unique;
ALTER TABLE IF EXISTS ONLY public.email_templates DROP CONSTRAINT IF EXISTS email_templates_pkey;
ALTER TABLE IF EXISTS ONLY public.email_logs DROP CONSTRAINT IF EXISTS email_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.coupons DROP CONSTRAINT IF EXISTS coupons_pkey;
ALTER TABLE IF EXISTS ONLY public.coupons DROP CONSTRAINT IF EXISTS coupons_code_unique;
ALTER TABLE IF EXISTS ONLY public.company_pricing DROP CONSTRAINT IF EXISTS company_pricing_pkey;
ALTER TABLE IF EXISTS ONLY public.commission_rules DROP CONSTRAINT IF EXISTS commission_rules_pkey;
ALTER TABLE IF EXISTS ONLY public.cities DROP CONSTRAINT IF EXISTS cities_pkey;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_slug_unique;
ALTER TABLE IF EXISTS ONLY public.categories DROP CONSTRAINT IF EXISTS categories_pkey;
ALTER TABLE IF EXISTS ONLY public.billing_plans DROP CONSTRAINT IF EXISTS billing_plans_pkey;
ALTER TABLE IF EXISTS ONLY public.areas DROP CONSTRAINT IF EXISTS areas_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_staff DROP CONSTRAINT IF EXISTS admin_staff_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_staff DROP CONSTRAINT IF EXISTS admin_staff_email_unique;
ALTER TABLE IF EXISTS public.wallet_transactions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.support_tickets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.subscriptions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.subcategories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.site_settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.services ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.service_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.saved_searches ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.reviews ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.requests ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.regions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.providers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.provider_service_areas ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.property_favorites ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.properties ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.payment_transactions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.packages ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.notifications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.messages ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.interactions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.favorites ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.faults ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.email_templates ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.email_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.coupons ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.company_pricing ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.commission_rules ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.cities ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.categories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.billing_plans ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.areas ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.admin_staff ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.wallet_transactions_id_seq;
DROP TABLE IF EXISTS public.wallet_transactions;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.support_tickets_id_seq;
DROP TABLE IF EXISTS public.support_tickets;
DROP SEQUENCE IF EXISTS public.subscriptions_id_seq;
DROP TABLE IF EXISTS public.subscriptions;
DROP SEQUENCE IF EXISTS public.subcategories_id_seq;
DROP TABLE IF EXISTS public.subcategories;
DROP SEQUENCE IF EXISTS public.site_settings_id_seq;
DROP TABLE IF EXISTS public.site_settings;
DROP TABLE IF EXISTS public.sessions;
DROP SEQUENCE IF EXISTS public.services_id_seq;
DROP TABLE IF EXISTS public.services;
DROP SEQUENCE IF EXISTS public.service_items_id_seq;
DROP TABLE IF EXISTS public.service_items;
DROP SEQUENCE IF EXISTS public.saved_searches_id_seq;
DROP TABLE IF EXISTS public.saved_searches;
DROP SEQUENCE IF EXISTS public.reviews_id_seq;
DROP TABLE IF EXISTS public.reviews;
DROP TABLE IF EXISTS public.reset_tokens;
DROP SEQUENCE IF EXISTS public.requests_id_seq;
DROP TABLE IF EXISTS public.requests;
DROP SEQUENCE IF EXISTS public.regions_id_seq;
DROP TABLE IF EXISTS public.regions;
DROP SEQUENCE IF EXISTS public.providers_id_seq;
DROP TABLE IF EXISTS public.providers;
DROP SEQUENCE IF EXISTS public.provider_service_areas_id_seq;
DROP TABLE IF EXISTS public.provider_service_areas;
DROP TABLE IF EXISTS public.provider_balances;
DROP SEQUENCE IF EXISTS public.property_favorites_id_seq;
DROP TABLE IF EXISTS public.property_favorites;
DROP SEQUENCE IF EXISTS public.properties_id_seq;
DROP TABLE IF EXISTS public.properties;
DROP SEQUENCE IF EXISTS public.payments_id_seq;
DROP TABLE IF EXISTS public.payments;
DROP SEQUENCE IF EXISTS public.payment_transactions_id_seq;
DROP TABLE IF EXISTS public.payment_transactions;
DROP SEQUENCE IF EXISTS public.packages_id_seq;
DROP TABLE IF EXISTS public.packages;
DROP SEQUENCE IF EXISTS public.notifications_id_seq;
DROP TABLE IF EXISTS public.notifications;
DROP SEQUENCE IF EXISTS public.messages_id_seq;
DROP TABLE IF EXISTS public.messages;
DROP SEQUENCE IF EXISTS public.interactions_id_seq;
DROP TABLE IF EXISTS public.interactions;
DROP SEQUENCE IF EXISTS public.favorites_id_seq;
DROP TABLE IF EXISTS public.favorites;
DROP SEQUENCE IF EXISTS public.faults_id_seq;
DROP TABLE IF EXISTS public.faults;
DROP SEQUENCE IF EXISTS public.email_templates_id_seq;
DROP TABLE IF EXISTS public.email_templates;
DROP SEQUENCE IF EXISTS public.email_logs_id_seq;
DROP TABLE IF EXISTS public.email_logs;
DROP SEQUENCE IF EXISTS public.coupons_id_seq;
DROP TABLE IF EXISTS public.coupons;
DROP SEQUENCE IF EXISTS public.company_pricing_id_seq;
DROP TABLE IF EXISTS public.company_pricing;
DROP SEQUENCE IF EXISTS public.commission_rules_id_seq;
DROP TABLE IF EXISTS public.commission_rules;
DROP SEQUENCE IF EXISTS public.cities_id_seq;
DROP TABLE IF EXISTS public.cities;
DROP SEQUENCE IF EXISTS public.categories_id_seq;
DROP TABLE IF EXISTS public.categories;
DROP SEQUENCE IF EXISTS public.billing_plans_id_seq;
DROP TABLE IF EXISTS public.billing_plans;
DROP SEQUENCE IF EXISTS public.areas_id_seq;
DROP TABLE IF EXISTS public.areas;
DROP SEQUENCE IF EXISTS public.admin_staff_id_seq;
DROP TABLE IF EXISTS public.admin_staff;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_staff (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'moderator'::text NOT NULL,
    permissions text DEFAULT '{}'::text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_staff_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_staff_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_staff_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_staff_id_seq OWNED BY public.admin_staff.id;


--
-- Name: areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.areas (
    id integer NOT NULL,
    city_id integer NOT NULL,
    name_ar text NOT NULL,
    name_en text NOT NULL,
    enabled boolean DEFAULT true NOT NULL
);


--
-- Name: areas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.areas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: areas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.areas_id_seq OWNED BY public.areas.id;


--
-- Name: billing_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_plans (
    id integer NOT NULL,
    name text NOT NULL,
    name_ar text,
    description text,
    description_ar text,
    price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    yearly_price numeric(10,2),
    currency text DEFAULT 'EGP'::text NOT NULL,
    duration_days integer DEFAULT 30 NOT NULL,
    duration_type text DEFAULT 'monthly'::text NOT NULL,
    user_type text DEFAULT 'all'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    is_recommended boolean DEFAULT false,
    is_most_popular boolean DEFAULT false,
    trial_days integer DEFAULT 0,
    sort_order integer DEFAULT 0,
    color text DEFAULT '#0d9488'::text,
    limits text DEFAULT '{}'::text,
    features text DEFAULT '{}'::text,
    commission_percent numeric(5,2) DEFAULT '10'::numeric,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: billing_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.billing_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: billing_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.billing_plans_id_seq OWNED BY public.billing_plans.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name_ar text NOT NULL,
    name_en text NOT NULL,
    icon text DEFAULT 'Grid'::text,
    slug text NOT NULL,
    description text,
    image text,
    status text DEFAULT 'active'::text NOT NULL,
    type text DEFAULT 'service'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cities (
    id integer NOT NULL,
    region_id integer NOT NULL,
    name_ar text NOT NULL,
    name_en text NOT NULL,
    enabled boolean DEFAULT true NOT NULL
);


--
-- Name: cities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cities_id_seq OWNED BY public.cities.id;


--
-- Name: commission_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commission_rules (
    id integer NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'percentage'::text NOT NULL,
    value numeric(10,2) DEFAULT '10'::numeric NOT NULL,
    is_percentage boolean DEFAULT true,
    applies_to text DEFAULT 'all'::text,
    user_type text DEFAULT 'all'::text,
    plan_id integer,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: commission_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.commission_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: commission_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.commission_rules_id_seq OWNED BY public.commission_rules.id;


--
-- Name: company_pricing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_pricing (
    id integer NOT NULL,
    company_id integer NOT NULL,
    service_item_id integer,
    fault_id integer,
    custom_price numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: company_pricing_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.company_pricing_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: company_pricing_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.company_pricing_id_seq OWNED BY public.company_pricing.id;


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupons (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    discount_type text DEFAULT 'percentage'::text NOT NULL,
    discount_value numeric(10,2) NOT NULL,
    max_uses integer,
    used_count integer DEFAULT 0,
    min_amount numeric(10,2),
    applicable_plans text DEFAULT '[]'::text,
    expires_at timestamp without time zone,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: coupons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.coupons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: coupons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.coupons_id_seq OWNED BY public.coupons.id;


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_logs (
    id integer NOT NULL,
    template_id text,
    template_name text,
    to_email text NOT NULL,
    to_name text,
    subject text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    error text,
    metadata text,
    sent_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: email_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_logs_id_seq OWNED BY public.email_logs.id;


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_templates (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    subject text NOT NULL,
    html_body text NOT NULL,
    plain_body text DEFAULT ''::text,
    category text DEFAULT 'custom'::text NOT NULL,
    channels text DEFAULT '["email"]'::text,
    variables text DEFAULT '[]'::text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: email_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_templates_id_seq OWNED BY public.email_templates.id;


--
-- Name: faults; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faults (
    id integer NOT NULL,
    service_item_id integer,
    name_ar text NOT NULL,
    name_en text NOT NULL,
    description text,
    default_price numeric(10,2),
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: faults_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.faults_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: faults_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.faults_id_seq OWNED BY public.faults.id;


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    id integer NOT NULL,
    user_id integer NOT NULL,
    provider_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: favorites_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.favorites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: favorites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.favorites_id_seq OWNED BY public.favorites.id;


--
-- Name: interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interactions (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    type text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: interactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.interactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: interactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.interactions_id_seq OWNED BY public.interactions.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    sender_id integer NOT NULL,
    receiver_id integer NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer,
    type text DEFAULT 'info'::text NOT NULL,
    title text NOT NULL,
    message text,
    read boolean DEFAULT false NOT NULL,
    link text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packages (
    id integer NOT NULL,
    name_ar text NOT NULL,
    name_en text NOT NULL,
    price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    duration_days integer DEFAULT 30 NOT NULL,
    max_listings integer DEFAULT 3,
    commission_rate numeric(5,2) DEFAULT '15'::numeric,
    featured_allowed integer DEFAULT 0,
    top_badge boolean DEFAULT false,
    priority_rank integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: packages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.packages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: packages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.packages_id_seq OWNED BY public.packages.id;


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_transactions (
    id integer NOT NULL,
    ref_id text NOT NULL,
    provider_id integer NOT NULL,
    package_id integer,
    kind text DEFAULT 'subscription'::text NOT NULL,
    user_id integer,
    service_id integer,
    amount numeric(10,2) NOT NULL,
    commission_amount numeric(10,2) DEFAULT '0'::numeric,
    currency text DEFAULT 'EGP'::text NOT NULL,
    gateway text DEFAULT 'stcpay'::text NOT NULL,
    gateway_ref text,
    gateway_payload text,
    status text DEFAULT 'pending'::text NOT NULL,
    from_onboarding integer DEFAULT 0 NOT NULL,
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_transactions_id_seq OWNED BY public.payment_transactions.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    provider_id integer,
    type text NOT NULL,
    amount numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    invoice_id text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: properties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.properties (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    title text NOT NULL,
    description text,
    main_category text NOT NULL,
    listing_type text NOT NULL,
    sub_category text,
    price numeric(14,2),
    area numeric(10,2),
    rooms integer,
    bathrooms integer,
    floor integer,
    total_floors integer,
    build_year integer,
    finishing text,
    condition text,
    furnished text,
    direction text,
    payment_method text,
    address text,
    region_id integer,
    city_id integer,
    district text,
    latitude numeric(10,7),
    longitude numeric(10,7),
    images text,
    video_url text,
    brochure_url text,
    logo_url text,
    phone text,
    whatsapp text,
    features text,
    nearby_services text,
    contact_methods text,
    status text DEFAULT 'pending'::text,
    featured boolean DEFAULT false,
    view_count integer DEFAULT 0 NOT NULL,
    phone_click_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: properties_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.properties_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: properties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.properties_id_seq OWNED BY public.properties.id;


--
-- Name: property_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.property_favorites (
    id integer NOT NULL,
    user_id integer NOT NULL,
    property_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: property_favorites_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.property_favorites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: property_favorites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.property_favorites_id_seq OWNED BY public.property_favorites.id;


--
-- Name: provider_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_balances (
    provider_id integer NOT NULL,
    balance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: provider_service_areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_service_areas (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    region_id integer NOT NULL,
    city_id integer,
    area_id integer
);


--
-- Name: provider_service_areas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.provider_service_areas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: provider_service_areas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.provider_service_areas_id_seq OWNED BY public.provider_service_areas.id;


--
-- Name: providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.providers (
    id integer NOT NULL,
    user_id integer NOT NULL,
    bio text,
    banner text,
    avatar text,
    logo text,
    address text,
    city text,
    district text,
    phone text,
    whatsapp text,
    contact_methods text DEFAULT '[]'::text,
    category_id integer,
    covered_areas text DEFAULT '[]'::text,
    active boolean DEFAULT true,
    rating numeric(3,2) DEFAULT '0'::numeric,
    reviews_count integer DEFAULT 0,
    verified boolean DEFAULT false,
    featured boolean DEFAULT false,
    approved boolean DEFAULT false,
    suspended boolean DEFAULT false,
    latitude numeric(10,7),
    longitude numeric(10,7),
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: providers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.providers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: providers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.providers_id_seq OWNED BY public.providers.id;


--
-- Name: regions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regions (
    id integer NOT NULL,
    name_ar text NOT NULL,
    name_en text NOT NULL,
    "order" integer DEFAULT 0,
    enabled boolean DEFAULT true NOT NULL
);


--
-- Name: regions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.regions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.regions_id_seq OWNED BY public.regions.id;


--
-- Name: requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requests (
    id integer NOT NULL,
    user_id integer,
    provider_id integer,
    assigned_company_id integer,
    service_id integer,
    fault_id integer,
    effective_price numeric(10,2),
    message text,
    notes text,
    status text DEFAULT 'new'::text NOT NULL,
    payment_ref text,
    paid_amount numeric(10,2),
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.requests_id_seq OWNED BY public.requests.id;


--
-- Name: reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reset_tokens (
    token text NOT NULL,
    user_id integer NOT NULL,
    email text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id integer NOT NULL,
    user_id integer,
    provider_id integer NOT NULL,
    rating integer NOT NULL,
    text text,
    reply text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;


--
-- Name: saved_searches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_searches (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name text DEFAULT 'بحث محفوظ'::text NOT NULL,
    email text,
    filters text DEFAULT '{}'::text NOT NULL,
    notify_email boolean DEFAULT true NOT NULL,
    notify_app boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: saved_searches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.saved_searches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: saved_searches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.saved_searches_id_seq OWNED BY public.saved_searches.id;


--
-- Name: service_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_items (
    id integer NOT NULL,
    subcategory_id integer,
    name_ar text NOT NULL,
    name_en text NOT NULL,
    description text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: service_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_items_id_seq OWNED BY public.service_items.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    category_id integer,
    title text NOT NULL,
    description text,
    price numeric(10,2),
    subcategory text,
    img text,
    status text DEFAULT 'active'::text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    token text NOT NULL,
    user_id integer NOT NULL,
    role text NOT NULL,
    provider_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    id integer NOT NULL,
    key text NOT NULL,
    value text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: site_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.site_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: site_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.site_settings_id_seq OWNED BY public.site_settings.id;


--
-- Name: subcategories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subcategories (
    id integer NOT NULL,
    category_id integer NOT NULL,
    name_ar text NOT NULL,
    name_en text NOT NULL,
    icon text DEFAULT 'Tag'::text,
    slug text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: subcategories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subcategories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subcategories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subcategories_id_seq OWNED BY public.subcategories.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    package_id integer,
    billing_plan_id integer,
    plan_name text,
    plan_name_ar text,
    plan_price text,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id integer NOT NULL,
    public_id text NOT NULL,
    provider_id integer NOT NULL,
    subject text NOT NULL,
    category text NOT NULL,
    status text DEFAULT 'Pending'::text NOT NULL,
    message text NOT NULL,
    admin_reply text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: support_tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_tickets_id_seq OWNED BY public.support_tickets.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    password_hash text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    avatar text,
    status text DEFAULT 'active'::text NOT NULL,
    region_id integer,
    city_id integer,
    google_id text,
    auth_provider text DEFAULT 'email'::text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transactions (
    id integer NOT NULL,
    provider_id integer,
    type text NOT NULL,
    amount numeric(12,2) NOT NULL,
    ref_id text,
    note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: wallet_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wallet_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wallet_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wallet_transactions_id_seq OWNED BY public.wallet_transactions.id;


--
-- Name: admin_staff id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_staff ALTER COLUMN id SET DEFAULT nextval('public.admin_staff_id_seq'::regclass);


--
-- Name: areas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas ALTER COLUMN id SET DEFAULT nextval('public.areas_id_seq'::regclass);


--
-- Name: billing_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plans ALTER COLUMN id SET DEFAULT nextval('public.billing_plans_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: cities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities ALTER COLUMN id SET DEFAULT nextval('public.cities_id_seq'::regclass);


--
-- Name: commission_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_rules ALTER COLUMN id SET DEFAULT nextval('public.commission_rules_id_seq'::regclass);


--
-- Name: company_pricing id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_pricing ALTER COLUMN id SET DEFAULT nextval('public.company_pricing_id_seq'::regclass);


--
-- Name: coupons id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons ALTER COLUMN id SET DEFAULT nextval('public.coupons_id_seq'::regclass);


--
-- Name: email_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs ALTER COLUMN id SET DEFAULT nextval('public.email_logs_id_seq'::regclass);


--
-- Name: email_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates ALTER COLUMN id SET DEFAULT nextval('public.email_templates_id_seq'::regclass);


--
-- Name: faults id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faults ALTER COLUMN id SET DEFAULT nextval('public.faults_id_seq'::regclass);


--
-- Name: favorites id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites ALTER COLUMN id SET DEFAULT nextval('public.favorites_id_seq'::regclass);


--
-- Name: interactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactions ALTER COLUMN id SET DEFAULT nextval('public.interactions_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: packages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages ALTER COLUMN id SET DEFAULT nextval('public.packages_id_seq'::regclass);


--
-- Name: payment_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions ALTER COLUMN id SET DEFAULT nextval('public.payment_transactions_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: properties id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties ALTER COLUMN id SET DEFAULT nextval('public.properties_id_seq'::regclass);


--
-- Name: property_favorites id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_favorites ALTER COLUMN id SET DEFAULT nextval('public.property_favorites_id_seq'::regclass);


--
-- Name: provider_service_areas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_service_areas ALTER COLUMN id SET DEFAULT nextval('public.provider_service_areas_id_seq'::regclass);


--
-- Name: providers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.providers ALTER COLUMN id SET DEFAULT nextval('public.providers_id_seq'::regclass);


--
-- Name: regions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regions ALTER COLUMN id SET DEFAULT nextval('public.regions_id_seq'::regclass);


--
-- Name: requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests ALTER COLUMN id SET DEFAULT nextval('public.requests_id_seq'::regclass);


--
-- Name: reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);


--
-- Name: saved_searches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_searches ALTER COLUMN id SET DEFAULT nextval('public.saved_searches_id_seq'::regclass);


--
-- Name: service_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_items ALTER COLUMN id SET DEFAULT nextval('public.service_items_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: site_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings ALTER COLUMN id SET DEFAULT nextval('public.site_settings_id_seq'::regclass);


--
-- Name: subcategories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcategories ALTER COLUMN id SET DEFAULT nextval('public.subcategories_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: support_tickets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets ALTER COLUMN id SET DEFAULT nextval('public.support_tickets_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: wallet_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions ALTER COLUMN id SET DEFAULT nextval('public.wallet_transactions_id_seq'::regclass);


--
-- Data for Name: admin_staff; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_staff (id, name, email, password_hash, role, permissions, status, created_at) FROM stdin;
\.


--
-- Data for Name: areas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.areas (id, city_id, name_ar, name_en, enabled) FROM stdin;
121	45	أتريب	أتريب	t
122	45	الفلل	الفلل	t
\.


--
-- Data for Name: billing_plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.billing_plans (id, name, name_ar, description, description_ar, price, yearly_price, currency, duration_days, duration_type, user_type, status, is_recommended, is_most_popular, trial_days, sort_order, color, limits, features, commission_percent, created_at, updated_at) FROM stdin;
1	Free	مجاني	\N	الباقة المجانية - ابدأ مجاناً	0.00	0.00	EGP	30	monthly	all	active	f	f	0	0	#64748b	{"properties":3,"photos":10,"videos":0,"featuredAds":0,"pinnedAds":0,"messages":20,"leads":10}	{"homepageDisplay":false,"topSearch":false,"verifiedBadge":false,"premiumBadge":false,"prioritySupport":false,"analytics":false,"seo":false,"aiTools":false,"autoBoost":false}	10.00	2026-05-19 14:18:24.109577	2026-05-19 14:18:24.109577
2	Bronze	برونز	\N	باقة البرونز للمبتدئين	99.00	999.00	EGP	30	monthly	all	active	f	t	7	1	#b45309	{"properties":10,"photos":20,"videos":2,"featuredAds":3,"pinnedAds":1,"messages":100,"leads":50}	{"homepageDisplay":true,"topSearch":false,"verifiedBadge":false,"premiumBadge":false,"prioritySupport":false,"analytics":true,"seo":false,"aiTools":false,"autoBoost":false}	7.00	2026-05-19 14:18:24.115836	2026-05-19 14:18:24.115836
3	Silver	فضي	\N	الباقة الفضية للسماسرة	199.00	1999.00	EGP	30	monthly	all	active	t	f	7	2	#475569	{"properties":30,"photos":30,"videos":5,"featuredAds":10,"pinnedAds":3,"messages":500,"leads":200}	{"homepageDisplay":true,"topSearch":true,"verifiedBadge":true,"premiumBadge":false,"prioritySupport":false,"analytics":true,"seo":true,"aiTools":false,"autoBoost":false}	5.00	2026-05-19 14:18:24.120179	2026-05-19 14:18:24.120179
4	Gold	ذهبي	\N	الباقة الذهبية للشركات	399.00	3999.00	EGP	30	monthly	all	active	f	f	14	3	#ca8a04	{"properties":100,"photos":50,"videos":10,"featuredAds":30,"pinnedAds":10,"messages":-1,"leads":-1}	{"homepageDisplay":true,"topSearch":true,"verifiedBadge":true,"premiumBadge":true,"prioritySupport":true,"analytics":true,"seo":true,"aiTools":true,"autoBoost":false}	3.00	2026-05-19 14:18:24.123301	2026-05-19 14:18:24.123301
5	VIP	VIP	\N	باقة VIP - صلاحيات غير محدودة	799.00	7999.00	EGP	30	monthly	all	active	f	f	14	4	#7c3aed	{"properties":-1,"photos":-1,"videos":-1,"featuredAds":-1,"pinnedAds":-1,"messages":-1,"leads":-1}	{"homepageDisplay":true,"topSearch":true,"verifiedBadge":true,"premiumBadge":true,"prioritySupport":true,"analytics":true,"seo":true,"aiTools":true,"autoBoost":true}	2.00	2026-05-19 14:18:24.126698	2026-05-19 14:18:24.126698
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name_ar, name_en, icon, slug, description, image, status, type, created_at) FROM stdin;
1	طعام منزلي	Home Food	ChefHat	food	\N	\N	active	service	2026-05-19 14:18:24.146836
2	صيانة	Maintenance	Wrench	maintenance	\N	\N	active	service	2026-05-19 14:18:24.146836
3	تصميم	Design	Palette	design	\N	\N	active	service	2026-05-19 14:18:24.146836
4	تعليم	Education	BookOpen	education	\N	\N	active	service	2026-05-19 14:18:24.146836
5	فعاليات	Events	Calendar	events	\N	\N	active	service	2026-05-19 14:18:24.146836
6	جمال	Beauty	Sparkles	beauty	\N	\N	active	service	2026-05-19 14:18:24.146836
7	سكني	Residential	Home	residential	العقارات السكنية	\N	active	real_estate	2026-05-19 14:18:24.877775
8	تجاري	Commercial	Store	commercial	العقارات التجارية	\N	active	real_estate	2026-05-19 14:18:24.877775
9	أراضي	Land	MapPin	land	الأراضي والقطع	\N	active	real_estate	2026-05-19 14:18:24.877775
10	صناعي	Industrial	Factory	industrial	العقارات الصناعية	\N	active	real_estate	2026-05-19 14:18:24.877775
\.


--
-- Data for Name: cities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cities (id, region_id, name_ar, name_en, enabled) FROM stdin;
45	14	بنها	بنها	t
\.


--
-- Data for Name: commission_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.commission_rules (id, name, type, value, is_percentage, applies_to, user_type, plan_id, priority, is_active, notes, created_at, updated_at) FROM stdin;
1	عمولة البيع	percentage	5.00	t	sale	all	\N	1	t	عمولة على صفقات البيع	2026-05-19 14:18:24.130489	2026-05-19 14:18:24.130489
2	عمولة الإيجار	percentage	3.00	t	rent	all	\N	2	t	عمولة على صفقات الإيجار	2026-05-19 14:18:24.134693	2026-05-19 14:18:24.134693
3	عمولة الإعلانات المميزة	percentage	2.00	t	featured	all	\N	3	t	عمولة الإعلانات المدفوعة	2026-05-19 14:18:24.139026	2026-05-19 14:18:24.139026
\.


--
-- Data for Name: company_pricing; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_pricing (id, company_id, service_item_id, fault_id, custom_price, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: coupons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.coupons (id, code, name, discount_type, discount_value, max_uses, used_count, min_amount, applicable_plans, expires_at, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: email_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_logs (id, template_id, template_name, to_email, to_name, subject, status, error, metadata, sent_at) FROM stdin;
\.


--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_templates (id, name, slug, subject, html_body, plain_body, category, channels, variables, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: faults; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.faults (id, service_item_id, name_ar, name_en, description, default_price, status, created_at) FROM stdin;
\.


--
-- Data for Name: favorites; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.favorites (id, user_id, provider_id, created_at) FROM stdin;
\.


--
-- Data for Name: interactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.interactions (id, provider_id, type, created_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, sender_id, receiver_id, content, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, type, title, message, read, link, created_at) FROM stdin;
1	\N	info	تسجيل جديد: a	نوع الحساب: مقدم خدمة — ١٩‏/٥‏/٢٠٢٦، ٢:٢٤:٣٤ م	f	/admin/users	2026-05-19 14:24:34.328896
2	\N	info	تسجيل جديد: a	نوع الحساب: مقدم خدمة — ١٩‏/٥‏/٢٠٢٦، ٢:٢٧:٠٥ م	f	/admin/users	2026-05-19 14:27:05.737801
3	\N	info	تسجيل جديد: rt	نوع الحساب: مقدم خدمة — ١٩‏/٥‏/٢٠٢٦، ٢:٤١:١٤ م	f	/admin/users	2026-05-19 14:41:14.315815
\.


--
-- Data for Name: packages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.packages (id, name_ar, name_en, price, duration_days, max_listings, commission_rate, featured_allowed, top_badge, priority_rank, created_at) FROM stdin;
1	مجاني	Free	0.00	30	3	15.00	0	f	0	2026-05-19 14:18:24.15191
2	برونزي	Bronze	99.00	30	10	10.00	3	f	1	2026-05-19 14:18:24.15191
3	بريميوم	Premium	249.00	30	\N	7.00	\N	t	2	2026-05-19 14:18:24.15191
\.


--
-- Data for Name: payment_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_transactions (id, ref_id, provider_id, package_id, kind, user_id, service_id, amount, commission_amount, currency, gateway, gateway_ref, gateway_payload, status, from_onboarding, paid_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, provider_id, type, amount, status, invoice_id, created_at) FROM stdin;
\.


--
-- Data for Name: properties; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.properties (id, provider_id, title, description, main_category, listing_type, sub_category, price, area, rooms, bathrooms, floor, total_floors, build_year, finishing, condition, furnished, direction, payment_method, address, region_id, city_id, district, latitude, longitude, images, video_url, brochure_url, logo_url, phone, whatsapp, features, nearby_services, contact_methods, status, featured, view_count, phone_click_count, created_at) FROM stdin;
3	8	3333asd	333sadasdads	residential	sale	فيلا	77.00	22.00	22	2	2	2	22	سوبر لوكس	ممتاز	مفروش بالكامل	\N	\N	333	7	30	33	\N	\N	["/uploads/properties/f0f46ff579be169db61e28d7f9c2bc4b.png","/uploads/properties/9c2698463cdef8e6933ff9b4b734abc5.jpg","/uploads/properties/a3c9e71fdd4e4b7ca54abfcdee908696.png","/uploads/properties/a09028107ac240ba8706b806b496a10d.png","/uploads/properties/d82a72078d634d450c03bf6ad27b4ab9.jpg"]	\N	\N	/uploads/avatars/a956f212d5981871f72d4b837cc4e149.png	12	1	["غرفة خادمة"]	["حدائق عامة"]	[]	published	f	3	3	2026-05-19 14:29:09.030365
2	1	شقة فاخرة 3 غرف - سيدي جابر	شقة رائعة في موقع مميز بالقرب من شاطئ سيدي جابر، تشطيب سوبر لوكس، إطلالة بحرية جزئية، مطبخ حديث مجهز، كل الخدمات والمرافق متوفرة.	شقة	للبيع	\N	2500000.00	150.00	3	2	\N	\N	2020	\N	\N	\N	\N	\N	سيدي جابر، الإسكندرية	\N	\N	\N	31.2001000	29.9187000	["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=85","https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"]	\N	\N	\N	\N	\N	["تكييف مركزي","حديقة خاصة","جراج","أمن 24 ساعة","مصعد","إنترنت فائق السرعة"]	\N	\N	published	t	11	0	2026-05-19 14:24:50.768082
\.


--
-- Data for Name: property_favorites; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.property_favorites (id, user_id, property_id, created_at) FROM stdin;
\.


--
-- Data for Name: provider_balances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.provider_balances (provider_id, balance, updated_at) FROM stdin;
\.


--
-- Data for Name: provider_service_areas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.provider_service_areas (id, provider_id, region_id, city_id, area_id) FROM stdin;
\.


--
-- Data for Name: providers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.providers (id, user_id, bio, banner, avatar, logo, address, city, district, phone, whatsapp, contact_methods, category_id, covered_areas, active, rating, reviews_count, verified, featured, approved, suspended, latitude, longitude, created_at) FROM stdin;
1	2	مصمم جرافيك محترف بخبرة 5 سنوات	\N	\N	\N	\N	الرياض	\N	\N	\N	[]	3	[]	t	4.90	75	t	t	t	f	\N	\N	2026-05-19 14:18:24.41133
2	3	مصورة منتجات احترافية	\N	\N	\N	\N	جدة	\N	\N	\N	[]	3	[]	t	4.80	11	t	t	t	f	\N	\N	2026-05-19 14:18:24.433697
3	4	فني صيانة تكييفات	\N	\N	\N	\N	الدمام	\N	\N	\N	[]	2	[]	t	4.70	77	t	f	t	f	\N	\N	2026-05-19 14:18:24.460695
4	5	طبخ منزلي أصيل	\N	\N	\N	\N	الرياض	\N	\N	\N	[]	1	[]	t	4.90	17	t	t	t	f	\N	\N	2026-05-19 14:18:24.485265
5	6	تنظيم حفلات وأعراس	\N	\N	\N	\N	الطائف	\N	\N	\N	[]	5	[]	t	4.60	75	t	f	t	f	\N	\N	2026-05-19 14:18:24.515228
6	7	خبيرة تجميل ومكياج	\N	\N	\N	\N	الرياض	\N	\N	\N	[]	6	[]	t	4.80	48	t	t	t	f	\N	\N	2026-05-19 14:18:24.543332
7	8	\N	\N	\N	\N	\N	\N	\N	\N	\N	[]	\N	[]	t	0.00	0	f	f	f	f	\N	\N	2026-05-19 14:24:34.298511
8	9	ed	/uploads/banners/3d57c5ff63f2d148b03545fbfc531d2b.jpg	/uploads/avatars/a956f212d5981871f72d4b837cc4e149.png	\N	\N	الوجه	\N	12	1	[]	\N	[]	t	0.00	0	f	f	f	f	\N	\N	2026-05-19 14:27:05.729947
9	10	\N	\N	\N	\N	\N	\N	\N	\N	\N	[]	\N	[]	t	0.00	0	f	f	f	f	\N	\N	2026-05-19 14:41:14.306249
\.


--
-- Data for Name: regions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.regions (id, name_ar, name_en, "order", enabled) FROM stdin;
14	القليوبية	القليوبية	0	t
\.


--
-- Data for Name: requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.requests (id, user_id, provider_id, assigned_company_id, service_id, fault_id, effective_price, message, notes, status, payment_ref, paid_amount, paid_at, created_at) FROM stdin;
\.


--
-- Data for Name: reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reset_tokens (token, user_id, email, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reviews (id, user_id, provider_id, rating, text, reply, created_at) FROM stdin;
1	1	1	5	خدمة ممتازة ومحترفة	\N	2026-05-19 14:18:24.425369
2	1	1	4	عمل جيد وسريع	\N	2026-05-19 14:18:24.425369
3	1	2	5	خدمة ممتازة ومحترفة	\N	2026-05-19 14:18:24.448455
4	1	2	4	عمل جيد وسريع	\N	2026-05-19 14:18:24.448455
5	1	3	5	خدمة ممتازة ومحترفة	\N	2026-05-19 14:18:24.472651
6	1	3	4	عمل جيد وسريع	\N	2026-05-19 14:18:24.472651
7	1	4	5	خدمة ممتازة ومحترفة	\N	2026-05-19 14:18:24.508748
8	1	4	4	عمل جيد وسريع	\N	2026-05-19 14:18:24.508748
9	1	5	5	خدمة ممتازة ومحترفة	\N	2026-05-19 14:18:24.535108
10	1	5	4	عمل جيد وسريع	\N	2026-05-19 14:18:24.535108
11	1	6	5	خدمة ممتازة ومحترفة	\N	2026-05-19 14:18:24.559621
12	1	6	4	عمل جيد وسريع	\N	2026-05-19 14:18:24.559621
\.


--
-- Data for Name: saved_searches; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.saved_searches (id, user_id, name, email, filters, notify_email, notify_app, created_at) FROM stdin;
\.


--
-- Data for Name: service_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_items (id, subcategory_id, name_ar, name_en, description, status, created_at) FROM stdin;
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.services (id, provider_id, category_id, title, description, price, subcategory, img, status, created_at) FROM stdin;
1	1	3	خدمة أحمد عبدالله الأساسية	مصمم جرافيك محترف بخبرة 5 سنوات	211.00	\N	\N	active	2026-05-19 14:18:24.416752
2	1	3	خدمة أحمد عبدالله المتميزة	خدمة متميزة من أحمد عبدالله	151.00	\N	\N	active	2026-05-19 14:18:24.416752
3	2	3	خدمة سارة الغامدي الأساسية	مصورة منتجات احترافية	186.00	\N	\N	active	2026-05-19 14:18:24.438959
4	2	3	خدمة سارة الغامدي المتميزة	خدمة متميزة من سارة الغامدي	207.00	\N	\N	active	2026-05-19 14:18:24.438959
5	3	2	خدمة نواف العتيبي الأساسية	فني صيانة تكييفات	104.00	\N	\N	active	2026-05-19 14:18:24.46455
6	3	2	خدمة نواف العتيبي المتميزة	خدمة متميزة من نواف العتيبي	444.00	\N	\N	active	2026-05-19 14:18:24.46455
7	4	1	خدمة أم خالد الأساسية	طبخ منزلي أصيل	193.00	\N	\N	active	2026-05-19 14:18:24.498059
8	4	1	خدمة أم خالد المتميزة	خدمة متميزة من أم خالد	432.00	\N	\N	active	2026-05-19 14:18:24.498059
9	5	5	خدمة منى الشهري الأساسية	تنظيم حفلات وأعراس	53.00	\N	\N	active	2026-05-19 14:18:24.523016
10	5	5	خدمة منى الشهري المتميزة	خدمة متميزة من منى الشهري	439.00	\N	\N	active	2026-05-19 14:18:24.523016
11	6	6	خدمة هنود القرني الأساسية	خبيرة تجميل ومكياج	244.00	\N	\N	active	2026-05-19 14:18:24.551936
12	6	6	خدمة هنود القرني المتميزة	خدمة متميزة من هنود القرني	545.00	\N	\N	active	2026-05-19 14:18:24.551936
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sessions (token, user_id, role, provider_id, created_at, expires_at) FROM stdin;
91a572c7391c886eabce05dc652149ba56b0d771333be540e2fb74438eb5ebdc	1	admin	\N	2026-05-19 14:33:37.346058	2026-06-18 14:33:37.345
0da6ef256f805aa228a3809c14454553a494e31de7cace0ba2af299e17e9725e	10	provider	9	2026-05-19 14:41:14.310623	2026-06-18 14:41:14.31
\.


--
-- Data for Name: site_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.site_settings (id, key, value, updated_at) FROM stdin;
1	allowRegistration	false	2026-05-19 14:36:25.338322
2	servicesModuleEnabled	false	2026-05-19 14:40:00.352989
3	themePreset	slate	2026-05-19 14:41:56.340397
4	primaryColorHsl	215 25% 35%	2026-05-19 14:41:56.34541
5	secondaryColorHsl	215 20% 90%	2026-05-19 14:41:56.350063
6	accentColorHsl	180 65% 38%	2026-05-19 14:41:56.355997
7	fontFamily	Tajawal	2026-05-19 14:41:56.359822
8	borderRadius	0.75rem	2026-05-19 14:41:56.363091
\.


--
-- Data for Name: subcategories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subcategories (id, category_id, name_ar, name_en, icon, slug, status, created_at) FROM stdin;
1	7	شقة	قق	Tag	ق	active	2026-05-19 14:45:30.758996
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscriptions (id, provider_id, package_id, billing_plan_id, plan_name, plan_name_ar, plan_price, start_date, end_date, status, created_at) FROM stdin;
1	1	2	\N	\N	\N	\N	2026-05-19 14:18:24.421	2026-06-06 14:18:24.421	active	2026-05-19 14:18:24.421916
2	2	2	\N	\N	\N	\N	2026-05-19 14:18:24.443	2026-06-06 14:18:24.443	active	2026-05-19 14:18:24.443771
3	3	2	\N	\N	\N	\N	2026-05-19 14:18:24.468	2026-06-06 14:18:24.468	active	2026-05-19 14:18:24.468789
4	4	2	\N	\N	\N	\N	2026-05-19 14:18:24.501	2026-06-06 14:18:24.501	active	2026-05-19 14:18:24.50157
5	5	2	\N	\N	\N	\N	2026-05-19 14:18:24.527	2026-06-06 14:18:24.527	active	2026-05-19 14:18:24.527545
6	6	2	\N	\N	\N	\N	2026-05-19 14:18:24.554	2026-06-06 14:18:24.554	active	2026-05-19 14:18:24.554806
\.


--
-- Data for Name: support_tickets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.support_tickets (id, public_id, provider_id, subject, category, status, message, admin_reply, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, phone, password_hash, role, avatar, status, region_id, city_id, google_id, auth_provider, created_at) FROM stdin;
1	Admin	admin@dalilsmartlines.com	\N	$2b$10$ScWATbOdIl7SxsLs.CYgUuAMRGAvK4eUpVJhSK3wx74aS/kG5BfKG	admin	\N	active	\N	\N	\N	email	2026-05-19 14:18:24.307627
2	أحمد عبدالله	ahmed@dalilsmartlines.com	\N	$2b$10$ZlTdPl3ifFa471VPUNuj7OXVF8inn0.NM8tgBLOsT52PiwGNCNttS	provider	\N	active	\N	\N	\N	email	2026-05-19 14:18:24.402522
3	سارة الغامدي	sara@dalilsmartlines.com	\N	$2b$10$ZlTdPl3ifFa471VPUNuj7OXVF8inn0.NM8tgBLOsT52PiwGNCNttS	provider	\N	active	\N	\N	\N	email	2026-05-19 14:18:24.430092
4	نواف العتيبي	nawaf@dalilsmartlines.com	\N	$2b$10$ZlTdPl3ifFa471VPUNuj7OXVF8inn0.NM8tgBLOsT52PiwGNCNttS	provider	\N	active	\N	\N	\N	email	2026-05-19 14:18:24.45438
5	أم خالد	oumkhalid@dalilsmartlines.com	\N	$2b$10$ZlTdPl3ifFa471VPUNuj7OXVF8inn0.NM8tgBLOsT52PiwGNCNttS	provider	\N	active	\N	\N	\N	email	2026-05-19 14:18:24.477454
6	منى الشهري	mona@dalilsmartlines.com	\N	$2b$10$ZlTdPl3ifFa471VPUNuj7OXVF8inn0.NM8tgBLOsT52PiwGNCNttS	provider	\N	active	\N	\N	\N	email	2026-05-19 14:18:24.511807
7	هنود القرني	hanood@dalilsmartlines.com	\N	$2b$10$ZlTdPl3ifFa471VPUNuj7OXVF8inn0.NM8tgBLOsT52PiwGNCNttS	provider	\N	active	\N	\N	\N	email	2026-05-19 14:18:24.5394
8	a	a@a.com	\N	$2b$10$dydyxkQdCAuNvWv87a1MBOzvU3kd6MGuHFE9TbGkMQ1kat0d1uauu	provider	\N	active	\N	\N	\N	email	2026-05-19 14:24:34.291529
9	3edsw	aa@a.com	12	$2b$10$uedVabpzSVdt5zW./gEiweyqlGhgflL0.gR9UpHwQFO2XggYsz6AC	provider	\N	active	7	30	\N	email	2026-05-19 14:27:05.697436
10	rt	aaa@a.com	\N	$2b$10$6332oGDoNOCI9mrip8URg.uzX1lnxrE2lrJUTkm.KAGeMXGtV2eSe	provider	\N	active	\N	\N	\N	email	2026-05-19 14:41:14.26992
\.


--
-- Data for Name: wallet_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wallet_transactions (id, provider_id, type, amount, ref_id, note, created_at) FROM stdin;
\.


--
-- Name: admin_staff_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_staff_id_seq', 1, false);


--
-- Name: areas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.areas_id_seq', 122, true);


--
-- Name: billing_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.billing_plans_id_seq', 5, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.categories_id_seq', 10, true);


--
-- Name: cities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cities_id_seq', 45, true);


--
-- Name: commission_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.commission_rules_id_seq', 3, true);


--
-- Name: company_pricing_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.company_pricing_id_seq', 1, false);


--
-- Name: coupons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.coupons_id_seq', 1, false);


--
-- Name: email_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.email_logs_id_seq', 1, false);


--
-- Name: email_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.email_templates_id_seq', 1, false);


--
-- Name: faults_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.faults_id_seq', 1, false);


--
-- Name: favorites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.favorites_id_seq', 1, false);


--
-- Name: interactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.interactions_id_seq', 1, false);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.messages_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 3, true);


--
-- Name: packages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.packages_id_seq', 3, true);


--
-- Name: payment_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payment_transactions_id_seq', 1, false);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payments_id_seq', 1, false);


--
-- Name: properties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.properties_id_seq', 3, true);


--
-- Name: property_favorites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.property_favorites_id_seq', 1, false);


--
-- Name: provider_service_areas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.provider_service_areas_id_seq', 1, false);


--
-- Name: providers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.providers_id_seq', 9, true);


--
-- Name: regions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.regions_id_seq', 14, true);


--
-- Name: requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.requests_id_seq', 1, false);


--
-- Name: reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reviews_id_seq', 12, true);


--
-- Name: saved_searches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.saved_searches_id_seq', 1, false);


--
-- Name: service_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.service_items_id_seq', 1, false);


--
-- Name: services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.services_id_seq', 12, true);


--
-- Name: site_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.site_settings_id_seq', 8, true);


--
-- Name: subcategories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.subcategories_id_seq', 1, true);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.subscriptions_id_seq', 6, true);


--
-- Name: support_tickets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.support_tickets_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 10, true);


--
-- Name: wallet_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.wallet_transactions_id_seq', 1, false);


--
-- Name: admin_staff admin_staff_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_staff
    ADD CONSTRAINT admin_staff_email_unique UNIQUE (email);


--
-- Name: admin_staff admin_staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_staff
    ADD CONSTRAINT admin_staff_pkey PRIMARY KEY (id);


--
-- Name: areas areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_pkey PRIMARY KEY (id);


--
-- Name: billing_plans billing_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_plans
    ADD CONSTRAINT billing_plans_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_unique UNIQUE (slug);


--
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- Name: commission_rules commission_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_rules
    ADD CONSTRAINT commission_rules_pkey PRIMARY KEY (id);


--
-- Name: company_pricing company_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_pricing
    ADD CONSTRAINT company_pricing_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_unique UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_slug_unique UNIQUE (slug);


--
-- Name: faults faults_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faults
    ADD CONSTRAINT faults_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: interactions interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactions
    ADD CONSTRAINT interactions_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: packages packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_ref_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_ref_id_unique UNIQUE (ref_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- Name: property_favorites property_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_favorites
    ADD CONSTRAINT property_favorites_pkey PRIMARY KEY (id);


--
-- Name: property_favorites property_favorites_user_prop; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_favorites
    ADD CONSTRAINT property_favorites_user_prop UNIQUE (user_id, property_id);


--
-- Name: provider_balances provider_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_balances
    ADD CONSTRAINT provider_balances_pkey PRIMARY KEY (provider_id);


--
-- Name: provider_service_areas provider_service_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_service_areas
    ADD CONSTRAINT provider_service_areas_pkey PRIMARY KEY (id);


--
-- Name: providers providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.providers
    ADD CONSTRAINT providers_pkey PRIMARY KEY (id);


--
-- Name: regions regions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (id);


--
-- Name: requests requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_pkey PRIMARY KEY (id);


--
-- Name: reset_tokens reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reset_tokens
    ADD CONSTRAINT reset_tokens_pkey PRIMARY KEY (token);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: saved_searches saved_searches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_searches
    ADD CONSTRAINT saved_searches_pkey PRIMARY KEY (id);


--
-- Name: service_items service_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_items
    ADD CONSTRAINT service_items_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (token);


--
-- Name: site_settings site_settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_key_unique UNIQUE (key);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- Name: subcategories subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_public_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_public_id_unique UNIQUE (public_id);


--
-- Name: favorites uq_favorites_user_provider; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT uq_favorites_user_provider UNIQUE (user_id, provider_id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_google_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_unique UNIQUE (google_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: areas areas_city_id_cities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_city_id_cities_id_fk FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE CASCADE;


--
-- Name: cities cities_region_id_regions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_region_id_regions_id_fk FOREIGN KEY (region_id) REFERENCES public.regions(id) ON DELETE CASCADE;


--
-- Name: company_pricing company_pricing_company_id_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_pricing
    ADD CONSTRAINT company_pricing_company_id_providers_id_fk FOREIGN KEY (company_id) REFERENCES public.providers(id) ON DELETE CASCADE;


--
-- Name: company_pricing company_pricing_fault_id_faults_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_pricing
    ADD CONSTRAINT company_pricing_fault_id_faults_id_fk FOREIGN KEY (fault_id) REFERENCES public.faults(id) ON DELETE CASCADE;


--
-- Name: company_pricing company_pricing_service_item_id_service_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_pricing
    ADD CONSTRAINT company_pricing_service_item_id_service_items_id_fk FOREIGN KEY (service_item_id) REFERENCES public.service_items(id) ON DELETE CASCADE;


--
-- Name: faults faults_service_item_id_service_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faults
    ADD CONSTRAINT faults_service_item_id_service_items_id_fk FOREIGN KEY (service_item_id) REFERENCES public.service_items(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_provider_id_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_provider_id_providers_id_fk FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: interactions interactions_provider_id_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interactions
    ADD CONSTRAINT interactions_provider_id_providers_id_fk FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;


--
-- Name: messages messages_receiver_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_receiver_id_users_id_fk FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_users_id_fk FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_package_id_packages_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_package_id_packages_id_fk FOREIGN KEY (package_id) REFERENCES public.packages(id);


--
-- Name: payment_transactions payment_transactions_provider_id_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_provider_id_providers_id_fk FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;


--
-- Name: payments payments_provider_id_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_provider_id_providers_id_fk FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE SET NULL;


--
-- Name: properties properties_provider_id_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_provider_id_providers_id_fk FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;


--
-- Name: property_favorites property_favorites_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_favorites
    ADD CONSTRAINT property_favorites_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: property_favorites property_favorites_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_favorites
    ADD CONSTRAINT property_favorites_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: provider_balances provider_balances_provider_id_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_balances
    ADD CONSTRAINT provider_balances_provider_id_providers_id_fk FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;


--
-- Name: provider_service_areas provider_service_areas_area_id_areas_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_service_areas
    ADD CONSTRAINT provider_service_areas_area_id_areas_id_fk FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE SET NULL;


--
-- Name: provider_service_areas provider_service_areas_city_id_cities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_service_areas
    ADD CONSTRAINT provider_service_areas_city_id_cities_id_fk FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE CASCADE;


--
-- Name: provider_service_areas provider_service_areas_region_id_regions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_service_areas
    ADD CONSTRAINT provider_service_areas_region_id_regions_id_fk FOREIGN KEY (region_id) REFERENCES public.regions(id) ON DELETE CASCADE;


--
-- Name: providers providers_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.providers
    ADD CONSTRAINT providers_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: providers providers_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.providers
    ADD CONSTRAINT providers_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: requests requests_assigned_company_id_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_assigned_company_id_providers_id_fk FOREIGN KEY (assigned_company_id) REFERENCES public.providers(id) ON DELETE SET NULL;


--
-- Name: requests requests_fault_id_faults_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_fault_id_faults_id_fk FOREIGN KEY (fault_id) REFERENCES public.faults(id) ON DELETE SET NULL;


--
-- Name: requests requests_provider_id_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_provider_id_providers_id_fk FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE SET NULL;


--
-- Name: requests requests_service_id_services_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_service_id_services_id_fk FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: requests requests_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reset_tokens reset_tokens_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reset_tokens
    ADD CONSTRAINT reset_tokens_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_provider_id_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_provider_id_providers_id_fk FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: saved_searches saved_searches_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_searches
    ADD CONSTRAINT saved_searches_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: service_items service_items_subcategory_id_subcategories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_items
    ADD CONSTRAINT service_items_subcategory_id_subcategories_id_fk FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE CASCADE;


--
-- Name: services services_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: services services_provider_id_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_provider_id_providers_id_fk FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subcategories subcategories_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_package_id_packages_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_package_id_packages_id_fk FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE RESTRICT;


--
-- Name: subscriptions subscriptions_provider_id_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_provider_id_providers_id_fk FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_provider_id_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_provider_id_providers_id_fk FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions wallet_transactions_provider_id_providers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_provider_id_providers_id_fk FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict Wndho7GFWIuPhehB4OPBzF81mxInizIpFp3pytgjfAtoVzvXwULfJJdZvOIZZA1

