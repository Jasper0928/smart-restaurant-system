import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Coffee, CalendarClock } from "lucide-react";


export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/10">

      {/* Navigation Bar */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Coffee className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg tracking-tight">妳有咖啡 neo cafe</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col md:flex-row items-center justify-center px-4 md:px-8 py-12 lg:px-16 relative overflow-hidden max-w-7xl mx-auto gap-12 md:gap-16 w-full">

        {/* Abstract Background Element for 'Bright & Minimalist' feel */}
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Text Content */}
        <div className="text-center md:text-left space-y-6 flex-1 animate-in fade-in slide-in-from-bottom-8 duration-1000 order-2 md:order-1 pt-8 md:pt-0">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-balance leading-tight">
            隱身西門町巷弄中的 <br className="hidden md:block" /> 老宅咖啡廳
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground font-light text-balance leading-relaxed md:pr-12">
            台北市萬華區武昌街二段83-9號2樓。<br /><br />立即透過 LINE 輕鬆訂位，免去現場排隊的煩惱，隨時查看即時候位狀態，享受美好的下午茶時光。
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
            <Link href="/reserve">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full shadow-lg shadow-primary/20 transition-all hover:-translate-y-1">
                <CalendarClock className="w-5 h-5 mr-2" />
                立即線上訂位
              </Button>
            </Link>

            <Link href="/menu">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-full bg-transparent hover:bg-primary/5 border-primary/20 hover:border-primary/50 transition-all">
                查看菜單
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero Image */}
        <div className="flex-1 w-full max-w-md md:max-w-full mx-auto animate-in fade-in slide-in-from-right-8 duration-1000 delay-200 order-1 md:order-2">
          <div className="relative aspect-square md:aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/10 border border-primary/5 group">
            <img
              src="/hero.jpg"
              alt="neo cafe desserts"
              className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} 妳有咖啡 neo cafe. All rights reserved.</p>
      </footer>
    </div>
  );
}
