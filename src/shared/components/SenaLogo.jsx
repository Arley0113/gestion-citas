export function SenaLogo({ size = 40, className, style }) {
  return (
    <img
      src="/sena-logo.png"
      alt="Logo SENA"
      width={size}
      height={size}
      style={{ objectFit: "contain", ...style }}
      className={className}
    />
  );
}
