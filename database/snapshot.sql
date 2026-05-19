--
-- PostgreSQL database dump
--


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



--
-- Data for Name: areas; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.areas VALUES (1, 1, 'النخيل', 'النخيل', true);
INSERT INTO public.areas VALUES (2, 1, 'الياسمين', 'الياسمين', true);
INSERT INTO public.areas VALUES (3, 1, 'الملقا', 'الملقا', true);
INSERT INTO public.areas VALUES (4, 1, 'حي الملك فهد', 'حي الملك فهد', true);
INSERT INTO public.areas VALUES (5, 1, 'العليا', 'العليا', true);
INSERT INTO public.areas VALUES (6, 1, 'الروضة', 'الروضة', true);
INSERT INTO public.areas VALUES (7, 1, 'العزيزية', 'العزيزية', true);
INSERT INTO public.areas VALUES (8, 1, 'الشميسي', 'الشميسي', true);
INSERT INTO public.areas VALUES (9, 1, 'المرسلات', 'المرسلات', true);
INSERT INTO public.areas VALUES (10, 1, 'قرطبة', 'قرطبة', true);
INSERT INTO public.areas VALUES (11, 1, 'غرناطة', 'غرناطة', true);
INSERT INTO public.areas VALUES (12, 1, 'المربع', 'المربع', true);
INSERT INTO public.areas VALUES (13, 1, 'الصحافة', 'الصحافة', true);
INSERT INTO public.areas VALUES (14, 1, 'الربيع', 'الربيع', true);
INSERT INTO public.areas VALUES (15, 1, 'الورود', 'الورود', true);
INSERT INTO public.areas VALUES (16, 1, 'التعاون', 'التعاون', true);
INSERT INTO public.areas VALUES (17, 1, 'الاندلس', 'الاندلس', true);
INSERT INTO public.areas VALUES (18, 1, 'السليمانية', 'السليمانية', true);
INSERT INTO public.areas VALUES (19, 1, 'النرجس', 'النرجس', true);
INSERT INTO public.areas VALUES (20, 7, 'الروضة', 'الروضة', true);
INSERT INTO public.areas VALUES (21, 7, 'الصفا', 'الصفا', true);
INSERT INTO public.areas VALUES (22, 7, 'الحمراء', 'الحمراء', true);
INSERT INTO public.areas VALUES (23, 7, 'البوادي', 'البوادي', true);
INSERT INTO public.areas VALUES (24, 7, 'أبحر الشمالية', 'أبحر الشمالية', true);
INSERT INTO public.areas VALUES (25, 7, 'الزهراء', 'الزهراء', true);
INSERT INTO public.areas VALUES (26, 7, 'المروة', 'المروة', true);
INSERT INTO public.areas VALUES (27, 7, 'الربوة', 'الربوة', true);
INSERT INTO public.areas VALUES (28, 7, 'النزهة', 'النزهة', true);
INSERT INTO public.areas VALUES (29, 7, 'الفيصلية', 'الفيصلية', true);
INSERT INTO public.areas VALUES (30, 7, 'الشاطئ', 'الشاطئ', true);
INSERT INTO public.areas VALUES (31, 7, 'التضامن', 'التضامن', true);
INSERT INTO public.areas VALUES (32, 7, 'الفيحاء', 'الفيحاء', true);
INSERT INTO public.areas VALUES (33, 7, 'العزيزية', 'العزيزية', true);
INSERT INTO public.areas VALUES (34, 7, 'الصواري', 'الصواري', true);
INSERT INTO public.areas VALUES (35, 7, 'النسيم', 'النسيم', true);
INSERT INTO public.areas VALUES (36, 7, 'السلامة', 'السلامة', true);
INSERT INTO public.areas VALUES (37, 8, 'العزيزية', 'العزيزية', true);
INSERT INTO public.areas VALUES (38, 8, 'الزاهر', 'الزاهر', true);
INSERT INTO public.areas VALUES (39, 8, 'العتيبية', 'العتيبية', true);
INSERT INTO public.areas VALUES (40, 8, 'الشرائع', 'الشرائع', true);
INSERT INTO public.areas VALUES (41, 8, 'أجياد', 'أجياد', true);
INSERT INTO public.areas VALUES (42, 8, 'الشيشة', 'الشيشة', true);
INSERT INTO public.areas VALUES (43, 8, 'المعابدة', 'المعابدة', true);
INSERT INTO public.areas VALUES (44, 9, 'الحوية', 'الحوية', true);
INSERT INTO public.areas VALUES (45, 9, 'الشهداء', 'الشهداء', true);
INSERT INTO public.areas VALUES (46, 9, 'القزاز', 'القزاز', true);
INSERT INTO public.areas VALUES (47, 9, 'المثناه', 'المثناه', true);
INSERT INTO public.areas VALUES (48, 9, 'الربوة', 'الربوة', true);
INSERT INTO public.areas VALUES (49, 9, 'الفيصلية', 'الفيصلية', true);
INSERT INTO public.areas VALUES (50, 11, 'قباء', 'قباء', true);
INSERT INTO public.areas VALUES (51, 11, 'شوران', 'شوران', true);
INSERT INTO public.areas VALUES (52, 11, 'العزيزية', 'العزيزية', true);
INSERT INTO public.areas VALUES (53, 11, 'الفيحاء', 'الفيحاء', true);
INSERT INTO public.areas VALUES (54, 11, 'وادي العقيق', 'وادي العقيق', true);
INSERT INTO public.areas VALUES (55, 11, 'سلطانة', 'سلطانة', true);
INSERT INTO public.areas VALUES (56, 11, 'المطار', 'المطار', true);
INSERT INTO public.areas VALUES (57, 14, 'الروضة', 'الروضة', true);
INSERT INTO public.areas VALUES (58, 14, 'الفيحاء', 'الفيحاء', true);
INSERT INTO public.areas VALUES (59, 14, 'الاندلس', 'الاندلس', true);
INSERT INTO public.areas VALUES (60, 14, 'النزهة', 'النزهة', true);
INSERT INTO public.areas VALUES (61, 14, 'السلام', 'السلام', true);
INSERT INTO public.areas VALUES (62, 17, 'الشاطئ', 'الشاطئ', true);
INSERT INTO public.areas VALUES (63, 17, 'الفيصلية', 'الفيصلية', true);
INSERT INTO public.areas VALUES (64, 17, 'العدامة', 'العدامة', true);
INSERT INTO public.areas VALUES (65, 17, 'النزهة', 'النزهة', true);
INSERT INTO public.areas VALUES (66, 17, 'المريكبات', 'المريكبات', true);
INSERT INTO public.areas VALUES (67, 17, 'العنود', 'العنود', true);
INSERT INTO public.areas VALUES (68, 17, 'الجامعيين', 'الجامعيين', true);
INSERT INTO public.areas VALUES (69, 17, 'البادية', 'البادية', true);
INSERT INTO public.areas VALUES (70, 18, 'العقربية', 'العقربية', true);
INSERT INTO public.areas VALUES (71, 18, 'الراكة', 'الراكة', true);
INSERT INTO public.areas VALUES (72, 18, 'الكورنيش', 'الكورنيش', true);
INSERT INTO public.areas VALUES (73, 18, 'الإسكان', 'الإسكان', true);
INSERT INTO public.areas VALUES (74, 18, 'اليرموك', 'اليرموك', true);
INSERT INTO public.areas VALUES (75, 19, 'الدانة', 'الدانة', true);
INSERT INTO public.areas VALUES (76, 19, 'الدوحة الجنوبية', 'الدوحة الجنوبية', true);
INSERT INTO public.areas VALUES (77, 19, 'الدوحة الشمالية', 'الدوحة الشمالية', true);
INSERT INTO public.areas VALUES (78, 19, 'الأنوار', 'الأنوار', true);
INSERT INTO public.areas VALUES (79, 20, 'الهفوف', 'الهفوف', true);
INSERT INTO public.areas VALUES (80, 20, 'المبرز', 'المبرز', true);
INSERT INTO public.areas VALUES (81, 20, 'العيون', 'العيون', true);
INSERT INTO public.areas VALUES (82, 20, 'الجفر', 'الجفر', true);
INSERT INTO public.areas VALUES (83, 20, 'العمران', 'العمران', true);
INSERT INTO public.areas VALUES (84, 21, 'سيهات', 'سيهات', true);
INSERT INTO public.areas VALUES (85, 21, 'صفوى', 'صفوى', true);
INSERT INTO public.areas VALUES (86, 21, 'تاروت', 'تاروت', true);
INSERT INTO public.areas VALUES (87, 21, 'العوامية', 'العوامية', true);
INSERT INTO public.areas VALUES (88, 21, 'الجش', 'الجش', true);
INSERT INTO public.areas VALUES (89, 26, 'المنهل', 'المنهل', true);
INSERT INTO public.areas VALUES (90, 26, 'الروضة', 'الروضة', true);
INSERT INTO public.areas VALUES (91, 26, 'مدينة العمال', 'مدينة العمال', true);
INSERT INTO public.areas VALUES (92, 26, 'الورود', 'الورود', true);
INSERT INTO public.areas VALUES (93, 26, 'الأندلس', 'الأندلس', true);
INSERT INTO public.areas VALUES (94, 27, 'الفيصلية', 'الفيصلية', true);
INSERT INTO public.areas VALUES (95, 27, 'الطائفية', 'الطائفية', true);
INSERT INTO public.areas VALUES (96, 27, 'الصالحية', 'الصالحية', true);
INSERT INTO public.areas VALUES (97, 29, 'الاندلس', 'الاندلس', true);
INSERT INTO public.areas VALUES (98, 29, 'الروضة', 'الروضة', true);
INSERT INTO public.areas VALUES (99, 29, 'الفيصلية', 'الفيصلية', true);
INSERT INTO public.areas VALUES (100, 29, 'العزيزية', 'العزيزية', true);
INSERT INTO public.areas VALUES (101, 31, 'الروضة', 'الروضة', true);
INSERT INTO public.areas VALUES (102, 31, 'الفيصلية', 'الفيصلية', true);
INSERT INTO public.areas VALUES (103, 31, 'الخزام', 'الخزام', true);
INSERT INTO public.areas VALUES (104, 31, 'النزهة', 'النزهة', true);
INSERT INTO public.areas VALUES (105, 33, 'الصالحية', 'الصالحية', true);
INSERT INTO public.areas VALUES (106, 33, 'النزهة', 'النزهة', true);
INSERT INTO public.areas VALUES (107, 33, 'الروضة', 'الروضة', true);
INSERT INTO public.areas VALUES (108, 35, 'الروضة', 'الروضة', true);
INSERT INTO public.areas VALUES (109, 35, 'السلام', 'السلام', true);
INSERT INTO public.areas VALUES (110, 35, 'الفيصلية', 'الفيصلية', true);
INSERT INTO public.areas VALUES (111, 35, 'الكورنيش', 'الكورنيش', true);
INSERT INTO public.areas VALUES (112, 38, 'الفيصلية', 'الفيصلية', true);
INSERT INTO public.areas VALUES (113, 38, 'الأمير فيصل', 'الأمير فيصل', true);
INSERT INTO public.areas VALUES (114, 38, 'سدير', 'سدير', true);
INSERT INTO public.areas VALUES (115, 40, 'العقيق', 'العقيق', true);
INSERT INTO public.areas VALUES (116, 40, 'المخواة', 'المخواة', true);
INSERT INTO public.areas VALUES (117, 40, 'الحجرة', 'الحجرة', true);
INSERT INTO public.areas VALUES (118, 42, 'الروضة', 'الروضة', true);
INSERT INTO public.areas VALUES (119, 42, 'الفيصلية', 'الفيصلية', true);
INSERT INTO public.areas VALUES (120, 42, 'الاندلس', 'الاندلس', true);


