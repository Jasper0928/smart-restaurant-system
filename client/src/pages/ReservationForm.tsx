import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { useLiff } from "@/contexts/LiffContext";

const reservationSchema = z.object({
  name: z.string().min(2, "名字必須至少兩個字"),
  phone: z.string().regex(/^\d{10,}$/, "請輸入有效的手機號碼"),
  email: z.string().email().optional().or(z.literal("")),
  partySize: z.coerce.number().min(1).max(20),
  date: z.string(),
  time: z.string(),
  highChairNeeded: z.coerce.number().default(0),
  specialRequests: z.string().optional(),
});

type ReservationFormData = z.infer<typeof reservationSchema>;

export default function ReservationForm() {
  const [restaurantId] = useState(1); // TODO: Get from context
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const { profile } = useLiff();

  const form = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema) as any,
    defaultValues: {
      partySize: 2,
      highChairNeeded: 0,
      name: profile?.displayName || "",
    },
  });

  const createReservation = trpc.reservation.create.useMutation({
    onSuccess: (data) => {
      setQrCode(data.qrCode);
      setQrCodeUrl(data.qrCodeUrl);
      toast.success("訂位成功！專屬 QR Code 已生成。");
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message || "建立訂位失敗，請稍後再試");
    },
  });

  const onSubmit: SubmitHandler<ReservationFormData> = async (data) => {
    const [year, month, day] = data.date.split("-");
    const [hours, minutes] = data.time.split(":");
    const scheduledAt = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes)
    );

    createReservation.mutate({
      restaurantId,
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      partySize: data.partySize,
      scheduledAt,
      highChairNeeded: data.highChairNeeded,
      specialRequests: data.specialRequests,
      lineUserId: profile?.userId,
    });
  };

  if (qrCode && qrCodeUrl) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">訂位已確認</CardTitle>
            <CardDescription className="text-center">
              您的預約已成功送出！
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <QRCodeDisplay qrCode={qrCode} qrCodeUrl={qrCodeUrl} />
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                請截圖保留此 QR Code 作為現場報到憑證。
              </p>
              <p className="text-xs text-muted-foreground">
                系統也已同步發送確認訊息至您的 LINE。
              </p>
            </div>
            <Button
              onClick={() => {
                setQrCode(null);
                setQrCodeUrl(null);
              }}
              className="w-full"
            >
              建立另一筆訂位
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2">預約訂位</h1>
          <p className="text-muted-foreground mb-4">
            妳有咖啡 neo cafe 歡迎您的蒞臨，請填寫下方資料完成訂位。
          </p>
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 text-sm text-left max-w-md mx-auto">
            <ul className="list-disc list-outside ml-4 space-y-1 text-muted-foreground">
              <li>平日座位保留 10 分鐘，假日座位時間不保留。</li>
              <li>逾時現場候位，人數到齊才入座</li>
              <li>用餐時間為兩個小時。</li>
            </ul>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>預約詳細資訊</CardTitle>
            <CardDescription>
              為了提供最好的服務，請確實填寫聯絡方式
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">聯絡人資訊</h3>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>姓名</FormLabel>
                        <FormControl>
                          <Input placeholder="請輸入您的姓名" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>聯絡電話</FormLabel>
                        <FormControl>
                          <Input placeholder="例如: 0912345678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (選填)</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Reservation Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">用餐資訊</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="partySize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>用餐人數</FormLabel>
                          <FormControl>
                            <Select value={field.value.toString()} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map(size => (
                                  <SelectItem key={size} value={size.toString()}>
                                    {size} 人
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>用餐日期</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>時間</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="請選擇時間" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 17 }).map((_, i) => {
                                const hour = Math.floor(i / 2) + 10;
                                const minute = i % 2 === 0 ? "00" : "30";
                                const timeString = `${hour.toString().padStart(2, "0")}:${minute}`;
                                return (
                                  <SelectItem key={timeString} value={timeString}>
                                    {timeString}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>



                <Button
                  type="submit"
                  className="w-full"
                  disabled={createReservation.isPending}
                >
                  {createReservation.isPending ? "訂位處理中..." : "確認預約"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div >
  );
}
