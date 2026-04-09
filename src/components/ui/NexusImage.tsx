
import React, { useState, ImgHTMLAttributes } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '../../utils/cn' // Assuming utility is here, will adjust if needed

interface NexusImageProps extends ImgHTMLAttributes<HTMLImageElement> {
    fallbackIcon?: React.ReactNode
}

export const NexusImage: React.FC<NexusImageProps> = ({
    src,
    alt,
    className,
    fallbackIcon,
    ...props
}) => {
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

    const handleLoad = () => {
        setStatus('loaded')
    }

    const handleError = () => {
        setStatus('error')
    }

    return (
        <div className={cn("relative overflow-hidden", className)}>
            {/* 1. Loading State: Skeleton Pulse */}
            {status === 'loading' && (
                <div className="absolute inset-0 bg-[#1e1e1e] animate-pulse z-10" />
            )}

            {/* 2. Error State: Placeholder */}
            {status === 'error' ? (
                <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e] border border-white/5">
                    {fallbackIcon || <ImageOff className="w-[40%] h-[40%] text-zinc-700" />}
                </div>
            ) : (
                /* 3. Normal Image */
                <img
                    src={src}
                    alt={alt}
                    className={cn(
                        "w-full h-full object-cover transition-opacity duration-300",
                        status === 'loaded' ? "opacity-100" : "opacity-0"
                    )}
                    onLoad={handleLoad}
                    onError={handleError}
                    {...props}
                />
            )}
        </div>
    )
}
