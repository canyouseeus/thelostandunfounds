import { createContext, useContext, useState, ReactNode } from 'react'

interface GalleryContextValue {
    activeGallery: string | null
    openGallery: (slug: string) => void
    closeGallery: () => void
}

const GalleryContext = createContext<GalleryContextValue>({
    activeGallery: null,
    openGallery: () => {},
    closeGallery: () => {},
})

export function GalleryProvider({ children }: { children: ReactNode }) {
    const [activeGallery, setActiveGallery] = useState<string | null>(null)
    return (
        <GalleryContext.Provider value={{
            activeGallery,
            openGallery: (slug) => setActiveGallery(slug),
            closeGallery: () => setActiveGallery(null),
        }}>
            {children}
        </GalleryContext.Provider>
    )
}

export function useGallery() {
    return useContext(GalleryContext)
}
