import React from "react";

type BrandMarkProps = {
  className?: string;
  compact?: boolean;
};

const portraitUrl = "assets/brand-mark.svg";

export function BrandMark({ className = "", compact = false }: BrandMarkProps) {
  return (
    <div className={`brand-mark ${className}`} aria-label="Ferramenta da QA">
      <img src={portraitUrl} alt="Marca da Ferramenta da QA" className="brand-mark__symbol" />
      {!compact && (
        <span className="brand-mark__wordmark">
          <strong>Ferramenta</strong>
          <em>QA</em>
        </span>
      )}
    </div>
  );
}
