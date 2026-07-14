import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";

export default function LandingPage() {
  return <main className="landing">
    <div className="landing__grain" aria-hidden="true" />
    <header className="landing__header"><Wordmark /><span className="landing__edition">Independent digital atelier · 2026</span></header>
    <section className="landing__hero">
      <p className="eyebrow">Build in progress</p>
      <h1>Ideas are taking<br /><i>their first form.</i></h1>
      <p className="landing__copy">A studio for new creative instruments.</p>
      <Link className="origin-button origin-button--large" href="/studio">Enter the studio <ArrowUpRight size={18} aria-hidden="true" /></Link>
    </section>
    <footer className="landing__footer"><span>Origin / 01</span><span>Made for the unfinished thought.</span></footer>
  </main>;
}
