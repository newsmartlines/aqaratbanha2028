import { CATEGORIES, FEATURED_LISTINGS } from "./mock-data";

// DEMO MODE: No real API base needed
const API_BASE = "/api-server/api";

// Mock request function that returns static data
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  console.log(`[DEMO API] Request to: ${path}`, options);
  
  // Return mock data based on path
  if (path.includes("/categories")) return CATEGORIES_MOCK as T;
  if (path.includes("/subcategories")) return [] as T;
  if (path.includes("/providers")) return PROVIDERS_MOCK as T;
  if (path.includes("/settings")) return SETTINGS_MOCK as T;
  if (path.includes("/stats")) return STATS_MOCK as T;
  if (path.includes("/regions")) return REGIONS_MOCK as T;
  if (path.includes("/auth/me")) return null as T; // Will be handled by AuthContext demo logic
  if (path.includes("/requests")) return [] as T;
  if (path.includes("/notifications")) return [] as T;
  if (path.includes("/listings")) return [] as T;
  if (path.includes("/packages")) return PACKAGES_MOCK as T;
  if (path.includes("/users")) return [] as T;
  if (path.includes("/messages")) return [] as T;

  return {} as T;
}

const CATEGORIES_MOCK = CATEGORIES.map((c, i) => ({
  id: i + 1,
  nameAr: c.name,
  nameEn: c.id,
  icon: "ChefHat",
  slug: c.id,
  description: "وصف التصنيف",
  image: null
}));

const PROVIDERS_MOCK = FEATURED_LISTINGS.map(l => ({
  id: l.id,
  userName: l.title,
  avatar: l.img,
  banner: l.img,
  city: l.location.split("،")[0],
  district: l.location.split("،")[1],
  phone: "0500000000",
  rating: String(l.rating),
  reviewsCount: l.reviews,
  verified: true,
  featured: l.featured,
  categoryId: 1,
  categoryNameAr: l.cat,
  latitude: null,
  longitude: null
}));

const SETTINGS_MOCK = {
  siteName: "دليل بلس (تجريبي)",
  siteNameEn: "Dalel Plus Demo",
  logoUrl: "",
  primaryColor: "#0d9488",
  aboutContent: "هذه نسخة تجريبية للمنصة.",
  contactEmail: "demo@dalel.sa",
  contactPhone: "920000000",
  contactAddress: "الرياض، السعودية",
  faqContent: "[]",
  heroTitle: "اكتشف أفضل الخدمات",
  heroSubtitle: "من أيدي محلية موثوقة",
  ctaText: "ندعم المشاريع المنزلية ونضمن حقوقك",
  ctaButtonText: "انضم إلينا الآن"
};

const STATS_MOCK = {
  providers: 150,
  users: 1200,
  services: 450,
  requests: 890
};

const PACKAGES_MOCK = [
  { id: 1, nameAr: "مجاني", nameEn: "Free", price: "0", durationDays: 30, maxListings: 3, commissionRate: "15", featuredAllowed: 0, topBadge: false, priorityRank: 0 },
  { id: 2, nameAr: "برونزي", nameEn: "Bronze", price: "99", durationDays: 30, maxListings: 10, commissionRate: "10", featuredAllowed: 3, topBadge: false, priorityRank: 1 },
  { id: 3, nameAr: "بريميوم", nameEn: "Premium", price: "249", durationDays: 30, maxListings: null, commissionRate: "7", featuredAllowed: null, topBadge: true, priorityRank: 2 },
];

const REGIONS_MOCK = [
  {
    id: 1, nameAr: "منطقة الرياض", nameEn: "Riyadh", order: 1, enabled: true,
    cities: [{ id: 1, regionId: 1, nameAr: "الرياض", nameEn: "Riyadh", enabled: true }]
  }
];

