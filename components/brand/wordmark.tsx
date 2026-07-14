import Link from "next/link";

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return <Link className={`wordmark ${compact ? "wordmark--compact" : ""}`} href="/" aria-label="Origin Studios home"><span className="wordmark__mark" aria-hidden="true">O</span><span>Origin <em>Studios</em></span></Link>;
}
