'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import { AlertCircle, Copy, RefreshCw, Save, Zap } from 'lucide-react'

// Types
interface NewsItem {
  headline: string
  source: string
  date: string
  summary: string
  key_takeaway: string
  url: string
  relevance_score: number
}

interface SearchMetadata {
  queries_executed: string[]
  total_results_found: number
  results_selected: number
  search_timestamp: string
}

interface NewsResponse {
  news_summary: NewsItem[]
  search_metadata: SearchMetadata
  confidence: number
}

interface PersonalityProfile {
  tone: string
  formality_level: 'formal' | 'semi-formal' | 'informal' | 'very casual'
  vocabulary_style: string
  emoji_usage: string
  sentence_structure: string
  humor_style: string
  engagement_style: string
  key_phrases: string[]
  topic_angles: Record<string, string>
}

interface PersonalityResponse {
  personality_profile: PersonalityProfile
  confidence: number
  analysis_summary: string
}

interface DraftMetadata {
  character_count: number
  emoji_count: number
  tone_match: number
  personality_alignment: number
  engagement_potential: number
  news_sources_used: string[]
}

interface DraftResponse {
  draft_message: string
  metadata: DraftMetadata
  confidence: number
  generation_notes: string
}

interface WorkflowResult {
  news: NewsResponse | null
  personality: PersonalityResponse | null
  draft: DraftResponse | null
  loading: boolean
  error: string | null
}