--
-- Data for Name: billing_plans; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.billing_plans VALUES (1, 'Free', 'مجاني', NULL, 'الباقة المجانية - ابدأ مجاناً', 0.00, 0.00, 'EGP', 30, 'monthly', 'all', 'active', false, false, 0, 0, '#64748b', '{"properties":3,"photos":10,"videos":0,"featuredAds":0,"pinnedAds":0,"messages":20,"leads":10}', '{"homepageDisplay":false,"topSearch":false,"verifiedBadge":false,"premiumBadge":false,"prioritySupport":false,"analytics":false,"seo":false,"aiTools":false,"autoBoost":false}', 10.00, '2026-05-19 14:18:24.109577', '2026-05-19 14:18:24.109577');
INSERT INTO public.billing_plans VALUES (2, 'Bronze', 'برونز', NULL, 'باقة البرونز للمبتدئين', 99.00, 999.00, 'EGP', 30, 'monthly', 'all', 'active', false, true, 7, 1, '#b45309', '{"properties":10,"photos":20,"videos":2,"featuredAds":3,"pinnedAds":1,"messages":100,"leads":50}', '{"homepageDisplay":true,"topSearch":false,"verifiedBadge":false,"premiumBadge":false,"prioritySupport":false,"analytics":true,"seo":false,"aiTools":false,"autoBoost":false}', 7.00, '2026-05-19 14:18:24.115836', '2026-05-19 14:18:24.115836');
INSERT INTO public.billing_plans VALUES (3, 'Silver', 'فضي', NULL, 'الباقة الفضية للسماسرة', 199.00, 1999.00, 'EGP', 30, 'monthly', 'all', 'active', true, false, 7, 2, '#475569', '{"properties":30,"photos":30,"videos":5,"featuredAds":10,"pinnedAds":3,"messages":500,"leads":200}', '{"homepageDisplay":true,"topSearch":true,"verifiedBadge":true,"premiumBadge":false,"prioritySupport":false,"analytics":true,"seo":true,"aiTools":false,"autoBoost":false}', 5.00, '2026-05-19 14:18:24.120179', '2026-05-19 14:18:24.120179');
INSERT INTO public.billing_plans VALUES (4, 'Gold', 'ذهبي', NULL, 'الباقة الذهبية للشركات', 399.00, 3999.00, 'EGP', 30, 'monthly', 'all', 'active', false, false, 14, 3, '#ca8a04', '{"properties":100,"photos":50,"videos":10,"featuredAds":30,"pinnedAds":10,"messages":-1,"leads":-1}', '{"homepageDisplay":true,"topSearch":true,"verifiedBadge":true,"premiumBadge":true,"prioritySupport":true,"analytics":true,"seo":true,"aiTools":true,"autoBoost":false}', 3.00, '2026-05-19 14:18:24.123301', '2026-05-19 14:18:24.123301');
INSERT INTO public.billing_plans VALUES (5, 'VIP', 'VIP', NULL, 'باقة VIP - صلاحيات غير محدودة', 799.00, 7999.00, 'EGP', 30, 'monthly', 'all', 'active', false, false, 14, 4, '#7c3aed', '{"properties":-1,"photos":-1,"videos":-1,"featuredAds":-1,"pinnedAds":-1,"messages":-1,"leads":-1}', '{"homepageDisplay":true,"topSearch":true,"verifiedBadge":true,"premiumBadge":true,"prioritySupport":true,"analytics":true,"seo":true,"aiTools":true,"autoBoost":true}', 2.00, '2026-05-19 14:18:24.126698', '2026-05-19 14:18:24.126698');


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.categories VALUES (1, 'طعام منزلي', 'Home Food', 'ChefHat', 'food', NULL, NULL, 'active', 'service', '2026-05-19 14:18:24.146836');
INSERT INTO public.categories VALUES (2, 'صيانة', 'Maintenance', 'Wrench', 'maintenance', NULL, NULL, 'active', 'service', '2026-05-19 14:18:24.146836');
INSERT INTO public.categories VALUES (3, 'تصميم', 'Design', 'Palette', 'design', NULL, NULL, 'active', 'service', '2026-05-19 14:18:24.146836');
INSERT INTO public.categories VALUES (4, 'تعليم', 'Education', 'BookOpen', 'education', NULL, NULL, 'active', 'service', '2026-05-19 14:18:24.146836');
INSERT INTO public.categories VALUES (5, 'فعاليات', 'Events', 'Calendar', 'events', NULL, NULL, 'active', 'service', '2026-05-19 14:18:24.146836');
INSERT INTO public.categories VALUES (6, 'جمال', 'Beauty', 'Sparkles', 'beauty', NULL, NULL, 'active', 'service', '2026-05-19 14:18:24.146836');
INSERT INTO public.categories VALUES (7, 'سكني', 'Residential', 'Home', 'residential', 'العقارات السكنية', NULL, 'active', 'real_estate', '2026-05-19 14:18:24.877775');
INSERT INTO public.categories VALUES (8, 'تجاري', 'Commercial', 'Store', 'commercial', 'العقارات التجارية', NULL, 'active', 'real_estate', '2026-05-19 14:18:24.877775');
INSERT INTO public.categories VALUES (9, 'أراضي', 'Land', 'MapPin', 'land', 'الأراضي والقطع', NULL, 'active', 'real_estate', '2026-05-19 14:18:24.877775');
INSERT INTO public.categories VALUES (10, 'صناعي', 'Industrial', 'Factory', 'industrial', 'العقارات الصناعية', NULL, 'active', 'real_estate', '2026-05-19 14:18:24.877775');