export interface Category { id: number; nameAr: string; nameEn: string; icon: string | null; slug: string; description: string | null; image: string | null; }
export interface Subcategory { id: number; categoryId: number; nameAr: string; nameEn: string; icon: string | null; slug: string; }
export interface Provider { id: number; bio: string | null; avatar: string | null; banner: string | null; city: string | null; district: string | null; phone: string | null; rating: string; reviewsCount: number; verified: boolean; featured: boolean; categoryId: number | null; userName: string; categoryNameAr: string | null; latitude: string | null; longitude: string | null; }
export interface AdminProvider extends Provider { userId: number; userEmail: string; approved: boolean; suspended: boolean; createdAt: string; }
export interface ProviderDetail extends Provider { userId: number; userEmail: string; whatsapp: string | null; latitude: string | null; longitude: string | null; approved: boolean; suspended: boolean; services: Service[]; reviews: Review[]; subscription: { id: number; startDate: string; endDate: string; packageName: string; packagePrice: string } | null; }
export interface Service { id: number; providerId: number; categoryId: number | null; title: string; description: string | null; price: string | null; subcategory: string | null; img: string | null; status: string; createdAt: string; }
export interface Listing extends Service { providerName: string; categoryNameAr: string | null; }
export interface Review { id: number; rating: number; text: string | null; reply: string | null; createdAt: string; userName: string | null; userAvatar?: string | null; }
export interface Package { id: number; nameAr: string; nameEn: string; price: string; durationDays: number; maxListings: number | null; commissionRate: string; featuredAllowed: number | null; topBadge: boolean; priorityRank: number; }
export interface UserInfo { id: number; name: string; email: string; phone?: string | null; role: string; avatar: string | null; providerId?: number; providerApproved?: boolean; }
export interface ProviderInteractions { phone: number; whatsapp: number; message: number; }
export interface ProviderStats { totalOrders: number; pendingOrders: number; completedOrders: number; cancelledOrders: number; servicesCount: number; reviewsCount: number; avgRating: string; subscription: { id: number; packageId: number; startDate: string; endDate: string; packageNameAr: string | null; packagePrice: string | null; durationDays: number | null; daysLeft: number | null; isActive: boolean; } | null; }
export interface AdminUser { id: number; name: string; email: string; phone: string | null; role: string; avatar: string | null; status: string; createdAt: string; }
export interface Order { id: number; message: string | null; notes: string | null; status: string; createdAt: string; userId: number | null; providerId: number | null; serviceId: number | null; userName: string | null; userPhone: string | null; serviceTitle: string | null; servicePrice: string | null; providerName: string | null; }
export interface UserRequestItem { id: number; providerId: number | null; message: string | null; notes: string | null; status: string; createdAt: string; providerName: string | null; providerAvatar: string | null; serviceTitle: string | null; servicePrice: string | null; }
export interface FavoriteItem { id: number; providerId: number; providerName: string; providerAvatar: string | null; providerCity: string | null; providerRating: string; providerReviewsCount: number; categoryNameAr: string | null; }
export interface Notification { id: number; userId: number | null; type: string; title: string; message: string | null; read: boolean; link: string | null; createdAt: string; }
export interface SiteSettings { siteName: string; siteNameEn: string; logoUrl: string; primaryColor: string; aboutContent: string; contactEmail: string; contactPhone: string; contactAddress: string; faqContent: string; heroTitle: string; heroSubtitle: string; ctaText: string; ctaButtonText: string; [key: string]: string; }
export interface StaffMember { id: number; name: string; email: string; role: string; permissions: string; status: string; createdAt: string; }
export interface Area { id: number; cityId: number; nameAr: string; nameEn: string; enabled: boolean; }
export interface City { id: number; regionId: number; nameAr: string; nameEn: string; enabled: boolean; areas?: Area[]; }
export interface Region { id: number; nameAr: string; nameEn: string; order: number; enabled: boolean; cities: City[]; }
export interface ServiceArea { id: number; providerId: number; regionId: number; cityId: number | null; areaId: number | null; }

