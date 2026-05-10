import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowLeft, Coffee, UtensilsCrossed } from "lucide-react";

const menuData = {
  drinks: [
    {
      category: "妳有水果冰茶 (neo iced tea)",
      note: "無法去冰",
      items: [
        { name: "香甜蜜桃冰茶 (Honey Peach)", price: "160" },
        { name: "野莓果香冰茶 (Raspberry)", price: "160" },
        { name: "百香柳橙冰茶 (Orange passion fruit)", price: "160" },
      ],
    },
    {
      category: "奶有飲品 (neo drink)",
      note: "冰品需做法太久",
      items: [
        { name: "奶有紅茶 (正常糖/黑糖)", tags: ["H", "I"], price: "100" },
        { name: "奶有奶茶 (正常糖/黑糖)", tags: ["H", "I"], price: "110" },
        { name: "奶有鮮奶奶茶 (正常糖/黑糖)", tags: ["H", "I"], price: "120" },
        { name: "奶有黑糖鮮奶奶茶", tags: ["H", "I"], price: "150" },
        { name: "蜂蜜柚子茶", tags: ["H", "I"], price: "150" },
        { name: "蜂蜜青梅茶", tags: ["H", "I"], price: "150" },
        { name: "楊桃桃瓜 (Iced)", tags: ["I"], price: "150" },
        { name: "酸檸檬茶", tags: ["H", "I"], price: "150" },
        { name: "綜合花果茶", tags: ["H", "I"], price: "150" },
        { name: "高山頂級山茶 (Cold brew tea)", tags: ["H", "I"], price: "150" },
        { name: "金桔草本茶 (金桔檸檬天然而甜)", tags: ["H"], price: "170" },
        { name: "薄荷花草茶 (清涼甘甜, 舒緩心神)", tags: ["H"], price: "170" },
        { name: "TWG 英式早晨茶", tags: ["H", "I"], price: "180" },
        { name: "TWG 茉莉香花南非國寶茶", tags: ["H", "I"], price: "180" },
        { name: "提拉米蘇咖啡", tags: ["H", "I"], price: "180" },
      ],
    },
    {
      category: "妳有泡泡飲 (neo sparkling drink)",
      items: [
        { name: "冬瓜楊桃泡泡 (Starfruit-Winter Melon)", price: "170" },
        { name: "鹹檸茶泡泡 (Salty lemon)", price: "170" },
        { name: "柳橙柚子泡泡 (Orange grapefruit)", price: "170" },
        { name: "蜂蜜青梅泡泡 (Honey green plum)", price: "170" },
        { name: "檸檬莓果泡泡 (Lemon raspberry)", price: "170" },
        { name: "葡萄萊姆泡泡 (Grape Lime)", price: "170" },
      ],
    },
    {
      category: "妳有水果風味汽水 (neo bundaberg)",
      note: "無法去冰",
      items: [
        { name: "柳橙 (Blood orange)", price: "160" },
        { name: "蜜桃 (Peach)", price: "160" },
        { name: "百香果 (Passionfruit)", price: "160" },
        { name: "夏日芒果 (Mango)", price: "160" },
        { name: "紅心芭樂 (Guava)", price: "160" },
        { name: "粉紅葡萄柚 (Pink grapefruit)", price: "160" },
      ],
    },
  ],
  food: [
    {
      category: "妳有招牌腰食 (neo signboard staple)",
      note: "可加起司 +$20",
      items: [
        { name: "起司蛋丼 (Egg donburi & cheese)", price: "220" },
        { name: "親子丼 (Oyakodon)", price: "260 / $280" },
        { name: "特選牛丼 (Gyudon)", price: "260 / $280" },
        { name: "香辣打拋豬 (Thai basil chili pork)", price: "260 / $280" },
        { name: "咖哩肉末太陽蛋 (Curry minced meat with sunny-side-up)", price: "260 / $280" },
        { name: "一個人吃韓軍部队鍋 (Korean troops pot)", price: "290" },
        { name: "茶葉蛋 + 鮭魚明太子烤飯糰", price: "290" },
        { name: "蕃茄燉牛肋條 (Beef stew with tomato)", price: "330" },
      ],
    },
    {
      category: "妳有薄脆披薩 (neo pizza)",
      note: "鹹口味可加蛋 +$20",
      items: [
        { name: "巧克力巴娜娜 (Banana chocolate-sweet)", tags: ["甜"], price: "230" },
        { name: "蒜香 Juicy 櫛瓜 (Garlic zucchini)", tags: ["鹹"], price: "260" },
        { name: "哈哇伊 (Hawaii)", price: "260" },
        { name: "羅勒雞肉 (Basil chicken)", price: "260" },
        { name: "泰菜打拋豬 (Thai basil Chili pork-salty)", price: "260" },
        { name: "貓王花生醬培根 (Elvis peanut butter bacon)", price: "260" },
        { name: "雙蛋明太子鮭魚 (Mentaiko salmon & 2 eggs)", price: "290" },
        { name: "西班牙生火腿佐芝麻葉 (Spanish Jamón Mentaiko & Arugula)", price: "290" },
      ],
    },
  ],
};