--
-- Data for Name: cities; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.cities VALUES (1, 1, 'الرياض', 'الرياض', true);
INSERT INTO public.cities VALUES (2, 1, 'الخرج', 'الخرج', true);
INSERT INTO public.cities VALUES (3, 1, 'الدوادمي', 'الدوادمي', true);
INSERT INTO public.cities VALUES (4, 1, 'الزلفي', 'الزلفي', true);
INSERT INTO public.cities VALUES (5, 1, 'شقراء', 'شقراء', true);
INSERT INTO public.cities VALUES (6, 1, 'المجمعة', 'المجمعة', true);
INSERT INTO public.cities VALUES (7, 2, 'جدة', 'جدة', true);
INSERT INTO public.cities VALUES (8, 2, 'مكة المكرمة', 'مكة المكرمة', true);
INSERT INTO public.cities VALUES (9, 2, 'الطائف', 'الطائف', true);
INSERT INTO public.cities VALUES (10, 2, 'رابغ', 'رابغ', true);
INSERT INTO public.cities VALUES (11, 3, 'المدينة المنورة', 'المدينة المنورة', true);
INSERT INTO public.cities VALUES (12, 3, 'ينبع', 'ينبع', true);
INSERT INTO public.cities VALUES (13, 3, 'العلا', 'العلا', true);
INSERT INTO public.cities VALUES (14, 4, 'بريدة', 'بريدة', true);
INSERT INTO public.cities VALUES (15, 4, 'عنيزة', 'عنيزة', true);
INSERT INTO public.cities VALUES (16, 4, 'الرس', 'الرس', true);
INSERT INTO public.cities VALUES (17, 5, 'الدمام', 'الدمام', true);
INSERT INTO public.cities VALUES (18, 5, 'الخبر', 'الخبر', true);
INSERT INTO public.cities VALUES (19, 5, 'الظهران', 'الظهران', true);
INSERT INTO public.cities VALUES (20, 5, 'الأحساء', 'الأحساء', true);
INSERT INTO public.cities VALUES (21, 5, 'القطيف', 'القطيف', true);
INSERT INTO public.cities VALUES (22, 5, 'الجبيل', 'الجبيل', true);
INSERT INTO public.cities VALUES (23, 5, 'حفر الباطن', 'حفر الباطن', true);
INSERT INTO public.cities VALUES (24, 5, 'الخفجي', 'الخفجي', true);
INSERT INTO public.cities VALUES (25, 5, 'رأس تنورة', 'رأس تنورة', true);
INSERT INTO public.cities VALUES (26, 6, 'أبها', 'أبها', true);
INSERT INTO public.cities VALUES (27, 6, 'خميس مشيط', 'خميس مشيط', true);
INSERT INTO public.cities VALUES (28, 6, 'بيشة', 'بيشة', true);
INSERT INTO public.cities VALUES (29, 7, 'تبوك', 'تبوك', true);
INSERT INTO public.cities VALUES (30, 7, 'الوجه', 'الوجه', true);
INSERT INTO public.cities VALUES (31, 8, 'حائل', 'حائل', true);
INSERT INTO public.cities VALUES (32, 8, 'بقعاء', 'بقعاء', true);
INSERT INTO public.cities VALUES (33, 9, 'عرعر', 'عرعر', true);
INSERT INTO public.cities VALUES (34, 9, 'رفحاء', 'رفحاء', true);
INSERT INTO public.cities VALUES (35, 10, 'جازان', 'جازان', true);
INSERT INTO public.cities VALUES (36, 10, 'أبو عريش', 'أبو عريش', true);
INSERT INTO public.cities VALUES (37, 10, 'صبيا', 'صبيا', true);
INSERT INTO public.cities VALUES (38, 11, 'نجران', 'نجران', true);
INSERT INTO public.cities VALUES (39, 11, 'شرورة', 'شرورة', true);
INSERT INTO public.cities VALUES (40, 12, 'الباحة', 'الباحة', true);
INSERT INTO public.cities VALUES (41, 12, 'بلجرشي', 'بلجرشي', true);
INSERT INTO public.cities VALUES (42, 13, 'سكاكا', 'سكاكا', true);
INSERT INTO public.cities VALUES (43, 13, 'القريات', 'القريات', true);
INSERT INTO public.cities VALUES (44, 13, 'دومة الجندل', 'دومة الجندل', true);


