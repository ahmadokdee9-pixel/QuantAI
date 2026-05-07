"use client";

import { useMemo, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import SearchBox from "../components/SearchBox";
import { calculateAIScore } from "./api/search/lib/aiScoring";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
type Product = {
  id: number;
  title: string;
  store: string;
  price: number;
  rating: number | string;
  link: string;
  image: string;
};

export default function Home() {
  const { isSignedIn } = useUser();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState("best");
  const [maxPrice, setMaxPrice] = useState("");
  const [saved, setSaved] = useState<Product[]>([]);
  const [question, setQuestion] = useState("")
const [aiReply, setAiReply] = useState("");
async function testSupabase() {
 
  const { data, error } = await supabase
    .from("products")
    .select("*");

  setProducts(data || []);
}
useEffect(() => {
  testSupabase();
}, []);
  function ratingValue(rating: number | string) {
    const n = Number(rating);
    return Number.isFinite(n) ? n : 0;
  }

  function getScore(p: Product) {
    let score = 50;
    const rating = ratingValue(p.rating);

    if (p.price < 300) score += 20;
    else if (p.price < 800) score += 14;
    else if (p.price < 1500) score += 8;

    if (rating >= 4.7) score += 25;
    else if (rating >= 4.4) score += 18;
    else if (rating >= 4) score += 10;

    const store = p.store.toLowerCase();
    if (
      store.includes("amazon") ||
      store.includes("bol") ||
      store.includes("coolblue") ||
      store.includes("mediamarkt") ||
      store.includes("apple")
    ) {
      score += 12;
    }

    return Math.min(100, Math.round(score));
  }

  function decision(score: number) {
    if (score >= 85) return "Buy now";
    if (score >= 70) return "Good choice";
    if (score >= 55) return "Compare first";
    return "Risky";
  }

  function decisionStyle(score: number) {
    if (score >= 85) return "text-emerald-300 border-emerald-300/30 bg-emerald-400/10";
    if (score >= 70) return "text-cyan-300 border-cyan-300/30 bg-cyan-400/10";
    if (score >= 55) return "text-yellow-300 border-yellow-300/30 bg-yellow-400/10";
    return "text-red-300 border-red-300/30 bg-red-400/10";
  }

  function whyImportant(p: Product) {
    const score = getScore(p);

    if (score >= 85) {
      return "This is a strong buy right now. The product has a strong balance of price, rating, and store reliability.";
    }

    if (score >= 70) {
      return "This is a good option, but QuantAI recommends comparing it with cheaper alternatives before buying.";
    }

    if (score >= 55) {
      return "This product is average. It may be better to wait or check other options first.";
    }

    return "This option looks weak compared with other available results. Better to avoid or wait.";
  }

  function smartDecisionText(p: Product) {
    const ai = calculateAIScore(p, sortedProducts)
    const score = ai.score;

    if (score >= 85) {
      return "QuantAI recommends buying this now. The price looks competitive, the rating is strong, and the store signal is reliable compared with other results.";
    }

    if (score >= 70) {
      return "This is a good buying option, but not perfect. Compare delivery, final checkout price, and similar products before making a final decision.";
    }

    if (score >= 55) {
      return "This product is acceptable, but the deal is not strong enough. Waiting or checking alternatives may give you better value.";
    }

    return "QuantAI does not recommend this option right now. The score is weak compared with other products in the search results.";
  }

  const sortedProducts = useMemo(() => {
    let list = [...products];

    if (maxPrice) {
      list = list.filter((p) => p.price <= Number(maxPrice));
    }

    if (sort === "cheap") {
      list.sort((a, b) => a.price - b.price);
    } else if (sort === "rating") {
      list.sort((a, b) => ratingValue(b.rating) - ratingValue(a.rating));
    } else {
      list.sort((a, b) => getScore(b) - getScore(a));
    }

    return list;
  }, [products, sort, maxPrice]);

  const best = sortedProducts[0];

  async function search() {
    if (!query.trim()) return;

    setLoading(true);
    setProducts([]);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (data.products) {
        setProducts(data.products);
      } else {
        alert(data.error || "No products found");
      }
    } catch (e) {
      alert("Search failed");
      console.error(e);
    }

    setLoading(false);
  }

  async function saveProduct(product: Product) {
  if (saved.some((p) => p.link === product.link)) {
    return;
  }

  setSaved([...saved, product]);

  try {
    const res = await fetch("/api/search/save-product", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: product.id,
        title: product.title,
        price: product.price,
        image: product.image,
        link: product.link,
        ai_score: product.rating,
      }),
    });

    const data = await res.json();

    console.log(data);
  } catch (e) {
    console.error(e);
  }
}

  return (
    <main className="min-h-screen bg-[#050713] text-white relative overflow-hidden">
  <div className="absolute inset-0 opacity-80 pointer-events-none">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.2),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.2),transparent_40%)]"></div>
    <div className="absolute inset-0 bg-[linear-gradient(rgba(56,189,248,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.08)_1px,transparent_1px)] ai-grid-motion,linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
  </div>
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black">QuantAI</h1>
          <p className="text-xs text-white/45">Quantitative AI buying decision engine</p>
        </div>

        <div className="hidden md:flex gap-5 text-sm text-white/70 items-center">

  <span className="hover:text-cyan-300 transition cursor-pointer">
    AI Deals
  </span>

  <span className="hover:text-cyan-300 transition cursor-pointer">
    Price Score
  </span>

  <span className="hover:text-cyan-300 transition cursor-pointer">
    Alerts
  </span>

  <span className="hover:text-cyan-300 transition cursor-pointer">
    Pro Tools
  </span>

  
  {isSignedIn ? (
  <UserButton />
) : (
  <SignInButton mode="modal" forceRedirectUrl="/dashboard">
    <button className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition">
      Login
    </button>
  </SignInButton>
)}

  <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 text-white font-bold hover:scale-105 transition-all duration-300 shadow-lg shadow-cyan-500/30">
    Get Started
  </button>

