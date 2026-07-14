import { Wordmark } from "@/components/brand/wordmark";
import { ProductCard } from "@/components/studio/product-card";

export const metadata = { title: "Studio" };
export default function StudioPage() {
  return <main className="studio-page">
    <header className="studio-header"><Wordmark /><span>Choose an instrument</span></header>
    <section className="studio-intro"><p className="eyebrow">The studio floor</p><h1>Three rooms.<br /><i>One origin.</i></h1></section>
    <section className="product-grid" aria-label="Origin products">
      <ProductCard index="01" name="Origin Frame" description="Plan, generate and edit cinematic scenes." type="frame" href="/studio/frame" />
      <ProductCard index="02" name="Origin Sites" description="A no-code workshop for expressive websites." type="sites" comingSoon />
      <ProductCard index="03" name="Origin Garage" description="A dimensional space for building in 3D." type="garage" comingSoon />
    </section>
  </main>;
}
