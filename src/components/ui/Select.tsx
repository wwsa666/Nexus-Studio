import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { useScrollSave } from '../../hooks/useScrollSave'

interface SelectProps {
    label?: string
    value: string
    onChange: (value: string) => void
    options: string[]
    placeholder?: string
    disabled?: boolean
    scrollKey?: string // Unique key for scroll persistence
}

export function Select({ label, value, onChange, options, placeholder = "Select...", disabled = false, scrollKey }: SelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    // Optional Scroll Persistence
    // If scrollKey is provided, use the hook. Otherwise use null ref.
    // We can't conditionally call hooks, so we always call it, but key depends on prop.
    // Making the key specific ensures it doesn't collide if scrollKey is undefined (though undefined key might be tricky).
    // Let's rely on scrollKey being passed if persistence is desired.
    // If empty key, useScrollSave handles it gracefully? Should probably handle undefined key in hook effectively, 
    // or just pass a dummy key that won't save anything meaningful if not provided.
    // Actually, safer: useScrollSave handles empty string? Hook signature expects string. 
    // Let's just use it if scrollKey is provided.

    // We can use a derived key. If scrollKey is missing, we can pass a random/dummy or empty.
    // But we need the ref to attach to the list div.

    const { ref: listRef, handleScroll } = useScrollSave<HTMLDivElement>(scrollKey || 'select-dummy-key', [isOpen, options.length])

    // Effect for "Click Outside" to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const selectedLabel = value || placeholder

    return (
        <div className="relative" ref={ref}>
            {label && <label className="block text-sm text-text-muted mb-2">{label}</label>}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full bg-app border rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between transition-colors ${disabled ? 'opacity-50 cursor-not-allowed border-border-default' :
                    isOpen ? 'border-primary' : 'border-border-default hover:border-text-muted'
                    }`}
            >
                <span className={`truncate ${value ? "text-text-main" : "text-text-dim"}`}>
                    {selectedLabel.replace(/\.[^/.]+$/, '')}
                </span>
                <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div
                    ref={scrollKey ? listRef : null}
                    onScroll={scrollKey ? handleScroll : undefined}
                    className="absolute z-50 w-full mt-1 bg-elevated border border-border-default rounded-lg shadow-xl max-h-[180px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
                >
                    {options.length > 0 ? (
                        options.map((opt) => (
                            <div
                                key={opt}
                                onClick={() => { onChange(opt); setIsOpen(false) }}
                                className={`px-3 py-2 text-sm cursor-pointer hover:bg-primary/20 hover:text-primary flex items-center justify-between group ${value === opt ? 'bg-primary/10 text-primary' : 'text-text-main'}`}
                            >
                                <span className="truncate">{opt.replace(/\.[^/.]+$/, '')}</span>
                                {value === opt && <Check className="w-3 h-3" />}
                            </div>
                        ))
                    ) : (
                        <div className="px-3 py-2 text-sm text-text-dim text-center">No options</div>
                    )}
                </div>
            )}
        </div>
    )
}