</div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-14 text-center">
        <div className="inline-flex px-4 py-2 rounded-full bg-white/10 border border-white/15 text-sm mb-6">
          ✦ Real-time AI shopping advisor
        </div>

        <h2 className="text-5xl md:text-7xl font-black leading-tight leading-tight tracking-tight bg-gradient-to-r from-cyan-300 via-white to-purple-400 bg-clip-text text-transparent">
          Make smarter buying decisions with QuantAI          <br />
          <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-emerald-300 bg-clip-text text-transparent">
            to buy anything.
          </span>
        </h2>

        <p className="text-white/70 leading-relaxed max-w-2xl mx-auto mt-5">
          QuantAI searches live product results, compares price, rating, and store quality,
          then gives you a clear buying decision.
        </p>

        <div className="max-w-4xl mx-auto mt-10 p-4 rounded-[32px] bg-white/10 border border-white/15 backdrop-blur-2xl shadow-2xl">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search: iPhone 15, gaming laptop, sofa..."
              className="flex-1 bg-white text-black px-5 py-4 rounded-2xl outline-none"
            />

            <button
              onClick={search}
              className="px-8 py-4 rounded-2xl font-black bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-600 shadow-[0_0_25px_rgba(139,92,246,0.6)] hover:shadow-[0_0_45px_rgba(139,92,246,0.9)] transition-all duration-300"
            >
              Analyze with AI            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4 text-xs text-white/60">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3">Live prices</div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3">AI score</div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3">Best decision</div>
            
          </div>
        </div>

        {loading && (
  <div className="mt-8 flex flex-col items-center gap-4">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full border-4 border-cyan-400/20"></div>
      <div className="absolute inset-0 rounded-full border-4 border-t-cyan-300 border-r-purple-400 border-b-transparent border-l-transparent animate-spin"></div>
      <div className="absolute inset-4 rounded-full bg-cyan-300/20 blur-sm"></div>
    </div>

    <p className="text-cyan-200 text-sm animate-pulse">
      QuantAI is scanning live prices, ratings, and store signals...
    </p>
  </div>
)}
      </section>

      {products.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-white/10 border border-white/20 px-4 py-3 rounded-2xl text-sm"
          >
            <option value="best">Best AI Score</option>
            <option value="cheap">Cheapest price</option>
            <option value="rating">Highest rating</option>
          </select>

          <input
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            type="number"
            placeholder="Max price (€)"
            className="bg-white/10 border border-white/20 px-4 py-3 rounded-2xl text-sm"
          />

          <div className="bg-white/10 border border-white/20 px-4 py-3 rounded-2xl text-sm">
            Saved products: {saved.length}
          </div> 
          {saved.length > 0 && (
  <section className="max-w-6xl mx-auto px-6 mt-8">
    <div className="rounded-3xl bg-white/10 border border-cyan-400/20 backdrop-blur-xl p-5">
      <h3 className="text-xl font-extrabold tracking-tight mb-4">
    
       💾 Saved Products
      </h3>

      <div className="flex flex-col gap-4 mt-6">
        
          {saved.map((item) => (
  <div
    key={item.link}
    className="w-full flex flex-col gap-4 rounded-3xl bg-black/20 border border-cyan-400/20 backdrop-blur-xl p-5"
  >
    <div className="flex flex-col gap-4">
      {item.image && (
        <img
          src={item.image}
          alt={item.title}
          className="w-20 h-20 object-contain bg-white rounded-2xl p-2"
        />
      )}

      <div className="flex-1 min-w-0">
        <p className="font-bold line-clamp-2">{item.title}</p>
        <p className="text-emerald-300 font-black mt-1">€{item.price}</p>
        <p className="text-white/50 text-sm">{item.store}</p>
      </div>

      <a
        href={item.link}
        target="_blank"
        className="bg-white text-black px-4 py-2 rounded-xl font-bold"
      >
        View
      </a>
      <button
  onClick={() => {
    setSaved(saved.filter((p) => p.link !== item.link))
  }}
  className="bg-red-500 text-white px-4 py-2 rounded-xl font-bold mt-2"
>
  Remove
</button>
    </div>
  </div>
))}
      </div>
    </div>
  </section>
)}
        </section>
      )}

      {best && !loading && (
        <>
          <section className="max-w-6xl mx-auto px-6 mt-12">
            <div className="relative overflow-hidden rounded-[34px] border border-cyan-300/30 bg-gradient-to-br from-cyan-400/15 via-emerald-400/10 to-violet-400/15 shadow-[0_0_45px_rgba(34,211,238,0.18)] backdrop-blur-2xl p-6 shadow-2xl relative overflow-hidden">
              <p className="text-emerald-300 font-black text-sm mb-4">🏆 BEST AI PICK</p>

              <div className="grid md:grid-cols-[180px_1fr_170px] gap-6 items-center">
                {best.image && (
                  <img
                    src={best.image}
                    alt={best.title}
                    className="w-full h-40 object-contain bg-white rounded-2xl p-3"
                  />
                )}

                <div>
                  <h3 className="text-2xl md:text-3xl font-black">{best.title}</h3>
                  <p className="text-white/60 mt-1">{best.store}</p>
                  <p className="text-5xl font-black text-emerald-300 mt-4">€{best.price}</p>

                  <p className={`inline-flex mt-3 px-3 py-1 rounded-full border text-sm font-black ${decisionStyle(getScore(best))}`}>
                    {decision(getScore(best))}
                  </p>

                  <p className="text-white/70 mt-4 text-sm">
                    {whyImportant(best)}
                  </p>

                  <div className="flex gap-3 mt-5">
                    <a
                      href={best.link}
                      target="_blank"
                      className="bg-white text-black px-5 py-3 rounded-2xl font-black"
                    >
                      View Offer
                    </a>
                    

                    <button
                      onClick={() => saveProduct(best)}
                      className="bg-emerald-400 text-black px-5 py-3 rounded-2xl font-black"
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div className="rounded-3xl bg-black/30 border border-white/10 p-5 text-center">
                  <p className="text-white/50 text-sm">AI Score</p>
                  <p className="text-5xl font-black">{getScore(best)}/100</p>
                </div>
              </div>
            </div>
          </section>

          <section className="max-w-6xl mx-auto px-6 mt-6">
            <div className="rounded-3xl bg-white/10 border border-white/10 p-6 backdrop-blur-xl hover:scale-105 hover:shadow-2xl transition-all duration-300">
              <h3 className="text-xl font-extrabold tracking-tight mb-3">🧠 QuantAI Decision</h3>

              <p className="text-white/70 text-sm leading-relaxed">
                {smartDecisionText(best)}
              </p>

              <div className="mt-5 grid md:grid-cols-3 gap-3 text-xs text-white/65">
                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl">
                  📊 Price signal: analyzed against available search results.
                </div>
                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl">
                  ⭐ Rating signal: higher ratings improve the AI score.
                </div>
                <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl">
                  🏪 Store signal: known stores receive stronger trust weight.
                </div>
              </div>
            </div>
          </section>
          <section className="max-w-6xl mx-auto px-6 mt-8">
  <div className="rounded-3xl bg-purple-400/10 border border-purple-400/20 backdrop-blur-xl p-6">
    <h3 className="text-2xl font-extrabold mb-3">
      🤖 AI Assistant
    </h3>

    <p className="text-white/70 leading-relaxed">
      Ask QuantAI what to do next: compare similar products, wait for a better price,
      check store trust, or find a cheaper alternative.
    </p>

    <div className="grid md:grid-cols-3 gap-4 mt-5">
      <button
  onClick={() =>
    setAiReply(
      "QuantAI found cheaper alternatives with similar ratings. Compare price, store trust, and delivery before buying."
    )
  }
  className="bg-white/10 border border-white/10 rounded-2xl py-3 font-bold hover:bg-white/20 transition"
>
  Compare alternatives
</button>

      <button
  onClick={() =>
    setAiReply(
      "QuantAI recommends buying this product now. Price, rating, and trust score are currently strong."
    )
  }
  className="bg-white/10 border border-white/10 rounded-2xl py-3 font-bold hover:bg-white/20 transition"
>
  Should I buy now?
</button>

      <button
  onClick={() =>
    setAiReply(
      "QuantAI will track this product and notify you when the price becomes a stronger deal."
    )
  }
  className="bg-white/10 border border-white/10 rounded-2xl py-3 font-bold hover:bg-white/20 transition"
>
  Track price drop
</button>
    </div>
  </div>
  

<div className="mt-5 flex gap-3">
  <input
    placeholder="Ask QuantAI anything..."
    value={question}
onChange={(e) => setQuestion(e.target.value)}
    className="flex-1 bg-black/20 border border-white/10 rounded-2xl px-4 py-3 outline-none"
  />

  <button
  onClick={async () => {
  try {
    setAiReply("QuantAI is thinking...");

    const res = await fetch("/api/ai-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        products: sortedProducts,
      }),
    });

    const data = await res.json();

    setAiReply(data.reply);
  } catch (error) {
    setAiReply("QuantAI could not analyze this request.");
  }
}}
  className="bg-cyan-400 text-black px-6 rounded-2xl font-black"