export const api = {
  categories: {
    list: () => request<Category[]>("/categories"),
    get: (id: number) => request<Category>(`/categories/${id}`),
    create: (data: any) => request<Category>("/categories", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<Category>(`/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/categories/${id}`, { method: "DELETE" }),
  },
  subcategories: {
    list: () => request<Subcategory[]>("/subcategories"),
    listByCategory: (categoryId: number) => request<Subcategory[]>(`/categories/${categoryId}/subcategories`),
    create: (categoryId: number, data: any) => request<Subcategory>(`/categories/${categoryId}/subcategories`, { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<Subcategory>(`/subcategories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/subcategories/${id}`, { method: "DELETE" }),
  },
  providers: {
    list: (params?: any) => request<Provider[]>("/providers"),
    get: (id: number) => request<ProviderDetail>(`/providers/${id}`),
    stats: (id: number) => request<ProviderStats>(`/providers/${id}/stats`),
    update: (id: number, data: any) => request<Provider>(`/providers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    trackInteraction: (id: number, type: string) => request<void>(`/providers/${id}/interactions`, { method: "POST" }),
    getInteractions: (id: number) => request<ProviderInteractions>(`/providers/${id}/interactions`),
  },
  stats: { platform: () => request<any>("/stats") },
  messages: {
    inbox: () => request<any[]>("/messages/inbox"),
    conversation: (otherId: number) => request<any[]>(`/messages/conversation/${otherId}`),
    send: (receiverId: number, content: string) => request<any>("/messages", { method: "POST" }),
    unreadCount: () => request<number>("/messages/unread-count"),
  },
  settings: {
    list: () => request<SiteSettings>("/settings"),
    save: (data: any) => request<Record<string, never>>("/settings", { method: "POST" }),
  },
  admin: {
    providers: {
      list: (params?: any) => request<AdminProvider[]>("/admin/providers"),
      create: (data: any) => request<AdminProvider>("/admin/providers", { method: "POST" }),
      update: (id: number, data: any) => request<AdminProvider>(`/providers/${id}`, { method: "PUT" }),
      approve: (id: number) => request<AdminProvider>(`/providers/${id}/approve`, { method: "PATCH" }),
      reject: (id: number) => request<AdminProvider>(`/providers/${id}/reject`, { method: "PATCH" }),
      suspend: (id: number) => request<AdminProvider>(`/providers/${id}/suspend`, { method: "PATCH" }),
    },
    staff: {
      list: () => request<StaffMember[]>("/admin/staff"),
      create: (data: any) => request<StaffMember>("/admin/staff", { method: "POST" }),
      update: (id: number, data: any) => request<StaffMember>(`/admin/staff/${id}`, { method: "PUT" }),
      delete: (id: number) => request<void>(`/admin/staff/${id}`, { method: "DELETE" }),
    },
    users: {
      list: () => request<AdminUser[]>("/users"),
      get: (id: number) => request<AdminUser>(`/users/${id}`),
      update: (id: number, data: any) => request<AdminUser>(`/users/${id}`, { method: "PUT" }),
      setStatus: (id: number, status: string) => request<any>(`/users/${id}/status`, { method: "PATCH" }),
      delete: (id: number) => request<void>(`/users/${id}`, { method: "DELETE" }),
    },
    orders: {
      list: () => request<Order[]>("/requests"),
      update: (id: number, data: any) => request<Order>(`/requests/${id}`, { method: "PATCH" }),
    },
    notifications: {
      list: () => request<Notification[]>("/notifications"),
      create: (data: any) => request<Notification>("/notifications", { method: "POST" }),
      markRead: (id: number) => request<Notification>(`/notifications/${id}/read`, { method: "PATCH" }),
      markAllRead: () => request<void>("/notifications/read-all", { method: "PATCH" }),
      delete: (id: number) => request<void>(`/notifications/${id}`, { method: "DELETE" }),
    },
  },
  services: {
    list: (providerId: number) => request<Service[]>(`/providers/${providerId}/services`),
    create: (providerId: number, data: any) => request<Service>(`/providers/${providerId}/services`, { method: "POST" }),
    update: (providerId: number, id: number, data: any) => request<Service>(`/providers/${providerId}/services/${id}`, { method: "PUT" }),
    delete: (providerId: number, id: number) => request<void>(`/providers/${providerId}/services/${id}`, { method: "DELETE" }),
  },
  listings: {
    list: () => request<Listing[]>("/listings"),
    update: (id: number, data: any) => request<Listing>(`/listings/${id}`, { method: "PATCH" }),
    delete: (id: number) => request<void>(`/listings/${id}`, { method: "DELETE" }),
  },
  packages: {
    list: () => request<Package[]>("/packages"),
    create: (data: any) => request<Package>("/packages", { method: "POST" }),
    update: (id: number, data: any) => request<Package>(`/packages/${id}`, { method: "PUT" }),
    delete: (id: number) => request<void>(`/packages/${id}`, { method: "DELETE" }),
  },
  users: {
    update: (id: number, data: any) => request<UserInfo>(`/users/${id}`, { method: "PUT" }),
  },
  auth: {
    login: (email: string, password: string) => request<any>("/auth/login", { method: "POST" }),
    register: (data: any) => request<any>("/auth/register", { method: "POST" }),
    me: () => request<UserInfo>("/auth/me"),
    logout: () => request<void>("/auth/logout", { method: "POST" }),
    forgotPassword: (email: string) => request<any>("/auth/forgot-password", { method: "POST" }),
    resetPassword: (token: string, newPassword: string) => request<any>("/auth/reset-password", { method: "POST" }),
    changePassword: (currentPassword: string, newPassword: string) => request<any>("/auth/change-password", { method: "POST" }),
  },
  reviews: {
    create: (providerId: number, data: any) => request<Review>(`/providers/${providerId}/reviews`, { method: "POST" }),
    addReply: (reviewId: number, reply: string) => request<Review>(`/reviews/${reviewId}/reply`, { method: "PATCH" }),
    listByProvider: (providerId: number) => request<Review[]>(`/providers/${providerId}/reviews`),
  },
  requests: {
    create: (data: any) => request<unknown>("/requests", { method: "POST" }),
    listByUser: (userId: number) => request<UserRequestItem[]>(`/users/${userId}/requests`),
    listByProvider: (providerId: number) => request<unknown[]>(`/providers/${providerId}/requests`),
    cancel: (requestId: number) => request<unknown>(`/requests/${requestId}/status`, { method: "PATCH" }),
    updateStatus: (requestId: number, status: string) => request<unknown>(`/requests/${requestId}/status`, { method: "PATCH" }),
  },
  favorites: {
    list: (userId: number) => request<FavoriteItem[]>(`/users/${userId}/favorites`),
    add: (userId: number, providerId: number) => request<unknown>(`/users/${userId}/favorites`, { method: "POST" }),
    remove: (userId: number, providerId: number) => request<void>(`/users/${userId}/favorites/${providerId}`, { method: "DELETE" }),
  },
  upload: {
    _prefixed: (relativeUrl: string): string => relativeUrl,
    avatar: async (file: File) => ({ url: "" }),
    banner: async (file: File) => ({ url: "" }),
    service: async (file: File) => ({ url: "" }),
  },
  subscriptions: {
    subscribe: (providerId: number, packageId: number) => request<unknown>(`/providers/${providerId}/subscribe`, { method: "POST" }),
  },
  regions: { list: () => request<Region[]>("/regions") },
  serviceAreas: {
    get: (providerId: number) => request<ServiceArea[]>(`/providers/${providerId}/service-areas`),
    save: (providerId: number, areas: any) => request<ServiceArea[]>(`/providers/${providerId}/service-areas`, { method: "PUT" }),
  },
  locations: {
    getAreasByCity: (cityId: number) => request<Area[]>(`/cities/${cityId}/areas`),
    admin: {
      allRegions: () => request<Region[]>("/admin/regions"),
      allCities: () => request<City[]>("/admin/cities"),
      createCity: (data: any) => request<City>("/admin/cities", { method: "POST" }),
      updateCity: (id: number, data: any) => request<City>(`/admin/cities/${id}`, { method: "PUT" }),
      toggleCity: (id: number) => request<City>(`/admin/cities/${id}/toggle`, { method: "PATCH" }),
      deleteCity: (id: number) => request<void>(`/admin/cities/${id}`, { method: "DELETE" }),
      allAreas: (cityId?: number) => request<Area[]>("/admin/areas"),
      createArea: (data: any) => request<Area>("/admin/areas", { method: "POST" }),
      updateArea: (id: number, data: any) => request<Area>(`/admin/areas/${id}`, { method: "PUT" }),
      toggleArea: (id: number) => request<Area>(`/admin/areas/${id}/toggle`, { method: "PATCH" }),
      deleteArea: (id: number) => request<void>(`/admin/areas/${id}`, { method: "DELETE" }),
    },
  },
};
