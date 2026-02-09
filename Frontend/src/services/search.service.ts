import { ApiService } from './api'
import logger from '../utils/logger'

export interface SearchResult {
  id: string
  type: 'sample' | 'result' | 'log'
  title: string
  description: string
  timestamp: number
  url: string
  metadata?: Record<string, unknown>
}

interface SearchResponse {
  success: boolean
  data: {
    results: SearchResult[]
    total: number
    query: string
  }
}

class SearchService {
  private api: ApiService
  private searchHistory: string[] = []

  constructor() {
    this.api = new ApiService(window.RESULTS_SERVICE_URL || 'http://localhost:6404')
    this.loadSearchHistory()
  }

  async search(query: string): Promise<SearchResponse> {
    if (!query.trim()) {
      return {
        success: true,
        data: {
          results: [],
          total: 0,
          query: ''
        }
      }
    }

    try {
      this.addToHistory(query)

      const [samplesResults, resultsResults, logsResults] = await Promise.allSettled([
        this.searchSamples(query),
        this.searchResults(query),
        this.searchLogs(query)
      ])

      const allResults: SearchResult[] = []

      if (samplesResults.status === 'fulfilled') {
        allResults.push(...samplesResults.value)
      }

      if (resultsResults.status === 'fulfilled') {
        allResults.push(...resultsResults.value)
      }

      if (logsResults.status === 'fulfilled') {
        allResults.push(...logsResults.value)
      }

      
      allResults.sort((a, b) => {
        const aExactMatch = a.title.toLowerCase().includes(query.toLowerCase())
        const bExactMatch = b.title.toLowerCase().includes(query.toLowerCase())
        if (aExactMatch && !bExactMatch) return -1
        if (!aExactMatch && bExactMatch) return 1
        return b.timestamp - a.timestamp
      })

      return {
        success: true,
        data: {
          results: allResults.slice(0, 20), 
          total: allResults.length,
          query
        }
      }
    } catch (error) {
      logger.error('Search error:', error)
      return {
        success: false,
        data: {
          results: [],
          total: 0,
          query
        }
      }
    }
  }

  private async searchSamples(query: string): Promise<SearchResult[]> {
    try {
      const response = await this.api.get(`/api/v1/result/search/samples?q=${encodeURIComponent(query)}`) as { data: { samples?: unknown[] } }
      return response.data.samples?.map((sample: unknown) => ({
        id: (sample as { id?: string; sampleNo?: string }).id || (sample as { sampleNo?: string }).sampleNo || 'unknown',
        type: 'sample' as const,
        title: (sample as { sampleNo?: string; id?: string }).sampleNo || (sample as { id?: string }).id || 'Unknown Sample',
        description: `Sample: ${(sample as { submissionNo?: string }).submissionNo || 'N/A'} - ${(sample as { description?: string }).description || 'No description'}`,
        timestamp: (sample as { createdAt?: number; timestamp?: number }).createdAt || (sample as { timestamp?: number }).timestamp || Date.now(),
        url: `/results/${(sample as { sampleNo?: string; id?: string }).sampleNo || (sample as { id?: string }).id}`,
        metadata: sample as Record<string, unknown>
      })) || []
    } catch (error) {
      logger.error('Sample search error:', error)
      return []
    }
  }

  private async searchResults(query: string): Promise<SearchResult[]> {
    try {
      const response = await this.api.get(`/api/v1/result/search/results?q=${encodeURIComponent(query)}`) as { data: { results?: unknown[] } }
      return response.data.results?.map((result: unknown) => ({
        id: (result as { id: string }).id,
        type: 'result' as const,
        title: `Result for ${(result as { sampleNo: string }).sampleNo}`,
        description: `Status: ${(result as { status: string }).status} - Confidence: ${(result as { confidence?: number }).confidence || 'N/A'}%`,
        timestamp: (result as { createdAt?: number; timestamp?: number }).createdAt || (result as { timestamp?: number }).timestamp || Date.now(),
        url: `/results/${(result as { sampleNo: string }).sampleNo}`,
        metadata: result as Record<string, unknown>
      })) || []
    } catch (error) {
      logger.error('Result search error:', error)
      return []
    }
  }

  private async searchLogs(query: string): Promise<SearchResult[]> {
    try {
      const response = await this.api.get(`/api/v1/result/logs?search=${encodeURIComponent(query)}`) as { data: { logs?: unknown[] } }
      return response.data.logs?.map((log: unknown) => ({
        id: (log as { id: string }).id,
        type: 'log' as const,
        title: `${(log as { method: string }).method} ${(log as { url: string }).url}`,
        description: (log as { message?: string }).message || `${(log as { statusCode: number }).statusCode} - ${(log as { latencyMs: number }).latencyMs}ms`,
        timestamp: (log as { time: number }).time,
        url: '/logs',
        metadata: log as Record<string, unknown>
      })) || []
    } catch (error) {
      logger.error('Log search error:', error)
      return []
    }
  }

  private addToHistory(query: string) {
    const trimmedQuery = query.trim().toLowerCase()
    if (trimmedQuery && !this.searchHistory.includes(trimmedQuery)) {
      this.searchHistory.unshift(trimmedQuery)
      this.searchHistory = this.searchHistory.slice(0, 10)
      this.saveSearchHistory()
    }
  }

  private loadSearchHistory() {
    try {
      const saved = localStorage.getItem('searchHistory')
      if (saved) {
        this.searchHistory = JSON.parse(saved)
      }
    } catch (error) {
      logger.error('Failed to load search history:', error)
    }
  }

  private saveSearchHistory() {
    try {
      localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory))
    } catch (error) {
      logger.error('Failed to save search history:', error)
    }
  }

  getSearchHistory(): string[] {
    return this.searchHistory
  }

  clearSearchHistory() {
    this.searchHistory = []
    this.saveSearchHistory()
  }

  getSuggestions(query: string): string[] {
    if (!query.trim()) {
      return this.searchHistory.slice(0, 5)
    }

    const lowercaseQuery = query.toLowerCase()
    return this.searchHistory
      .filter(term => term.includes(lowercaseQuery))
      .slice(0, 5)
  }
}

export const searchService = new SearchService()