>
    Ask AI
  </button>
</div>
{aiReply && (
  <div className="mt-4 bg-cyan-400/10 border border-cyan-400/20 rounded-2xl p-4 text-sm text-cyan-100">
    {aiReply}
  </div>
)}
</section>
        </>
      )}

      <section className="max-w-6xl mx-auto px-6 mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedProducts.map((p) => {
          const ai = calculateAIScore(p, sortedProducts);
const score = ai.score;

          return (
            <div
  key={p.id}
  className="group rounded-[30px] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-xl p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] hover:-translate-y-2 hover:scale-[1.02] hover:border-cyan-300/40 hover:shadow-[0_0_45px_rgba(34,211,238,0.18)] transition-all duration-300"
>
              {p.image && (
                <div className="bg-white rounded-2xl p-3 mb-4">
                  <img src={p.image} alt={p.title} className="w-full h-40 object-contain transition-transform duration-500 group-hover:scale-110" />
                </div>
              )}

              <h3 className="font-black text-lg line-clamp-2">{p.title}</h3>
              <p className="text-white/55 text-sm mt-1">{p.store}</p>

              <div className="flex justify-between items-end mt-4">
                <p className="text-3xl font-black">€{p.price}</p>
                <span className={`px-3 py-1 rounded-full border text-xs font-black ${decisionStyle(score)}`}>
                  {ai.label}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/65">
                <div className={`px-4 py-3 rounded-2xl border backdrop-blur-xl ${
  score >= 85
    ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-300"
    : score >= 70
    ? "bg-cyan-400/10 border-cyan-400/30 text-cyan-300"
    : score >= 55
    ? "bg-yellow-400/10 border-yellow-400/30 text-yellow-300"
    : "bg-red-400/10 border-red-400/30 text-red-300"
}`}>

  <p className="text-xs opacity-70 mb-1">
    AI Confidence
  </p>

  <p className="text-3xl font-black">
    {ai.score}%
  </p>

</div>
              </div>

              <p className="text-white/60 text-sm mt-4">
                {ai.reason}
              </p>

              <div className="flex gap-2 mt-5">
                <a
                  href={p.link}
                  target="_blank"
                  className="flex-1 bg-white text-black text-center py-3 rounded-2xl font-black"
                >
                  View Offer
                </a>

                <button
                  onClick={() => saveProduct(p)}
                  className="bg-cyan-400/90 text-black px-4 rounded-2xl font-black hover:bg-cyan-300 hover:scale-105 transition-all duration-300 shadow-[0_0_18px_rgba(34,211,238,0.35)]"
                >
                  Save
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <section className="max-w-6xl mx-auto px-6 mt-20 pb-16 grid md:grid-cols-3 gap-5">
        <div className="rounded-3xl bg-white/10 border border-white/10 p-6">
          <h3 className="font-black text-xl">Why AI scoring matters</h3>
          <p className="text-white/55 mt-2 text-sm">
            The cheapest product is not always the best. QuantAI balances price,
            rating, and store trust to reduce bad purchases.
          </p>
        </div>

        <div className="rounded-3xl bg-white/10 border border-white/10 p-6">
          <h3 className="font-black text-xl">Smart Alerts</h3>
          <p className="text-white/55 mt-2 text-sm">
            Soon, users will be able to save products and get notified when the price
            becomes a strong buy.
          </p>
        </div>

        <div className="rounded-3xl bg-white/10 border border-white/10 p-6">
          <h3 className="font-black text-xl">AI Assistant</h3>
          <p className="text-white/55 mt-2 text-sm">
            The next version will let users ask: should I buy now, wait, or choose a safer option?
          </p>
        </div>
      </section>
    <section className="max-w-7xl mx-auto px-6 py-24">

  <div className="text-center mb-16">
    <p className="text-cyan-300 font-semibold mb-3">
      QUANTAI PLANS
    </p>

    <h2 className="text-5xl font-black text-white mb-5">
      Choose your AI power
    </h2>

    <p className="text-white/60 max-w-2xl mx-auto">
      Unlock advanced AI shopping intelligence, price tracking,
      smart alerts, and premium decision tools.
    </p>
  </div>

  <div className="grid md:grid-cols-3 gap-8">

    {/* FREE */}
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 hover:scale-105 transition-all duration-300">

      <h3 className="text-2xl font-black text-white mb-2">
        Free
      </h3>

      <p className="text-white/50 mb-6">
        Perfect for casual users.
      </p>

      <div className="text-5xl font-black text-white mb-6">
        €0
      </div>

      <div className="space-y-4 text-white/70 mb-8">
        <p>✓ Basic AI search</p>
        <p>✓ AI product scores</p>
        <p>✓ Save products</p>
      </div>

      <button className="w-full py-3 rounded-2xl bg-white text-black font-bold hover:scale-105 transition">
        Current Plan
      </button>
    </div>

    {/* PRO */}
    <div className="rounded-3xl border border-cyan-400/30 bg-cyan-400/10 backdrop-blur-xl p-8 scale-105 shadow-[0_0_40px_rgba(34,211,238,0.25)] relative">

      <div className="absolute top-4 right-4 bg-cyan-400 text-black text-xs font-black px-3 py-1 rounded-full">
        MOST POPULAR
      </div>

      <h3 className="text-2xl font-black text-white mb-2">
        Pro
      </h3>

      <p className="text-white/60 mb-6">
        For serious smart buyers.
      </p>

      <div className="text-5xl font-black text-white mb-6">
        €19
        <span className="text-lg text-white/50">/mo</span>
      </div>

      <div className="space-y-4 text-white/80 mb-8">
        <p>✓ Advanced AI analysis</p>
        <p>✓ Real-time smart alerts</p>
        <p>✓ Unlimited saved products</p>
        <p>✓ AI recommendations</p>
        <p>✓ Faster search engine</p>
      </div>

      <a
  href="https://buy.stripe.com/test_14k8wQ8uQ5xM9DWcMM"
  target="_blank"
  className="block w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-purple-500 text-center font-bold"
>
  Upgrade to Pro
</a>
    </div>

    {/* BUSINESS */}
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 hover:scale-105 transition-all duration-300">

      <h3 className="text-2xl font-black text-white mb-2">
        Business
      </h3>

      <p className="text-white/50 mb-6">
        AI tools for teams and companies.
      </p>

      <div className="text-5xl font-black text-white mb-6">
        €99
        <span className="text-lg text-white/50">/mo</span>
      </div>

      <div className="space-y-4 text-white/70 mb-8">
        <p>✓ Team dashboards</p>
        <p>✓ AI market analytics</p>
        <p>✓ API access</p>
        <p>✓ Premium alerts</p>
        <p>✓ Priority support</p>
      </div>

      <button className="w-full py-3 rounded-2xl bg-white text-black font-bold hover:scale-105 transition">
        Contact Sales
      </button>
    </div>

  </div>
  <div className="mt-10">
  <SearchBox />
</div>
</section></main>
  );
}