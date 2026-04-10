import { useEffect } from 'react'
import { BIOMES } from '../lib/biomes'

interface BiomeSelectorProps {
  currentIndex: number
  onBiomeChange: (index: number) => void
}

export default function BiomeSelector({ currentIndex, onBiomeChange }: BiomeSelectorProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '[') {
        onBiomeChange((currentIndex - 1 + BIOMES.length) % BIOMES.length)
      } else if (e.key === ']') {
        onBiomeChange((currentIndex + 1) % BIOMES.length)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [currentIndex, onBiomeChange])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '6rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
        borderRadius: '9999px',
        color: 'white',
        fontSize: '0.875rem',
        fontFamily: 'inherit',
        userSelect: 'none',
        zIndex: 50,
      }}
    >
      <button
        onClick={() => onBiomeChange((currentIndex - 1 + BIOMES.length) % BIOMES.length)}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '1rem',
          padding: '0 0.25rem',
        }}
        aria-label="Previous biome"
      >
        &larr;
      </button>
      <span style={{ minWidth: '120px', textAlign: 'center' }}>
        {BIOMES[currentIndex].name}
      </span>
      <button
        onClick={() => onBiomeChange((currentIndex + 1) % BIOMES.length)}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '1rem',
          padding: '0 0.25rem',
        }}
        aria-label="Next biome"
      >
        &rarr;
      </button>
    </div>
  )
}
