import { useParams, useLocation } from "wouter";
import { Loader2, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import { PropertyFormFull } from "@/components/property-form/PropertyFormFull";
import { PROPERTY_GROUPS } from "@/components/property-form/constants";
import type { FormValues } from "@/components/property-form/types";

function getPropertyGroup(mainCategory: string): string {
  for (const g of PROPERTY_GROUPS) {
    if (g.subtypes.some((s) => s.value === mainCategory)) return g.value;
  }
  return "residential";
}

function parseArr(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

function mapPropertyToFormValues(prop: Record<string, any>): Partial<FormValues> {
  const mainCategory = prop.mainCategory ?? "";
  const images = Array.isArray(prop.images)
    ? prop.images
    : parseArr(prop.images as string);

  return {
    listingType:    prop.listingType    ?? "",
    propertyGroup:  getPropertyGroup(mainCategory),
    mainCategory,
    title:          prop.title          ?? "",
    description:    prop.description    ?? "",
    price:          prop.price          != null ? String(prop.price)          : "",
    area:           prop.area           != null ? String(prop.area)           : "",
    rooms:          prop.rooms          != null ? String(prop.rooms)          : "",
    bathrooms:      prop.bathrooms      != null ? String(prop.bathrooms)      : "",
    floor:          prop.floor          != null ? String(prop.floor)          : "",
    totalFloors:    prop.totalFloors    != null ? String(prop.totalFloors)    : "",
    buildYear:      prop.buildYear      != null ? String(prop.buildYear)      : "",
    finishing:      prop.finishing      ?? "",
    furnished:      prop.furnished      ?? "",
    condition:      prop.condition      ?? "",
    paymentMethod:  prop.paymentMethod  ?? "",
    advertiserType: prop.advertiserType ?? "",
    compound:       prop.compound       ?? "",
    facade:         prop.facade         ?? "",
    direction:      prop.direction      ?? "",
    city:           prop.district       ?? prop.city ?? "",
    district:       prop.district       ?? "",
    address:        prop.address        ?? "",
    street:         prop.street         ?? "",
    latitude:       prop.latitude       != null ? String(prop.latitude)       : "",
    longitude:      prop.longitude      != null ? String(prop.longitude)      : "",
    phone:          prop.phone          ?? "",
    videoUrl:       prop.videoUrl       ?? "",
    landType:       prop.landType       ?? "",
    landWidth:      prop.landWidth      != null ? String(prop.landWidth)      : "",
    landDepth:      prop.landDepth      != null ? String(prop.landDepth)      : "",
    buildRatio:     prop.buildRatio     != null ? String(prop.buildRatio)     : "",
    images,
    features:       parseArr(prop.features as string),
    nearbyServices: parseArr(prop.nearbyServices as string),
    contactMethod:  parseArr(prop.contactMethods as string).length
                      ? parseArr(prop.contactMethods as string)
                      : ["phone"],
  };
}

export default function EditPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data: propData, isLoading, isError } = useQuery({
    queryKey: ["property-edit", id],
    queryFn:  () => api.properties.get(parseInt(id!, 10)),
    enabled:  !!id,
  });

  const prop = ((propData as any)?.data ?? propData) as Record<string, any> | undefined;

  if (!user) return null;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !prop) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground mb-4">لم يتم العثور على الإعلان أو ليس لديك صلاحية تعديله.</p>
          <button
            onClick={() => navigate("/dashboard/properties")}
            className="inline-flex items-center gap-2 text-sm text-teal-700 hover:underline"
          >
            <ArrowRight className="w-4 h-4" />
            العودة إلى عقاراتي
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const initialData = mapPropertyToFormValues(prop);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 py-6" dir="rtl">
        <PropertyFormFull
          mode={prop.advertiserType === "company" ? "company" : "user"}
          backPath="/dashboard/properties"
          showPlans={false}
          editPropertyId={parseInt(id!, 10)}
          initialData={initialData}
        />
      </div>
    </DashboardLayout>
  );
}