--
-- Data for Name: commission_rules; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.commission_rules VALUES (1, 'عمولة البيع', 'percentage', 5.00, true, 'sale', 'all', NULL, 1, true, 'عمولة على صفقات البيع', '2026-05-19 14:18:24.130489', '2026-05-19 14:18:24.130489');
INSERT INTO public.commission_rules VALUES (2, 'عمولة الإيجار', 'percentage', 3.00, true, 'rent', 'all', NULL, 2, true, 'عمولة على صفقات الإيجار', '2026-05-19 14:18:24.134693', '2026-05-19 14:18:24.134693');
INSERT INTO public.commission_rules VALUES (3, 'عمولة الإعلانات المميزة', 'percentage', 2.00, true, 'featured', 'all', NULL, 3, true, 'عمولة الإعلانات المدفوعة', '2026-05-19 14:18:24.139026', '2026-05-19 14:18:24.139026');


--
-- Data for Name: company_pricing; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: coupons; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: email_logs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: faults; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: favorites; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: interactions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.notifications VALUES (1, NULL, 'info', 'تسجيل جديد: a', 'نوع الحساب: مقدم خدمة — ١٩‏/٥‏/٢٠٢٦، ٢:٢٤:٣٤ م', false, '/admin/users', '2026-05-19 14:24:34.328896');
INSERT INTO public.notifications VALUES (2, NULL, 'info', 'تسجيل جديد: a', 'نوع الحساب: مقدم خدمة — ١٩‏/٥‏/٢٠٢٦، ٢:٢٧:٠٥ م', false, '/admin/users', '2026-05-19 14:27:05.737801');