export default function Menu() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/10 pb-16">
      {/* Navigation Bar */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="mr-2 rounded-full hover:bg-primary/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Coffee className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg tracking-tight">妳有咖啡 neo cafe</span>
          </div>
        </div>
      </header>

      {/* Header Section */}
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary">精選菜單 Menu</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          為您準備最用心的飲品與餐點，享受悠閒的咖啡廳時光。
        </p>
      </div>

      {/* Menu Content */}
      <div className="container mx-auto px-4 max-w-4xl">
        <Tabs defaultValue="drinks" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-14 rounded-full bg-muted/50 p-1 shadow-inner mb-8">
            <TabsTrigger value="drinks" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm text-base">
              <Coffee className="w-4 h-4 mr-2" />
              飲品 Drinks
            </TabsTrigger>
            <TabsTrigger value="food" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm text-base">
              <UtensilsCrossed className="w-4 h-4 mr-2" />
              餐點 Food
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drinks" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {menuData.drinks.map((category, index) => (
              <div key={index} className="space-y-4">
                <div className="flex items-baseline gap-3 mb-2 border-b border-border/50 pb-2">
                  <h2 className="text-2xl font-semibold tracking-tight">{category.category}</h2>
                  {category.note && (
                    <span className="text-sm text-muted-foreground font-medium bg-secondary/50 px-2 py-1 rounded-md">
                      {category.note}
                    </span>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {category.items.map((item, itemIdx) => (
                    <Card key={itemIdx} className="overflow-hidden border-border/40 bg-card hover:bg-accent/5 transition-colors group shadow-sm">
                      <CardContent className="p-4 flex justify-between items-start gap-4">
                        <div className="space-y-1.5 flex-1">
                          <h3 className="font-medium text-lg leading-tight group-hover:text-primary transition-colors">
                            {item.name}
                          </h3>
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 rounded-sm font-normal">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="font-semibold text-primary/90 whitespace-nowrap">
                          ${item.price}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="food" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {menuData.food.map((category, index) => (
              <div key={index} className="space-y-4">
                <div className="flex items-baseline gap-3 mb-2 border-b border-border/50 pb-2">
                  <h2 className="text-2xl font-semibold tracking-tight">{category.category}</h2>
                  {category.note && (
                    <span className="text-sm text-muted-foreground font-medium bg-secondary/50 px-2 py-1 rounded-md">
                      {category.note}
                    </span>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {category.items.map((item, itemIdx) => (
                    <Card key={itemIdx} className="overflow-hidden border-border/40 bg-card hover:bg-accent/5 transition-colors group shadow-sm">
                      <CardContent className="p-4 flex justify-between items-start gap-4">
                        <div className="space-y-1.5 flex-1">
                          <h3 className="font-medium text-lg leading-tight group-hover:text-primary transition-colors">
                            {item.name}
                          </h3>
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 rounded-sm font-normal">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="font-semibold text-primary/90 whitespace-nowrap">
                          ${item.price}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
