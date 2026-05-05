import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, UtensilsCrossed, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function AdminDashboard() {
  const [restaurantId] = useState(1); // TODO: Get from context or URL

  const { data: status, isLoading } = trpc.restaurant.getStatus.useQuery(
    { restaurantId },
    { refetchInterval: 5000 } // Real-time updates every 5 seconds
  );

  const notifyMutation = trpc.waitlist.notify.useMutation({
    onSuccess: () => {
      // alert("通知已成功發送"); // Optional: you can add toast notification here
    },
    onError: (error) => {
      alert(`發送通知失敗: ${error.message}`);
    }
  });

  const updateStatusMutation = trpc.waitlist.updateStatus.useMutation({
    onSuccess: () => {
      // Optional toast for manual cancellation success
    },
    onError: (error) => {
      alert(`更新狀態失敗: ${error.message}`);
    }
  });

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { data: reservationsList = [], refetch: refetchReservations } = trpc.reservation.listByDate.useQuery(
    { restaurantId, dateString: selectedDate },
    { refetchInterval: 5000 }
  );

  const [isAddReservationOpen, setIsAddReservationOpen] = useState(false);
  const [newResPhone, setNewResPhone] = useState("");
  const [newResName, setNewResName] = useState("");
  const [newResParty, setNewResParty] = useState(2);
  const [newResTime, setNewResTime] = useState("18:00");

  const createReservationMutation = trpc.reservation.create.useMutation({
    onSuccess: () => {
      setIsAddReservationOpen(false);
      setNewResPhone("");
      setNewResName("");
      setNewResParty(2);
      setNewResTime("18:00");
      refetchReservations();
    },
    onError: (err) => alert(`新增失敗: ${err.message}`)
  });

  const updateReservationStatusMutation = trpc.reservation.updateStatus.useMutation({
    onSuccess: () => refetchReservations(),
    onError: (err) => alert(`更新狀態失敗: ${err.message}`)
  });

  const sendReminderMutation = trpc.reservation.sendReminder.useMutation({
    onSuccess: () => {
      refetchReservations();
    },
    onError: (err) => alert(`發送提醒失敗: ${err.message}`)
  });

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const scheduledAt = new Date(`${selectedDate}T${newResTime}:00`);
    createReservationMutation.mutate({
      restaurantId,
      phone: newResPhone,
      name: newResName,
      partySize: newResParty,
      scheduledAt
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading restaurant status...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!status) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-destructive">Restaurant not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{status.restaurant.branchName || "妳有咖啡 neo cafe"}</h1>
          <p className="text-muted-foreground mt-2">{status.restaurant.location || "台北市萬華區武昌街二段83-9號2樓"}</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">總桌數</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.stats.totalTables}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {status.stats.emptyTables} 空桌, {status.stats.occupiedTables} 用餐中
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                候位組數
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.stats.waitlistCount}</div>
              <p className="text-xs text-muted-foreground mt-1">組客人等候中</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                平均等候
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">~45 min</div>
              <p className="text-xs text-muted-foreground mt-1">預估時間</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4" />
                今日訂位
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.reservations.length}</div>
              <p className="text-xs text-muted-foreground mt-1">組</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="waitlist" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="waitlist">候位看版</TabsTrigger>
            <TabsTrigger value="tables">桌位狀態</TabsTrigger>
            <TabsTrigger value="reservations">訂位管理</TabsTrigger>
          </TabsList>

          {/* Waitlist Tab */}
          <TabsContent value="waitlist" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>目前候位</CardTitle>
                <CardDescription>即時追蹤排隊狀態與顧客資訊</CardDescription>
              </CardHeader>
              <CardContent>
                {status.waitlist.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <p>目前無人候位</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...status.waitlist].sort((a: any, b: any) => {
                      if (a.notifiedStatus === "cancelled" && b.notifiedStatus !== "cancelled") return 1;
                      if (a.notifiedStatus !== "cancelled" && b.notifiedStatus === "cancelled") return -1;
                      return 0;
                    }).map((entry: any, idx: number) => (
                      <div
                        key={entry.id}
                        className={`flex items-center justify-between p-4 border rounded-lg transition ${entry.notifiedStatus === "cancelled" ? "opacity-50 line-through bg-muted/30" : "hover:bg-muted/50"}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col gap-1 items-center min-w-[3rem]">
                            <Badge variant="outline" className="text-lg font-bold">
                              #{idx + 1}
                            </Badge>
                            {entry.notifiedStatus !== "cancelled" && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-5 px-1 text-[10px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => updateStatusMutation.mutate({ waitlistId: entry.id, status: "cancelled" })}
                                disabled={updateStatusMutation.isPending}
                              >
                                手動取消
                              </Button>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {entry.customer?.name || '未知客人'} ({entry.partySize} 人)
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {entry.customer?.phone} • 等候自 {new Date(entry.entryTime).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={entry.notifiedStatus === "notified" || entry.notifiedStatus === "coming" ? "default" : entry.notifiedStatus === "cancelled" ? "destructive" : "secondary"}
                          >
                            {entry.notifiedStatus === "pending" ? "待通知" 
                             : entry.notifiedStatus === "notified" ? "已通知" 
                             : entry.notifiedStatus === "coming" ? "立即前往"
                             : entry.notifiedStatus === "reserved_5min" ? "保留 5 分鐘"
                             : entry.notifiedStatus === "cancelled" ? "客人取消"
                             : entry.notifiedStatus}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => notifyMutation.mutate({ waitlistId: entry.id })}
                            disabled={notifyMutation.isPending || entry.notifiedStatus === "cancelled"}
                          >
                            {notifyMutation.isPending ? "發送中..." : "發送通知"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tables Tab */}
          <TabsContent value="tables" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>桌位狀態</CardTitle>
                <CardDescription>視覺化管理店內空桌與用餐狀況</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {status.tables.map(table => (
                    <div
                      key={table.id}
                      className={`p-4 rounded-lg border-2 text-center cursor-pointer transition ${
                        table.status === "empty"
                          ? "bg-green-50 border-green-300 hover:bg-green-100"
                          : table.status === "occupied"
                          ? "bg-red-50 border-red-300 hover:bg-red-100"
                          : table.status === "reserved"
                          ? "bg-blue-50 border-blue-300 hover:bg-blue-100"
                          : "bg-yellow-50 border-yellow-300 hover:bg-yellow-100"
                      }`}
                    >
                      <p className="font-bold text-sm">{table.tableNumber}</p>
                      <p className="text-xs text-muted-foreground">{table.maxSeats} 人座</p>
                      <Badge
                        variant="outline"
                        className="mt-2 text-xs"
                      >
                        {table.status === "empty" ? "空桌" : table.status === "occupied" ? "用餐中" : table.status === "reserved" ? "已預訂" : "清潔中"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reservations Tab */}
          <TabsContent value="reservations" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>訂位管理</CardTitle>
                  <CardDescription>管理與追蹤特定日期的預約紀錄</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)} 
                    className="w-auto"
                  />
                  <Dialog open={isAddReservationOpen} onOpenChange={setIsAddReservationOpen}>
                    <DialogTrigger asChild>
                      <Button>手動新增</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>新增訂位</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleManualAdd} className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label>姓名</Label>
                          <Input value={newResName} onChange={(e) => setNewResName(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                          <Label>電話</Label>
                          <Input value={newResPhone} onChange={(e) => setNewResPhone(e.target.value)} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>人數</Label>
                            <Input type="number" min={1} value={newResParty} onChange={(e) => setNewResParty(parseInt(e.target.value))} required />
                          </div>
                          <div className="space-y-2">
                            <Label>時間</Label>
                            <Input type="time" value={newResTime} onChange={(e) => setNewResTime(e.target.value)} required />
                          </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={createReservationMutation.isPending}>
                          {createReservationMutation.isPending ? "新增中..." : "確認新增"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {reservationsList.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <p>該日尚無訂位</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...reservationsList].sort((a: any, b: any) => {
                      if (a.status === "cancelled" && b.status !== "cancelled") return 1;
                      if (a.status !== "cancelled" && b.status === "cancelled") return -1;
                      return 0;
                    }).map((res: any) => (
                      <div
                        key={res.id}
                        className={`flex items-center justify-between p-4 border rounded-lg transition ${res.status === "cancelled" ? "opacity-50 line-through bg-muted/30" : "hover:bg-muted/50"}`}
                      >
                        <div>
                          <p className="font-medium">
                            {res.customer?.name || '未知客人'} ({res.partySize} 人)
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {res.customer?.phone} • {new Date(res.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                          {(res.confirmationSentAt || res.reminderSentAt) && (
                            <div className="flex gap-2 mt-1">
                              {res.confirmationSentAt && <Badge variant="outline" className="text-[10px] h-4">已發送確認</Badge>}
                              {res.reminderSentAt && <Badge variant="outline" className="text-[10px] h-4">已發送提醒</Badge>}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={res.status === "confirmed" ? "default" : res.status === "cancelled" ? "destructive" : "secondary"}>
                            {res.status === "pending" ? "待確認" :
                             res.status === "confirmed" ? "已確認" :
                             res.status === "cancelled" ? "已取消" : res.status}
                          </Badge>
                          {res.status !== "cancelled" && res.customer?.lineUid && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendReminderMutation.mutate({ reservationId: res.id })}
                              disabled={sendReminderMutation.isPending}
                            >
                              發送提醒
                            </Button>
                          )}
                          {res.status !== "cancelled" && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => updateReservationStatusMutation.mutate({ reservationId: res.id, status: "cancelled" })}
                              disabled={updateReservationStatusMutation.isPending}
                            >
                              手動取消
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
