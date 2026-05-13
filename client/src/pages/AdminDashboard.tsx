import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, UtensilsCrossed, AlertCircle, Settings, Grid3X3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef } from "react";
import { Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboard() {
  const [restaurantId] = useState(1);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [localTables, setLocalTables] = useState<any[] | null>(null);
  const [optimisticTables, setOptimisticTables] = useState<any[] | null>(null);

  const { data: status, isLoading } = trpc.restaurant.getStatus.useQuery(
    { restaurantId },
    { refetchInterval: 5000 }
  );

  // When fresh server data arrives, clear the optimistic override
  useEffect(() => {
    setOptimisticTables(null);
  }, [status]);

  // ── 90/120 min dining-time alerts ──────────────────────────────
  const alertedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const check = () => {
      const tables = displayTables(status?.tables ?? []);
      const now = Date.now();
      for (const t of tables) {
        if (t.status !== "occupied" || !t.occupiedSince) continue;
        const since = new Date(t.occupiedSince).getTime();
        const elapsed = Math.floor((now - since) / 60000); // minutes
        const key90 = `${t.id}-90`;
        const key120 = `${t.id}-120`;
        if (elapsed >= 120 && !alertedRef.current.has(key120)) {
          alertedRef.current.add(key120);
          toast.error(`⏰ ${t.tableNumber} 用餐時間已到（120 分鐘）`, {
            description: `入座時間：${new Date(t.occupiedSince).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
            duration: 0, // 不自動消失
          });
        } else if (elapsed >= 90 && !alertedRef.current.has(key90)) {
          alertedRef.current.add(key90);
          toast.warning(`⚠️ ${t.tableNumber} 用餐已達 90 分鐘`, {
            description: `入座時間：${new Date(t.occupiedSince).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}，請留意翻桌時間。`,
            duration: 10000,
          });
        }
        // Reset alert keys when table becomes empty (handled on status change)
      }
    };
    check(); // run immediately
    const interval = setInterval(check, 60000); // check every minute
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Clean up alertedRef entries for tables that are no longer occupied
  useEffect(() => {
    const occupiedIds = new Set(
      (status?.tables ?? [])
        .filter((t: any) => t.status === "occupied")
        .flatMap((t: any) => [`${t.id}-90`, `${t.id}-120`])
    );
    for (const key of Array.from(alertedRef.current)) {
      if (!occupiedIds.has(key)) alertedRef.current.delete(key);
    }
  }, [status]);

  // Derive display tables: prefer optimistic override, fallback to server data
  const displayTables = (tables: any[]) =>
    tables.map((t) => {
      const override = optimisticTables?.find((o: any) => o.id === t.id);
      return override ?? t;
    });

  const toggleTableMutation = trpc.table.toggleStatus.useMutation({
    onMutate: ({ tableId }) => {
      // Optimistically flip the status immediately
      const serverTables = status?.tables ?? [];
      setOptimisticTables(
        serverTables.map((t: any) =>
          t.id === tableId
            ? { ...t, status: t.status === "empty" ? "occupied" : "empty", occupiedSince: t.status === "empty" ? new Date().toISOString() : null }
            : t
        )
      );
    },
    onError: (e) => {
      setOptimisticTables(null); // revert on error
      alert(`切換桌位失敗: ${e.message}`);
    },
  });


  const savePositionMutation = trpc.table.savePosition.useMutation({
    onError: (e) => alert(`儲存位置失敗: ${e.message}`)
  });

  const notifyMutation = trpc.waitlist.notify.useMutation({
    onSuccess: () => {
      // alert("通知已成功發送");
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

  const toggleWaitlistMutation = trpc.restaurant.toggleWaitlist.useMutation({
    onSuccess: () => {
      // refetch will automatically happen
    },
    onError: (error) => {
      alert(`切換候位狀態失敗: ${error.message}`);
    }
  });

  // Walk-in reserve ratio settings
  const { data: ratioData } = trpc.settings.getWalkInRatio.useQuery({ restaurantId });
  const [localRatio, setLocalRatio] = useState<number | null>(null);
  const displayRatio = localRatio ?? ratioData?.walkInReserveRatio ?? 0.40;
  const utils = trpc.useUtils();
  const updateRatioMutation = trpc.settings.updateWalkInRatio.useMutation({
    onSuccess: () => {
      toast.success("保留比例已更新");
      utils.settings.getWalkInRatio.invalidate();
    },
    onError: (err) => alert(`更新保留比例失敗: ${err.message}`),
  });
  // Sync localRatio when server data arrives
  useEffect(() => {
    if (ratioData) setLocalRatio(ratioData.walkInReserveRatio);
  }, [ratioData]);

  // Closed Dates
  const { data: closedDates = [] } = trpc.settings.getClosedDates.useQuery({ restaurantId });
  const [newClosedDate, setNewClosedDate] = useState("");
  const [newClosedReason, setNewClosedReason] = useState("");
  const addClosedDateMutation = trpc.settings.addClosedDate.useMutation({
    onSuccess: () => {
      toast.success("已新增店休日");
      utils.settings.getClosedDates.invalidate();
      setNewClosedDate("");
      setNewClosedReason("");
    },
    onError: (err) => alert(`新增店休日失敗: ${err.message}`),
  });
  const removeClosedDateMutation = trpc.settings.removeClosedDate.useMutation({
    onSuccess: () => {
      toast.success("已取消店休");
      utils.settings.getClosedDates.invalidate();
    },
    onError: (err) => alert(`取消店休失敗: ${err.message}`),
  });

  // Recurring Closed Days
  const { data: recurringClosedDaysData } = trpc.settings.getRecurringClosedDays.useQuery({ restaurantId });
  const [localRecurringDays, setLocalRecurringDays] = useState<number[]>([]);
  const updateRecurringMutation = trpc.settings.updateRecurringClosedDays.useMutation({
    onSuccess: () => {
      toast.success("固定店休日已更新");
      utils.settings.getRecurringClosedDays.invalidate();
    },
    onError: (err) => alert(`更新固定店休日失敗: ${err.message}`),
  });

  useEffect(() => {
    if (recurringClosedDaysData) {
      setLocalRecurringDays(recurringClosedDaysData.recurringClosedDays);
    }
  }, [recurringClosedDaysData]);

  const toggleRecurringDay = (dayIndex: number) => {
    setLocalRecurringDays(prev => 
      prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]
    );
  };

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="waitlist">候位看版</TabsTrigger>
            <TabsTrigger value="tables">桌位狀態</TabsTrigger>
            <TabsTrigger value="reservations">訂位管理</TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-3.5 h-3.5 mr-1" />設定
            </TabsTrigger>
          </TabsList>

          {/* Waitlist Tab */}
          <TabsContent value="waitlist" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>目前候位</CardTitle>
                  <CardDescription>即時追蹤排隊狀態與顧客資訊</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="waitlist-mode" className={status.restaurant?.isWaitlistOpen ? "text-primary font-bold" : "text-muted-foreground"}>
                    {status.restaurant?.isWaitlistOpen ? "接客中" : "已停止候位"}
                  </Label>
                  <Switch
                    id="waitlist-mode"
                    checked={status.restaurant?.isWaitlistOpen}
                    onCheckedChange={(checked) => toggleWaitlistMutation.mutate({ restaurantId, isOpen: checked })}
                    disabled={toggleWaitlistMutation.isPending}
                  />
                </div>
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


          {/* Tables Tab — 12×5 free-position grid */}
          <TabsContent value="tables" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>桌位狀態</CardTitle>
                  <CardDescription>
                    {isEditingLayout
                      ? "編輯中：將桌子拖曳到任意格子，完成後按「確認鎖定」"
                      : "點擊桌子切換空桌／用餐中；按「調整桌位」可自由移動位置"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isEditingLayout ? (
                    <>
                      <Button size="sm" onClick={() => { setIsEditingLayout(false); setLocalTables(null); }} disabled={savePositionMutation.isPending}>
                        <Lock className="w-3 h-3 mr-1" />確認鎖定
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setIsEditingLayout(false); setLocalTables(null); }}>
                        取消
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => {
                      setLocalTables([...(status?.tables ?? [])]);
                      setIsEditingLayout(true);
                    }}>
                      <Unlock className="w-3 h-3 mr-1" />調整桌位
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* 12 × 5 grid — centered, rectangular cells */}
                <div className="flex justify-center overflow-x-auto">
                <div
                  className="relative border border-border/40 rounded-xl bg-muted/20 overflow-hidden inline-grid"
                  style={{
                    gridTemplateColumns: "repeat(12, 76px)",
                    gridTemplateRows: "repeat(5, 64px)",
                    gap: "4px",
                    padding: "6px",
                  }}
                >
                  {/* Hidden cell drop targets */}
                  {Array.from({ length: 60 }).map((_, idx) => {
                    const col = idx % 12;
                    const row = Math.floor(idx / 12);
                    const tableSrc = isEditingLayout
                      ? (localTables ?? [])
                      : displayTables(status?.tables ?? []);
                    const tableHere = tableSrc.find((t: any) => t.gridCol === col && t.gridRow === row);
                    return (
                      <div
                        key={`cell-${col}-${row}`}
                        style={{ gridColumn: col + 1, gridRow: row + 1 }}
                        className={[
                          "flex items-center justify-center rounded-lg transition-all",
                          isEditingLayout
                            ? "border border-dashed border-primary/20 hover:border-primary/60 hover:bg-primary/5"
                            : "",
                        ].join(" ")}
                        onDragOver={(e) => { if (isEditingLayout) e.preventDefault(); }}
                        onDrop={(e) => {
                          if (!isEditingLayout) return;
                          e.preventDefault();
                          const tableId = parseInt(e.dataTransfer.getData("tableId"));
                          setLocalTables(prev =>
                            (prev ?? []).map((t: any) =>
                              t.id === tableId ? { ...t, gridCol: col, gridRow: row } : t
                            )
                          );
                          savePositionMutation.mutate({ tableId, gridCol: col, gridRow: row });
                        }}
                      >
                        {tableHere && (
                          <div
                            draggable={isEditingLayout}
                            onDragStart={(e) => {
                              e.dataTransfer.setData("tableId", String(tableHere.id));
                            }}
                            onClick={() => {
                              if (!isEditingLayout) toggleTableMutation.mutate({ tableId: tableHere.id });
                            }}
                            title={tableHere.status === "occupied" && tableHere.occupiedSince
                              ? `用餐中・${new Date(tableHere.occupiedSince).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} 起`
                              : "空桌"}
                            className={[
                              "w-full h-full rounded-lg flex flex-col items-center justify-center select-none transition-all shadow-sm px-1",
                              tableHere.status === "empty"
                                ? "bg-emerald-400"
                                : (() => {
                                    if (!tableHere.occupiedSince) return "bg-rose-400";
                                    const mins = Math.floor((Date.now() - new Date(tableHere.occupiedSince).getTime()) / 60000);
                                    return mins >= 120 ? "bg-red-700" : mins >= 90 ? "bg-orange-500" : "bg-rose-400";
                                  })(),
                              isEditingLayout
                                ? "cursor-grab active:cursor-grabbing ring-2 ring-white/60 ring-offset-1 scale-95"
                                : tableHere.status === "empty"
                                ? "cursor-pointer hover:bg-emerald-500 hover:shadow-md hover:scale-105"
                                : "cursor-pointer hover:brightness-110 hover:shadow-md",
                            ].join(" ")}
                          >
                            <span className="text-white font-bold text-[11px] leading-tight drop-shadow-sm tracking-wide">{tableHere.tableNumber}</span>
                            {tableHere.status === "occupied" && tableHere.occupiedSince ? (
                              <>
                                <span className="text-white text-[9px] leading-tight font-medium mt-0.5">
                                  {new Date(tableHere.occupiedSince).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                <span className="text-white/80 text-[8px] leading-tight">
                                  {(() => {
                                    const m = Math.floor((Date.now() - new Date(tableHere.occupiedSince).getTime()) / 60000);
                                    return `${m}min`;
                                  })()}
                                </span>
                              </>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                </div>{/* end overflow-x-auto */}

                {/* Legend */}
                <div className="mt-3 flex items-center gap-5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-400 inline-block shadow-sm"></span>空桌
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-rose-400 inline-block shadow-sm"></span>用餐中
                  </span>
                  <span className="ml-auto text-xs">
                    共 {status?.tables?.length ?? 0} 張桌 · 空桌 {displayTables(status?.tables ?? []).filter((t: any) => t.status === "empty").length} 張
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
                          <div className="flex gap-2">
                            <Input value={newResPhone} onChange={(e) => setNewResPhone(e.target.value)} required className="flex-1" />
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button type="button" variant="outline" size="icon" className="shrink-0">
                                  <Grid3X3 className="w-4 h-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-3" align="end">
                                <div className="grid grid-cols-3 gap-2">
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <Button
                                      key={num}
                                      type="button"
                                      variant="outline"
                                      className="h-12 text-lg font-medium"
                                      onClick={() => setNewResPhone(prev => prev + num)}
                                    >
                                      {num}
                                    </Button>
                                  ))}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-12 text-lg font-medium bg-muted/50"
                                    onClick={() => setNewResPhone(prev => prev.slice(0, -1))}
                                  >
                                    ⌫
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-12 text-lg font-medium"
                                    onClick={() => setNewResPhone(prev => prev + "0")}
                                  >
                                    0
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-12 text-lg font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 hover:text-destructive"
                                    onClick={() => setNewResPhone("")}
                                  >
                                    C
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
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
                      const aInactive = a.status === "cancelled" || a.status === "noshow";
                      const bInactive = b.status === "cancelled" || b.status === "noshow";
                      if (aInactive && !bInactive) return 1;
                      if (!aInactive && bInactive) return -1;
                      return 0;
                    }).map((res: any) => {
                      const isInactive = res.status === "cancelled" || res.status === "noshow";
                      return (
                      <div
                        key={res.id}
                        className={`flex items-center justify-between p-4 border rounded-lg transition ${isInactive ? "opacity-50 line-through bg-muted/30" : "hover:bg-muted/50"}`}
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
                          <Badge variant={res.status === "confirmed" ? "default" : (res.status === "cancelled" || res.status === "noshow") ? "destructive" : "secondary"}>
                            {res.status === "pending" ? "待確認" :
                             res.status === "confirmed" ? "已確認" :
                             res.status === "cancelled" ? "已取消" :
                             res.status === "noshow" ? "未到取消" : res.status}
                          </Badge>
                          {!isInactive && res.customer?.lineUid && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendReminderMutation.mutate({ reservationId: res.id })}
                              disabled={sendReminderMutation.isPending}
                            >
                              發送提醒
                            </Button>
                          )}
                          {!isInactive && (
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
                    );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>訂位容量設定</CardTitle>
                <CardDescription>調整現場客人保留桌位比例，影響線上可訂位桌數</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">現場客人保留比例</p>
                      <p className="text-sm text-muted-foreground">
                        保留 {Math.round(displayRatio * 100)}% 的桌位給現場候位客人，
                        剩餘 {Math.round((1 - displayRatio) * 100)}% 開放線上訂位。
                      </p>
                    </div>
                    <span className="text-2xl font-bold text-primary">{Math.round(displayRatio * 100)}%</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={Math.round(displayRatio * 100)}
                    onChange={(e) => setLocalRatio(parseInt(e.target.value) / 100)}
                    className="w-full accent-primary h-2 rounded-full cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0% (全部開放訂位)</span>
                    <span>100% (不開放訂位)</span>
                  </div>

                  {/* Summary */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">總桌數</span>
                      <span className="font-medium">{status.stats.totalTables} 桌</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">可線上訂位</span>
                      <span className="font-medium text-primary">
                        {Math.floor(status.stats.totalTables * (1 - displayRatio))} 桌
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">保留給現場</span>
                      <span className="font-medium">
                        {status.stats.totalTables - Math.floor(status.stats.totalTables * (1 - displayRatio))} 桌
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">每桌座位</span>
                      <span className="font-medium">2 人</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">用餐時間</span>
                      <span className="font-medium">2 小時</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    disabled={updateRatioMutation.isPending || displayRatio === (ratioData?.walkInReserveRatio ?? 0.40)}
                    onClick={() => updateRatioMutation.mutate({ restaurantId, walkInReserveRatio: displayRatio })}
                  >
                    {updateRatioMutation.isPending ? "儲存中..." : "儲存設定"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>店休日管理</CardTitle>
                <CardDescription>設定店休日期，設定後客人將無法預約該日期</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-2 items-end">
                  <div className="space-y-2 flex-1">
                    <Label>選擇日期</Label>
                    <Input 
                      type="date" 
                      value={newClosedDate} 
                      onChange={(e) => setNewClosedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]} // Cannot close past dates easily
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label>原因 (選填)</Label>
                    <Input 
                      placeholder="例: 員工旅遊" 
                      value={newClosedReason} 
                      onChange={(e) => setNewClosedReason(e.target.value)} 
                    />
                  </div>
                  <Button 
                    onClick={() => {
                      if (!newClosedDate) return;
                      addClosedDateMutation.mutate({ restaurantId, date: newClosedDate, reason: newClosedReason });
                    }}
                    disabled={!newClosedDate || addClosedDateMutation.isPending}
                  >
                    新增
                  </Button>
                </div>

                {closedDates.length > 0 ? (
                  <div className="space-y-2 mt-4">
                    <p className="text-sm font-medium text-muted-foreground">即將到來的店休日：</p>
                    {closedDates.filter((cd: any) => cd.date >= new Date().toISOString().split('T')[0]).map((cd: any) => (
                      <div key={cd.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-destructive">{cd.date}</p>
                          {cd.reason && <p className="text-xs text-muted-foreground">{cd.reason}</p>}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeClosedDateMutation.mutate({ id: cd.id })}
                          disabled={removeClosedDateMutation.isPending}
                        >
                          取消店休
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                   <p className="text-sm text-muted-foreground">目前沒有設定任何未來的店休日。</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>固定店休日設定</CardTitle>
                <CardDescription>設定每週固定的公休星期（例如每週二、週三）。設定後，客人將無法預約該星期的日子。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-6 p-4 border rounded-lg bg-muted/20">
                  {["週日", "週一", "週二", "週三", "週四", "週五", "週六"].map((dayName, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`day-${index}`} 
                        checked={localRecurringDays.includes(index)}
                        onCheckedChange={() => toggleRecurringDay(index)}
                      />
                      <Label htmlFor={`day-${index}`} className="cursor-pointer font-medium">{dayName}</Label>
                    </div>
                  ))}
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full" disabled={updateRecurringMutation.isPending}>
                      {updateRecurringMutation.isPending ? "儲存中..." : "儲存固定公休設定"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>確認更新固定店休日？</AlertDialogTitle>
                      <AlertDialogDescription>
                        您確定要將固定公休日設定為：
                        <span className="font-bold block mt-2 mb-2 text-foreground text-base">
                          {localRecurringDays.length > 0 
                            ? localRecurringDays.sort().map(d => ["週日", "週一", "週二", "週三", "週四", "週五", "週六"][d]).join("、") 
                            : "無固定公休"}
                        </span>
                        這將會影響未來所有相關星期的訂位開放狀態。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={() => updateRecurringMutation.mutate({ restaurantId, days: localRecurringDays })}>
                        確定儲存
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
