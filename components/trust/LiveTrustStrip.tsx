"use client";

const TRUST_BRANDS = [
  { name: "Apple", mark: "A" },
  { name: "Tesla", mark: "T" },
  { name: "Nike", mark: "N" },
  { name: "Samsung", mark: "S" },
  { name: "Sony", mark: "S" },
  { name: "Porsche", mark: "P" },
  { name: "NVIDIA", mark: "N" },
  { name: "Adobe", mark: "A" },
  { name: "Microsoft", mark: "M" },
  { name: "Rolex", mark: "R" },
] as const;

type Props = {
  className?: string;
};

export default function LiveTrustStrip({ className = "" }: Props) {
  const row = [...TRUST_BRANDS, ...TRUST_BRANDS];
  return (
    <section
      className={`qa-market-galaxy ${className}`}
      aria-label="Trusted merchant network"
    >
      <div className="qa-market-galaxy-head">
        <p className="qa-market-galaxy-overline">Market galaxy</p>
        <p className="qa-market-galaxy-title">Trusted merchant network</p>
      </div>
      <div className="qa-market-galaxy-track-wrap">
        <div className="qa-market-galaxy-track">
          {row.map((brand, idx) => (
            <span key={`${brand.name}-${idx}`} className="qa-market-galaxy-chip">
              <span className="qa-market-galaxy-chip-mark" aria-hidden>{brand.mark}</span>
              <span>{brand.name}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
