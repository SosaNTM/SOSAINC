import * as React from "react";
import { cn } from "@/lib/utils";

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ElementType;
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ icon: Icon, className, style, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);

    return (
      <div className="relative">
        {/* Icon */}
        {Icon && (
          <div
            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: focused ? "#4A9EFF" : "#8a8aa0" }}
          >
            <Icon size={18} />
          </div>
        )}

        <input
          ref={ref}
          className={cn(
            "w-full outline-none placeholder:text-gray-400 transition-all duration-200",
            className,
          )}
          style={{
            background: "rgba(255, 255, 255, 0.20)",
            border: focused
              ? "1.5px solid #4A9EFF"
              : "1.5px solid transparent",
            borderRadius: 10,
            padding: "12px 16px",
            paddingLeft: Icon ? 44 : 16,
            fontSize: 14,
            color: "#1a1a2e",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            boxShadow: focused
              ? "0 0 0 3px rgba(74, 158, 255, 0.15)"
              : "none",
            ...style,
          }}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
      </div>
    );
  },
);

GlassInput.displayName = "GlassInput";
