// Central HTTP client for the Vite app → proxied `/api/*` → API server (e.g. :8080)
// In production builds, set VITE_API_BASE_URL to your backend domain (e.g. https://api.yourdomain.com)

const _viteApiBase = (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ?? "";
const API = _viteApiBase ? `${_viteApiBase.replace(/\/$/, "")}/api` : "/api";

function stripTrailingSlash(s: string) {
  return s.replace(/\/$/, "");
}

const APP_BASE = typeof import.meta !== "undefined" ? stripTrailingSlash(import.meta.env.BASE_URL || "") : "";

/** Turn stored paths like `/uploads/...` into a browser-loadable URL (Vite proxies `/uploads` in dev). */
export function mediaUrl(url: string | null | undefined, fallback = ""): string {
  if (!url) return fallback;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${APP_BASE}${path}`;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function qs(params?: Record<string, string | number | boolean | undefined | null>) {
  if (!params) return "";
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${API}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });

  let body: unknown = null;
  const ct = res.headers.get("content-type");
  if (ct?.includes("application/json")) {
    try {
      body = await res.json();
    } catch {
      body = null;
    }
  }

  const b = body as Record<string, unknown> | null;

  if (!res.ok) {
    const msg =
      (typeof b?.error === "string" && b.error) ||
      (typeof b?.message === "string" && b.message) ||
      res.statusText ||
      `HTTP ${res.status}`;
    throw new ApiError(res.status, msg);
  }

  if (b && typeof b === "object" && b.success === false) {
    throw new ApiError(res.status, (typeof b.error === "string" && b.error) || "تعذر تنفيذ الطلب");
  }

  if (b && typeof b === "object" && "data" in b) return b.data as T;
  return body as T;
}

const ensureArray = <T,>(res: unknown): T[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === "object" && Array.isArray((res as { data?: unknown }).data)) {
    return (res as { data: T[] }).data;
  }
  return [];
};

async function uploadFile(path: string, field: string, file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append(field, file);
  const res = await fetch(`${API}${path}`, { method: "POST", body: form, credentials: "include", cache: "no-store" });
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const msg = (typeof body?.error === "string" && body.error) || res.statusText;
    throw new ApiError(res.status, msg);
  }
  const data = body?.data as { url?: string } | undefined;
  if (!data?.url) throw new ApiError(res.status, "Invalid upload response");
  return { url: data.url };
}

// ── Types (UI-facing; aligned with API JSON) ─────────────────────────────

export interface Category {
  id: number;
  nameAr: string;
  nameEn: string;
  icon: string | null;
  slug: string;
  description: string | null;
  image: string | null;
  status?: string | null;
}
export interface Subcategory {
  id: number;
  categoryId: number;
  nameAr: string;
  nameEn: string;
  icon: string | null;
  slug: string;
  status?: string | null;
}
export interface Provider {
  id: number;
  bio: string | null;
  avatar: string | null;
  banner: string | null;
  /** Some payloads use these aliases; prefer `banner` / `avatar` when absent. */
  cover_image?: string | null;
  profile_image?: string | null;
  city: string | null;
  district: string | null;
  phone: string | null;
  whatsapp?: string | null;
  contactMethods?: string | null;
  rating: string;
  reviewsCount: number;
  verified: boolean;
  featured: boolean;
  categoryId: number | null;
  userName: string;
  categoryNameAr: string | null;
  latitude: string | null;
  longitude: string | null;
  createdAt?: string;
}
export interface AdminProvider extends Provider {
  userId: number;
  userEmail: string;
  approved: boolean;
  suspended: boolean;
  createdAt?: string;
  regionNameAr?: string | null;
}
export interface ProviderDetail extends Provider {
  userId: number;
  userEmail: string;
  whatsapp: string | null;
  approved: boolean;
  suspended: boolean;
  services: Service[];
  reviews: Review[];
  subscription: {
    id: number;
    startDate: string;
    endDate: string;
    packageName?: string | null;
    packageNameAr?: string | null;
    packagePrice?: string | null;
  } | null;
}
export interface Service {
  id: number;
  providerId: number;
  categoryId: number | null;
  title: string;
  description: string | null;
  price: string | null;
  subcategory: string | null;
  img: string | null;
  status: string;
  createdAt: string;
}
export interface Listing extends Service {
  providerName: string;
  categoryNameAr: string | null;
}
export interface PublicService {
  id: number;
  title: string;
  description: string | null;
  price: string | null;
  subcategory: string | null;
  img: string | null;
  status: string;
  createdAt: string;
  providerId: number;
  providerName: string | null;
  providerAvatar: string | null;
  providerCity: string | null;
  categoryId: number | null;
  categoryNameAr: string | null;
}
export interface Review {
  id: number;
  rating: number;
  text: string | null;
  reply: string | null;
  createdAt: string;
  userName: string | null;
  userAvatar?: string | null;
}
export interface UserReviewItem {
  id: number;
  providerId: number;
  rating: number;
  text: string | null;
  reply: string | null;
  createdAt: string;
  providerName: string | null;
  providerAvatar: string | null;
}
export interface Package {
  id: number;
  nameAr: string;
  nameEn: string;
  price: string;
  durationDays: number;
  maxListings: number | null;
  commissionRate: string;
  featuredAllowed: number | null;
  topBadge: boolean;
  priorityRank: number;
}
export interface UserInfo {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  avatar: string | null;
  providerId?: number;
  providerApproved?: boolean;
  regionId?: number | null;
  cityId?: number | null;
  staffRole?: string | null;
  permissions?: Record<string, boolean>;
  isSuperAdmin?: boolean;
}
export interface ProviderInteractions {
  phone: number;
  whatsapp: number;
  message: number;
}
export interface ProviderStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  servicesCount: number;
  reviewsCount: number;
  avgRating: string;
  totalProperties: number;
  activeProperties: number;
  featuredProperties: number;
  totalViews: number;
  totalPhoneClicks: number;
  totalWhatsappClicks: number;
  subscription: {
    id: number;
    packageId: number;
    startDate: string;
    endDate: string;
    packageNameAr: string | null;
    packagePrice: string | null;
    durationDays: number | null;
    daysLeft: number | null;
    isActive: boolean;
    maxListings?: number | null;
    billingPlanId?: number | null;
  } | null;
}
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatar: string | null;
  status: string;
  createdAt: string;
  regionId?: number | null;
  cityId?: number | null;
  regionNameAr?: string | null;
  cityNameAr?: string | null;
}
export interface Order {
  id: number;
  message: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  userId: number | null;
  providerId: number | null;
  serviceId: number | null;
  userName: string | null;
  userPhone: string | null;
  serviceTitle: string | null;
  servicePrice: string | null;
  providerName: string | null;
}
export interface UserRequestItem {
  id: number;
  providerId: number | null;
  message: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  providerName: string | null;
  providerAvatar: string | null;
  serviceTitle: string | null;
  servicePrice: string | null;
}
export interface FavoriteItem {
  id: number;
  providerId: number;
  providerName: string;
  providerAvatar: string | null;
  providerCity: string | null;
  providerRating: string;
  providerReviewsCount: number;
  categoryNameAr: string | null;
}
/** Row from `GET /messages/inbox` */
export interface InboxThread {
  otherId: number;
  otherName?: string;
  otherAvatar?: string;
  otherRole?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
  unreadCount?: number;
  propertyId?: number | null;
  propertyTitle?: string | null;
  propertyPrice?: string | null;
  propertyImages?: string | null;
  propertyListingType?: string | null;
  propertyMainCategory?: string | null;
  senderId?: number;
  isRead?: boolean;
}
export interface Notification {
  id: number;
  userId: number | null;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  link: string | null;
  createdAt: string;
}
export interface SiteSettings {
  siteName: string;
  siteNameEn: string;
  logoUrl: string;
  faviconUrl: string;
  heroImage: string;
  primaryColor: string;
  aboutContent: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  faqContent: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaText: string;
  ctaButtonText: string;
  [key: string]: string;
}
export interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string;
  status: string;
  createdAt: string;
}
export interface Area {
  id: number;
  cityId: number;
  nameAr: string;
  nameEn: string;
  enabled: boolean;
}
export interface City {
  id: number;
  regionId: number;
  nameAr: string;
  nameEn: string;
  enabled: boolean;
  areas?: Area[];
}
export interface Region {
  id: number;
  nameAr: string;
  nameEn: string;
  order: number;
  enabled: boolean;
  cities: City[];
}
export interface ServiceArea {
  id: number;
  providerId: number;
  regionId: number;
  cityId: number | null;
  areaId: number | null;
}

export type SupportTicketDto = {
  id: string;
  subject: string;
  category: string;
  status: string;
  message: string;
  adminReply?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminSupportTicket = {
  id: string;
  providerId: number;
  providerName: string;
  providerEmail: string;
  subject: string;
  category: string;
  status: string;
  message: string;
  adminReply: string | null;
  createdAt: string;
  updatedAt: string;
};

export const api = {
  regions: {
    list: async () => ensureArray<Region>(await fetchJson(`/regions`)),
    create: (data: unknown) => fetchJson(`/regions`, { method: "POST", body: JSON.stringify(data) }),
    delete: (id: number) => fetchJson(`/regions/${id}`, { method: "DELETE" }),
  },

  locations: {
    getAreasByCity: async (cityId: number) => ensureArray<Area>(await fetchJson(`/cities/${cityId}/areas`)),
    admin: {
      allRegions: async () => ensureArray<Region>(await fetchJson(`/admin/regions`)),
      createRegion: (data: { nameAr: string; nameEn?: string; order?: number }) =>
        fetchJson<Region>(`/admin/regions`, { method: "POST", body: JSON.stringify(data) }),
      updateRegion: (id: number, data: unknown) =>
        fetchJson<Region>(`/admin/regions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      toggleRegion: (id: number) => fetchJson<Region>(`/admin/regions/${id}/toggle`, { method: "PATCH" }),
      deleteRegion: (id: number) => fetchJson(`/admin/regions/${id}`, { method: "DELETE" }),
      allCities: async () => ensureArray<City>(await fetchJson(`/admin/cities`)),
      allAreas: async (cityId?: number) =>
        ensureArray<Area>(await fetchJson(`/admin/areas${cityId != null ? `?cityId=${cityId}` : ""}`)),
      createCity: (data: unknown) => fetchJson<City>(`/admin/cities`, { method: "POST", body: JSON.stringify(data) }),
      updateCity: (id: number, data: unknown) => fetchJson<City>(`/admin/cities/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      toggleCity: (id: number) => fetchJson(`/admin/cities/${id}/toggle`, { method: "PATCH" }),
      deleteCity: (id: number) => fetchJson(`/admin/cities/${id}`, { method: "DELETE" }),
      createArea: (data: unknown) => fetchJson<Area>(`/admin/areas`, { method: "POST", body: JSON.stringify(data) }),
      updateArea: (id: number, data: unknown) => fetchJson<Area>(`/admin/areas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      toggleArea: (id: number) => fetchJson(`/admin/areas/${id}/toggle`, { method: "PATCH" }),
      deleteArea: (id: number) => fetchJson(`/admin/areas/${id}`, { method: "DELETE" }),
    },
  },

  auth: {
    login: (email: string, password: string) =>
      fetchJson<UserInfo & { providerId?: number }>(`/auth/login`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (data: unknown) =>
      fetchJson<UserInfo & { providerId?: number }>(`/auth/register`, { method: "POST", body: JSON.stringify(data) }),
    /** Creates provider row + role for logged-in users starting `/provider/register` onboarding; refreshes session. */
    becomeProvider: () =>
      fetchJson<UserInfo & { providerId?: number; providerApproved?: boolean }>(`/auth/become-provider`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    me: () => fetchJson<UserInfo & { providerId?: number; providerApproved?: boolean }>(`/auth/me`),
    logout: () => fetchJson(`/auth/logout`, { method: "POST" }),
    forgotPassword: (email: string) =>
      fetchJson<{ dev_reset_token?: string }>(`/auth/forgot-password`, { method: "POST", body: JSON.stringify({ email }) }),
    resetPassword: (token: string, newPassword: string) =>
      fetchJson(`/auth/reset-password`, { method: "POST", body: JSON.stringify({ token, newPassword }) }),
    changePassword: (currentPassword: string, newPassword: string) =>
      fetchJson(`/auth/change-password`, { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),
  },

  admin: {
    sidebarCounts: () =>
      fetchJson<{
        pendingProviders: number;
        suspendedUsers: number;
        pendingOrders: number;
        openTickets: number;
        pendingProperties: number;
      }>(`/admin/sidebar-counts`),
    payments: {
      list: (params?: { from?: string; to?: string; status?: string }) =>
        fetchJson<{
          rows: Array<{
            id: string;
            invoiceId: string | null;
            type: string;
            subscriberType: string;
            providerId: number | null;
            providerName: string | null;
            providerEmail: string | null;
            providerPhone: string | null;
            planName: string | null;
            amount: string;
            commissionAmount: string;
            status: string;
            gateway: string | null;
            gatewayRef: string | null;
            paidAt: string | null;
            createdAt: string;
          }>;
          totals: {
            paid: number;
            pending: number;
            failed: number;
            paidAmount: number;
            pendingAmount: number;
            failedAmount: number;
            totalAmount: number;
            commissionTotal: number;
          };
        }>(`/admin/payments${qs(params)}`),
      exportUrl: (params?: { from?: string; to?: string; status?: string }) =>
        `/api/admin/payments/export${qs(params)}`,
      approveSubscription: (paymentId: number) =>
        fetchJson(`/admin/payments/${paymentId}/approve-subscription`, { method: "POST" }),
      rejectSubscription: (paymentId: number) =>
        fetchJson(`/admin/payments/${paymentId}/reject-subscription`, { method: "POST" }),
    },
    subscriptions: {
      list: (params?: { status?: string; type?: string }) =>
        fetchJson<{
          rows: Array<{
            id: number;
            providerId: number | null;
            userId: number | null;
            subscriberType: string;
            subscriberName: string;
            subscriberEmail: string | null;
            packageNameAr: string | null;
            packageNameEn: string | null;
            packagePrice: string | null;
            durationDays: number | null;
            startDate: string;
            endDate: string;
            status: string;
            createdAt: string;
            isActive: boolean;
            isPastDue: boolean;
            daysLeft: number;
          }>;
          totals: {
            premiumActive: number;
            bronzeActive: number;
            freeActive: number;
            monthlyRecurring: number;
            totalActive: number;
            userActive: number;
            companyActive: number;
          };
        }>(`/admin/subscriptions${qs(params)}`),
    },
    users: {
      list: async (params?: { regionId?: number; cityId?: number }) => {
        const rows = await fetchJson<AdminUser[]>(`/admin/users${qs({ limit: 500, ...params })}`);
        return Array.isArray(rows) ? rows : ensureArray(rows);
      },
      get: (id: number) => fetchJson<AdminUser>(`/admin/users/${id}`),
      update: (id: number, data: unknown) => fetchJson<AdminUser>(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      setStatus: (id: number, status: string) =>
        fetchJson(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
      delete: (id: number) => fetchJson(`/admin/users/${id}`, { method: "DELETE" }),
    },
    notifications: {
      list: async () => ensureArray<Notification>(await fetchJson(`/notifications`)),
      create: (data: unknown) => fetchJson(`/notifications`, { method: "POST", body: JSON.stringify(data) }),
      markRead: (id: number) => fetchJson(`/notifications/${id}/read`, { method: "PATCH" }),
      markAllRead: () => fetchJson(`/notifications/read-all`, { method: "PATCH", body: JSON.stringify({}) }),
      delete: (id: number) => fetchJson(`/notifications/${id}`, { method: "DELETE" }),
    },
    stats: () => fetchJson(`/admin/analytics`),
    providers: {
      list: async (params?: Record<string, string>) =>
        ensureArray<AdminProvider>(await fetchJson(`/admin/providers${qs(params)}`)),
      create: (data: unknown) => fetchJson<AdminProvider>(`/admin/providers`, { method: "POST", body: JSON.stringify(data) }),
      update: (id: number, data: unknown) => fetchJson(`/providers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      approve: (id: number) => fetchJson(`/providers/${id}/approve`, { method: "PATCH" }),
      reject: (id: number) => fetchJson(`/providers/${id}/reject`, { method: "PATCH" }),
      suspend: (id: number) => fetchJson(`/providers/${id}/suspend`, { method: "PATCH" }),
    },
    orders: {
      list: async () => ensureArray<Order>(await fetchJson(`/admin/orders`)),
      update: (id: number, data: unknown) =>
        fetchJson<Order>(`/admin/orders/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    },
    supportTickets: {
      list: async () => ensureArray<AdminSupportTicket>(await fetchJson(`/admin/support-tickets`)),
      update: (publicId: string, body: { adminReply?: string | null; status?: "Open" | "Closed" }) =>
        fetchJson<AdminSupportTicket>(`/admin/support-tickets/${encodeURIComponent(publicId)}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
    },
    staff: {
      list: async () => ensureArray<StaffMember>(await fetchJson(`/admin/staff`)),
      create: (data: unknown) => fetchJson<StaffMember>(`/admin/staff`, { method: "POST", body: JSON.stringify(data) }),
      update: (id: number, data: unknown) => fetchJson<StaffMember>(`/admin/staff/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      delete: (id: number) => fetchJson(`/admin/staff/${id}`, { method: "DELETE" }),
    },
  },

  categories: {
    list: async () => ensureArray<Category>(await fetchJson(`/categories`)),
    listByType: async (type: string) => ensureArray<Category>(await fetchJson(`/categories?type=${encodeURIComponent(type)}`)),
    get: (id: number) => fetchJson<Category>(`/categories/${id}`),
    create: (data: unknown) => fetchJson<Category>(`/categories`, { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: unknown) => fetchJson<Category>(`/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => fetchJson(`/categories/${id}`, { method: "DELETE" }),
  },

  subcategories: {
    list: async () => ensureArray<Subcategory>(await fetchJson(`/subcategories`)),
    listByCategory: async (categoryId: number) =>
      ensureArray<Subcategory>(await fetchJson(`/categories/${categoryId}/subcategories`)),
    create: (categoryId: number, data: unknown) =>
      fetchJson<Subcategory>(`/categories/${categoryId}/subcategories`, { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: unknown) =>
      fetchJson<Subcategory>(`/subcategories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => fetchJson(`/subcategories/${id}`, { method: "DELETE" }),
  },

  providers: {
    list: async (params?: Record<string, string | number | boolean | undefined | null>) =>
      ensureArray<Provider>(await fetchJson(`/providers${qs(params)}`)),
    get: (id: number) => fetchJson<ProviderDetail>(`/providers/${id}`),
    stats: (id: number) => fetchJson<ProviderStats>(`/providers/${id}/stats`),
    update: (id: number, data: unknown) => fetchJson(`/providers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    trackInteraction: (id: number, type: string) =>
      fetchJson(`/providers/${id}/interactions`, { method: "POST", body: JSON.stringify({ type }) }),
    getInteractions: (id: number) => fetchJson<ProviderInteractions>(`/providers/${id}/interactions`),
  },

  services: {
    listAll: async (params?: Record<string, string | undefined>) =>
      ensureArray<import("./api").PublicService>(await fetchJson(`/services${qs(params)}`)),
    list: async (providerId: number) => ensureArray<Service>(await fetchJson(`/providers/${providerId}/services`)),
    create: (providerId: number, data: unknown) =>
      fetchJson<Service>(`/providers/${providerId}/services`, { method: "POST", body: JSON.stringify(data) }),
    update: (providerId: number, id: number, data: unknown) =>
      fetchJson<Service>(`/providers/${providerId}/services/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (providerId: number, id: number) => fetchJson(`/providers/${providerId}/services/${id}`, { method: "DELETE" }),
  },

  upload: {
    avatar: (file: File) => uploadFile("/upload/avatar", "avatar", file),
    banner: (file: File) => uploadFile("/upload/banner", "banner", file),
    service: (file: File) => uploadFile("/upload/service", "image", file),
    propertyImage: (file: File) => uploadFile("/upload/property-image", "image", file),
    brochure: async (file: File): Promise<{ url: string }> => {
      const form = new FormData();
      form.append("brochure", file);
      const res = await fetch(`${API}/upload/brochure`, { method: "POST", body: form, credentials: "include", cache: "no-store" });
      const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) throw new ApiError(res.status, (typeof body?.error === "string" && body.error) || res.statusText);
      const data = body?.data as { url?: string } | undefined;
      if (!data?.url) throw new ApiError(res.status, "Invalid upload response");
      return { url: data.url };
    },
  },

  properties: {
    list: async (params?: Record<string, string | number | undefined>) =>
      ensureArray(await fetchJson(`/properties${qs(params)}`)),
    get: (id: number) => fetchJson<Record<string, unknown>>(`/properties/${id}`),
    create: (data: unknown) => fetchJson<Record<string, unknown>>(`/properties`, { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: unknown) => fetchJson<Record<string, unknown>>(`/properties/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => fetchJson(`/properties/${id}`, { method: "DELETE" }),
    patchStatus: (id: number, status: string, rejectionReason?: string) => fetchJson(`/properties/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, rejectionReason }) }),
  },

  subscriptions: {
    /** Subscribe using old packageId OR new billingPlanId (pass isBillingPlan=true) */
    subscribe: (providerId: number, planOrPackageId: number, isBillingPlan?: boolean, opts?: { simulated?: boolean }) =>
      fetchJson(`/providers/${providerId}/subscribe`, {
        method: "POST",
        body: JSON.stringify(
          isBillingPlan
            ? { billingPlanId: planOrPackageId, ...(opts?.simulated ? { simulated: true } : {}) }
            : { packageId: planOrPackageId, ...(opts?.simulated ? { simulated: true } : {}) }
        ),
      }),
    /** @deprecated No dedicated route; use `api.providers.stats` subscription field */
    current: async () => null,
  },

  payments: {
    /** Customer's payment transaction history (paid / pending / failed). */
    myPayments: () =>
      fetchJson<{
        rows: Array<{
          id: number; refId: string; kind: string;
          providerId: number; providerName: string | null;
          serviceId: number | null; serviceTitle: string | null;
          amount: string; commissionAmount: string | null; currency: string;
          status: "pending" | "paid" | "failed" | "cancelled";
          gateway: string; gatewayRef: string | null;
          paidAt: string | null; createdAt: string;
        }>;
        totals: {
          paid: number; pending: number; failed: number;
          paidAmount: number; pendingAmount: number; failedAmount: number;
        };
      }>(`/users/me/payments`),
    /** Provider's incoming payment transaction history. */
    providerMyPayments: () =>
      fetchJson<{
        rows: Array<{
          id: number; refId: string; kind: string;
          userId: number | null; customerName: string | null; customerPhone: string | null;
          serviceId: number | null; serviceTitle: string | null;
          amount: string; commissionAmount: string | null; currency: string;
          status: "pending" | "paid" | "failed" | "cancelled";
          gateway: string;
          paidAt: string | null; createdAt: string;
        }>;
        totals: {
          paid: number; pending: number; failed: number;
          paidAmount: number; pendingAmount: number; failedAmount: number;
          netEarnings: number;
        };
      }>(`/providers/me/payments`),
    adminWallet: () =>
      fetchJson<{
        totalCommission: string;
        currency: string;
        transactions: Array<{
          id: number; providerId: number | null; type: string;
          amount: string; refId: string | null; note: string | null; createdAt: string;
        }>;
      }>(`/admin/wallet`),
    requestSubscription: (data: { billingPlanId: number; gateway: string; receiptUrl?: string }) =>
      fetchJson(`/payments/subscription-request`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  requests: {
    create: (data: unknown) => fetchJson(`/requests`, { method: "POST", body: JSON.stringify(data) }),
    listByUser: async (userId: number) => ensureArray<UserRequestItem>(await fetchJson(`/users/${userId}/requests`)),
    listByProvider: async (providerId: number) => ensureArray(await fetchJson(`/providers/${providerId}/requests`)),
    cancel: (requestId: number) =>
      fetchJson(`/requests/${requestId}/status`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) }),
    updateStatus: (requestId: number, status: string) =>
      fetchJson(`/requests/${requestId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  },

  messages: {
    inbox: async () => ensureArray<InboxThread>(await fetchJson(`/messages/inbox`)),
    conversation: async (otherId: number, propertyId?: number | null) => {
      const url = propertyId
        ? `/messages/conversation/${otherId}?propertyId=${propertyId}`
        : `/messages/conversation/${otherId}`;
      const res = await fetchJson<{ messages: unknown[]; property: unknown }>(url);
      return res as { messages: unknown[]; property: unknown };
    },
    send: (receiverId: number, content: string, propertyId?: number | null) =>
      fetchJson(`/messages`, { method: "POST", body: JSON.stringify({ receiverId, content, propertyId }) }),
    unreadCount: async () => {
      const res = await fetchJson<number>(`/messages/unread-count`);
      return typeof res === "number" ? res : (res as any)?.data ?? 0;
    },
    markRead: (otherId: number, propertyId?: number | null) => {
      const url = propertyId
        ? `/messages/conversation/${otherId}/read?propertyId=${propertyId}`
        : `/messages/conversation/${otherId}/read`;
      return fetchJson(url, { method: "PATCH", body: JSON.stringify({}) });
    },
  },

  notifications: {
    list: async () => ensureArray<Notification>(await fetchJson(`/notifications`)),
    unreadCount: () => fetchJson<number>(`/notifications/unread-count`),
    markRead: (id: number) => fetchJson(`/notifications/${id}/read`, { method: "PATCH", body: JSON.stringify({}) }),
    markAllRead: () => fetchJson(`/notifications/read-all`, { method: "PATCH", body: JSON.stringify({}) }),
    delete: (id: number) => fetchJson(`/notifications/${id}`, { method: "DELETE" }),
  },

  settings: {
    list: () => fetchJson<SiteSettings>(`/settings`),
    update: (data: unknown) => fetchJson(`/settings`, { method: "POST", body: JSON.stringify(data) }),
    save: (data: unknown) => fetchJson(`/settings`, { method: "POST", body: JSON.stringify(data) }),
  },

  favorites: {
    list: async (userId: number) => ensureArray<FavoriteItem>(await fetchJson(`/users/${userId}/favorites`)),
    add: (userId: number, providerId: number) =>
      fetchJson(`/users/${userId}/favorites`, { method: "POST", body: JSON.stringify({ providerId }) }),
    remove: (userId: number, providerId: number) => fetchJson(`/users/${userId}/favorites/${providerId}`, { method: "DELETE" }),
  },

  packages: {
    list: async () => ensureArray<Package>(await fetchJson(`/packages`)),
    create: (data: unknown) => fetchJson<Package>(`/packages`, { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: unknown) => fetchJson<Package>(`/packages/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => fetchJson(`/packages/${id}`, { method: "DELETE" }),
  },

  subscriptionHistory: {
    list: async (providerId: number) => {
      const res = await fetchJson<any>(`/providers/${providerId}/subscriptions-history`);
      return (Array.isArray(res) ? res : (res?.data ?? [])) as SubHistoryItem[];
    },
    listForUser: async (userId: number) => {
      const res = await fetchJson<any>(`/users/${userId}/subscriptions-history`);
      return (Array.isArray(res) ? res : (res?.data ?? [])) as SubHistoryItem[];
    },
  },

  userSubscription: {
    current: async (userId: number) => {
      const res = await fetchJson<any>(`/users/${userId}/current-subscription`);
      return (res?.data ?? null) as UserCurrentSub | null;
    },
    subscribe: (userId: number, billingPlanId: number) =>
      fetchJson(`/users/${userId}/subscribe`, {
        method: "POST",
        body: JSON.stringify({ billingPlanId }),
      }),
  },

  stats: {
    platform: () =>
      fetchJson<{ providers: number; users: number; services: number; requests: number; properties: number }>(`/stats`),
  },

  reviews: {
    create: (providerId: number, data: unknown) =>
      fetchJson<Review>(`/providers/${providerId}/reviews`, { method: "POST", body: JSON.stringify(data) }),
    addReply: (reviewId: number, reply: string) =>
      fetchJson<Review>(`/reviews/${reviewId}/reply`, { method: "PATCH", body: JSON.stringify({ reply }) }),
    listByProvider: async (providerId: number) =>
      ensureArray<Review>(await fetchJson(`/providers/${providerId}/reviews`)),
    listByUser: async (userId: number) =>
      ensureArray<UserReviewItem>(await fetchJson(`/users/${userId}/reviews`)),
    update: (reviewId: number, data: { rating?: number; text?: string }) =>
      fetchJson<Review>(`/reviews/${reviewId}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (reviewId: number) =>
      fetchJson(`/reviews/${reviewId}`, { method: "DELETE" }),
  },

  listings: {
    list: async () => ensureArray<Listing>(await fetchJson(`/listings`)),
    update: (id: number, data: unknown) => fetchJson<Listing>(`/listings/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) => fetchJson(`/listings/${id}`, { method: "DELETE" }),
  },

  users: {
    update: (id: number, data: unknown) => fetchJson<UserInfo>(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  serviceAreas: {
    get: async (providerId: number) =>
      ensureArray<ServiceArea>(await fetchJson(`/providers/${providerId}/service-areas`)),
    save: (providerId: number, areas: { regionId: number; cityId?: number | null; areaId?: number | null }[]) =>
      fetchJson<ServiceArea[]>(`/providers/${providerId}/service-areas`, {
        method: "PUT",
        body: JSON.stringify({ areas }),
      }),
  },

  supportTickets: {
    list: async (providerId: number, userId?: number) =>
      ensureArray<SupportTicketDto>(
        await fetchJson(`/providers/${providerId}/support-tickets`, {
          headers: userId ? { "x-user-id": String(userId) } : undefined,
        })
      ),
    create: (providerId: number, body: { subject: string; category: string; message: string }, userId?: number) =>
      fetchJson<SupportTicketDto>(`/providers/${providerId}/support-tickets`, {
        method: "POST",
        body: JSON.stringify(body),
        headers: userId ? { "x-user-id": String(userId) } : undefined,
      }),
    updateStatus: (providerId: number, publicId: string, status: string, userId?: number) =>
      fetchJson<SupportTicketDto>(`/providers/${providerId}/support-tickets/${encodeURIComponent(publicId)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
        headers: userId ? { "x-user-id": String(userId) } : undefined,
      }),
  },
  userProperties: {
    list: () =>
      fetchJson<any>(`/user/properties`).then((r: any) =>
        Array.isArray(r) ? r : (r?.data ?? [])
      ),
    create: (data: Record<string, any>) =>
      fetchJson(`/properties`, { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, any>) =>
      fetchJson(`/properties/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  propertyFavorites: {
    list: () => fetchJson<any[]>(`/property-favorites`),
    add: (propertyId: number) =>
      fetchJson(`/property-favorites`, { method: "POST", body: JSON.stringify({ propertyId }) }),
    remove: (propertyId: number) =>
      fetchJson(`/property-favorites/${propertyId}`, { method: "DELETE" }),
  },

  savedSearches: {
    list: () => fetchJson<any[]>(`/saved-searches`),
    create: (data: { name?: string; email?: string; filters: Record<string, any>; notifyEmail?: boolean; notifyApp?: boolean }) =>
      fetchJson(`/saved-searches`, { method: "POST", body: JSON.stringify(data) }),
    delete: (id: number) => fetchJson(`/saved-searches/${id}`, { method: "DELETE" }),
  },

  propertyStats: {
    view: (propertyId: number) =>
      fetchJson(`/properties/${propertyId}/view`, { method: "POST" }),
    phoneClick: (propertyId: number) =>
      fetchJson(`/properties/${propertyId}/phone-click`, { method: "POST" }),
    whatsappClick: (propertyId: number) =>
      fetchJson(`/properties/${propertyId}/whatsapp-click`, { method: "POST" }),
  },

  billingPlans: {
    publicList: async () => {
      const res = await fetchJson<any>(`/billing/plans`);
      if (res && typeof res === "object" && "data" in res) return res.data as BillingPlan[];
      if (Array.isArray(res)) return res as BillingPlan[];
      return [] as BillingPlan[];
    },
    publicListByType: async (userType: "user" | "company" | "broker" | "provider") => {
      const res = await fetchJson<any>(`/billing/plans?userType=${encodeURIComponent(userType)}`);
      if (res && typeof res === "object" && "data" in res) return res.data as BillingPlan[];
      if (Array.isArray(res)) return res as BillingPlan[];
      return [] as BillingPlan[];
    },
    adminList: async () => {
      const res = await fetchJson<any>(`/admin/billing/plans`);
      if (res && typeof res === "object" && "data" in res) return res.data as BillingPlan[];
      if (Array.isArray(res)) return res as BillingPlan[];
      return [] as BillingPlan[];
    },
    seed: () => fetchJson(`/admin/billing/seed`, { method: "POST" }),
    toggle: (id: number) => fetchJson(`/admin/billing/plans/${id}/toggle`, { method: "PATCH" }),
    create: (data: any) => fetchJson(`/admin/billing/plans`, { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => fetchJson(`/admin/billing/plans/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => fetchJson(`/admin/billing/plans/${id}`, { method: "DELETE" }),
  },

  featuredAreas: {
    list: () => fetchJson<Array<{ id: number; nameAr: string; image: string | null; cityName: string | null; displayOrder: number; enabled: boolean; propertyCount: number }>>("/featured-areas"),
    adminList: () => fetchJson<Array<{ id: number; nameAr: string; image: string | null; cityName: string | null; displayOrder: number; enabled: boolean; propertyCount: number }>>("/admin/featured-areas"),
    create: (data: { nameAr: string; image?: string; cityName?: string; displayOrder?: number; enabled?: boolean }) =>
      fetchJson("/admin/featured-areas", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: { nameAr: string; image?: string; cityName?: string; displayOrder?: number; enabled?: boolean }) =>
      fetchJson(`/admin/featured-areas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    toggle: (id: number) => fetchJson(`/admin/featured-areas/${id}/toggle`, { method: "PATCH" }),
    delete: (id: number) => fetchJson(`/admin/featured-areas/${id}`, { method: "DELETE" }),
  },

  propertyFeatures: {
    list: (type: "feature" | "service") =>
      fetchJson<Array<{ id: number; type: string; name: string; icon: string | null; status: string; sortOrder: number; applicableTypes: string | null; filterType: string; filterOptions: string | null; filterGroup: string }>>(`/property-features?type=${type}`),
    listByType: (type: "feature" | "service", propertyType?: string) =>
      fetchJson<Array<{ id: number; type: string; name: string; icon: string | null; status: string; sortOrder: number; applicableTypes: string | null; filterType: string; filterOptions: string | null; filterGroup: string }>>(
        `/property-features?type=${type}${propertyType ? `&propertyType=${encodeURIComponent(propertyType)}` : ""}`
      ),
    dynamicFilters: (group: string, category: string, featureType?: string) =>
      fetchJson<Array<{ id: number; name: string; icon: string | null; filterType: string; filterOptions: string | null; filterGroup: string }>>(
        `/dynamic-filters?group=${encodeURIComponent(group)}&category=${encodeURIComponent(category)}${featureType ? `&type=${featureType}` : ""}`
      ),
    adminList: (type: "feature" | "service") =>
      fetchJson<Array<{ id: number; type: string; name: string; icon: string | null; status: string; sortOrder: number; applicableTypes: string | null; filterType: string; filterOptions: string | null; filterGroup: string }>>(`/admin/property-features?type=${type}`),
    adminListAll: () =>
      fetchJson<Array<{ id: number; type: string; name: string; icon: string | null; status: string; sortOrder: number; applicableTypes: string | null; filterType: string; filterOptions: string | null; filterGroup: string }>>(`/admin/property-features/all`),
    create: (data: { type: string; name: string; icon?: string; status?: string; sortOrder?: number; applicableTypes?: string | null; filterType?: string; filterOptions?: string | null; filterGroup?: string }) =>
      fetchJson("/admin/property-features", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: { name?: string; icon?: string; status?: string; sortOrder?: number; applicableTypes?: string | null; filterType?: string; filterOptions?: string | null; filterGroup?: string }) =>
      fetchJson(`/admin/property-features/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    toggle: (id: number) =>
      fetchJson(`/admin/property-features/${id}/toggle`, { method: "PATCH" }),
    reorder: (items: Array<{ id: number; sortOrder: number }>) =>
      fetchJson("/admin/property-features/reorder", { method: "PATCH", body: JSON.stringify(items) }),
    delete: (id: number) =>
      fetchJson(`/admin/property-features/${id}`, { method: "DELETE" }),
  },

  propertyFieldConfigs: {
    list: () =>
      fetchJson<Array<{ mainCategory: string; fieldKey: string; isVisible: boolean; id: number; label: string | null; sortOrder: number }>>("/property-field-configs"),
    adminList: () =>
      fetchJson<Array<{ id: number; mainCategory: string; fieldKey: string; isVisible: boolean; label: string | null; sortOrder: number }>>("/admin/property-field-configs"),
    bulkUpdate: (rows: Array<{ mainCategory: string; fieldKey: string; isVisible: boolean }>) =>
      fetchJson("/admin/property-field-configs/bulk", { method: "PUT", body: JSON.stringify({ rows }) }),
  },

  market: {
    analytics: (params: {
      mainCategory: string;
      cityId?: number | null;
      regionId?: number | null;
      district?: string | null;
      subCategory?: string | null;
      listingType?: string | null;
      priceNum?: number;
      area?: number;
    }) => fetchJson<any>(`/market/analytics${qs(params as any)}`),
    adminSettings: () => fetchJson<any>("/admin/market/settings"),
    saveSettings: (data: any) => fetchJson("/admin/market/settings", { method: "POST", body: JSON.stringify(data) }),
    rebuild: () => fetchJson("/admin/market/rebuild", { method: "POST" }),
    snapshots: () => fetchJson<any[]>("/admin/market/snapshots"),
  },

  search: {
    suggestions: (q: string) =>
      fetchJson<{
        trending: Array<{ text: string }>;
        cities: Array<{ id: number; nameAr: string; type: string }>;
        areas: Array<{ id: number; nameAr: string; type: string }>;
        categories: Array<{ id: number; nameAr: string; slug: string; categoryType?: string; type: string }>;
        properties: Array<{ id: number; title: string; listingType: string; mainCategory: string; type: string }>;
      }>(`/search/suggestions${qs({ q })}`),
  },

  fetchJson,
};

export type SubHistoryItem = {
  id: number;
  planNameAr: string | null;
  planPrice: string | null;
  durationDays: number;
  maxListings: number | null;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  isActive: boolean;
};

export type UserCurrentSub = {
  id: number;
  billingPlanId: number | null;
  packageNameAr: string | null;
  packagePrice: string | null;
  durationDays: number;
  startDate: string;
  endDate: string;
  status: string;
  isActive: boolean;
  daysLeft: number;
  limits: Record<string, number> | null;
  features: Record<string, boolean> | null;
  color: string | null;
};

export type BillingPlan = {
  id: number;
  name: string;
  nameAr: string | null;
  descriptionAr: string | null;
  price: string;
  yearlyPrice: string | null;
  currency: string;
  durationDays: number;
  durationType: string;
  userType: string;
  status: string;
  isRecommended: boolean;
  isMostPopular: boolean;
  trialDays: number;
  sortOrder: number;
  color: string;
  limits: string;
  features: string;
  commissionPercent: string;
  createdAt: string;
};

// ── Promotions API ────────────────────────────────────────────────────────────
export const promotions = {
  /** Get the current user's monthly quota usage */
  getQuotas: () => fetchJson<{ success: boolean; data: any }>("/users/me/promotion-quotas"),

  /** Bump (bump-up) a property to the top of search results */
  bumpProperty: (propertyId: number) =>
    fetchJson<{ success: boolean; message: string }>(`/properties/${propertyId}/bump`, { method: "POST" }),

  /** Feature a property (marks as "مميز") */
  featureProperty: (propertyId: number) =>
    fetchJson<{ success: boolean; message: string }>(`/properties/${propertyId}/feature`, { method: "POST" }),

  /** Spotlight a property */
  spotlightProperty: (propertyId: number) =>
    fetchJson<{ success: boolean; message: string }>(`/properties/${propertyId}/spotlight`, { method: "POST" }),

  /** Get the user's active addon boosts */
  getAddonBoosts: () => fetchJson<{ success: boolean; data: any[] }>("/users/me/addon-boosts"),

  /** Get all promotions for a user's properties */
  getUserPromotions: (userId: number) =>
    fetchJson<{ success: boolean; data: any[] }>(`/users/${userId}/property-promotions`),

  /** Admin: get promotion overview stats */
  adminOverview: () => fetchJson<{ success: boolean; data: any }>("/admin/promotions/overview"),

  /** Admin: grant addon boosts to a user */
  adminGrantAddon: (data: { userId: number; type: string; quantity: number; note?: string; daysValid?: number }) =>
    fetchJson<{ success: boolean }>("/admin/promotions/grant-addon", { method: "POST", body: JSON.stringify(data) }),

  /** Expire stale promotions (maintenance) */
  expireStale: () =>
    fetchJson<{ success: boolean; expired: number }>("/promotions/expire-stale", { method: "POST" }),
};
