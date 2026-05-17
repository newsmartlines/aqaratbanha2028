import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { api, type Provider, type Category, type Subcategory, type SiteSettings, type Region, type FavoriteItem } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

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

export default function Home() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  /** null = كل المناطق */
  const [heroRegionId, setHeroRegionId] = useState<number | null>(null);
  /** null = كل المدن ضمن نطاق المنطقة */
  const [heroCityName, setHeroCityName] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedCat, setExpandedCat] = useState<number | null>(null);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showNearMeMap, setShowNearMeMap] = useState(false);
  const [, setLocation] = useLocation();
  const nearMeRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: categories } = useApi(() => api.categories.list(), []);
  const { data: allSubs } = useApi(() => api.subcategories.list(), []);
  const { data: providers, loading: providersLoading } = useApi(() => api.providers.list(), []);
  const { data: settings } = useApi(() => api.settings.list(), []);

  const { data: regions = [] } = useQuery<Region[]>({
    queryKey: ["regions"],
    queryFn: () => api.regions.list(),
  });

  const { data: platformStats } = useQuery<{ providers: number; users: number; services: number; requests: number }>({
    queryKey: ["platform-stats"],
    queryFn: () => api.stats.platform(),
    staleTime: 5 * 60 * 1000,
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

  const siteName = (settings as SiteSettings | undefined)?.siteName ?? "سمارت لاينز للنظم المتطورة";
  const ctaText = (settings as SiteSettings | undefined)?.ctaText ?? "ندعم المشاريع المنزلية ونضمن حقوقك";
  const ctaButtonText = (settings as SiteSettings | undefined)?.ctaButtonText ?? "انضم إلينا الآن";
  const heroImage = (settings as SiteSettings | undefined)?.heroImage ?? "";
  const heroTitle = (settings as SiteSettings | undefined)?.heroTitle ?? "";
  const heroSubtitle = (settings as SiteSettings | undefined)?.heroSubtitle ?? "";

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
    if (heroRegionId != null) params.set("regionId", String(heroRegionId));
    if (heroCityName) params.set("city", heroCityName);
    if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory);
    setLocation(`/search?${params.toString()}`);
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
        <section className="relative pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden border-b">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-l from-background/95 via-background/80 to-background/40 z-10" />
            <img
              src={heroImage || "/images/hero.jpg"}
              alt="Hero Background"
              className="w-full h-full object-cover object-center"
              onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=2000&q=80"; }}
            />
          </div>

          <div className="container relative z-10 mx-auto px-4">
            <div className="max-w-3xl">
              <Badge variant="secondary" className="mb-6 bg-secondary text-primary px-4 py-1.5 rounded-full text-sm font-medium border border-primary/10">
                المنصة الأولى للخدمات المنزلية والمحلية
              </Badge>
              <h1 className="text-5xl md:text-7xl font-extrabold text-foreground leading-[1.15] mb-6 tracking-tight">
                {heroTitle || (
                  <>اكتشف أفضل <span className="text-primary relative inline-block">الخدمات<div className="absolute -bottom-1 left-0 right-0 h-3 bg-accent/20 -z-10 rounded-full"></div></span><br />من أيدي محلية موثوقة</>
                )}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl leading-relaxed">
                {heroSubtitle || `سواء كنت تبحث عن طعام بيتي لذيذ، أو حرف يدوية متقنة، أو خدمات صيانة موثوقة، "${siteName}" يربطك بأفضل مقدمي الخدمات في منطقتك بسرعة وأمان.`}
              </p>

              {/* Advanced Search Box */}
              <motion.div
                layout
                className="bg-card p-3 rounded-2xl shadow-xl border border-border/60 max-w-4xl transition-shadow hover:shadow-2xl duration-500"
              >
                <div className="flex flex-col md:flex-row gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="عن ماذا تبحث؟ (مثال: كيك، صيانة مكيفات)"
                      className="pr-12 h-14 bg-transparent border-none text-base focus-visible:ring-0 shadow-none placeholder:text-muted-foreground/70"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                  <div className="w-px bg-border hidden md:block my-2" />
                  <div className="md:w-44 relative">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="h-14 bg-transparent border-none focus:ring-0 shadow-none px-4 font-medium text-foreground">
                        <Grid className="w-4 h-4 ml-2 text-primary" />
                        <SelectValue placeholder="التصنيف" />
                      </SelectTrigger>
                      <SelectContent side="bottom" align="start" sideOffset={6}>
                        <SelectItem value="all">كل التصنيفات</SelectItem>
                        {(categories as Category[] | undefined)?.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.nameAr}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-px bg-border hidden md:block my-2" />
                  <div className="md:w-40 relative">
                    <Select
                      value={heroRegionId != null ? String(heroRegionId) : "__all_regions__"}
                      onValueChange={(v) => {
                        if (v === "__all_regions__") setHeroRegionId(null);
                        else setHeroRegionId(parseInt(v, 10));
                      }}
                    >
                      <SelectTrigger className="h-14 bg-transparent border-none focus:ring-0 shadow-none px-4 font-medium text-foreground">
                        <MapPin className="w-4 h-4 ml-2 text-primary" />
                        <SelectValue placeholder="المنطقة" />
                      </SelectTrigger>
                      <SelectContent side="bottom" align="start" sideOffset={6}>
                        <SelectItem value="__all_regions__">كل المناطق</SelectItem>
                        {regions.map(r => (
                          <SelectItem key={r.id} value={String(r.id)}>{r.nameAr}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={heroRegionId ?? "all"}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.2 }}
                      className="md:w-40 relative w-full"
                    >
                      <Select
                        value={heroCityName ?? "__all__"}
                        onValueChange={(v) => setHeroCityName(v === "__all__" ? null : v)}
                      >
                        <SelectTrigger className="h-14 bg-transparent border-none focus:ring-0 shadow-none px-4 font-medium text-foreground">
                          <MapPin className="w-4 h-4 ml-2 text-teal-600" />
                          <SelectValue placeholder="المدينة" />
                        </SelectTrigger>
                        <SelectContent side="bottom" align="start" sideOffset={6}>
                          {heroCityOptions.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  </AnimatePresence>
                  <Button onClick={handleSearch} className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-lg rounded-xl font-bold shadow-md transition-all hover:scale-[1.02]">
                    ابحث الآن
                  </Button>
                </div>
                <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-3 px-1">
                  <Button
                    variant="ghost" size="sm"
                    onClick={handleNearMe}
                    disabled={nearMeLoading}
                    className="text-primary hover:bg-primary/10 gap-2 rounded-full"
                  >
                    {nearMeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                    الأقرب لي
                  </Button>
                  <span className="text-xs text-muted-foreground">اكتشف مقدمي الخدمات الأقرب إلى موقعك</span>
                </div>
              </motion.div>

              {/* ── Platform Statistics ── */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: Briefcase,     label: "مزود خدمة",    value: platformStats?.providers },
                  { icon: ShoppingBag,   label: "خدمة نشطة",    value: platformStats?.services  },
                  { icon: Users,         label: "عميل مسجّل",   value: platformStats?.users     },
                  { icon: ClipboardList, label: "طلب مُنجز",    value: platformStats?.requests  },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-background/70 backdrop-blur-sm text-foreground transition-all hover:shadow-sm"
                    >
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-black leading-none">
                          {stat.value !== undefined
                            ? stat.value.toLocaleString("ar-EG")
                            : <span className="text-sm animate-pulse">...</span>}
                          {stat.value !== undefined && <span className="text-xs font-semibold mr-0.5">+</span>}
                        </p>
                        <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate">{stat.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── BROWSE BY CATEGORY — Horizontal pills with inline subcategories ── */}
        <section className="py-10 bg-background border-b">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">تصفح حسب التصنيف</h2>
                <p className="text-sm text-muted-foreground mt-0.5">اختر تصنيفاً لعرض الفئات الفرعية</p>
              </div>
              <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/5 rounded-full gap-1" onClick={() => setLocation("/categories")}>
                عرض الكل
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>

            {/* Horizontal category strip */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
              {(categories as Category[] | undefined)?.map((cat, i) => {
                const Icon = ICON_MAP[cat.icon ?? "Grid"] ?? Grid;
                const isActive = expandedCat === cat.id;
                const colorClass = isActive ? ACTIVE_COLOR_MAP[i % ACTIVE_COLOR_MAP.length] : COLOR_MAP[i % COLOR_MAP.length];
                return (
                  <button
                    key={cat.id}
                    onClick={() => setExpandedCat(isActive ? null : cat.id)}
                    className={`flex flex-col items-center gap-2 px-5 py-3 rounded-2xl border shrink-0 transition-all duration-200 ${isActive ? "border-primary/50 shadow-md scale-[1.03]" : "border-border/40 hover:border-primary/30 hover:shadow-sm bg-card"} ${isActive ? colorClass : ""}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? "bg-white/20" : colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold whitespace-nowrap">{cat.nameAr}</span>
                    {getSubs(cat.id).length > 0 && (
                      <span className={`text-[10px] ${isActive ? "text-white/70" : "text-muted-foreground"}`}>
                        {getSubs(cat.id).length} فرعي
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Inline subcategories panel */}
            {expandedCat && expandedCatObj && (
              <div className="mt-4 p-4 rounded-2xl bg-secondary/30 border border-border/30 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-2 mb-3">
                  {(() => {
                    const Icon = ICON_MAP[expandedCatObj.icon ?? "Grid"] ?? Grid;
                    return <Icon className="w-4 h-4 text-primary" />;
                  })()}
                  <span className="text-sm font-bold text-foreground">{expandedCatObj.nameAr}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">التصنيفات الفرعية</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${ACTIVE_COLOR_MAP[expandedCatIndex % ACTIVE_COLOR_MAP.length]} shadow-sm`}
                    onClick={() => setLocation(`/search?category=${expandedCat}`)}
                  >
                    <Grid className="w-3 h-3" />
                    عرض الكل
                  </button>
                  {getSubs(expandedCat).map(sub => {
                    const SubIcon = ICON_MAP[sub.icon ?? "Grid"] ?? Grid;
                    return (
                      <button
                        key={sub.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 text-xs font-medium bg-background hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all"
                        onClick={() => setLocation(`/search?category=${expandedCat}&subcategory=${sub.id}`)}
                      >
                        <SubIcon className="w-3 h-3 text-muted-foreground" />
                        {sub.nameAr}
                      </button>
                    );
                  })}
                  {getSubs(expandedCat).length === 0 && (
                    <p className="text-xs text-muted-foreground">لا توجد تصنيفات فرعية</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── NEAR ME SECTION ── */}
        <section ref={nearMeRef} className="py-16 bg-gradient-to-b from-teal-50/60 via-background to-background border-b">
          <div className="container mx-auto px-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">الأقرب إليك</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {userLocation ? "يتم عرض مقدمي الخدمات الأقرب إلى موقعك" : "اكتشف مقدمي الخدمات القريبين من موقعك"}
                </p>
              </div>
              <Button
                onClick={handleDetectLocation}
                disabled={nearMeLoading}
                className="bg-primary text-white rounded-full gap-2 shadow-md shadow-primary/20"
              >
                {nearMeLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Navigation className="w-4 h-4" />}
                {userLocation ? "تحديث الموقع" : "حدد موقعي"}
              </Button>
            </div>

            {/* Map */}
            {showNearMeMap && userLocation && (
              <div className="h-64 md:h-80 rounded-2xl overflow-hidden mb-6 border border-border/50 shadow-md">
                <MapContainer
                  key={`${userLocation.lat}-${userLocation.lng}`}
                  center={[userLocation.lat, userLocation.lng]}
                  zoom={11}
                  className="h-full w-full"
                  zoomControl={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
                    <Popup>موقعك الحالي</Popup>
                  </Marker>
                  {(providers as Provider[] | undefined)?.map(p => {
                    const coords = getProviderCoords(p);
                    if (!coords) return null;
                    return (
                      <Marker key={p.id} position={coords}>
                        <Popup>
                          <div className="text-right min-w-[140px]">
                            <p className="font-bold text-sm">{p.userName}</p>
                            <p className="text-xs text-gray-500">{p.city ?? ""}</p>
                            <p className="text-xs text-gray-400">{p.categoryNameAr ?? ""}</p>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            )}

            {!showNearMeMap && (
              <div className="h-52 rounded-2xl border-2 border-dashed border-border/50 bg-secondary/20 flex flex-col items-center justify-center gap-3 mb-6 cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-all group" onClick={handleDetectLocation}>
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Map className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">انقر هنا للسماح بتحديد موقعك وعرض الخريطة</p>
              </div>
            )}

            {/* Nearby providers carousel */}
            {nearbyProviders.length > 0 ? (
              <div className="flex overflow-x-auto gap-4 -mx-4 px-4 pb-2" style={{ scrollbarWidth: "none" }}>
                {nearbyProviders.map((provider: any) => {
                  const phoneDigits = (provider.phone ?? "").replace(/\D/g, "");
                  const waDigits = ((provider.whatsapp ?? provider.phone ?? "") as string).replace(/\D/g, "");
                  return (
                  <div key={provider.id} className="min-w-[230px] shrink-0">
                    <Card
                      className="overflow-hidden group border-border/40 hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer h-full"
                      onClick={() => setLocation(`/provider/${provider.id}`)}
                    >
                      <div className="relative h-32 overflow-hidden bg-muted">
                        <img
                          src={provider.avatar ?? DEFAULT_IMG}
                          alt={provider.userName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { e.currentTarget.src = DEFAULT_IMG; }}
                        />
                        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                          {provider.featured && (
                            <Badge className="bg-accent text-accent-foreground border-none text-[10px] px-2 py-0.5">مميز</Badge>
                          )}
                          {provider.verified && (
                            <Badge className="bg-teal-500/95 text-white border-none text-[10px] px-2 py-0.5 gap-1">
                              <CheckCircle2 className="w-3 h-3" /> موثّق
                            </Badge>
                          )}
                        </div>
                        {userLocation && typeof provider.dist === "number" && provider.dist < 9999 && (
                          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />
                            {provider.dist < 1 ? "أقل من كم" : `${Math.round(provider.dist)} كم`}
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <h3 className="font-bold text-sm truncate mb-0.5">{provider.userName}</h3>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1">
                          <MapPin className="w-3 h-3" />
                          {provider.city ?? "مصر"}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-accent text-accent" />
                            <span className="text-xs font-bold">{parseFloat(provider.rating).toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {phoneDigits && (
                              <a
                                href={`tel:${phoneDigits}`}
                                onClick={(e) => e.stopPropagation()}
                                title="اتصال"
                                className="w-7 h-7 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {waDigits && (
                              <a
                                href={`https://wa.me/${waDigits}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="واتساب"
                                className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border/50 rounded-2xl bg-secondary/20">
                {providersLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                ) : userLocation ? (
                  <div className="flex flex-col items-center gap-2">
                    <MapPin className="w-6 h-6 text-muted-foreground/60" />
                    <p>لا يوجد مقدمو خدمات ضمن {NEARBY_RADIUS_KM} كم من موقعك.</p>
                    <p className="text-xs text-muted-foreground/80">جرّب تغيير التصنيف أو وسّع نطاق البحث.</p>
                  </div>
                ) : (
                  "لا توجد خدمات متاحة"
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── ALL PROVIDERS ── */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8">استكشف الخدمات</h2>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
              <Tabs defaultValue="all" className="w-full md:w-auto" onValueChange={setActiveTab}>
                <TabsList className="bg-secondary/50 p-1 w-full justify-start overflow-x-auto">
                  <TabsTrigger value="all" className="rounded-full px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">الكل</TabsTrigger>
                  <TabsTrigger value="food" className="rounded-full px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">طعام</TabsTrigger>
                  <TabsTrigger value="design" className="rounded-full px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">تصميم</TabsTrigger>
                  <TabsTrigger value="maintenance" className="rounded-full px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">صيانة</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <Button variant="outline" className="rounded-full flex-1 md:flex-none border-border/60" onClick={() => setLocation("/search")}>
                  <Filter className="w-4 h-4 ml-2" />
                  تصفية
                </Button>
              </div>
            </div>

            {providersLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProviders.slice(0, 8).map((provider: Provider) => {
                  const isFav = favoriteIds.has(provider.id);
                  const cardBanner = provider.banner ?? provider.avatar ?? DEFAULT_IMG;
                  const phoneDigits = (provider.phone ?? "").replace(/\D/g, "");
                  const waDigits = ((provider.whatsapp ?? provider.phone ?? "") as string).replace(/\D/g, "");
                  return (
                    <Card key={provider.id} className="overflow-hidden group border-border/50 hover:shadow-xl hover:border-primary/20 transition-all duration-300 cursor-pointer" onClick={() => setLocation(`/provider/${provider.id}`)}>
                      {/* Banner image */}
                      <div className="relative h-36 overflow-hidden bg-muted">
                        <img
                          src={cardBanner}
                          alt={provider.userName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          onError={(e) => { e.currentTarget.src = DEFAULT_IMG; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <div className="absolute top-2 right-2 flex flex-wrap gap-1.5 max-w-[70%] justify-end">
                          <Badge className="bg-background/90 text-foreground backdrop-blur-sm border-none text-[10px] px-2 py-0.5">
                            {provider.categoryNameAr ?? "خدمات"}
                          </Badge>
                          {provider.featured && (
                            <Badge className="bg-accent text-accent-foreground border-none text-[10px] px-2 py-0.5">مميز</Badge>
                          )}
                          {provider.verified && (
                            <Badge className="bg-teal-500/95 text-white border-none text-[10px] px-2 py-0.5 gap-1">
                              <CheckCircle2 className="w-3 h-3" /> موثّق
                            </Badge>
                          )}
                        </div>
                        {user && user.role === "user" && (
                          <button
                            className={`absolute top-2 left-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow transition-all hover:scale-110 ${isFav ? "text-rose-500" : "text-muted-foreground hover:text-rose-400"}`}
                            onClick={(e) => { e.stopPropagation(); toggleFavMutation.mutate(provider.id); }}
                            title={isFav ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-rose-500" : ""}`} />
                          </button>
                        )}
                      </div>

                      <CardContent className="p-4">
                        {/* Avatar + Name row */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary shrink-0 border-2 border-background shadow">
                            <img
                              src={provider.avatar ?? DEFAULT_IMG}
                              alt={provider.userName}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.src = DEFAULT_IMG; }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm leading-tight truncate">{provider.userName}</h3>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{provider.city ?? "مصر"}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0 bg-secondary/80 px-1.5 py-0.5 rounded text-xs">
                            <Star className="w-3 h-3 fill-accent text-accent" />
                            <span className="font-bold">{parseFloat(provider.rating).toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button className="flex-1 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors shadow-none rounded-xl text-xs h-8">
                            عرض التفاصيل
                          </Button>
                          {phoneDigits && (
                            <a
                              href={`tel:${phoneDigits}`}
                              onClick={(e) => e.stopPropagation()}
                              title="اتصال"
                              className="w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors shrink-0"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {waDigits && (
                            <a
                              href={`https://wa.me/${waDigits}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="واتساب"
                              className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors shrink-0"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <div className="mt-12 flex justify-center">
              <Button variant="outline" size="lg" className="rounded-full px-8 border-border hover:bg-secondary" onClick={() => setLocation("/search")}>
                عرض المزيد من الخدمات
                <ChevronDown className="w-4 h-4 mr-2" />
              </Button>
            </div>
          </div>
        </section>

        {/* ── REAL ESTATE LISTINGS ── */}
        <section className="py-20 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
          {/* Decorative background blobs */}
          <div className="absolute top-0 left-0 w-72 h-72 rounded-full bg-primary/5 blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-accent/5 blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

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
                onClick={() => setLocation("/search?category=real-estate")}
                className="hidden md:flex items-center gap-2 text-sm text-primary font-semibold border border-primary/30 rounded-full px-5 py-2.5 hover:bg-primary/10 transition-all group"
              >
                عرض الكل
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Stats strip */}
            <div className="flex gap-6 mb-10 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {[
                { icon: Building2, label: "عقار متاح", value: "+1,200" },
                { icon: TrendingUp, label: "صفقة هذا الشهر", value: "+340" },
                { icon: MapPin, label: "مدينة مغطاة", value: "18" },
                { icon: CheckCircle2, label: "عميل راضٍ", value: "+5K" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 bg-white border border-border shadow-sm rounded-2xl px-5 py-3 shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <s.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-bold text-lg leading-none">{s.value}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Property cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {PROPERTIES.map((property, idx) => (
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
                    {/* Image */}
                    <div className="relative h-52 overflow-hidden">
                      <img
                        src={property.img}
                        alt={property.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        onError={(e) => { e.currentTarget.src = DEFAULT_IMG; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                      {/* Top badges */}
                      <div className="absolute top-3 right-3 flex gap-2">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full shadow-lg ${property.type === "للبيع" ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"}`}>
                          {property.type}
                        </span>
                        {property.featured && (
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-400 text-amber-900 shadow-lg">
                            ⭐ مميز
                          </span>
                        )}
                      </div>

                      {/* Kind badge bottom left */}
                      <div className="absolute bottom-3 left-3">
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/25 backdrop-blur-md text-white border border-white/30">
                          {property.kind}
                        </span>
                      </div>

                      {/* Fav button */}
                      <button
                        className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-rose-500 hover:border-rose-400 transition-all"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Heart className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-primary font-extrabold text-xl leading-none">{property.price}</p>
                          <p className="text-muted-foreground text-xs mt-0.5">جنيه مصري</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-bold text-gray-700">4.8</span>
                        </div>
                      </div>

                      <h3 className="font-bold text-gray-900 text-base leading-snug mb-1.5 group-hover:text-primary transition-colors line-clamp-1">
                        {property.title}
                      </h3>

                      <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-4">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{property.location}</span>
                      </div>

                      <div className="border-t border-border mb-4" />

                      <div className="flex items-center gap-4 mb-4">
                        {property.beds > 0 && (
                          <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                            <BedDouble className="w-4 h-4 text-gray-400" />
                            <span>{property.beds} غرف</span>
                          </div>
                        )}
                        {property.baths > 0 && (
                          <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                            <Bath className="w-4 h-4 text-gray-400" />
                            <span>{property.baths} حمام</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                          <Maximize2 className="w-4 h-4 text-gray-400" />
                          <span>{property.area} م²</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={property.agentAvatar}
                            alt={property.agentName}
                            className="w-7 h-7 rounded-full object-cover border-2 border-primary/20"
                            onError={(e) => { e.currentTarget.src = DEFAULT_IMG; }}
                          />
                          <span className="text-muted-foreground text-xs">{property.agentName}</span>
                        </div>
                        <button
                          className="text-xs font-semibold text-primary border border-primary/30 rounded-full px-4 py-1.5 hover:bg-primary hover:text-white transition-all"
                          onClick={(e) => { e.stopPropagation(); setLocation(`/property/${property.id}`); }}
                        >
                          تفاصيل
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Mobile "show all" */}
            <div className="mt-10 flex justify-center md:hidden">
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-10 border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => setLocation("/search")}
              >
                عرض جميع العقارات
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            </div>
          </div>
        </section>

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
                <h3 className="text-xl font-bold mb-3">استلم وقيم</h3>
                <p className="text-muted-foreground leading-relaxed px-4">احصل على خدمتك، وشارك تجربتك من خلال تقييم مزود الخدمة لمساعدة الآخرين.</p>
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

        {/* ── FOOTER ── */}
        <footer className="bg-slate-900 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
              <div className="md:col-span-2">
                <h3 className="text-2xl font-extrabold text-white mb-3">{siteName}</h3>
                <p className="text-slate-400 leading-relaxed max-w-sm">المنصة الأولى للخدمات المنزلية والمحلية في جمهورية مصر العربية.</p>
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
                  <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" />info@dalilsmartlines.com</li>
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
      </main>
    </div>
  );
}
