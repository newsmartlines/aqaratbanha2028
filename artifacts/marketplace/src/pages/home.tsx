import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { PropertyImageGallery } from "@/components/property-image-gallery";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SmartSearch } from "@/components/SmartSearch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, MapPin, Navigation,
  Star, ArrowLeft, CheckCircle2,
  Filter, ChevronDown, ChevronRight,
  ChefHat, Wrench, Palette, BookOpen, Calendar, Sparkles, Grid,
  Loader2, Phone, Mail, Map, Heart, MessageCircle,
  Users, Briefcase, ShoppingBag, ClipboardList,
  BedDouble, Bath, Maximize2, Building2, TrendingUp,
  Store, Trees, Scale, GitCompare, X as XIcon, Eye, Clock,
} from "lucide-react";
import { api, type Provider, type Category, type Subcategory, type SiteSettings, type Region, type FavoriteItem } from "@/lib/api";
import { AdBanner } from "@/components/AdBanner";
import { useApi } from "@/lib/use-api";
import { useInterpolate } from "@/lib/use-interpolate";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompare, addToCompare, removeFromCompare } from "@/lib/compare-store";
import toast from "react-hot-toast";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "الآن";
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} ${Math.floor(diff / 86400) === 1 ? "يوم" : "أيام"}`;
  if (diff < 2592000) return `منذ ${Math.floor(diff / 604800)} ${Math.floor(diff / 604800) === 1 ? "أسبوع" : "أسابيع"}`;
  return `منذ ${Math.floor(diff / 2592000)} شهر`;
}

// Fix Leaflet default marker icons for Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const userLocationIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const ICON_MAP: Record<string, React.ElementType> = {
  ChefHat, Wrench, Palette, BookOpen, Calendar, Sparkles, Grid,
};

const COLOR_MAP = [
  "bg-amber-50 text-amber-600 border-amber-200",
  "bg-blue-50 text-blue-600 border-blue-200",
  "bg-purple-50 text-purple-600 border-purple-200",
  "bg-green-50 text-green-600 border-green-200",
  "bg-rose-50 text-rose-600 border-rose-200",
  "bg-teal-50 text-teal-600 border-teal-200",
];

const ACTIVE_COLOR_MAP = [
  "bg-amber-500 text-white border-amber-500",
  "bg-blue-500 text-white border-blue-500",
  "bg-purple-500 text-white border-purple-500",
  "bg-green-500 text-white border-green-500",
  "bg-rose-500 text-white border-rose-500",
  "bg-teal-500 text-white border-teal-500",
];

const DEFAULT_IMG = "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80";

const CITIES = [
  { value: "all", label: "كل المدن" },
  { value: "القاهرة", label: "القاهرة" },
  { value: "الإسكندرية", label: "الإسكندرية" },
  { value: "الدمام", label: "الدمام" },
  { value: "مكة المكرمة", label: "مكة المكرمة" },
  { value: "المدينة المنورة", label: "المدينة المنورة" },
  { value: "الخبر", label: "الخبر" },
  { value: "أبها", label: "أبها" },
];

const CITY_COORDS: Record<string, [number, number]> = {
  "القاهرة": [24.7136, 46.6753],
  "الإسكندرية": [21.3891, 39.8579],
  "الدمام": [26.3927, 49.9777],
  "الطائف": [21.2703, 40.4158],
  "الخبر": [26.2172, 50.1971],
  "أبها": [18.2164, 42.5053],
  "المدينة المنورة": [24.5247, 39.5692],
  "مكة المكرمة": [21.3891, 39.8579],
  "تبوك": [28.3835, 36.5662],
  "حائل": [27.5219, 41.7057],
  "بريدة": [26.3260, 43.9750],
};

function getProviderCoords(provider: Provider): [number, number] | null {
  if (provider.latitude && provider.longitude) {
    return [parseFloat(provider.latitude), parseFloat(provider.longitude)];
  }
  if (provider.city && CITY_COORDS[provider.city]) {
    const [lat, lng] = CITY_COORDS[provider.city];
    const offset = ((provider.id * 0.009) % 0.12) - 0.06;
    return [lat + offset, lng + offset * 1.3];
  }
  return null;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const PROPERTIES = [
  {
    id: 1,
    title: "فيلا فاخرة مع مسبح",
    location: "حي النرجس، القاهرة",
    address: "شارع الأمير سلمان، حي النرجس، القاهرة 13315",
    price: "٢,٨٠٠,٠٠٠",
    priceNum: 2800000,
    type: "للبيع",
    kind: "فيلا",
    beds: 5, baths: 4, area: 450,
    floors: 3, garage: 2, year: 2021,
    featured: true,
    lat: 24.7753, lng: 46.6233,
    img: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1584738766473-61c083514bf4?auto=format&fit=crop&w=1200&q=85",
    ],
    videoId: "dQw4w9WgXcQ",
    description: "فيلا فاخرة مع مسبح خارجي وحديقة واسعة في أرقى أحياء القاهرة. تتميز بتصميم معماري حديث، تشطيبات فاخرة، ومطبخ مجهز بالكامل. تضم غرف نوم فسيحة، صالة كبيرة، وغرفة سينما خاصة.",
    amenities: ["مسبح خاص", "حديقة", "غرفة سينما", "جراج مغطى", "نظام أمني", "مولد كهربائي", "مطبخ غربي", "تكييف مركزي"],
    agentName: "أحمد العمري",
    agentPhone: "+20 50 123 4567",
    agentAvatar: "https://i.pravatar.cc/80?img=12",
    agentTitle: "مستشار عقاري أول",
  },
  {
    id: 2,
    title: "شقة حديثة بإطلالة بانورامية",
    location: "كورنيش الإسكندرية، الإسكندرية",
    address: "طريق الكورنيش، برج المرجان، الطابق 18، الإسكندرية 23525",
    price: "٨٥٠,٠٠٠",
    priceNum: 850000,
    type: "للبيع",
    kind: "شقة",
    beds: 3, baths: 2, area: 180,
    floors: 1, garage: 1, year: 2022,
    featured: false,
    lat: 21.5433, lng: 39.1728,
    img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=85",
    ],
    videoId: "dQw4w9WgXcQ",
    description: "شقة راقية في برج المرجان على كورنيش الإسكندرية مع إطلالة بانورامية على البحر الأحمر. تصميم عصري بتشطيبات عالية الجودة، بالكوني فسيح، وموقع استراتيجي قريب من أهم المراكز التجارية.",
    amenities: ["إطلالة بحرية", "بالكوني", "مسبح مشترك", "صالة رياضية", "حارس أمن", "مصعد", "موقف سيارات", "تكييف مركزي"],
    agentName: "سارة الحربي",
    agentPhone: "+20 55 234 5678",
    agentAvatar: "https://i.pravatar.cc/80?img=5",
    agentTitle: "وكيلة عقارية معتمدة",
  },
  {
    id: 3,
    title: "مكتب تجاري راقٍ في برج مميز",
    location: "طريق الملك فهد، القاهرة",
    address: "برج مصر، الطابق 32، طريق الملك فهد، القاهرة 12211",
    price: "٤٥,٠٠٠ / سنة",
    priceNum: 45000,
    type: "للإيجار",
    kind: "مكتب",
    beds: 0, baths: 2, area: 320,
    floors: 1, garage: 2, year: 2019,
    featured: true,
    lat: 24.6887, lng: 46.6826,
    img: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=1200&q=85",
    ],
    videoId: "dQw4w9WgXcQ",
    description: "مكتب تجاري فاخر في أحد أبرز أبراج القاهرة على طريق الملك فهد. مؤهل بالكامل بأنظمة الاتصالات الحديثة، غرف اجتماعات مجهزة، واستقبال احترافي. مثالي للشركات الكبرى والقنصليات.",
    amenities: ["غرف اجتماعات", "استقبال", "إنترنت عالي السرعة", "كافيتيريا", "أمن على مدار الساعة", "موقف سيارات مميز", "تكييف مركزي"],
    agentName: "محمد الدوسري",
    agentPhone: "+20 56 345 6789",
    agentAvatar: "https://i.pravatar.cc/80?img=8",
    agentTitle: "مستشار عقارات تجارية",
  },
  {
    id: 4,
    title: "دوبلكس عصري في موقع استراتيجي",
    location: "الواجهة البحرية، الدمام",
    address: "طريق الملك فهد، حي الشاطئ، الدمام 32244",
    price: "١,٢٠٠,٠٠٠",
    priceNum: 1200000,
    type: "للبيع",
    kind: "دوبلكس",
    beds: 4, baths: 3, area: 280,
    floors: 2, garage: 1, year: 2023,
    featured: false,
    lat: 26.4367, lng: 50.1047,
    img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1599427303058-f04cbcf4756f?auto=format&fit=crop&w=1200&q=85",
    ],
    videoId: "dQw4w9WgXcQ",
    description: "دوبلكس عصري بتصميم أنيق وموقع مميز على الواجهة البحرية بالدمام. طابقان متكاملان، مطبخ مفتوح، وتراس خاص مطل على البحر. مبنى حديث البناء بتشطيبات ممتازة.",
    amenities: ["تراس خاص", "إطلالة بحرية", "مطبخ مفتوح", "مسبح مشترك", "صالة رياضية", "حارس أمن", "موقف سيارات"],
    agentName: "نورة السعيد",
    agentPhone: "+20 54 456 7890",
    agentAvatar: "https://i.pravatar.cc/80?img=9",
    agentTitle: "مستشارة عقارية",
  },
  {
    id: 5,
    title: "شقة مؤثثة بالكامل للإيجار",
    location: "حي الملز، القاهرة",
    address: "شارع الأمير عبدالعزيز بن مساعد، حي الملز، القاهرة 12836",
    price: "٢٨,٠٠٠ / سنة",
    priceNum: 28000,
    type: "للإيجار",
    kind: "شقة",
    beds: 2, baths: 1, area: 120,
    floors: 1, garage: 1, year: 2020,
    featured: false,
    lat: 24.6941, lng: 46.7151,
    img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=85",
    ],
    videoId: "dQw4w9WgXcQ",
    description: "شقة مؤثثة بالكامل بأثاث عصري عالي الجودة، جاهزة للسكن الفوري. موقع مركزي مميز قريب من الخدمات والمرافق، مناسبة للعزاب أو الأزواج الجدد.",
    amenities: ["مؤثثة بالكامل", "إنترنت", "غسالة", "مكيفات", "حراسة", "موقف سيارات"],
    agentName: "خالد الزهراني",
    agentPhone: "+20 58 567 8901",
    agentAvatar: "https://i.pravatar.cc/80?img=15",
    agentTitle: "وكيل عقاري",
  },
  {
    id: 6,
    title: "أرض تجارية في حي الأعمال",
    location: "حي العليا، القاهرة",
    address: "طريق العليا العام، حي العليا، القاهرة 12211",
    price: "٥,٥٠٠,٠٠٠",
    priceNum: 5500000,
    type: "للبيع",
    kind: "أرض",
    beds: 0, baths: 0, area: 1200,
    floors: 0, garage: 0, year: 0,
    featured: true,
    lat: 24.6892, lng: 46.6848,
    img: "https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1200&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=85",
    ],
    videoId: "dQw4w9WgXcQ",
    description: "أرض تجارية مميزة في قلب حي العليا بالقاهرة، منطقة الأعمال الأولى في مصر. مساحة شاسعة بإطلالة على الشارع الرئيسي، مرخصة للبناء التجاري والسكني. فرصة استثمارية لا تُعوض.",
    amenities: ["واجهة على الشارع الرئيسي", "ترخيص تجاري", "قريبة من الخدمات", "منطقة نمو عالي"],
    agentName: "فيصل القحطاني",
    agentPhone: "+20 50 678 9012",
    agentAvatar: "https://i.pravatar.cc/80?img=11",
    agentTitle: "مستشار استثمار عقاري",
  },
  {
    id: 7,
    title: "شقة فندقية قرب الحرم المكي",
    location: "أجياد، مكة المكرمة",
    address: "شارع إبراهيم الخليل، أجياد، مكة المكرمة 24231",
    price: "١,١٠٠,٠٠٠",
    priceNum: 1100000,
    type: "للبيع",
    kind: "شقة",
    beds: 3, baths: 2, area: 145,
    floors: 1, garage: 1, year: 2022,
    featured: true,
    lat: 21.4225, lng: 39.8262,
    img: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1631049552057-403cdb8f0658?auto=format&fit=crop&w=1200&q=85",
    ],
    videoId: "dQw4w9WgXcQ",
    description: "شقة فندقية فاخرة بإطلالة مباشرة على الكعبة المشرفة، مجهزة بالكامل بأحدث التجهيزات، مثالية للاستثمار أو السكن خلال فترات الحج والعمرة.",
    amenities: ["إطلالة على الحرم", "مؤثثة بالكامل", "مسبح", "صالة رياضية", "خدمة الغرف", "موقف سيارات"],
    agentName: "عبدالله المالكي",
    agentPhone: "+20 56 111 2233",
    agentAvatar: "https://i.pravatar.cc/80?img=20",
    agentTitle: "وكيل عقاري معتمد",
  },
  {
    id: 8,
    title: "فيلا بحرية في شمال الإسكندرية",
    location: "حي الشاطئ، الإسكندرية",
    address: "طريق الأمير نايف، حي الشاطئ، الإسكندرية 23514",
    price: "٤,٢٠٠,٠٠٠",
    priceNum: 4200000,
    type: "للبيع",
    kind: "فيلا",
    beds: 6, baths: 5, area: 620,
    floors: 3, garage: 3, year: 2020,
    featured: true,
    lat: 21.6511, lng: 39.1081,
    img: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=85",
    ],
    videoId: "dQw4w9WgXcQ",
    description: "فيلا فاخرة بإطلالة مباشرة على البحر الأحمر في أرقى أحياء الإسكندرية. تصميم هندسي استثنائي، حديقة استوائية، وشاطئ خاص خلف الفيلا مباشرة.",
    amenities: ["شاطئ خاص", "مسبح لا نهاية", "حديقة استوائية", "غرفة سينما", "جناح للضيوف", "تكييف مركزي", "أمن 24 ساعة"],
    agentName: "ريم القرشي",
    agentPhone: "+20 55 321 8800",
    agentAvatar: "https://i.pravatar.cc/80?img=25",
    agentTitle: "مستشارة عقارية فاخرة",
  },
  {
    id: 9,
    title: "شقة للإيجار في الخبر الشمالية",
    location: "الخبر الشمالية، الخبر",
    address: "شارع الأمير فيصل بن فهد، الخبر الشمالية 31952",
    price: "٣٢,٠٠٠ / سنة",
    priceNum: 32000,
    type: "للإيجار",
    kind: "شقة",
    beds: 3, baths: 2, area: 155,
    floors: 1, garage: 1, year: 2021,
    featured: false,
    lat: 26.3001, lng: 50.2083,
    img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=85",
    ],
    videoId: "dQw4w9WgXcQ",
    description: "شقة عصرية في الخبر الشمالية بالقرب من المجمعات التجارية الكبرى، تصميم مفتوح، تشطيبات حديثة، وموقع استراتيجي مميز قريب من أرامكو.",
    amenities: ["تكييف مركزي", "موقف مغطى", "حراسة", "مصعد", "إنترنت ألياف", "صالة رياضية مشتركة"],
    agentName: "وليد البكر",
    agentPhone: "+20 50 444 5566",
    agentAvatar: "https://i.pravatar.cc/80?img=30",
    agentTitle: "وكيل عقاري",
  },
  {
    id: 10,
    title: "دوبلكس فاخر في المدينة المنورة",
    location: "العزيزية، المدينة المنورة",
    address: "طريق الملك عبدالعزيز، حي العزيزية، المدينة المنورة 42315",
    price: "٩٥٠,٠٠٠",
    priceNum: 950000,
    type: "للبيع",
    kind: "دوبلكس",
    beds: 4, baths: 3, area: 240,
    floors: 2, garage: 2, year: 2022,
    featured: false,
    lat: 24.4539, lng: 39.6047,
    img: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1599427303058-f04cbcf4756f?auto=format&fit=crop&w=1200&q=85",
    ],
    videoId: "dQw4w9WgXcQ",
    description: "دوبلكس راقٍ بالقرب من المسجد النبوي الشريف، موقع متميز يجمع بين القيمة الدينية والاستثمارية، تشطيبات فاخرة وتصميم عصري أنيق.",
    amenities: ["قريب من الحرم", "روف خاص", "مطبخ أمريكي", "غرفة خادمة", "تكييف مركزي", "موقف خاص"],
    agentName: "هاني العنزي",
    agentPhone: "+20 54 777 8899",
    agentAvatar: "https://i.pravatar.cc/80?img=35",
    agentTitle: "مستشار عقاري",
  },
  {
    id: 11,
    title: "فيلا استثمارية في حي الراشدية",
    location: "حي الراشدية، الدمام",
    address: "شارع الأمير محمد بن فهد، حي الراشدية، الدمام 32216",
    price: "٢,١٠٠,٠٠٠",
    priceNum: 2100000,
    type: "للبيع",
    kind: "فيلا",
    beds: 5, baths: 4, area: 400,
    floors: 2, garage: 2, year: 2019,
    featured: false,
    lat: 26.4512, lng: 50.0834,
    img: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85",
    ],
    videoId: "dQw4w9WgXcQ",
    description: "فيلا استثمارية ذات موقع متميز في حي الراشدية، تصميم كلاسيكي فاخر مع حديقة خلفية وخدمات متكاملة، مناسبة للسكن أو التأجير بعائد مرتفع.",
    amenities: ["حديقة خلفية", "جلسة خارجية", "مستودع", "غرفة خادمة", "نظام إنذار", "موقف مغطى"],
    agentName: "سعود المطيري",
    agentPhone: "+20 56 888 9900",
    agentAvatar: "https://i.pravatar.cc/80?img=40",
    agentTitle: "وكيل عقاري معتمد",
  },
  {
    id: 12,
    title: "شقة سمارت هوم في حي الياسمين",
    location: "حي الياسمين، القاهرة",
    address: "طريق أنس بن مالك، حي الياسمين، القاهرة 13322",
    price: "٥٥,٠٠٠ / سنة",
    priceNum: 55000,
    type: "للإيجار",
    kind: "شقة",
    beds: 4, baths: 3, area: 210,
    floors: 1, garage: 2, year: 2024,
    featured: true,
    lat: 24.8107, lng: 46.6395,
    img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=85",
    ],
    videoId: "dQw4w9WgXcQ",
    description: "شقة ذكية بتقنية سمارت هوم كاملة في أحدث مجمعات حي الياسمين، التحكم بكل شيء من هاتفك: الإضاءة، التكييف، الأمن، والستائر الأوتوماتيكية.",
    amenities: ["سمارت هوم", "تكييف مركزي ذكي", "ستائر أوتوماتيكية", "كاميرات ذكية", "جاكوزي", "مسبح مشترك", "صالة رياضية"],
    agentName: "لمى الشمري",
    agentPhone: "+20 55 000 1122",
    agentAvatar: "https://i.pravatar.cc/80?img=45",
    agentTitle: "مستشارة عقارية",
  },
  {
    id: 13,
    title: "مكتب طابقي في برج الفيصلية",
    location: "حي العليا، القاهرة",
    address: "برج الفيصلية، الطابق 15، طريق الملك فهد، القاهرة 12212",
    price: "٩٥,٠٠٠ / سنة",
    priceNum: 95000,
    type: "للإيجار",
    kind: "مكتب",
    beds: 0, baths: 4, area: 580,
    floors: 1, garage: 4, year: 2018,
    featured: false,
    lat: 24.6921, lng: 46.6837,
    img: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=1200&q=85",
    ],
    videoId: "dQw4w9WgXcQ",
    description: "مكتب طابقي كامل في برج الفيصلية الأيقوني بالقاهرة، طابق 15 مع إطلالة 360 درجة على العاصمة، مجهز بالكامل بأحدث التقنيات والبنية التحتية التكنولوجية.",
    amenities: ["إطلالة 360 درجة", "غرف اجتماعات زجاجية", "استقبال", "مطبخ", "خزائن آمنة", "أمن 24 ساعة", "موقف VIP"],
    agentName: "طارق العسيري",
    agentPhone: "+20 50 222 3344",
    agentAvatar: "https://i.pravatar.cc/80?img=50",
    agentTitle: "مستشار عقارات تجارية",
  },
  {
    id: 14,
    title: "أرض سكنية في حي طويق",
    location: "حي طويق، القاهرة",
    address: "شارع الأمير سلطان بن سلمان، حي طويق، القاهرة 14741",
    price: "١,٨٠٠,٠٠٠",
    priceNum: 1800000,
    type: "للبيع",
    kind: "أرض",
    beds: 0, baths: 0, area: 750,
    floors: 0, garage: 0, year: 0,
    featured: false,
    lat: 24.6201, lng: 46.5943,
    img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=85",
      "https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1200&q=85",
    ],
    videoId: "dQw4w9WgXcQ",
    description: "أرض سكنية في حي طويق الهادئ، شارع مرصوف بعرض 15 متر، مناسبة لبناء فيلا أو عمارة سكنية صغيرة، قريبة من جميع الخدمات.",
    amenities: ["شارع مرصوف", "مرخصة للبناء السكني", "قريبة من المدارس", "هادئة وآمنة"],
    agentName: "نبيل الغامدي",
    agentPhone: "+20 58 333 4455",
    agentAvatar: "https://i.pravatar.cc/80?img=55",
    agentTitle: "وكيل عقاري",
  },
];

/* ═══════════════════════════════════════════════════════════════════
   AI SMART COMPONENTS — Trending & Recently Viewed
   ═══════════════════════════════════════════════════════════════════ */

interface SmallProperty {
  id: number; title: string; price?: string | null; listingType?: string | null;
  mainCategory?: string | null; district?: string | null; images?: string | null;
  viewCount?: number; rooms?: number | null; area?: string | null;
}

function SmallPropertyCard({ p, onClick }: { p: SmallProperty; onClick: () => void }) {
  const imgs: string[] = (() => { try { return JSON.parse(p.images ?? "[]"); } catch { return []; } })();
  const thumb = imgs[0] ?? DEFAULT_IMG;
  const priceNum = Number(p.price);
  const priceStr = priceNum ? priceNum.toLocaleString("ar-EG") + " ج.م" : "السعر عند التواصل";
  const typeAr = p.listingType === "rent" ? "للإيجار" : "للبيع";
  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="w-56 shrink-0 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg cursor-pointer transition-shadow duration-300"
    >
      <div className="relative h-36 overflow-hidden bg-slate-100">
        <img src={thumb} alt={p.title} loading="lazy"
          className="w-full h-full object-cover"
          onError={e => { e.currentTarget.src = DEFAULT_IMG; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <span className={`absolute top-2 right-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-md
          ${p.listingType === "rent" ? "bg-blue-500" : "bg-emerald-500"}`}>
          {typeAr}
        </span>
        <span className="absolute bottom-2 right-2 text-white text-xs font-black">{priceStr}</span>
      </div>
      <div className="p-3">
        <p className="font-bold text-slate-800 text-sm line-clamp-1">{p.title}</p>
        {p.district && (
          <p className="flex items-center gap-1 text-slate-400 text-xs mt-1">
            <MapPin className="w-3 h-3 shrink-0" />{p.district}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function TrendingSection() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useQuery<SmallProperty[]>({
    queryKey: ["trending-properties"],
    queryFn: async () => {
      const res = await fetch("/api/trending?limit=10");
      const json = await res.json();
      return json.data ?? [];
    },
    staleTime: 60_000,
  });
  if (isLoading || !data || data.length === 0) return null;
  return (
    <section className="py-14 bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 rounded-full px-3 py-1 text-xs font-semibold mb-2">
              <TrendingUp className="w-3.5 h-3.5" />
              الأكثر مشاهدة الآن
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">العقارات الأكثر مشاهدة</h2>
            <p className="text-slate-500 text-sm mt-1">اكتشف ما يبحث عنه الآخرون</p>
          </div>
          <button onClick={() => setLocation("/search?sort=popular")}
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
            عرض الكل <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {data.map(p => (
            <SmallPropertyCard key={p.id} p={p} onClick={() => setLocation(`/property/${p.id}`)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RecentlyViewedSection() {
  const [, setLocation] = useLocation();
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    try {
      const stored: number[] = JSON.parse(localStorage.getItem("rve_ids") ?? "[]");
      setIds(stored.filter(n => n > 0).slice(0, 8));
    } catch {}
  }, []);

  const { data, isLoading } = useQuery<SmallProperty[]>({
    queryKey: ["recently-viewed", ids.join(",")],
    queryFn: async () => {
      if (!ids.length) return [];
      const res = await fetch(`/api/recently-viewed?ids=${ids.join(",")}`);
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: ids.length > 0,
    staleTime: 30_000,
  });

  if (!ids.length || isLoading || !data || data.length === 0) return null;

  return (
    <section className="py-14 bg-white border-t border-slate-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-600 rounded-full px-3 py-1 text-xs font-semibold mb-2">
              <Eye className="w-3.5 h-3.5" />
              شاهدته مؤخراً
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">متابعة تصفحك</h2>
            <p className="text-slate-500 text-sm mt-1">استكمل مشاهدة العقارات التي اهتممت بها</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("rve_ids");
              setIds([]);
            }}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            مسح السجل
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {data.map(p => (
            <SmallPropertyCard key={p.id} p={p} onClick={() => setLocation(`/property/${p.id}`)} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  /** null = كل المناطق */
  const [heroRegionId, setHeroRegionId] = useState<number | null>(null);
  /** null = كل المدن ضمن نطاق المنطقة */
  const [heroCityName, setHeroCityName] = useState<string | null>(null);
  /** اسم الحي / المنطقة المختارة في بنها */
  const [heroAreaName, setHeroAreaName] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedCat, setExpandedCat] = useState<number | null>(null);
  /* ─── Real-estate hero search ─── */
  const [listingType, setListingType] = useState<"للبيع" | "للإيجار">("للبيع");
  const [heroSubcategoryId, setHeroSubcategoryId] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<string>("all");
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showNearMeMap, setShowNearMeMap] = useState(false);
  const [, setLocation] = useLocation();
  const nearMeRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const qc = useQueryClient();
  const { items: compareItems, isIn: isInCompare } = useCompare();

  const { data: categories } = useApi(() => api.categories.list(), []);
  const { data: allSubs } = useApi(() => api.subcategories.list(), []);
  const { data: providers, loading: providersLoading } = useApi(() => api.providers.list(), []);
  const { data: settings } = useApi(() => api.settings.list(), []);

  const { data: reCategories = [] } = useQuery<Category[]>({
    queryKey: ["re-categories"],
    queryFn: () => api.categories.listByType("real_estate"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: regions = [] } = useQuery<Region[]>({
    queryKey: ["regions"],
    queryFn: () => api.regions.list(),
  });

  const { data: banhaAreas = [] } = useQuery({
    queryKey: ["areas", 45],
    queryFn: () => api.locations.getAreasByCity(45),
    staleTime: 5 * 60_000,
  });

  const { data: featuredAreas = [] } = useQuery<Array<{ id: number; nameAr: string; image: string | null; cityName: string | null; displayOrder: number; enabled: boolean; propertyCount: number }>>({
    queryKey: ["featured-areas"],
    queryFn: api.featuredAreas.list,
    staleTime: 5 * 60_000,
  });

  const spotlightEnabled = settings?.spotlightEnabled === "true";
  const spotlightPropertyId = settings?.spotlightPropertyId ? Number(settings.spotlightPropertyId) : null;
  const spotlightBadge = settings?.spotlightBadge || "عرض حصري";
  const spotlightCtaText = settings?.spotlightCtaText || "عرض التفاصيل";
  const spotlightCustomLink = settings?.spotlightCustomLink || "";

  const { data: spotlightProperty } = useQuery<any>({
    queryKey: ["spotlight-property", spotlightPropertyId],
    queryFn: () => api.properties.get(spotlightPropertyId!),
    enabled: spotlightEnabled && !!spotlightPropertyId,
    staleTime: 5 * 60_000,
  });

  const { data: platformStats } = useQuery<{ providers: number; users: number; services: number; requests: number; properties: number }>({
    queryKey: ["platform-stats"],
    queryFn: () => api.stats.platform(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: homePropsRaw = [], isLoading: propsLoading } = useQuery<any[]>({
    queryKey: ["home-properties"],
    queryFn: () => api.properties.list({ status: "active" }),
    staleTime: 2 * 60 * 1000,
  });

  const { data: homeFavIds = [] } = useQuery<number[]>({
    queryKey: ["property-favorites-ids"],
    queryFn: async () => {
      if (!user) return [];
      const rows = await api.propertyFavorites.list();
      return (rows as any[]).map((r: any) => r.propertyId);
    },
    enabled: !!user,
  });

  const toggleHomeFavMut = useMutation({
    mutationFn: async ({ id, add }: { id: number; add: boolean }) => {
      if (!user) return;
      if (add) await api.propertyFavorites.add(id);
      else await api.propertyFavorites.remove(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["property-favorites-ids"] }),
  });

  const heroCityOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [{ value: "__all__", label: "كل المدن" }];
    const addCity = (nameAr: string) => {
      if (!opts.some(o => o.value === nameAr)) opts.push({ value: nameAr, label: nameAr });
    };
    if (heroRegionId != null) {
      const reg = regions.find(r => r.id === heroRegionId);
      (reg?.cities ?? []).forEach(c => {
        if (c.enabled !== false) addCity(c.nameAr);
      });
      return opts;
    }
    regions.forEach(region => {
      region.cities.forEach(city => {
        if (city.enabled !== false) addCity(city.nameAr);
      });
    });
    return opts.length > 1 ? opts : [{ value: "__all__", label: "كل المدن" }, ...CITIES.filter(c => c.value !== "all").map(c => ({ value: c.value, label: c.label }))];
  }, [regions, heroRegionId]);

  useEffect(() => {
    setHeroCityName(null);
  }, [heroRegionId]);

  const { data: favoritesData = [] } = useQuery<FavoriteItem[]>({
    queryKey: ["favorites", user?.id],
    queryFn: () => api.favorites.list(user!.id),
    enabled: !!user && user.role === "user",
  });

  const favoriteIds = useMemo(() => new Set(favoritesData.map(f => f.providerId)), [favoritesData]);

  const toggleFavMutation = useMutation({
    mutationFn: async (providerId: number) => {
      if (!user) return;
      if (favoriteIds.has(providerId)) {
        await api.favorites.remove(user.id, providerId);
      } else {
        await api.favorites.add(user.id, providerId);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites", user?.id] }),
  });

  const siteName = (settings as SiteSettings | undefined)?.siteName ?? "عقارات بنها";
  const _ctaText = (settings as SiteSettings | undefined)?.ctaText ?? "ندعم المشاريع المنزلية ونضمن حقوقك";
  const _ctaButtonText = (settings as SiteSettings | undefined)?.ctaButtonText ?? "انضم إلينا الآن";
  const heroImage = (settings as SiteSettings | undefined)?.heroImage ?? "";
  const _heroTitle = (settings as SiteSettings | undefined)?.heroTitle ?? "";
  const _heroSubtitle = (settings as SiteSettings | undefined)?.heroSubtitle ?? "";
  const ip = useInterpolate();
  const heroTitle = ip(_heroTitle);
  const heroSubtitle = ip(_heroSubtitle);
  const ctaText = ip(_ctaText);
  const ctaButtonText = ip(_ctaButtonText);

  const getSubs = (catId: number) => ((allSubs as Subcategory[] | undefined) ?? []).filter(s => s.categoryId === catId);

  const matchesActiveCategory = (p: Provider) => {
    if (activeTab === "all") return true;
    return (p.categoryNameAr ?? "").includes(
      activeTab === "food" ? "طعام" :
      activeTab === "maintenance" ? "صيانة" :
      activeTab === "design" ? "تصميم" : ""
    );
  };

  const featuredProviders = (providers as Provider[] | undefined)?.filter(p => p.featured) ?? [];
  const filteredProviders = ((providers as Provider[] | undefined) ?? []).filter(matchesActiveCategory);

  /** Maximum radius (km) for the "Near me" carousel. */
  const NEARBY_RADIUS_KM = 5;

  const nearbyProviders = useMemo(() => {
    const allProviders = ((providers as Provider[] | undefined) ?? []).filter(matchesActiveCategory);
    // No geo permission yet → fall back to a small generic preview.
    if (!userLocation) return allProviders.slice(0, 8).map(p => ({ ...p, dist: 0 }));
    return [...allProviders]
      .map(p => {
        const coords = getProviderCoords(p);
        const dist = coords ? haversine(userLocation.lat, userLocation.lng, coords[0], coords[1]) : Infinity;
        return { ...p, dist };
      })
      .filter(p => p.dist <= NEARBY_RADIUS_KM)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers, userLocation, activeTab]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery);
    if (selectedCategory && selectedCategory !== "all") params.set("mainCategory", selectedCategory);
    if (listingType) params.set("type", listingType);
    if (priceRange && priceRange !== "all") params.set("price", priceRange);
    if (heroRegionId != null) params.set("regionId", String(heroRegionId));
    if (heroCityName && heroCityName !== "__all__") params.set("city", heroCityName);
    if (heroAreaName) params.set("district", heroAreaName);
    setLocation(`/properties?${params.toString()}`);
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) { alert("متصفحك لا يدعم تحديد الموقع"); return; }
    setNearMeLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNearMeLoading(false);
        const { latitude, longitude } = pos.coords;
        setLocation(`/search?lat=${latitude}&lng=${longitude}&nearest=true`);
      },
      () => {
        setNearMeLoading(false);
        alert("لم نتمكن من تحديد موقعك. تأكد من السماح بالوصول للموقع.");
      },
      { timeout: 8000 }
    );
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) { alert("متصفحك لا يدعم تحديد الموقع"); return; }
    setNearMeLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNearMeLoading(false);
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setShowNearMeMap(true);
        nearMeRef.current?.scrollIntoView({ behavior: "smooth" });
      },
      () => {
        setNearMeLoading(false);
        alert("لم نتمكن من تحديد موقعك.");
      },
      { timeout: 8000 }
    );
  };

  const expandedCatObj = (categories as Category[] | undefined)?.find(c => c.id === expandedCat);
  const expandedCatIndex = (categories as Category[] | undefined)?.findIndex(c => c.id === expandedCat) ?? 0;

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans selection:bg-primary/20 selection:text-primary" dir="rtl">
      <Header />

      <main className="flex-1">
        {/* ── HERO ── */}
        <section className="relative overflow-hidden border-b">
          {/* Background */}
          <div className="absolute inset-0 z-0">
            <img
              src={heroImage || "/images/hero.jpg"}
              alt=""
              className="w-full h-full object-cover object-center scale-105"
              onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=2000&q=80"; }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/75 via-slate-900/60 to-slate-900/80" />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center px-4 pt-14 pb-10 md:pt-16 md:pb-12">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-xs font-semibold rounded-full px-4 py-1.5 mb-5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              بنها — القليوبية — مصر
            </div>

            {/* Headline */}
            <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight tracking-tight mb-3 max-w-2xl drop-shadow">
              {heroTitle || (
                <>اعثر على <span className="text-primary">عقارك المثالي</span> في بنها</>
              )}
            </h1>
            <p className="text-white/70 text-sm md:text-base mb-8 max-w-lg">
              بيع وإيجار وخدمات عقارية — أسرع وأوثق
            </p>

            {/* ── Search Card ── */}
            <motion.div
              layout
              className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-visible"
            >
              {/* Tabs */}
              <div className="relative flex rounded-t-2xl overflow-hidden">
                {(["للبيع", "للإيجار"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setListingType(tab)}
                    className={`relative flex-1 py-3.5 text-sm font-bold transition-colors z-10 ${
                      listingType === tab ? "text-primary-foreground" : "text-gray-500 hover:text-gray-700 bg-gray-50"
                    }`}
                  >
                    {listingType === tab && (
                      <motion.span
                        layoutId="tab-indicator"
                        className="absolute inset-0 bg-primary"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                      />
                    )}
                    <span className="relative z-10">{tab}</span>
                  </button>
                ))}
              </div>

              {/* ── Main search row ── */}
              <div className="flex items-stretch border-t border-gray-100" dir="rtl">

                {/* SmartSearch — takes the bulk of the space */}
                <div className="flex-1 min-w-0">
                  <SmartSearch
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSearch={handleSearch}
                    placeholder="ابحث عن حي أو منطقة أو مشروع أو نوع عقار…"
                    variant="hero"
                  />
                </div>

                {/* Divider */}
                <div className="w-px bg-gray-100 self-stretch my-2 shrink-0" />

                {/* Category */}
                <div className="w-32 shrink-0">
                  <Select value={selectedCategory} onValueChange={v => { setSelectedCategory(v); setHeroSubcategoryId("all"); }}>
                    <SelectTrigger className="h-14 bg-transparent border-none focus:ring-0 shadow-none px-3 font-medium text-sm w-full text-gray-600">
                      <Building2 className="w-3.5 h-3.5 ml-1 text-primary shrink-0" />
                      <SelectValue placeholder="النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الأنواع</SelectItem>
                      {reCategories.map(c => (
                        <SelectItem key={c.id} value={c.slug ?? String(c.id)}>{c.nameAr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Divider */}
                <div className="w-px bg-gray-100 self-stretch my-2 shrink-0" />

                {/* City */}
                <div className="w-28 shrink-0">
                  <Select
                    value={heroCityName ?? "__all__"}
                    onValueChange={v => setHeroCityName(v === "__all__" ? null : v)}
                  >
                    <SelectTrigger className="h-14 bg-transparent border-none focus:ring-0 shadow-none px-3 font-medium text-sm w-full text-gray-600">
                      <MapPin className="w-3.5 h-3.5 ml-1 text-primary shrink-0" />
                      <SelectValue placeholder="المدينة" />
                    </SelectTrigger>
                    <SelectContent>
                      {heroCityOptions.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search button */}
                <button
                  onClick={handleSearch}
                  className="shrink-0 h-14 px-6 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-es-2xl transition-colors flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  بحث
                </button>
              </div>

              {/* ── Subcategory pills — animates in when category selected ── */}
              {(() => {
                const selCat = reCategories.find(c => (c.slug ?? String(c.id)) === selectedCategory);
                const subs = selCat ? ((allSubs as Subcategory[] | undefined) ?? []).filter(s => s.categoryId === selCat.id) : [];
                if (selectedCategory === "all" || subs.length === 0) return null;
                return (
                  <motion.div
                    key={selectedCategory}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="border-t border-gray-100 px-4 py-3 overflow-hidden rounded-b-2xl"
                    dir="rtl"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-400 shrink-0">النوع:</span>
                      <button
                        onClick={() => setHeroSubcategoryId("all")}
                        className={`px-3.5 py-1 rounded-full text-xs font-bold border transition-all duration-150 shrink-0
                          ${heroSubcategoryId === "all"
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-gray-500 border-gray-200 hover:border-primary/40 hover:text-primary"
                          }`}
                      >الكل</button>
                      {subs.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setHeroSubcategoryId(heroSubcategoryId === String(s.id) ? "all" : String(s.id))}
                          className={`px-3.5 py-1 rounded-full text-xs font-bold border transition-all duration-150 shrink-0
                            ${heroSubcategoryId === String(s.id)
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-gray-500 border-gray-200 hover:border-primary/40 hover:text-primary"
                            }`}
                        >{s.nameAr}</button>
                      ))}
                    </div>
                  </motion.div>
                );
              })()}
            </motion.div>

            {/* ── Stats strip ── */}
            <div className="mt-6 flex items-center gap-6 flex-wrap justify-center">
              {[
                { label: "عقار متاح", value: platformStats?.properties },
                { label: "مستخدم مسجل", value: platformStats?.users },
              ].map((s, i) => (
                <div key={i} className="flex items-baseline gap-1.5 text-white/90">
                  <span className="text-xl font-black text-white drop-shadow">
                    {s.value !== undefined ? s.value.toLocaleString("ar-EG") : "—"}
                    {s.value !== undefined && <span className="text-sm">+</span>}
                  </span>
                  <span className="text-xs text-white/60">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── AD: hero bottom ── */}
        <div className="container mx-auto px-4 py-3">
          <AdBanner position="hero_bottom" />
        </div>

        {/* ── REAL ESTATE LISTINGS ── */}
        <section
          className="py-20 bg-white relative overflow-hidden"
          style={{
            backgroundImage: "radial-gradient(circle, #cbd5e1 1.5px, transparent 1.5px)",
            backgroundSize: "30px 30px",
          }}
        >
          {/* Fade edges — keeps dots visible in the middle, fades at borders */}
          <div className="absolute inset-0 pointer-events-none"
            style={{
              background: [
                "linear-gradient(to bottom, white 0%, transparent 8%, transparent 92%, white 100%)",
                "linear-gradient(to right,  white 0%, transparent 8%, transparent 92%, white 100%)",
              ].join(", "),
            }}
          />
          {/* Soft teal glow top-right */}
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(20,184,166,0.06) 0%, transparent 70%)" }} />
          {/* Soft accent glow bottom-left */}
          <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)" }} />

          <div className="container mx-auto px-4 relative z-10">
            {/* Header */}
            <div className="flex items-end justify-between mb-12">
              <div>
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
                  <Building2 className="w-4 h-4" />
                  العقارات المميزة
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
                  اكتشف أفضل العقارات
                  <span className="block text-primary">في مصر</span>
                </h2>
                <p className="text-muted-foreground mt-3 text-base max-w-md">شقق وفلل ومكاتب تجارية بأسعار تنافسية في أفضل المواقع</p>
              </div>
              <button
                onClick={() => setLocation("/properties")}
                className="hidden md:flex items-center gap-2 text-sm text-primary font-semibold border border-primary/30 rounded-full px-5 py-2.5 hover:bg-primary/10 transition-all group"
              >
                عرض الكل
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Property cards grid */}
            {propsLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : homePropsRaw.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border border-dashed border-border/60 rounded-3xl bg-secondary/20">
                <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium">لا توجد عقارات متاحة حالياً</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {homePropsRaw.slice(0, 12).map((property, idx) => {
                const imgs: string[] = (() => { try { return JSON.parse(property.images ?? "[]"); } catch { return []; } })();
                const thumb = imgs[0] ?? DEFAULT_IMG;
                const location = [property.district, property.city].filter(Boolean).join("، ") || "بنها";
                const priceNum = Number(property.price);
                const priceStr = priceNum ? priceNum.toLocaleString("ar-EG") : "—";
                const listType = property.listingType ?? "";
                return (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.08 }}
                >
                  <div
                    className="group relative bg-white border border-border rounded-3xl overflow-hidden hover:border-primary/30 hover:shadow-xl transition-all duration-300 cursor-pointer"
                    onClick={() => setLocation(`/property/${property.id}`)}
                  >
                    {/* Image gallery */}
                    <PropertyImageGallery
                      images={imgs}
                      alt={property.title}
                      fallback={DEFAULT_IMG}
                      className="h-52"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute top-3 right-3 flex gap-1.5 z-20">
                        {listType && (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full shadow-lg ${listType === "sale" ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"}`}>
                            {listType === "sale" ? "للبيع" : "للإيجار"}
                          </span>
                        )}
                        {(property as any).verified && (
                          <span className="inline-flex items-center gap-1 bg-teal-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                            <CheckCircle2 className="w-3 h-3" /> موثق
                          </span>
                        )}
                      </div>
                      {property.propertyType && (
                        <div className="absolute bottom-3 left-3 z-20">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/25 backdrop-blur-md text-white border border-white/30">
                            {property.propertyType}
                          </span>
                        </div>
                      )}
                      <button
                        className={`absolute top-3 left-3 z-20 w-8 h-8 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${homeFavIds.includes(property.id) ? "bg-rose-500 border-rose-400 text-white" : "bg-white/20 border-white/30 text-white hover:bg-rose-500 hover:border-rose-400"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const add = !homeFavIds.includes(property.id);
                          toggleHomeFavMut.mutate({ id: property.id, add });
                        }}
                      >
                        <Heart className={`w-3.5 h-3.5 ${homeFavIds.includes(property.id) ? "fill-white" : ""}`} />
                      </button>
                    </PropertyImageGallery>

                    {/* Content */}
                    <div className="p-4">
                      {/* Price */}
                      <div className="flex items-baseline gap-1.5 mb-1.5">
                        <p className="text-gray-900 font-extrabold text-xl leading-none">{priceStr}</p>
                        <span className="text-muted-foreground text-xs font-medium">ج.م</span>
                      </div>

                      <h3 className="font-bold text-gray-900 text-sm leading-snug mb-2 line-clamp-1">
                        {property.title}
                      </h3>

                      <div className="flex items-center gap-1 text-muted-foreground text-xs mb-3">
                        <MapPin className="w-3 h-3 text-primary shrink-0" />
                        <span className="truncate">{location}</span>
                      </div>

                      {/* Specs pills — always show beds */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-3">
                        <span className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-medium">
                          <BedDouble className="w-3 h-3 text-slate-400" />
                          {(property as any).rooms ? `${(property as any).rooms} غرفة` : "—"}
                        </span>
                        {(property.bathrooms ?? 0) > 0 && (
                          <span className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-medium">
                            <Bath className="w-3 h-3 text-slate-400" />
                            {property.bathrooms} حمام
                          </span>
                        )}
                        {(property.area ?? 0) > 0 && (
                          <span className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-medium">
                            <Maximize2 className="w-3 h-3 text-slate-400" />
                            {Number(property.area).toLocaleString("ar-EG")} م²
                          </span>
                        )}
                      </div>

                      <div className="border-t border-border/60 my-3" />

                      {/* Date + Views row */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {timeAgo((property as any).createdAt) || "—"}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-bold text-slate-900">
                          <Eye className="w-3.5 h-3.5 text-slate-700" />
                          {((property.viewCount ?? 0) as number).toLocaleString("ar-EG")} مشاهدة
                        </span>
                      </div>

                      {/* Agent + compare in one row */}
                      {(() => {
                        const agentName = (property as any).agentName as string | undefined;
                        const agentAvatar = (property as any).agentAvatar as string | undefined;
                        const agentLogo = (property as any).agentLogo as string | undefined;
                        const avatar = agentAvatar || agentLogo;
                        return (
                          <div className="flex items-center gap-2">
                            {(agentName || avatar) && (
                              <>
                                {avatar ? (
                                  <img
                                    src={avatar}
                                    alt={agentName}
                                    className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                                    onError={e => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(agentName ?? "م")}&background=0d9488&color=fff&size=28`; }}
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-xs">
                                    {agentName?.charAt(0) ?? "م"}
                                  </div>
                                )}
                                <span className="text-xs text-slate-600 font-medium truncate flex-1">{agentName}</span>
                              </>
                            )}
                            {!agentName && !avatar && <span className="flex-1" />}
                            <button
                              className={`flex items-center justify-center w-8 h-8 rounded-xl border transition-all shrink-0 ${isInCompare(property.id) ? "bg-primary text-white border-primary" : "border-slate-200 text-slate-500 hover:border-primary/40 hover:text-primary"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                const imgs2: string[] = (() => { try { return JSON.parse(property.images ?? "[]"); } catch { return []; } })();
                                const r = addToCompare({ id: property.id, title: property.title, price: property.price?.toString() ?? "", priceNum: Number(property.price), image: imgs2[0] ?? "", location: [property.district, property.city].filter(Boolean).join("، ") || "بنها", beds: (property as any).rooms ?? 0, baths: property.bathrooms ?? 0, area: property.area ?? 0, type: property.listingType ?? "", kind: property.propertyType ?? "", year: property.yearBuilt ?? 0, finishing: "" });
                                if (r === "added") toast.success("أُضيف للمقارنة ✓");
                                else if (r === "already") toast("موجود بالفعل في المقارنة");
                                else toast.error("المقارنة ممتلئة (٤ عقارات)");
                              }}
                              title="قارن"
                            >
                              <GitCompare className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </motion.div>
                );
              })}
            </div>
            )}

            {/* Show all button */}
            <div className="mt-10 flex justify-center">
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-10 border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => setLocation("/properties")}
              >
                عرض جميع العقارات
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            </div>
          </div>
        </section>

        {/* ── FEATURED AREAS ── */}
        {featuredAreas.length > 0 && (
          <section className="py-14 bg-gradient-to-b from-white to-gray-50/60">
            <div className="container mx-auto px-4">
              {/* Section header */}
              <div className="flex items-end justify-between mb-8">
                <div>
                  <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-semibold mb-3">
                    <MapPin className="w-3.5 h-3.5" />
                    تصفح بالمنطقة
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-[#0a0a0a] leading-tight">
                    أهم المناطق
                  </h2>
                  <p className="text-gray-500 text-sm mt-1.5">اختر منطقتك وتصفح العقارات المتاحة</p>
                </div>
                <button
                  onClick={() => setLocation("/properties")}
                  className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  عرض الكل
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Horizontal scroll strip */}
              <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">
                {featuredAreas.map((area) => (
                  <motion.button
                    key={area.id}
                    onClick={() => setLocation(`/properties?district=${encodeURIComponent(area.nameAr)}`)}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                    className="group relative shrink-0 w-44 sm:w-52 md:w-60 h-60 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow snap-start cursor-pointer"
                  >
                    {/* Background image */}
                    {area.image ? (
                      <img
                        src={area.image}
                        alt={area.nameAr}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-teal-200" />
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    {/* Property count badge top-right */}
                    <div className="absolute top-3 right-3">
                      <span className="bg-white/90 backdrop-blur-sm text-primary text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                        {area.propertyCount > 0 ? `${area.propertyCount} عقار` : "عقارات"}
                      </span>
                    </div>

                    {/* Bottom text */}
                    <div className="absolute bottom-0 right-0 left-0 p-4 text-right">
                      <p className="text-white font-bold text-lg leading-tight drop-shadow-md">
                        {area.nameAr}
                      </p>
                      {area.cityName && (
                        <p className="text-white/70 text-xs mt-0.5 flex items-center gap-1 justify-end">
                          <MapPin className="w-3 h-3" />
                          {area.cityName}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-white/60 flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        عرض العقارات
                        <ArrowLeft className="w-3 h-3" />
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Mobile show all */}
              <div className="mt-5 flex justify-center sm:hidden">
                <button
                  onClick={() => setLocation("/properties")}
                  className="text-sm font-semibold text-primary flex items-center gap-1.5"
                >
                  عرض جميع العقارات
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── SPOTLIGHT PROPERTY ── */}
        {spotlightEnabled && spotlightProperty && (() => {
          const sp = spotlightProperty as any;
          const imgs: string[] = (() => { try { return JSON.parse(sp.images ?? "[]"); } catch { return []; } })();
          const thumb = imgs[0] ?? DEFAULT_IMG;
          const priceNum = Number(sp.price);
          const priceStr = priceNum ? priceNum.toLocaleString("ar-EG") : "";
          const location = [sp.district, sp.city].filter(Boolean).join("، ") || "بنها";
          const beds = Number(sp.bedrooms ?? 0);
          const baths = Number(sp.bathrooms ?? 0);
          const area = Number(sp.area ?? 0);
          const targetLink = spotlightCustomLink || `/property/${sp.id}`;

          return (
            <section className="relative overflow-hidden py-0" style={{ background: "linear-gradient(145deg, #0c1121 0%, #1a1040 40%, #0c1121 100%)" }}>
              {/* Decorative background orbs */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-80px] right-[-80px] w-[360px] h-[360px] rounded-full bg-primary/10 blur-[100px]" />
                <div className="absolute bottom-[-60px] left-[-60px] w-[280px] h-[280px] rounded-full bg-amber-500/10 blur-[80px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] rounded-full bg-primary/5 blur-[120px]" />
              </div>

              <div className="container mx-auto px-4 py-16 relative z-10">
                {/* Section label */}
                <motion.div
                  initial={{ opacity: 0, y: -12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="flex justify-center mb-10"
                >
                  <div className="inline-flex items-center gap-2.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-full px-5 py-2 text-sm font-extrabold backdrop-blur-sm">
                    <Sparkles className="w-4 h-4 fill-amber-400" />
                    {spotlightBadge}
                    <Sparkles className="w-4 h-4 fill-amber-400" />
                  </div>
                </motion.div>

                {/* Main card */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="max-w-5xl mx-auto"
                >
                  <div
                    className="group relative bg-white/[0.04] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md shadow-[0_0_100px_rgba(0,0,0,0.5)] cursor-pointer flex flex-col md:flex-row"
                    onClick={() => setLocation(targetLink)}
                  >
                    {/* ── Image side ── */}
                    <div className="relative md:w-[45%] h-64 md:h-auto overflow-hidden shrink-0">
                      <img
                        src={thumb}
                        alt={sp.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={e => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }}
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30 hidden md:block" />

                      {/* Badges on image */}
                      <div className="absolute top-4 right-4 flex flex-col gap-2">
                        {sp.listingType && (
                          <span className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                            {sp.listingType}
                          </span>
                        )}
                        {sp.mainCategory && (
                          <span className="bg-white/90 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full shadow">
                            {sp.mainCategory}
                          </span>
                        )}
                      </div>

                      {/* Bottom image text (mobile) */}
                      <div className="md:hidden absolute bottom-0 inset-x-0 p-4">
                        <h2 className="text-xl font-extrabold text-white leading-snug drop-shadow-lg">{sp.title}</h2>
                      </div>
                    </div>

                    {/* ── Content side ── */}
                    <div className="flex-1 flex flex-col justify-center p-8 md:p-10" dir="rtl">
                      {/* Gold accent label */}
                      <div className="flex items-center gap-2 mb-4">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-amber-400 text-xs font-extrabold tracking-widest uppercase">{spotlightBadge}</span>
                      </div>

                      {/* Title (desktop) */}
                      <h2 className="hidden md:block text-2xl md:text-3xl font-extrabold text-white leading-snug mb-4">
                        {sp.title}
                      </h2>

                      {/* Feature pills */}
                      {(beds > 0 || baths > 0 || area > 0) && (
                        <div className="flex flex-wrap gap-3 mb-5">
                          {beds > 0 && (
                            <div className="flex items-center gap-1.5 bg-white/10 border border-white/10 text-white/90 text-sm px-3 py-1.5 rounded-full">
                              <BedDouble className="w-3.5 h-3.5 text-primary" />
                              {beds} غرف
                            </div>
                          )}
                          {baths > 0 && (
                            <div className="flex items-center gap-1.5 bg-white/10 border border-white/10 text-white/90 text-sm px-3 py-1.5 rounded-full">
                              <Bath className="w-3.5 h-3.5 text-primary" />
                              {baths} حمام
                            </div>
                          )}
                          {area > 0 && (
                            <div className="flex items-center gap-1.5 bg-white/10 border border-white/10 text-white/90 text-sm px-3 py-1.5 rounded-full">
                              <Maximize2 className="w-3.5 h-3.5 text-primary" />
                              {area} م²
                            </div>
                          )}
                        </div>
                      )}

                      {/* Location */}
                      <div className="flex items-center gap-1.5 text-white/60 text-sm mb-5">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        {location}
                      </div>

                      {/* Price */}
                      {priceStr && (
                        <div className="mb-7">
                          <div className="text-4xl md:text-5xl font-black text-white leading-none">
                            {priceStr}
                          </div>
                          <div className="text-white/40 text-sm mt-1.5">جنيه مصري</div>
                        </div>
                      )}

                      {/* CTA */}
                      <div>
                        <Button
                          size="lg"
                          className="rounded-xl px-8 font-bold gap-2 shadow-xl shadow-primary/30 group-hover:shadow-primary/50 transition-shadow"
                          onClick={e => { e.stopPropagation(); setLocation(targetLink); }}
                        >
                          {spotlightCtaText}
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>
          );
        })()}

        {/* ── COMMERCIAL & LANDS ── */}
        {(() => {
          const commercial = homePropsRaw.filter(p => p.mainCategory === "تجاري");
          const lands = homePropsRaw.filter(p => p.mainCategory === "أراضي");
          if (commercial.length === 0 && lands.length === 0) return null;

          const MiniCard = ({ property }: { property: any }) => {
            const imgs: string[] = (() => { try { return JSON.parse(property.images ?? "[]"); } catch { return []; } })();
            const thumb = imgs[0] ?? DEFAULT_IMG;
            const location = [property.district, property.city].filter(Boolean).join("، ") || "بنها";
            const priceNum = Number(property.price);
            const priceStr = priceNum ? priceNum.toLocaleString("ar-EG") : "غير محدد";
            const listType = property.listingType ?? "";
            return (
              <div
                className="group shrink-0 w-64 bg-white border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setLocation(`/property/${property.id}`)}
              >
                <div className="relative h-40 overflow-hidden">
                  <img src={thumb} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={e => { e.currentTarget.src = DEFAULT_IMG; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  {listType && (
                    <span className={`absolute top-2 right-2 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${listType === "للبيع" ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"}`}>{listType}</span>
                  )}
                  {(property.area ?? 0) > 0 && (
                    <span className="absolute bottom-2 left-2 text-[11px] font-semibold bg-black/40 backdrop-blur-sm text-white px-2 py-0.5 rounded-full">{property.area} م²</span>
                  )}
                </div>
                <div className="p-3.5">
                  <p className="text-gray-900 font-extrabold text-base leading-none">{priceStr} <span className="text-[11px] text-muted-foreground font-normal">ج.م</span></p>
                  <h3 className="font-semibold text-gray-900 text-sm mt-1 mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">{property.title}</h3>
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <MapPin className="w-3 h-3 text-primary shrink-0" />
                    <span className="truncate">{location}</span>
                  </div>
                </div>
              </div>
            );
          };

          return (
            <section className="py-14 bg-white border-y border-border/50">
              <div className="container mx-auto px-4 space-y-12">
                {commercial.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
                          <Store className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-extrabold text-gray-900">محلات ومكاتب تجارية</h2>
                          <p className="text-xs text-muted-foreground">{commercial.length} عقار تجاري متاح</p>
                        </div>
                      </div>
                      <button onClick={() => setLocation("/properties?category=تجاري")} className="text-xs font-semibold text-primary flex items-center gap-1 hover:gap-2 transition-all">
                        عرض الكل <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                      {commercial.map(p => <MiniCard key={p.id} property={p} />)}
                    </div>
                  </div>
                )}
                {lands.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                          <Trees className="w-4 h-4 text-amber-700" />
                        </div>
                        <div>
                          <h2 className="text-lg font-extrabold text-gray-900">أراضي للبيع</h2>
                          <p className="text-xs text-muted-foreground">{lands.length} قطعة أرض متاحة</p>
                        </div>
                      </div>
                      <button onClick={() => setLocation("/properties?category=أراضي")} className="text-xs font-semibold text-primary flex items-center gap-1 hover:gap-2 transition-all">
                        عرض الكل <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                      {lands.map(p => <MiniCard key={p.id} property={p} />)}
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        })()}

        {/* ── AD: homepage mid ── */}
        <div className="container mx-auto px-4 py-2">
          <AdBanner position="homepage_mid" />
        </div>

        {/* ── AI: TRENDING PROPERTIES ── */}
        <TrendingSection />

        {/* ── AI: RECENTLY VIEWED ── */}
        <RecentlyViewedSection />

        {/* ── HOW IT WORKS ── */}
        <section className="py-24 bg-secondary/30">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">كيف يعمل "{siteName}"؟</h2>
            <p className="text-muted-foreground text-lg mb-16 max-w-2xl mx-auto">خطوات بسيطة تفصلك عن الحصول على أفضل الخدمات أو البدء في تقديم خدماتك.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-border/50 border-t border-dashed border-border z-0"></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 rounded-3xl bg-card border border-border shadow-lg flex items-center justify-center mb-6 text-3xl font-black text-primary">1</div>
                <h3 className="text-xl font-bold mb-3">ابحث عن الخدمة</h3>
                <p className="text-muted-foreground leading-relaxed px-4">تصفح التصنيفات أو استخدم محرك البحث للعثور على الخدمة التي تحتاجها في منطقتك.</p>
              </div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 rounded-3xl bg-card border border-border shadow-lg flex items-center justify-center mb-6 text-3xl font-black text-primary">2</div>
                <h3 className="text-xl font-bold mb-3">تواصل واحجز</h3>
                <p className="text-muted-foreground leading-relaxed px-4">تواصل مع مقدم الخدمة مباشرة، اتفق على التفاصيل، وقم بتأكيد طلبك بكل سهولة.</p>
              </div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 rounded-3xl bg-primary shadow-xl shadow-primary/20 flex items-center justify-center mb-6 text-3xl font-black text-primary-foreground">3</div>
                <h3 className="text-xl font-bold mb-3">استلم وتمتع</h3>
                <p className="text-muted-foreground leading-relaxed px-4">احصل على العقار المناسب وابدأ رحلتك الجديدة بكل راحة وثقة.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">{ctaText}</h2>
            <p className="text-primary-foreground/80 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
              سجّل نشاطك التجاري أو خدماتك اليوم، وابدأ في الوصول إلى آلاف العملاء في منطقتك.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-xl shadow-black/20 rounded-full px-10 h-14 text-lg font-bold transition-transform hover:scale-105" onClick={() => setLocation("/provider/register")}>
                {ctaButtonText}
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-full px-10 h-14 text-lg font-bold" onClick={() => setLocation("/search")}>
                تصفح الخدمات
              </Button>
            </div>
          </div>
        </section>

        {/* ── AD: before footer ── */}
        <div className="container mx-auto px-4 py-4">
          <AdBanner position="homepage_before_footer" />
        </div>

        {/* ── FOOTER ── */}
        <footer className="bg-slate-900 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
              <div className="md:col-span-2">
                <h3 className="text-2xl font-extrabold text-white mb-3">{siteName}</h3>
                <p className="text-slate-400 leading-relaxed max-w-sm">الوجهة الأولى لبيع وشراء وإيجار العقارات في بنها والقليوبية مع خدمات التشطيبات والديكور.</p>
                <div className="flex gap-3 mt-5">
                  {["twitter", "instagram", "whatsapp"].map(s => (
                    <div key={s} className="w-10 h-10 rounded-full bg-white/10 hover:bg-primary/80 flex items-center justify-center cursor-pointer transition-colors">
                      <span className="text-xs font-bold">{s[0].toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">روابط سريعة</h4>
                <ul className="space-y-2 text-slate-400 text-sm">
                  {[["الرئيسية", "/"], ["التصنيفات", "/categories"], ["من نحن", "/about"], ["تواصل معنا", "/contact"]].map(([label, href]) => (
                    <li key={href}><Link href={href} className="hover:text-white transition-colors">{label}</Link></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">تواصل معنا</h4>
                <ul className="space-y-2 text-slate-400 text-sm">
                  <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" />info@aqarat-banha.com</li>
                  <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" />920XXXXXX</li>
                  <li className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />القاهرة، جمهورية مصر العربية</li>
                </ul>
              </div>
            </div>
            <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-sm">
              <p>© 2026 {siteName}. جميع الحقوق محفوظة.</p>
              <div className="flex gap-6">
                {["سياسة الخصوصية", "شروط الاستخدام", "الأسئلة الشائعة"].map(item => (
                  <a key={item} href="#" className="hover:text-white transition-colors">{item}</a>
                ))}
              </div>
            </div>
            <div className="border-t border-white/5 mt-6 pt-6 text-center text-slate-600 text-xs">
              تصميم وبرمجة <span className="text-teal-500 font-semibold">سمارت يلانز للنظم المتطورة</span> 2026
            </div>
          </div>
        </footer>
      {/* ── Floating Compare Bar ── */}
      <AnimatePresence>
        {compareItems.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border shadow-2xl"
          >
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
              <div className="flex items-center gap-2 flex-1 overflow-x-auto">
                <Scale className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-bold text-gray-900 shrink-0">مقارنة ({compareItems.length}/4)</span>
                <div className="flex items-center gap-2 mr-2">
                  {compareItems.map(item => (
                    <div key={item.id} className="flex items-center gap-1.5 bg-primary/10 rounded-xl px-3 py-1.5 shrink-0">
                      <img src={item.image} alt="" className="w-7 h-7 rounded-lg object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
                      <span className="text-xs font-semibold text-gray-800 max-w-[100px] truncate">{item.title}</span>
                      <button onClick={() => removeFromCompare(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <XIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setLocation("/compare")} disabled={compareItems.length < 2} className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 disabled:opacity-40 transition-all">
                  قارن الآن
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      </main>
    </div>
  );
}
