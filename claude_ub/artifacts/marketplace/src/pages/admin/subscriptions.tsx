import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, TrendingUp, Users } from "lucide-react";

export default function AdminSubscriptions() {
  return (
    <AdminLayout title="Subscriptions">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
            </div>
            <p className="font-medium text-purple-100 mb-1">Active Premium</p>
            <h3 className="text-3xl font-bold">48</h3>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <p className="font-medium text-blue-100 mb-1">Active Bronze</p>
            <h3 className="text-3xl font-bold">112</h3>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Monthly Recurring</p>
            <h3 className="text-3xl font-bold text-slate-900">23,040 <span className="text-sm text-slate-500 font-normal">SAR</span></h3>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Active Subscribers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Billing Cycle</TableHead>
                  <TableHead>Next Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { name: "Ahmed Abdullah", plan: "Premium", status: "Active", cycle: "Monthly", next: "Nov 12, 2023", amt: "249 SAR" },
                  { name: "Fatima Al-Saud", plan: "Bronze", status: "Active", cycle: "Monthly", next: "Nov 15, 2023", amt: "99 SAR" },
                  { name: "Sara Khalid", plan: "Premium", status: "Past Due", cycle: "Monthly", next: "Oct 28, 2023", amt: "249 SAR" },
                  { name: "Faisal Salem", plan: "Premium", status: "Active", cycle: "Yearly", next: "Dec 01, 2024", amt: "2490 SAR" },
                ].map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.plan === 'Premium' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {s.plan}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`flex items-center gap-1.5 text-sm ${s.status === 'Active' ? 'text-emerald-600' : 'text-red-600'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {s.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500">{s.cycle}</TableCell>
                    <TableCell className="text-slate-500">{s.next}</TableCell>
                    <TableCell className="text-right font-medium">{s.amt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}