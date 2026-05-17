import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminPayments() {
  return (
    <AdminLayout title="Payments & Transactions">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 mb-1">Total Collected</p>
            <h3 className="text-3xl font-bold text-emerald-600">124,500 <span className="text-sm text-emerald-600/70 font-normal">SAR</span></h3>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 mb-1">Pending Settlements</p>
            <h3 className="text-3xl font-bold text-amber-500">8,240 <span className="text-sm text-amber-500/70 font-normal">SAR</span></h3>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 mb-1">This Month</p>
            <h3 className="text-3xl font-bold text-slate-900">14,320 <span className="text-sm text-slate-500 font-normal">SAR</span></h3>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Transaction ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { name: "Ahmed Abdullah", type: "Subscription", amt: "249 SAR", status: "Paid", date: "Today, 10:23 AM", id: "TRX-8291" },
                  { name: "Fatima Al-Saud", type: "Commission", amt: "45 SAR", status: "Paid", date: "Today, 09:15 AM", id: "TRX-8290" },
                  { name: "Sara Khalid", type: "Featured", amt: "99 SAR", status: "Pending", date: "Yesterday", id: "TRX-8289" },
                  { name: "Mohammed Ali", type: "Subscription", amt: "99 SAR", status: "Failed", date: "Yesterday", id: "TRX-8288" },
                  { name: "Omar Fahad", type: "Commission", amt: "120 SAR", status: "Paid", date: "Oct 28, 2023", id: "TRX-8287" },
                ].map((t, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        t.type === 'Subscription' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        t.type === 'Featured' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }>
                        {t.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{t.amt}</TableCell>
                    <TableCell>
                      <span className={`text-sm font-medium ${
                        t.status === 'Paid' ? 'text-emerald-600' : 
                        t.status === 'Pending' ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        {t.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">{t.date}</TableCell>
                    <TableCell className="text-right text-slate-400 font-mono text-xs">{t.id}</TableCell>
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