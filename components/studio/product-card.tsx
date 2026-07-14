import Link from "next/link";
import { ArrowUpRight, Box, Frame, PanelsTopLeft } from "lucide-react";

const icons = { frame: Frame, sites: PanelsTopLeft, garage: Box };
interface ProductCardProps { index: string; name: string; description: string; type: keyof typeof icons; href?: string; comingSoon?: boolean }

export function ProductCard({ index, name, description, type, href, comingSoon }: ProductCardProps) {
  const Icon = icons[type];
  const content = <>
    <div className={`product-card__visual product-card__visual--${type}`}><Icon aria-hidden="true" /><span className="product-card__orbit" /></div>
    <div className="product-card__meta"><span>{index}</span>{comingSoon ? <span className="status-pill">Coming soon</span> : <span className="status-pill status-pill--live">Open</span>}</div>
    <div><h2>{name}</h2><p>{description}</p></div>
    {!comingSoon && <ArrowUpRight className="product-card__arrow" aria-hidden="true" />}
  </>;
  return href ? <Link href={href} className="product-card">{content}</Link> : <article className="product-card product-card--disabled" tabIndex={0} aria-label={`${name}, coming soon`}>{content}</article>;
}
