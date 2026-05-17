import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: 'Week 1', rev: 4000, conv: 2.4 },
  { name: 'Week 2', rev: 3000, conv: 1.3 },
  { name: 'Week 3', rev: 5500, conv: 3.8 },
  { name: 'Week 4', rev: 4500, conv: 3.1 },
];

export default function AdminReports() {
  return (
    <AdminLayout title="Reports & Analytics">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Revenue (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <Tooltip />
                  <Line type="monotone" dataKey="rev" stroke="#0d9488" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Conversion Rate (Search to Booking)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <Tooltip />
                  <Line type="monotone" dataKey="conv" stroke="#8b5cf6" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Top 5 Providers (By Earnings)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Ahmed Abdullah", earn: "12,450 SAR", cat: "Food" },
                { name: "Sara Khalid", earn: "9,820 SAR", cat: "Beauty" },
                { name: "Fatima Al-Saud", earn: "8,100 SAR", cat: "Maintenance" },
                { name: "Mohammed Ali", earn: "7,540 SAR", cat: "Events" },
                { name: "Omar Fahad", earn: "5,300 SAR", cat: "Handmade" },
              ].map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">{i+1}</div>
                    <div>
                      <p className="font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.cat}</p>
                    </div>
                  </div>
                  <span className="font-bold text-teal-600">{p.earn}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Top Categories (By Listings)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Food & Hospitality", count: 184, percent: "35%" },
                { name: "Home Maintenance", count: 115, percent: "22%" },
                { name: "Events & Occasions", count: 95, percent: "18%" },
                { name: "Beauty & Care", count: 78, percent: "15%" },
                { name: "Handmade Products", count: 36, percent: "7%" },
              ].map((c, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{c.name}</span>
                    <span className="text-slate-500">{c.count} listings</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: c.percent }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}