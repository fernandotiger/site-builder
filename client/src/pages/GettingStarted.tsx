import { useEffect, useState, useRef } from 'react'
import { Loader2Icon, PlayIcon, XIcon, BookOpenIcon, ChevronRightIcon, SparklesIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import api from '@/configs/axios'
import { toast } from 'sonner'

interface Tutorial {
  id: string
  title: string
  description: string
  youtubeUrl: string
  category: string
  order: number
}

const getYouTubeId = (url: string): string => {
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? match[2] : ''
}

const getYouTubeThumbnail = (url: string): string => {
  const id = getYouTubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : ''
}

const GettingStarted = () => {
  const [tutorials, setTutorials] = useState<Tutorial[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [heroLoaded, setHeroLoaded] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Replace with your actual welcome/hero video YouTube URL
  const HERO_VIDEO_URL = 'https://www.youtube.com/embed/dQw4w9WgXcQ'

  const fetchTutorials = async () => {
    try {
      const { data } = await api.get('/api/tutorials')
      setTutorials(data.tutorials)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTutorials()
    setTimeout(() => setHeroLoaded(true), 100)
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedTutorial(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (selectedTutorial) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [selectedTutorial])

  const categories = ['All', ...Array.from(new Set(tutorials.map(t => t.category)))]

  const filtered = activeCategory === 'All'
    ? tutorials
    : tutorials.filter(t => t.category === activeCategory)

  return (
    <>
      <div className='min-h-screen px-4 md:px-16 lg:px-24 xl:px-32 pb-16'>

        {/* ─── Hero Section ─── */}
        <div
          className={`pt-12 pb-10 transition-all duration-700 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <div className='flex items-center gap-2 mb-2'>
            <SparklesIcon className='size-4 text-indigo-400' />
            <span className='text-indigo-400 text-sm font-medium tracking-wide uppercase'>Getting Started</span>
          </div>
          <h1 className='text-3xl md:text-4xl font-semibold text-white mb-2'>
            Welcome to the platform
          </h1>
          <p className='text-gray-400 text-base max-w-xl'>
            Watch the overview below, then explore our step-by-step tutorials to get the most out of every feature.
          </p>
        </div>

        {/* ─── Hero Video ─── */}
        <div
          className={`relative rounded-2xl overflow-hidden border border-gray-700 shadow-2xl shadow-indigo-950/40 mb-16 transition-all duration-700 delay-150 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          {/* Glow effect */}
          <div className='absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-purple-900/10 pointer-events-none z-10 rounded-2xl' />
          <div className='aspect-video w-full bg-gray-900'>
            <iframe
              src={HERO_VIDEO_URL}
              title='Platform Welcome'
              className='w-full h-full'
              allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
              allowFullScreen
            />
          </div>
        </div>

        {/* ─── Tutorials Section ─── */}
        <div className={`transition-all duration-700 delay-300 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6'>
            <div className='flex items-center gap-2'>
              <BookOpenIcon className='size-5 text-indigo-400' />
              <h2 className='text-xl font-semibold text-white'>Feature Tutorials</h2>
            </div>

            {/* Category filter pills */}
            {categories.length > 1 && (
              <div className='flex flex-wrap gap-2'>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 text-xs rounded-full border transition-all duration-200 ${
                      activeCategory === cat
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'border-gray-700 text-gray-400 hover:border-indigo-600 hover:text-white bg-gray-900/40'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className='flex items-center justify-center h-48'>
              <Loader2Icon className='size-7 animate-spin text-indigo-400' />
            </div>
          ) : filtered.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-48 text-gray-500'>
              <BookOpenIcon className='size-10 mb-3 opacity-30' />
              <p>No tutorials available yet.</p>
            </div>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
              {filtered.map((tutorial, i) => (
                <TutorialCard
                  key={tutorial.id}
                  tutorial={tutorial}
                  index={i}
                  onClick={() => setSelectedTutorial(tutorial)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Video Modal ─── */}
      {selectedTutorial && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center p-4'
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedTutorial(null) }}
        >
          {/* Backdrop */}
          <div className='absolute inset-0 bg-black/80 backdrop-blur-sm' />

          {/* Modal */}
          <div
            ref={modalRef}
            className='relative z-10 w-full max-w-3xl bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 animate-modal-in'
          >
            {/* Header */}
            <div className='flex items-start justify-between p-5 pb-4'>
              <div>
                <span className='text-xs text-indigo-400 font-medium uppercase tracking-wide'>{selectedTutorial.category}</span>
                <h3 className='text-lg font-semibold text-white mt-0.5 pr-8'>{selectedTutorial.title}</h3>
                {selectedTutorial.description && (
                  <p className='text-sm text-gray-400 mt-1'>{selectedTutorial.description}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedTutorial(null)}
                className='shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all'
              >
                <XIcon className='size-5' />
              </button>
            </div>

            {/* Video */}
            <div className='aspect-video w-full bg-black'>
              <iframe
                src={`https://www.youtube.com/embed/${getYouTubeId(selectedTutorial.youtubeUrl)}?autoplay=1&rel=0`}
                title={selectedTutorial.title}
                className='w-full h-full'
                allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                allowFullScreen
              />
            </div>

            {/* Footer hint */}
            <div className='px-5 py-3 text-xs text-gray-600 text-center border-t border-gray-800'>
              Press <kbd className='px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono text-[11px]'>Esc</kbd> or click outside to close
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
        .animate-modal-in { animation: modal-in 0.22s ease-out both; }
      `}</style>

      <Footer />
    </>
  )
}

// ─── Tutorial Card ────────────────────────────────────────────────────────────
interface TutorialCardProps {
  tutorial: Tutorial
  index: number
  onClick: () => void
}

const TutorialCard = ({ tutorial, index, onClick }: TutorialCardProps) => {
  const thumbnail = getYouTubeThumbnail(tutorial.youtubeUrl)

  return (
    <button
      onClick={onClick}
      className='group text-left w-full bg-gray-900/60 border border-gray-700 rounded-xl overflow-hidden hover:border-indigo-700/70 hover:shadow-lg hover:shadow-indigo-950/30 transition-all duration-300'
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Thumbnail */}
      <div className='relative w-full aspect-video bg-gray-800 overflow-hidden'>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={tutorial.title}
            className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-105'
          />
        ) : (
          <div className='w-full h-full flex items-center justify-center text-gray-600'>
            <PlayIcon className='size-10 opacity-30' />
          </div>
        )}
        {/* Play overlay */}
        <div className='absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
          <div className='size-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center'>
            <PlayIcon className='size-5 text-white fill-white ml-0.5' />
          </div>
        </div>
        {/* Category badge */}
        <span className='absolute top-2 left-2 px-2 py-0.5 text-[10px] font-medium bg-gray-900/80 backdrop-blur-sm border border-gray-700 text-gray-300 rounded-full'>
          {tutorial.category}
        </span>
      </div>

      {/* Content */}
      <div className='p-4'>
        <div className='flex items-start justify-between gap-2'>
          <h3 className='text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug'>
            {tutorial.title}
          </h3>
          <ChevronRightIcon className='size-4 text-gray-600 group-hover:text-indigo-400 shrink-0 mt-0.5 transition-colors' />
        </div>
        {tutorial.description && (
          <p className='text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed'>
            {tutorial.description}
          </p>
        )}
      </div>
    </button>
  )
}

export default GettingStarted
