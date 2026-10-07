/** The approved leaf O is already part of the wordmark: never pair it with a second O. */
export function BrandWordmark() {
  return <span className="brand-wordmark" role="img" aria-label="Olive" />;
}

export function BrandIllustration({ name, className = '' }: {
  name: 'support' | 'timing' | 'care' | 'records';
  className?: string;
}) {
  return <img src={`/branding/illustration-${name}.webp`} alt="" aria-hidden="true"
    width="360" height="360" className={`brand-illustration ${className}`} decoding="async" />;
}
