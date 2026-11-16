export default function Avatar({ name, size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-12 w-12 text-sm',
  };
  const text = name
    ? name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
    : '?';

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-blue-100 font-semibold text-blue-800 ${sizes[size] ?? sizes.md} ${className}`}
      aria-hidden="true"
    >
      {text}
    </span>
  );
}
