interface HashtagFooterProps {
  tags?: string[];
  className?: string;
}

const DEFAULT_TAGS = ["NOSLEEP", "NOEXCUSES", "HUSTLE"];

export function HashtagFooter({ tags = DEFAULT_TAGS, className }: HashtagFooterProps) {
  return (
    <div
      className={className}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 400,
        color: "var(--sosa-white-20)",
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        lineHeight: 1,
      }}
    >
      {tags.map((tag, i) => (
        <span key={tag}>
          {i > 0 && <span style={{ margin: "0 6px", opacity: 0.5 }}>×</span>}
          #{tag}
        </span>
      ))}
    </div>
  );
}
