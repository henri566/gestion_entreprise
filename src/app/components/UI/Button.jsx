'use client';

export default function Button({ 
  children, 
  variant = 'primary', 
  type = 'button', 
  onClick, 
  href, 
  className = '', 
  ...props 
}) {
  const baseStyle = "inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap shadow-sm cursor-pointer disabled:opacity-50 select-none";

  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700 shadow-sm",
    dark: "bg-gray-900 hover:bg-gray-800 text-white shadow-sm",
    danger: "bg-red-50 hover:bg-red-100 text-red-600 border border-red-100",
  };

  const combinedClassName = `${baseStyle} ${variants[variant] || variants.primary} ${className}`;

  if (href) {
    return (
      <a href={href} className={combinedClassName} {...props}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} className={combinedClassName} {...props}>
      {children}
    </button>
  );
}