--
-- Data for Name: packages; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.packages VALUES (1, 'مجاني', 'Free', 0.00, 30, 3, 15.00, 0, false, 0, '2026-05-19 14:18:24.15191');
INSERT INTO public.packages VALUES (2, 'برونزي', 'Bronze', 99.00, 30, 10, 10.00, 3, false, 1, '2026-05-19 14:18:24.15191');
INSERT INTO public.packages VALUES (3, 'بريميوم', 'Premium', 249.00, 30, NULL, 7.00, NULL, true, 2, '2026-05-19 14:18:24.15191');


--
-- Data for Name: payment_transactions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: properties; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.properties VALUES (3, 8, '3333asd', '333sadasdads', 'residential', 'sale', 'فيلا', 77.00, 22.00, 22, 2, 2, 2, 22, 'سوبر لوكس', 'ممتاز', 'مفروش بالكامل', NULL, NULL, '333', 7, 30, '33', NULL, NULL, '["/uploads/properties/f0f46ff579be169db61e28d7f9c2bc4b.png","/uploads/properties/9c2698463cdef8e6933ff9b4b734abc5.jpg","/uploads/properties/a3c9e71fdd4e4b7ca54abfcdee908696.png","/uploads/properties/a09028107ac240ba8706b806b496a10d.png","/uploads/properties/d82a72078d634d450c03bf6ad27b4ab9.jpg"]', NULL, NULL, '/uploads/avatars/a956f212d5981871f72d4b837cc4e149.png', '12', '1', '["غرفة خادمة"]', '["حدائق عامة"]', '[]', 'published', false, 0, 0, '2026-05-19 14:29:09.030365');
INSERT INTO public.properties VALUES (2, 1, 'شقة فاخرة 3 غرف - سيدي جابر', 'شقة رائعة في موقع مميز بالقرب من شاطئ سيدي جابر، تشطيب سوبر لوكس، إطلالة بحرية جزئية، مطبخ حديث مجهز، كل الخدمات والمرافق متوفرة.', 'شقة', 'للبيع', NULL, 2500000.00, 150.00, 3, 2, NULL, NULL, 2020, NULL, NULL, NULL, NULL, NULL, 'سيدي جابر، الإسكندرية', NULL, NULL, NULL, 31.2001000, 29.9187000, '["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=85","https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=800&q=80","https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"]', NULL, NULL, NULL, NULL, NULL, '["تكييف مركزي","حديقة خاصة","جراج","أمن 24 ساعة","مصعد","إنترنت فائق السرعة"]', NULL, NULL, 'published', true, 2, 0, '2026-05-19 14:24:50.768082');


