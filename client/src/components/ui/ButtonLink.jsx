import { Link } from 'react-router-dom';

const VARIANTS = {
  primary:
    'bg-blue-700 text-white shadow-sm hover:bg-blue-800 focus-visible:outline-blue-700',
  secondary:
    'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-blue-700',
  danger:
    'bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus-visible:outline-rose-600',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-blue-700',
}; 
  
const SIZES = {  
  sm: 'h-8 px-2.5 text-xs',  
  md: 'h-9 px-3.5 text-sm',  
  lg: 'h-11 px-5 text-sm',  
};  
  
export function buttonClasses({  
  variant = 'primary',  
  size = 'md',  
  className = '',  
} = {}) {  
  return `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${VARIANTS[variant] ?? VARIANTS.primary} ${SIZES[size] ?? SIZES.md} ${className}`;  
}  
  
export default function ButtonLink({  
  to,  
  children,  
  variant = 'primary',  
  size = 'md',  
  className = '',  
  ...props  
}) {  
  return (  
    <Link to={to} className={buttonClasses({ variant, size, className })} {...props}>  
      {children}  
    </Link>  
  );  
}  
