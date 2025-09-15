import Header from '@/components/Header'
import SearchForm from '@/components/SearchForm'
import ResultsSection from '@/components/ResultsSection'

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-black transition-colors">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <SearchForm />
        <ResultsSection />
      </div>
    </main>
  )
}