--
-- Data for Name: property_favorites; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: provider_balances; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: provider_service_areas; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: providers; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.providers VALUES (1, 2, 'مصمم جرافيك محترف بخبرة 5 سنوات', NULL, NULL, NULL, NULL, 'الرياض', NULL, NULL, NULL, '[]', 3, '[]', true, 4.90, 75, true, true, true, false, NULL, NULL, '2026-05-19 14:18:24.41133');
INSERT INTO public.providers VALUES (2, 3, 'مصورة منتجات احترافية', NULL, NULL, NULL, NULL, 'جدة', NULL, NULL, NULL, '[]', 3, '[]', true, 4.80, 11, true, true, true, false, NULL, NULL, '2026-05-19 14:18:24.433697');
INSERT INTO public.providers VALUES (3, 4, 'فني صيانة تكييفات', NULL, NULL, NULL, NULL, 'الدمام', NULL, NULL, NULL, '[]', 2, '[]', true, 4.70, 77, true, false, true, false, NULL, NULL, '2026-05-19 14:18:24.460695');
INSERT INTO public.providers VALUES (4, 5, 'طبخ منزلي أصيل', NULL, NULL, NULL, NULL, 'الرياض', NULL, NULL, NULL, '[]', 1, '[]', true, 4.90, 17, true, true, true, false, NULL, NULL, '2026-05-19 14:18:24.485265');
INSERT INTO public.providers VALUES (5, 6, 'تنظيم حفلات وأعراس', NULL, NULL, NULL, NULL, 'الطائف', NULL, NULL, NULL, '[]', 5, '[]', true, 4.60, 75, true, false, true, false, NULL, NULL, '2026-05-19 14:18:24.515228');
INSERT INTO public.providers VALUES (6, 7, 'خبيرة تجميل ومكياج', NULL, NULL, NULL, NULL, 'الرياض', NULL, NULL, NULL, '[]', 6, '[]', true, 4.80, 48, true, true, true, false, NULL, NULL, '2026-05-19 14:18:24.543332');
INSERT INTO public.providers VALUES (7, 8, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, '[]', true, 0.00, 0, false, false, false, false, NULL, NULL, '2026-05-19 14:24:34.298511');
INSERT INTO public.providers VALUES (8, 9, 'ed', '/uploads/banners/3d57c5ff63f2d148b03545fbfc531d2b.jpg', '/uploads/avatars/a956f212d5981871f72d4b837cc4e149.png', NULL, NULL, 'الوجه', NULL, '12', '1', '[]', NULL, '[]', true, 0.00, 0, false, false, false, false, NULL, NULL, '2026-05-19 14:27:05.729947');


--
-- Data for Name: regions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.regions VALUES (1, 'منطقة الرياض', 'Riyadh Region', 1, true);
INSERT INTO public.regions VALUES (2, 'منطقة مكة المكرمة', 'Mecca Region', 2, true);
INSERT INTO public.regions VALUES (3, 'منطقة المدينة المنورة', 'Madinah Region', 3, true);
INSERT INTO public.regions VALUES (4, 'منطقة القصيم', 'Qassim Region', 4, true);
INSERT INTO public.regions VALUES (5, 'المنطقة الشرقية', 'Eastern Province', 5, true);
INSERT INTO public.regions VALUES (6, 'منطقة عسير', 'Asir Region', 6, true);
INSERT INTO public.regions VALUES (7, 'منطقة تبوك', 'Tabuk Region', 7, true);
INSERT INTO public.regions VALUES (8, 'منطقة حائل', 'Hail Region', 8, true);
INSERT INTO public.regions VALUES (9, 'منطقة الحدود الشمالية', 'Northern Borders Region', 9, true);
INSERT INTO public.regions VALUES (10, 'منطقة جازان', 'Jizan Region', 10, true);
INSERT INTO public.regions VALUES (11, 'منطقة نجران', 'Najran Region', 11, true);
INSERT INTO public.regions VALUES (12, 'منطقة الباحة', 'Al-Baha Region', 12, true);
INSERT INTO public.regions VALUES (13, 'منطقة الجوف', 'Al-Jouf Region', 13, true);