// Main Component
export default function HomePage() {
  const [result, setResult] = useState<WorkflowResult>({
    news: null,
    personality: null,
    draft: null,
    loading: false,
    error: null,
  })
  const [copied, setCopied] = useState(false)

  const AGENT_IDS = {
    news: '690443fbe26dd0e0368525c4',
    personality: '6904440fe26dd0e0368525c5',
    draft: '6904441bcb70cd01d307c50e',
  }

  async function callAgent(agentId: string, message: string) {
    const response = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        agent_id: agentId,
      }),
    })

    const data = await response.json()
    if (!data.success) throw new Error('Agent call failed')
    return data.response
  }

  async function handleGenerateDraft() {
    setResult((prev) => ({ ...prev, loading: true, error: null }))

    try {
      // Step 1: Get AI News
      const newsData = await callAgent(
        AGENT_IDS.news,
        'Search for the latest AI and Lyzr news articles. Focus on recent developments, breakthroughs, and industry updates. Return structured JSON with headlines, sources, dates, summaries, key takeaways, URLs, and relevance scores.'
      )

      const newsResult: NewsResponse =
        typeof newsData === 'string' ? JSON.parse(newsData) : newsData

      // Step 2: Get Personality Profile
      const personalityData = await callAgent(
        AGENT_IDS.personality,
        'Analyze the tone, style, and communication patterns for a Discord community manager sharing tech news. Create a comprehensive personality profile including formality, vocabulary, emoji usage, humor style, engagement approach, key phrases, and topic angles. Return structured JSON format.'
      )

      const personalityResult: PersonalityResponse =
        typeof personalityData === 'string'
          ? JSON.parse(personalityData)
          : personalityData

      // Step 3: Generate Discord Draft
      const newsContext = JSON.stringify(newsResult.news_summary.slice(0, 3))
      const personalityContext = JSON.stringify(
        personalityResult.personality_profile
      )

      const draftData = await callAgent(
        AGENT_IDS.draft,
        `Using this personality profile: ${personalityContext}\n\nAnd these news items: ${newsContext}\n\nGenerate an engaging Discord message that incorporates 2-3 news items. Match the personality profile exactly. Include appropriate markdown formatting and structure the message for maximum engagement in a Discord channel. Return JSON with the draft message and detailed metadata.`
      )

      const draftResult: DraftResponse =
        typeof draftData === 'string' ? JSON.parse(draftData) : draftData

      setResult({
        news: newsResult,
        personality: personalityResult,
        draft: draftResult,
        loading: false,
        error: null,
      })
    } catch (err) {
      setResult((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to generate draft',
      }))
    }
  }

  async function handleRegenerateDraft() {
    if (!result.news || !result.personality) return

    setResult((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const newsContext = JSON.stringify(result.news.news_summary.slice(0, 3))
      const personalityContext = JSON.stringify(
        result.personality.personality_profile
      )

      const draftData = await callAgent(
        AGENT_IDS.draft,
        `Using this personality profile: ${personalityContext}\n\nAnd these news items: ${newsContext}\n\nGenerate a NEW and DIFFERENT engaging Discord message. Use a fresh approach while maintaining the personality profile. Return JSON with the draft message and detailed metadata.`
      )

      const draftResult: DraftResponse =
        typeof draftData === 'string' ? JSON.parse(draftData) : draftData

      setResult((prev) => ({
        ...prev,
        draft: draftResult,
        loading: false,
      }))
    } catch (err) {
      setResult((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to regenerate draft',
      }))
    }
  }

  async function handleSaveDraft() {
    if (!result.draft) return

    const timestamp = new Date().toISOString()
    const savedData = {
      draft: result.draft.draft_message,
      metadata: result.draft.metadata,
      timestamp,
      personality: result.personality,
      news: result.news?.news_summary,
    }

    const blob = new Blob([JSON.stringify(savedData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `discord-draft-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleCopyDraft() {
    if (!result.draft) return
    navigator.clipboard.writeText(result.draft.draft_message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-purple-900/50 bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="mx-auto max-w-7xl px-8 py-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Content Coordinator Manager
          </h1>
          <p className="text-gray-400">
            AI-powered Discord content generation with personality & news insights
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-8 py-8">
        {/* Error Alert */}
        {result.error && (
          <div className="mb-8 flex items-start gap-4 rounded-lg border border-red-500/50 bg-red-950/20 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-400">Error</h3>
              <p className="text-sm text-red-300">{result.error}</p>
            </div>
          </div>
        )}

        {/* Three Column Layout */}
        <div className="grid grid-cols-3 gap-8">
          {/* Left: News Feed */}
          <div className="col-span-1">
            <Card className="border-purple-900/50 bg-slate-900 h-full">
              <CardHeader className="border-b border-purple-900/30">
                <CardTitle className="text-xl font-bold text-white">
                  AI News Feed
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {result.loading && (
                  <div className="flex items-center justify-center p-8">
                    <Spinner className="h-6 w-6" />
                  </div>
                )}
                {!result.loading && !result.news && (
                  <div className="p-6 text-center text-gray-400">
                    Click "Generate Draft" to fetch latest news
                  </div>
                )}
                {result.news && (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4 p-4">
                      {result.news.news_summary.map((item, idx) => (
                        <div
                          key={idx}
                          className="space-y-2 rounded-lg border border-purple-800/30 bg-slate-800/50 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-purple-300 line-clamp-2">
                              {item.headline}
                            </h4>
                            <span className="flex-shrink-0 rounded bg-purple-900/50 px-2 py-1 text-xs text-purple-200">
                              {(item.relevance_score * 100).toFixed(0)}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{item.source}</p>
                          <p className="text-xs text-gray-300 line-clamp-2">
                            {item.summary}
                          </p>
                          <p className="text-xs font-semibold text-purple-400">
                            {item.key_takeaway}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Center: Generate Panel */}
          <div className="col-span-1 flex flex-col gap-8">
            {/* Generate Button Panel */}
            <Card className="border-purple-900/50 bg-slate-900">
              <CardHeader className="border-b border-purple-900/30">
                <CardTitle className="text-xl font-bold text-white">
                  Generator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <Button
                  onClick={handleGenerateDraft}
                  disabled={result.loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold h-12"
                >
                  <Zap className="mr-2 h-5 w-5" />
                  {result.loading ? 'Generating...' : 'Generate Draft'}
                </Button>

                {result.draft && (
                  <>
                    <Button
                      onClick={handleRegenerateDraft}
                      disabled={result.loading}
                      variant="outline"
                      className="w-full border-purple-700 text-purple-300 hover:bg-purple-900/20"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate
                    </Button>
                    <Button
                      onClick={handleCopyDraft}
                      variant="outline"
                      className="w-full border-blue-700 text-blue-300 hover:bg-blue-900/20"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {copied ? 'Copied!' : 'Copy Draft'}
                    </Button>
                    <Button
                      onClick={handleSaveDraft}
                      variant="outline"
                      className="w-full border-green-700 text-green-300 hover:bg-green-900/20"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save JSON
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Personality Profile Panel */}
            {result.personality && (
              <Card className="border-purple-900/50 bg-slate-900">
                <CardHeader className="border-b border-purple-900/30">
                  <CardTitle className="text-lg font-bold text-white">
                    Personality Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Tone</p>
                    <p className="text-gray-300">
                      {result.personality.personality_profile.tone}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Formality</p>
                    <p className="text-gray-300">
                      {result.personality.personality_profile.formality_level}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">
                      Key Phrases
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {result.personality.personality_profile.key_phrases.map(
                        (phrase, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 rounded text-xs bg-purple-900/40 text-purple-300"
                          >
                            {phrase}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Confidence</p>
                    <p className="text-purple-300 font-semibold">
                      {(result.personality.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Discord Draft Preview */}
          <div className="col-span-1">
            <Card className="border-blue-900/50 bg-slate-900 h-full flex flex-col">
              <CardHeader className="border-b border-blue-900/30">
                <CardTitle className="text-xl font-bold text-white">
                  Discord Draft
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 flex flex-col">
                {result.loading && (
                  <div className="flex items-center justify-center p-8">
                    <Spinner className="h-6 w-6" />
                  </div>
                )}
                {!result.loading && !result.draft && (
                  <div className="flex-1 flex items-center justify-center p-6 text-center text-gray-400">
                    Draft preview will appear here
                  </div>
                )}
                {result.draft && (
                  <Tabs defaultValue="preview" className="flex-1 flex flex-col">
                    <TabsList className="mx-4 mt-4 bg-slate-800 border border-slate-700">
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                      <TabsTrigger value="metrics">Metrics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="preview" className="flex-1 p-4">
                      <ScrollArea className="h-full">
                        <div className="rounded-lg bg-slate-800 p-4 border border-slate-700 space-y-4">
                          <div className="space-y-3 text-sm text-white leading-relaxed whitespace-pre-wrap">
                            {result.draft.draft_message}
                          </div>
                          <div className="border-t border-slate-700 pt-3 text-xs text-gray-400">
                            <p className="font-semibold text-gray-300 mb-1">
                              Notes:
                            </p>
                            <p>{result.draft.generation_notes}</p>
                          </div>
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="metrics" className="flex-1 p-4">
                      <ScrollArea className="h-full">
                        <div className="space-y-3">
                          <MetricItem
                            label="Characters"
                            value={result.draft.metadata.character_count}
                          />
                          <MetricItem
                            label="Emoji Count"
                            value={result.draft.metadata.emoji_count}
                          />
                          <MetricBar
                            label="Tone Match"
                            value={result.draft.metadata.tone_match}
                          />
                          <MetricBar
                            label="Personality Alignment"
                            value={result.draft.metadata.personality_alignment}
                          />
                          <MetricBar
                            label="Engagement Potential"
                            value={result.draft.metadata.engagement_potential}
                          />
                          <MetricBar
                            label="Overall Confidence"
                            value={result.draft.confidence}
                          />
                          <div className="rounded-lg bg-slate-800 p-3 border border-slate-700">
                            <p className="text-xs text-gray-500 uppercase mb-2">
                              Sources
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {result.draft.metadata.news_sources_used.map(
                                (source, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 rounded text-xs bg-blue-900/40 text-blue-300"
                                  >
                                    {source}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// Metric Item Component
function MetricItem({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-lg bg-slate-800 p-3 border border-slate-700">
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className="text-lg font-semibold text-white mt-1">{value}</p>
    </div>
  )
}

// Metric Bar Component
function MetricBar({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-lg bg-slate-800 p-3 border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500 uppercase">{label}</p>
        <p className="text-sm font-semibold text-purple-300">
          {(value * 100).toFixed(0)}%
        </p>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  )
}
