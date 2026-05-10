import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLiff } from "@/contexts/LiffContext";
import { Clock, Users, ArrowLeft, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useEffect } from "react";

const formSchema = z.object({
  name: z.string().min(2, "請輸入至少兩個字"),
  phone: z.string().regex(/^09\d{8}$/, "請輸入有效的手機號碼 (例如: 0912345678)"),
  partySize: z.coerce.number().min(1).max(20),
});

export default function WaitlistForm() {
  const [, setLocation] = useLocation();
  const { profile } = useLiff();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      partySize: 2,
    },
  });

  // Pre-fill name from LINE profile if available
  useEffect(() => {
    if (profile?.displayName) {
      form.setValue("name", profile.displayName);
    }
  }, [profile, form]);

  const createWaitlist = trpc.waitlist.create.useMutation({
    onSuccess: (data) => {
      toast.success("候位登記成功！");
      setLocation(`/status/${data.id}`);
    },
    onError: (error) => {
      toast.error("登記失敗: " + error.message);
    },
  });

  const { data: status } = trpc.restaurant.getStatus.useQuery(
    { restaurantId: 1 },
    { refetchInterval: 10000 }
  );

  function onSubmit(values: z.infer<typeof formSchema>) {
    createWaitlist.mutate({
      restaurantId: 1, // default branch
      ...values,
      lineUserId: profile?.userId,
    });
  }

  const waitlistCount = status?.stats?.waitlistCount || 0;

  return (
    <div className="min-h-screen bg-background py-8 px-4 animate-in fade-in duration-500">
      <div className="max-w-md mx-auto space-y-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="-ml-4 mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回首頁
          </Button>
        </Link>

        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">現場候位</h1>
          <p className="text-muted-foreground">
            目前有 <span className="font-bold text-primary">{waitlistCount}</span> 組客人在等候
          </p>
        </div>

        {status?.restaurant?.isWaitlistOpen === false ? (
          <Card className="border-destructive shadow-sm overflow-hidden mt-6">
            <div className="bg-destructive h-1 w-full" />
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl text-destructive flex items-center justify-center gap-2">
                <AlertCircle className="w-6 h-6" />
                已停止候位
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground pb-8">
              <p>今日已停止接客，我們將於明日上午 8:00 重新開放現場候位。</p>
              <p className="mt-2">如有急需請直接來電洽詢，謝謝您的支持！</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <div className="bg-primary h-1 w-full" />
            <CardHeader>
              <CardTitle>候位資料填寫</CardTitle>
              <CardDescription>
                請留下您的基本資料，快到您的號碼時，我們會透過 LINE 通知您！
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>聯絡人姓名</FormLabel>
                          <FormControl>
                            <Input placeholder="王小明" {...field} />
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
                            <Input placeholder="0912345678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                  </div>

                  <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 text-sm text-left">
                    <ul className="list-disc list-outside ml-4 space-y-1 text-muted-foreground">
                      <li>號碼保留 10 分鐘，過號視同放棄。</li>
                      <li>人數到齊後才會安排入座。</li>
                      <li>用餐時間為兩個小時。</li>
                    </ul>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createWaitlist.isPending}
                  >
                    {createWaitlist.isPending ? "處理中..." : "確認抽號"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