--
-- Data for Name: requests; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.reviews VALUES (1, 1, 1, 5, 'خدمة ممتازة ومحترفة', NULL, '2026-05-19 14:18:24.425369');
INSERT INTO public.reviews VALUES (2, 1, 1, 4, 'عمل جيد وسريع', NULL, '2026-05-19 14:18:24.425369');
INSERT INTO public.reviews VALUES (3, 1, 2, 5, 'خدمة ممتازة ومحترفة', NULL, '2026-05-19 14:18:24.448455');
INSERT INTO public.reviews VALUES (4, 1, 2, 4, 'عمل جيد وسريع', NULL, '2026-05-19 14:18:24.448455');
INSERT INTO public.reviews VALUES (5, 1, 3, 5, 'خدمة ممتازة ومحترفة', NULL, '2026-05-19 14:18:24.472651');
INSERT INTO public.reviews VALUES (6, 1, 3, 4, 'عمل جيد وسريع', NULL, '2026-05-19 14:18:24.472651');
INSERT INTO public.reviews VALUES (7, 1, 4, 5, 'خدمة ممتازة ومحترفة', NULL, '2026-05-19 14:18:24.508748');
INSERT INTO public.reviews VALUES (8, 1, 4, 4, 'عمل جيد وسريع', NULL, '2026-05-19 14:18:24.508748');
INSERT INTO public.reviews VALUES (9, 1, 5, 5, 'خدمة ممتازة ومحترفة', NULL, '2026-05-19 14:18:24.535108');
INSERT INTO public.reviews VALUES (10, 1, 5, 4, 'عمل جيد وسريع', NULL, '2026-05-19 14:18:24.535108');
INSERT INTO public.reviews VALUES (11, 1, 6, 5, 'خدمة ممتازة ومحترفة', NULL, '2026-05-19 14:18:24.559621');
INSERT INTO public.reviews VALUES (12, 1, 6, 4, 'عمل جيد وسريع', NULL, '2026-05-19 14:18:24.559621');


--
-- Data for Name: saved_searches; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: service_items; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.services VALUES (1, 1, 3, 'خدمة أحمد عبدالله الأساسية', 'مصمم جرافيك محترف بخبرة 5 سنوات', 211.00, NULL, NULL, 'active', '2026-05-19 14:18:24.416752');
INSERT INTO public.services VALUES (2, 1, 3, 'خدمة أحمد عبدالله المتميزة', 'خدمة متميزة من أحمد عبدالله', 151.00, NULL, NULL, 'active', '2026-05-19 14:18:24.416752');
INSERT INTO public.services VALUES (3, 2, 3, 'خدمة سارة الغامدي الأساسية', 'مصورة منتجات احترافية', 186.00, NULL, NULL, 'active', '2026-05-19 14:18:24.438959');
INSERT INTO public.services VALUES (4, 2, 3, 'خدمة سارة الغامدي المتميزة', 'خدمة متميزة من سارة الغامدي', 207.00, NULL, NULL, 'active', '2026-05-19 14:18:24.438959');
INSERT INTO public.services VALUES (5, 3, 2, 'خدمة نواف العتيبي الأساسية', 'فني صيانة تكييفات', 104.00, NULL, NULL, 'active', '2026-05-19 14:18:24.46455');
INSERT INTO public.services VALUES (6, 3, 2, 'خدمة نواف العتيبي المتميزة', 'خدمة متميزة من نواف العتيبي', 444.00, NULL, NULL, 'active', '2026-05-19 14:18:24.46455');
INSERT INTO public.services VALUES (7, 4, 1, 'خدمة أم خالد الأساسية', 'طبخ منزلي أصيل', 193.00, NULL, NULL, 'active', '2026-05-19 14:18:24.498059');
INSERT INTO public.services VALUES (8, 4, 1, 'خدمة أم خالد المتميزة', 'خدمة متميزة من أم خالد', 432.00, NULL, NULL, 'active', '2026-05-19 14:18:24.498059');
INSERT INTO public.services VALUES (9, 5, 5, 'خدمة منى الشهري الأساسية', 'تنظيم حفلات وأعراس', 53.00, NULL, NULL, 'active', '2026-05-19 14:18:24.523016');
INSERT INTO public.services VALUES (10, 5, 5, 'خدمة منى الشهري المتميزة', 'خدمة متميزة من منى الشهري', 439.00, NULL, NULL, 'active', '2026-05-19 14:18:24.523016');
INSERT INTO public.services VALUES (11, 6, 6, 'خدمة هنود القرني الأساسية', 'خبيرة تجميل ومكياج', 244.00, NULL, NULL, 'active', '2026-05-19 14:18:24.551936');
INSERT INTO public.services VALUES (12, 6, 6, 'خدمة هنود القرني المتميزة', 'خدمة متميزة من هنود القرني', 545.00, NULL, NULL, 'active', '2026-05-19 14:18:24.551936');


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.sessions VALUES ('91a572c7391c886eabce05dc652149ba56b0d771333be540e2fb74438eb5ebdc', 1, 'admin', NULL, '2026-05-19 14:33:37.346058', '2026-06-18 14:33:37.345');


--
-- Data for Name: site_settings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.site_settings VALUES (1, 'allowRegistration', 'false', '2026-05-19 14:36:25.338322');
INSERT INTO public.site_settings VALUES (2, 'servicesModuleEnabled', 'false', '2026-05-19 14:40:00.352989');


