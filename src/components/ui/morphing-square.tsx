import { cva } from "class-variance-authority";
import { HTMLMotionProps, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const morphingSquareVariants = cva("flex gap-2 items-center justify-center", {
  variants: {
    messagePlacement: {
      bottom: "flex-col",
      top: "flex-col-reverse",
      right: "flex-row",
      left: "flex-row-reverse",
    },
  },
  defaultVariants: {
    messagePlacement: "bottom",
  },
});

export interface MorphingSquareProps {
  message?: string;
  messagePlacement?: "top" | "bottom" | "left" | "right";
  size?: number;
}

export function MorphingSquare({
  className,
  message,
  messagePlacement = "bottom",
  size = 40,
  ...props
}: HTMLMotionProps<"div"> & MorphingSquareProps) {
  return (
    <div className={cn(morphingSquareVariants({ messagePlacement }))}>
      <motion.div
        className={cn("bg-[var(--accent-color)]", className)}
        style={{ width: size, height: size }}
        animate={{
          borderRadius: ["6%", "50%", "6%"],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        {...props}
      />
      {message && (
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-tertiary)",
            letterSpacing: "-0.2px",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
