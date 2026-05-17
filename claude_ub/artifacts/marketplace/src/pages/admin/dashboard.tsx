import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Building2, List, CreditCard, Clock, Activity } from "lucide-react";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const revenueData = [
  { name: 'Jan', revenue: 4000 },
  { name: 'Feb', revenue: 5500 },
  { name: 'Mar', revenue: 4800 },
  { name: 'Apr', revenue: 7200 },
  { name: 'May', revenue: 6500 },
  { name: 'Jun', revenue: 8900 },
];

const providerData = [
  { name: 'Jan', providers: 12 },
  { name: 'Feb', providers: 18 },
  { name: 'Mar', providers: 15 },
  { name: 'Apr', providers: 24 },
  { name: 'May', providers: 22 },
  { name: 'Jun', providers: 30 },
];

const categoryData = [
  { name: 'Food', value: 35 },
  { name: 'Maintenance', value: 22 },
  { name: 'Events', value: 18 },
  { name: 'Beauty', value: 15 },
  { name: 'Handmade', value: 7 },
  { name: 'Delivery', value: 3 },
];

const COLORS = ['#0d9488', '#0284c7', '#8b5cf6', '#e11d48', '#f59e0b', '#10b981'];

export default function AdminDashboard() {
  return (
    <AdminLayout title="Dashboard Overview">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Building2 size={20} />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Total Providers</p>
            <h3 className="text-2xl font-bold text-slate-900">247</h3>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                <Activity size={20} />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Active Providers</p>
            <h3 className="text-2xl font-bold text-slate-900">189</h3>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Users size={20} />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Total Users</p>
            <h3 className="text-2xl font-bold text-slate-900">1,842</h3>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                <List size={20} />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Total Listings</p>
            <h3 className="text-2xl font-bold text-slate-900">534</h3>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CreditCard size={20} />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Total Revenue</p>
            <h3 className="text-2xl font-bold text-slate-900">48,320 <span className="text-sm font-normal text-slate-500">SAR</span></h3>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <Clock size={20} />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Pending Approvals</p>
            <h3 className="text-2xl font-bold text-slate-900">12</h3>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
            <CardDescription>Monthly revenue growth in SAR</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={3} dot={{ r: 4, fill: '#0d9488', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
            <CardDescription>Distribution of active listings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>New Providers per Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={providerData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="providers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { title: "Ahmed registered as a new provider", time: "2 hours ago", type: "user" },
                { title: "New listing 'Plumbing Services' approved", time: "4 hours ago", type: "listing" },
                { title: "Payment of 500 SAR processed", time: "5 hours ago", type: "payment" },
                { title: "Fatima updated subscription to Premium", time: "Yesterday", type: "sub" },
                { title: "Review reported on listing #42", time: "Yesterday", type: "alert" },
              ].map((activity, i) => (
                <div key={i} className="flex gap-4">
                  <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${
                    activity.type === 'user' ? 'bg-blue-500' :
                    activity.type === 'listing' ? 'bg-teal-500' :
                    activity.type === 'payment' ? 'bg-emerald-500' :
                    activity.type === 'sub' ? 'bg-purple-500' : 'bg-amber-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{activity.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
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