--
-- Data for Name: subcategories; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.subscriptions VALUES (1, 1, 2, NULL, NULL, NULL, NULL, '2026-05-19 14:18:24.421', '2026-06-06 14:18:24.421', 'active', '2026-05-19 14:18:24.421916');
INSERT INTO public.subscriptions VALUES (2, 2, 2, NULL, NULL, NULL, NULL, '2026-05-19 14:18:24.443', '2026-06-06 14:18:24.443', 'active', '2026-05-19 14:18:24.443771');
INSERT INTO public.subscriptions VALUES (3, 3, 2, NULL, NULL, NULL, NULL, '2026-05-19 14:18:24.468', '2026-06-06 14:18:24.468', 'active', '2026-05-19 14:18:24.468789');
INSERT INTO public.subscriptions VALUES (4, 4, 2, NULL, NULL, NULL, NULL, '2026-05-19 14:18:24.501', '2026-06-06 14:18:24.501', 'active', '2026-05-19 14:18:24.50157');
INSERT INTO public.subscriptions VALUES (5, 5, 2, NULL, NULL, NULL, NULL, '2026-05-19 14:18:24.527', '2026-06-06 14:18:24.527', 'active', '2026-05-19 14:18:24.527545');
INSERT INTO public.subscriptions VALUES (6, 6, 2, NULL, NULL, NULL, NULL, '2026-05-19 14:18:24.554', '2026-06-06 14:18:24.554', 'active', '2026-05-19 14:18:24.554806');


--
-- Data for Name: support_tickets; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users VALUES (1, 'Admin', 'admin@dalilsmartlines.com', NULL, '$2b$10$ScWATbOdIl7SxsLs.CYgUuAMRGAvK4eUpVJhSK3wx74aS/kG5BfKG', 'admin', NULL, 'active', NULL, NULL, NULL, 'email', '2026-05-19 14:18:24.307627');
INSERT INTO public.users VALUES (2, 'أحمد عبدالله', 'ahmed@dalilsmartlines.com', NULL, '$2b$10$ZlTdPl3ifFa471VPUNuj7OXVF8inn0.NM8tgBLOsT52PiwGNCNttS', 'provider', NULL, 'active', NULL, NULL, NULL, 'email', '2026-05-19 14:18:24.402522');
INSERT INTO public.users VALUES (3, 'سارة الغامدي', 'sara@dalilsmartlines.com', NULL, '$2b$10$ZlTdPl3ifFa471VPUNuj7OXVF8inn0.NM8tgBLOsT52PiwGNCNttS', 'provider', NULL, 'active', NULL, NULL, NULL, 'email', '2026-05-19 14:18:24.430092');
INSERT INTO public.users VALUES (4, 'نواف العتيبي', 'nawaf@dalilsmartlines.com', NULL, '$2b$10$ZlTdPl3ifFa471VPUNuj7OXVF8inn0.NM8tgBLOsT52PiwGNCNttS', 'provider', NULL, 'active', NULL, NULL, NULL, 'email', '2026-05-19 14:18:24.45438');
INSERT INTO public.users VALUES (5, 'أم خالد', 'oumkhalid@dalilsmartlines.com', NULL, '$2b$10$ZlTdPl3ifFa471VPUNuj7OXVF8inn0.NM8tgBLOsT52PiwGNCNttS', 'provider', NULL, 'active', NULL, NULL, NULL, 'email', '2026-05-19 14:18:24.477454');
INSERT INTO public.users VALUES (6, 'منى الشهري', 'mona@dalilsmartlines.com', NULL, '$2b$10$ZlTdPl3ifFa471VPUNuj7OXVF8inn0.NM8tgBLOsT52PiwGNCNttS', 'provider', NULL, 'active', NULL, NULL, NULL, 'email', '2026-05-19 14:18:24.511807');
INSERT INTO public.users VALUES (7, 'هنود القرني', 'hanood@dalilsmartlines.com', NULL, '$2b$10$ZlTdPl3ifFa471VPUNuj7OXVF8inn0.NM8tgBLOsT52PiwGNCNttS', 'provider', NULL, 'active', NULL, NULL, NULL, 'email', '2026-05-19 14:18:24.5394');
INSERT INTO public.users VALUES (8, 'a', 'a@a.com', NULL, '$2b$10$dydyxkQdCAuNvWv87a1MBOzvU3kd6MGuHFE9TbGkMQ1kat0d1uauu', 'provider', NULL, 'active', NULL, NULL, NULL, 'email', '2026-05-19 14:24:34.291529');
INSERT INTO public.users VALUES (9, '3edsw', 'aa@a.com', '12', '$2b$10$uedVabpzSVdt5zW./gEiweyqlGhgflL0.gR9UpHwQFO2XggYsz6AC', 'provider', NULL, 'active', 7, 30, NULL, 'email', '2026-05-19 14:27:05.697436');


--
-- Data for Name: wallet_transactions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Name: admin_staff_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_staff_id_seq', 1, false);


--
-- Name: areas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.areas_id_seq', 120, true);


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

SELECT pg_catalog.setval('public.cities_id_seq', 44, true);


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

SELECT pg_catalog.setval('public.notifications_id_seq', 2, true);


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

SELECT pg_catalog.setval('public.providers_id_seq', 8, true);


--
-- Name: regions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.regions_id_seq', 13, true);


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

SELECT pg_catalog.setval('public.site_settings_id_seq', 2, true);


--
-- Name: subcategories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.subcategories_id_seq', 1, false);


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

SELECT pg_catalog.setval('public.users_id_seq', 9, true);


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

\unrestrict B7CIbcXEN3pVRaF62jHkFgYc1HMYHyugqrwdOeh8ziTno0GaBCSgmtlWksYjR4n

