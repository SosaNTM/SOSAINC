import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Search, FileText, FolderIcon, Image, FileSpreadsheet, FileArchive, Presentation, File } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export interface SearchResult {
  id: string
  name: string
  type: "file" | "folder"
  fileType?: string
  path: string
}

interface SearchBarProps {
  placeholder?: string
  results?: SearchResult[]
  onQueryChange?: (query: string) => void
  onSelectResult?: (result: SearchResult) => void
}

function getFileIcon(fileType?: string) {
  switch (fileType) {
    case "pdf": return <FileText className="w-4 h-4 text-destructive shrink-0" />
    case "docx": return <FileText className="w-4 h-4 text-blue-500 shrink-0" />
    case "xlsx": return <FileSpreadsheet className="w-4 h-4 text-green-500 shrink-0" />
    case "image": return <Image className="w-4 h-4 text-purple-500 shrink-0" />
    case "pptx": return <Presentation className="w-4 h-4 text-orange-500 shrink-0" />
    case "zip": return <FileArchive className="w-4 h-4 text-yellow-500 shrink-0" />
    default: return <File className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
  }
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

const SearchBar = ({ placeholder = "Search...", results = [], onQueryChange, onSelectResult }: SearchBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isClicked, setIsClicked] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    onQueryChange?.(value)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isFocused) {
      const rect = e.currentTarget.getBoundingClientRect()
      setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setIsClicked(true)
    setTimeout(() => setIsClicked(false), 800)
  }

  useEffect(() => {
    if (isFocused && inputRef.current) inputRef.current.focus()
  }, [isFocused])

  const particles = Array.from({ length: isFocused ? 12 : 0 }, (_, i) => (
    <motion.div
      key={`particle-${i}`}
      className="absolute w-1 h-1 rounded-full bg-primary/30"
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.8, 0],
        scale: [0, 1.5, 0],
        x: [0, (Math.random() - 0.5) * 120],
        y: [0, (Math.random() - 0.5) * 40],
      }}
      transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
      style={{ left: `${10 + Math.random() * 80}%`, top: `${20 + Math.random() * 60}%` }}
    />
  ))

  const showResults = isFocused && searchQuery.trim().length > 0

  return (
    <div className="w-full max-w-xl mx-auto relative">
      <svg className="absolute" style={{ width: 0, height: 0 }}>
        <defs>
          <filter id="gooey-search">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div className="relative" onMouseMove={handleMouseMove} onClick={handleClick}>
        <motion.div
          className={cn(
            "relative flex items-center gap-3 px-5 py-1 rounded-2xl transition-all duration-300 overflow-hidden",
            isFocused
              ? "shadow-lg shadow-primary/5"
              : "hover:border-primary/30"
          )}
          style={{
            border: `0.5px solid var(--glass-border)`,
            background: "var(--glass-bg)",
          }}
          animate={{ scale: isClicked ? [1, 1.01, 1] : 1 }}
          transition={{ duration: 0.3 }}
        >
          {isFocused && (
            <motion.div
              className="absolute inset-0 rounded-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, hsl(var(--primary) / 0.06) 0%, transparent 60%)`,
              }}
            />
          )}

          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none" style={{ filter: "url(#gooey-search)" }}>
            {particles}
          </div>

          {isClicked && (
            <motion.div
              className="absolute inset-0 rounded-2xl"
              initial={{ opacity: 0.3 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              style={{
                background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, hsl(var(--primary) / 0.15) 0%, transparent 50%)`,
              }}
            />
          )}

          <Search className={cn("w-5 h-5 relative z-10 transition-colors shrink-0", isFocused ? "text-primary" : "")} style={{ color: isFocused ? undefined : "var(--text-tertiary)" }} />

          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            className="w-full py-3 bg-transparent outline-none font-medium text-base relative z-10"
            style={{
              color: isFocused ? "var(--text-primary)" : "var(--text-secondary)",
              letterSpacing: isFocused ? "0.01em" : undefined,
            }}
          />

          {isFocused && (
            <motion.div
              className="absolute bottom-0 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
            />
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 right-0 mt-2 py-1.5 rounded-xl backdrop-blur-xl max-h-[360px] overflow-y-auto z-20"
            style={{
              background: "var(--glass-bg-elevated)",
              border: "0.5px solid var(--glass-border)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
              padding: "6px",
            }}
          >
            {results.length > 0 ? (
              <div>
                {results.slice(0, 6).map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      onSelectResult?.(result)
                      setSearchQuery("")
                      onQueryChange?.("")
                      setIsFocused(false)
                    }}
                    className="flex flex-col gap-0.5 px-3.5 py-2.5 cursor-pointer rounded-lg transition-colors"
                    style={{ }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-bg-hover)" }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {result.type === "folder"
                        ? <FolderIcon className="w-4 h-4 text-primary shrink-0" />
                        : getFileIcon(result.fileType)
                      }
                      {highlightMatch(result.name, searchQuery)}
                    </span>
                    <span className="text-xs pl-6" style={{ color: "var(--text-quaternary)" }}>
                      {result.path}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-4 text-center text-sm" style={{ color: "var(--text-quaternary)" }}>
                No files or folders matching "{searchQuery}"
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { SearchBar }
