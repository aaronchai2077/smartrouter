/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { PublicLayout } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

const PUBLIC_BASE = 'https://www.octorouter.com'

function getServerAddress(): string {
  try {
    const raw = localStorage.getItem('status')
    if (raw) {
      const status = JSON.parse(raw)
      if (status?.server_address) return String(status.server_address)
    }
  } catch {
    /* empty */
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return PUBLIC_BASE
}

type CodeBlockProps = {
  id: string
  code: string
  copiedKey: string | null
  onCopy: (text: string, id: string) => void
  language?: string
}

function CodeBlock({ id, code, copiedKey, onCopy }: CodeBlockProps) {
  return (
    <div className='relative'>
      <pre className='bg-muted overflow-x-auto rounded-lg p-4 text-sm leading-relaxed'>
        <code>{code}</code>
      </pre>
      <Button
        size='sm'
        variant='outline'
        className='absolute right-2 top-2'
        onClick={() => onCopy(code, id)}
      >
        {copiedKey === id ? (
          <Check className='h-4 w-4' />
        ) : (
          <Copy className='h-4 w-4' />
        )}
      </Button>
    </div>
  )
}

const SECTIONS: { id: string; label: string }[] = [
  { id: 'overview', label: '概览' },
  { id: 'auth', label: '鉴权' },
  { id: 'quickstart', label: '快速开始' },
  { id: 'chat', label: '聊天 / Chat' },
  { id: 'completions', label: '文本补全 / Completions' },
  { id: 'embeddings', label: '嵌入 / Embeddings' },
  { id: 'images', label: '图像 / Images' },
  { id: 'audio', label: '音频 / Audio' },
  { id: 'models', label: '模型列表 / Models' },
  { id: 'moderations', label: '审查 / Moderations' },
  { id: 'rerank', label: '重排 / Rerank' },
  { id: 'errors', label: '错误码' },
  { id: 'faq', label: 'FAQ' },
]

export function DocsPage() {
  const { t } = useTranslation()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const runtimeBase = useMemo(
    () => getServerAddress().replace(/\/$/, ''),
    [],
  )
  const baseURL = `${runtimeBase}/v1`
  const publicBaseURL = `${PUBLIC_BASE}/v1`

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(id)
      toast.success(t('Copied to clipboard'))
      setTimeout(() => setCopiedKey((k) => (k === id ? null : k)), 2000)
    } catch {
      toast.error(t('Failed to copy'))
    }
  }

  // ---------- Quick Start ----------
  const quickStart = {
    openai: `import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: '${publicBaseURL}',
  apiKey: process.env.OPENAI_API_KEY, // sk-xxxxxxxx
});

const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: '你好，介绍一下你自己' },
  ],
});

console.log(completion.choices[0].message.content);`,

    claude: `import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  baseURL: '${publicBaseURL}',
  apiKey: process.env.ANTHROPIC_API_KEY, // sk-xxxxxxxx
});

const msg = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: '你好，介绍一下你自己' }],
});

console.log(msg.content[0].text);`,

    gemini: `// 推荐：通过 OpenAI 兼容接口调用 Gemini
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: '${publicBaseURL}',
  apiKey: process.env.GEMINI_API_KEY,
});

const completion = await client.chat.completions.create({
  model: 'gemini-2.0-flash',
  messages: [{ role: 'user', content: '你好 Gemini' }],
});

console.log(completion.choices[0].message.content);`,

    curl: `# OpenAI 兼容（ChatGPT / Gemini / DeepSeek 等）
curl ${publicBaseURL}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $YOUR_API_KEY" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role":"user","content":"Hello!"}]
  }'

# Claude 原生 Messages 接口
curl ${publicBaseURL}/messages \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: $YOUR_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [{"role":"user","content":"Hello, Claude!"}]
  }'`,

    python: `from openai import OpenAI

client = OpenAI(
    base_url="${publicBaseURL}",
    api_key="YOUR_API_KEY",
)

# 切换模型仅需修改 model 名
for model in ["gpt-4o-mini", "claude-3-5-sonnet-20241022", "gemini-2.0-flash"]:
    resp = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": f"Hi {model}"}],
    )
    print(model, "->", resp.choices[0].message.content)`,
  }

  // ---------- Chat ----------
  const chatOpenAI = `POST ${publicBaseURL}/chat/completions
Content-Type: application/json
Authorization: Bearer $YOUR_API_KEY

{
  "model": "gpt-4o-mini",
  "messages": [
    { "role": "system", "content": "You are helpful." },
    { "role": "user",   "content": "Hello!" }
  ],
  "temperature": 0.7,
  "max_tokens": 1024,
  "stream": false,
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get current weather",
        "parameters": {
          "type": "object",
          "properties": { "city": { "type": "string" } },
          "required": ["city"]
        }
      }
    }
  ],
  "tool_choice": "auto",
  "response_format": { "type": "json_object" },
  "stream_options": { "include_usage": true }
}`

  const chatClaude = `POST ${publicBaseURL}/messages
Content-Type: application/json
x-api-key: $YOUR_API_KEY
anthropic-version: 2023-06-01

{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 1024,
  "system": "You are helpful.",
  "messages": [
    { "role": "user", "content": "Hello, Claude!" }
  ],
  "temperature": 1,
  "stream": false,
  "thinking": { "type": "enabled", "budget_tokens": 1024 },
  "tools": [
    {
      "name": "get_weather",
      "description": "Get current weather",
      "input_schema": {
        "type": "object",
        "properties": { "city": { "type": "string" } },
        "required": ["city"]
      }
    }
  ]
}`

  const chatGemini = `POST ${publicBaseURL}beta/models/gemini-2.0-flash:generateContent
Content-Type: application/json
Authorization: Bearer $YOUR_API_KEY

{
  "systemInstruction": {
    "parts": [{ "text": "You are helpful." }]
  },
  "contents": [
    {
      "role": "user",
      "parts": [{ "text": "Hello, Gemini!" }]
    }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "topP": 0.95,
    "topK": 40,
    "maxOutputTokens": 1024,
    "stopSequences": []
  },
  "safetySettings": [
    { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" }
  ]
}`

  // ---------- Completions / Embeddings / Images / Audio ----------
  const completions = `POST ${publicBaseURL}/completions
Authorization: Bearer $YOUR_API_KEY

{
  "model": "gpt-3.5-turbo-instruct",
  "prompt": "Once upon a time",
  "max_tokens": 128,
  "temperature": 0.7,
  "top_p": 1,
  "n": 1,
  "stream": false,
  "stop": ["\\n\\n"]
}`

  const embeddings = `POST ${publicBaseURL}/embeddings
Authorization: Bearer $YOUR_API_KEY

{
  "model": "text-embedding-3-small",
  "input": ["The quick brown fox", "jumps over the lazy dog"],
  "encoding_format": "float",
  "dimensions": 1536
}`

  const imagesGen = `POST ${publicBaseURL}/images/generations
Authorization: Bearer $YOUR_API_KEY

{
  "model": "gpt-image-1",
  "prompt": "A serene Japanese garden in watercolor",
  "n": 1,
  "size": "1024x1024",
  "background": "auto",
  "quality": "high",
  "response_format": "url"
}`

  const imagesEdit = `curl ${publicBaseURL}/images/edits \\
  -H "Authorization: Bearer $YOUR_API_KEY" \\
  -F image=@./cat.png \\
  -F mask=@./mask.png \\
  -F prompt="Add a small hat" \\
  -F n=1 \\
  -F size=1024x1024 \\
  -F model=gpt-image-1`

  const audioTTS = `POST ${publicBaseURL}/audio/speech
Authorization: Bearer $YOUR_API_KEY

{
  "model": "tts-1",
  "input": "Hello from OctoRouter",
  "voice": "alloy",
  "response_format": "mp3"
}`

  const audioSTT = `curl ${publicBaseURL}/audio/transcriptions \\
  -H "Authorization: Bearer $YOUR_API_KEY" \\
  -F file=@./audio.mp3 \\
  -F model=whisper-1 \\
  -F language=zh \\
  -F response_format=json`

  const models = `GET ${publicBaseURL}/models
Authorization: Bearer $YOUR_API_KEY`

  const moderations = `POST ${publicBaseURL}/moderations
Authorization: Bearer $YOUR_API_KEY

{
  "model": "omni-moderation-latest",
  "input": "Some user input to check"
}`

  const rerank = `POST ${publicBaseURL}/rerank
Authorization: Bearer $YOUR_API_KEY

{
  "model": "rerank-english-v2.0",
  "query": "What is the capital of France?",
  "documents": [
    "Paris is the capital of France.",
    "Berlin is the capital of Germany.",
    "Madrid is the capital of Spain."
  ],
  "top_n": 3,
  "return_documents": true
}`

  return (
    <PublicLayout>
      <div className='mx-auto w-full max-w-7xl px-4 py-8'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold tracking-tight md:text-4xl'>
            {t('API Documentation')}
          </h1>
          <p className='text-muted-foreground mt-2 max-w-3xl'>
            统一对接 OpenAI、Claude、Gemini、Qwen、DeepSeek、Kling、即梦 等
            40+ 模型供应商。所有接口兼容 OpenAI 格式，
            部分模型支持原生 Claude Messages / Gemini generateContent 调用。
            把现有 SDK 的 baseURL 指向{' '}
            <code className='bg-muted rounded px-1.5 py-0.5 text-sm'>
              {publicBaseURL}
            </code>
            ，再使用本平台签发的 API Key 即可。
          </p>
        </div>

        <div className='grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]'>
          {/* Side nav */}
          <aside className='hidden lg:block'>
            <div className='sticky top-20 space-y-1 text-sm'>
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className='text-muted-foreground hover:text-foreground hover:bg-accent block rounded-md px-3 py-1.5 transition-colors'
                >
                  {s.label}
                </a>
              ))}
            </div>
          </aside>

          <div className='space-y-6'>
            {/* Overview */}
            <Card id='overview'>
              <CardHeader>
                <CardTitle>概览</CardTitle>
                <CardDescription>
                  OctoRouter 提供 RESTful API，可通过统一接口访问多家模型供应商。
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div>
                  <h3 className='mb-2 text-sm font-medium'>公开 Base URL</h3>
                  <div className='bg-muted relative rounded-md p-3 font-mono text-sm'>
                    <span>{publicBaseURL}</span>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='absolute right-1 top-1'
                      onClick={() => copy(publicBaseURL, 'public-base')}
                    >
                      {copiedKey === 'public-base' ? (
                        <Check className='h-4 w-4' />
                      ) : (
                        <Copy className='h-4 w-4' />
                      )}
                    </Button>
                  </div>
                </div>

                {runtimeBase && runtimeBase !== PUBLIC_BASE && (
                  <div>
                    <h3 className='mb-2 text-sm font-medium'>
                      当前会话检测到的 Base URL
                    </h3>
                    <div className='bg-muted relative rounded-md p-3 font-mono text-sm'>
                      <span>{baseURL}</span>
                      <Button
                        size='sm'
                        variant='ghost'
                        className='absolute right-1 top-1'
                        onClick={() => copy(baseURL, 'runtime-base')}
                      >
                        {copiedKey === 'runtime-base' ? (
                          <Check className='h-4 w-4' />
                        ) : (
                          <Copy className='h-4 w-4' />
                        )}
                      </Button>
                    </div>
                    <p className='text-muted-foreground mt-2 text-xs'>
                      自部署或私有化用户可使用此地址；公网用户请使用上方公开 Base URL。
                    </p>
                  </div>
                )}

                <Separator />

                <div>
                  <h3 className='mb-2 text-sm font-medium'>支持的接口家族</h3>
                  <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                    <div className='rounded-md border p-3'>
                      <div className='font-medium'>OpenAI 兼容</div>
                      <div className='text-muted-foreground mt-1 text-xs'>
                        /chat/completions、/completions、/embeddings、
                        /images/*、/audio/*、/moderations、/rerank、/models
                      </div>
                    </div>
                    <div className='rounded-md border p-3'>
                      <div className='font-medium'>Claude Messages</div>
                      <div className='text-muted-foreground mt-1 text-xs'>
                        /v1/messages，支持 tools / thinking / streaming
                      </div>
                    </div>
                    <div className='rounded-md border p-3'>
                      <div className='font-medium'>Gemini Native</div>
                      <div className='text-muted-foreground mt-1 text-xs'>
                        /v1beta/models/&#123;model&#125;:generateContent
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Auth */}
            <Card id='auth'>
              <CardHeader>
                <CardTitle>鉴权</CardTitle>
                <CardDescription>
                  所有请求需在请求头携带平台签发的 API Key。
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge variant='outline'>OpenAI / Gemini</Badge>
                  <code className='bg-muted rounded px-2 py-1 text-sm'>
                    Authorization: Bearer sk-xxxxxxxx
                  </code>
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge variant='outline'>Claude Messages</Badge>
                  <code className='bg-muted rounded px-2 py-1 text-sm'>
                    x-api-key: sk-xxxxxxxx &nbsp; +&nbsp;
                    anthropic-version: 2023-06-01
                  </code>
                </div>
                <p className='text-muted-foreground text-sm'>
                  在「API Keys」页面创建并复制密钥；密钥只在创建时显示一次，请妥善保管。
                </p>
              </CardContent>
            </Card>

            {/* Quickstart */}
            <Card id='quickstart'>
              <CardHeader>
                <CardTitle>{t('Quick Start')}</CardTitle>
                <CardDescription>选择你常用的语言或工具开始调用。</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue='openai'>
                  <TabsList className='grid grid-cols-2 md:grid-cols-5'>
                    <TabsTrigger value='openai'>OpenAI (ChatGPT)</TabsTrigger>
                    <TabsTrigger value='claude'>Claude</TabsTrigger>
                    <TabsTrigger value='gemini'>Gemini</TabsTrigger>
                    <TabsTrigger value='curl'>cURL</TabsTrigger>
                    <TabsTrigger value='python'>Python</TabsTrigger>
                  </TabsList>
                  <TabsContent value='openai' className='mt-4'>
                    <CodeBlock
                      id='qs-openai'
                      code={quickStart.openai}
                      copiedKey={copiedKey}
                      onCopy={copy}
                    />
                  </TabsContent>
                  <TabsContent value='claude' className='mt-4'>
                    <CodeBlock
                      id='qs-claude'
                      code={quickStart.claude}
                      copiedKey={copiedKey}
                      onCopy={copy}
                    />
                  </TabsContent>
                  <TabsContent value='gemini' className='mt-4'>
                    <CodeBlock
                      id='qs-gemini'
                      code={quickStart.gemini}
                      copiedKey={copiedKey}
                      onCopy={copy}
                    />
                  </TabsContent>
                  <TabsContent value='curl' className='mt-4'>
                    <CodeBlock
                      id='qs-curl'
                      code={quickStart.curl}
                      copiedKey={copiedKey}
                      onCopy={copy}
                    />
                  </TabsContent>
                  <TabsContent value='python' className='mt-4'>
                    <CodeBlock
                      id='qs-python'
                      code={quickStart.python}
                      copiedKey={copiedKey}
                      onCopy={copy}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Chat */}
            <Card id='chat'>
              <CardHeader>
                <CardTitle>聊天 / Chat</CardTitle>
                <CardDescription>
                  三种风格任选其一：OpenAI Chat Completions、Claude Messages、Gemini generateContent。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue='openai'>
                  <TabsList className='grid grid-cols-3'>
                    <TabsTrigger value='openai'>OpenAI</TabsTrigger>
                    <TabsTrigger value='claude'>Claude</TabsTrigger>
                    <TabsTrigger value='gemini'>Gemini</TabsTrigger>
                  </TabsList>
                  <TabsContent value='openai' className='mt-4'>
                    <CodeBlock
                      id='chat-openai'
                      code={chatOpenAI}
                      copiedKey={copiedKey}
                      onCopy={copy}
                    />
                    <p className='text-muted-foreground mt-3 text-sm'>
                      支持流式（<code>stream: true</code>）、Function Calling、
                      Structured Outputs（<code>response_format</code>）、
                      多模态（<code>messages[].content</code> 可为数组，含
                      <code>image_url</code> / <code>input_audio</code>）。
                    </p>
                  </TabsContent>
                  <TabsContent value='claude' className='mt-4'>
                    <CodeBlock
                      id='chat-claude'
                      code={chatClaude}
                      copiedKey={copiedKey}
                      onCopy={copy}
                    />
                    <p className='text-muted-foreground mt-3 text-sm'>
                      支持 Tool Use、Extended Thinking（
                      <code>thinking.budget_tokens</code>）、流式 SSE。
                    </p>
                  </TabsContent>
                  <TabsContent value='gemini' className='mt-4'>
                    <CodeBlock
                      id='chat-gemini'
                      code={chatGemini}
                      copiedKey={copiedKey}
                      onCopy={copy}
                    />
                    <p className='text-muted-foreground mt-3 text-sm'>
                      <code>parts[]</code> 内可混合 <code>text</code> /{' '}
                      <code>inlineData</code>（base64 图片/音频/视频）以实现多模态。
                    </p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Completions */}
            <Card id='completions'>
              <CardHeader>
                <CardTitle>文本补全 / Completions</CardTitle>
                <CardDescription>
                  传统 instruct 风格补全，仅部分模型支持（如 gpt-3.5-turbo-instruct）。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock
                  id='completions'
                  code={completions}
                  copiedKey={copiedKey}
                  onCopy={copy}
                />
              </CardContent>
            </Card>

            {/* Embeddings */}
            <Card id='embeddings'>
              <CardHeader>
                <CardTitle>嵌入 / Embeddings</CardTitle>
                <CardDescription>
                  生成文本向量，用于检索、聚类、相似度计算。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock
                  id='embeddings'
                  code={embeddings}
                  copiedKey={copiedKey}
                  onCopy={copy}
                />
              </CardContent>
            </Card>

            {/* Images */}
            <Card id='images'>
              <CardHeader>
                <CardTitle>图像 / Images</CardTitle>
                <CardDescription>
                  支持文生图（generations）和图生图 / 图像编辑（edits）。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue='gen'>
                  <TabsList className='grid grid-cols-2'>
                    <TabsTrigger value='gen'>generations</TabsTrigger>
                    <TabsTrigger value='edit'>edits</TabsTrigger>
                  </TabsList>
                  <TabsContent value='gen' className='mt-4'>
                    <CodeBlock
                      id='img-gen'
                      code={imagesGen}
                      copiedKey={copiedKey}
                      onCopy={copy}
                    />
                  </TabsContent>
                  <TabsContent value='edit' className='mt-4'>
                    <CodeBlock
                      id='img-edit'
                      code={imagesEdit}
                      copiedKey={copiedKey}
                      onCopy={copy}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Audio */}
            <Card id='audio'>
              <CardHeader>
                <CardTitle>音频 / Audio</CardTitle>
                <CardDescription>
                  TTS（语音合成）与 STT（语音识别 / 翻译）。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue='tts'>
                  <TabsList className='grid grid-cols-2'>
                    <TabsTrigger value='tts'>TTS / speech</TabsTrigger>
                    <TabsTrigger value='stt'>STT / transcriptions</TabsTrigger>
                  </TabsList>
                  <TabsContent value='tts' className='mt-4'>
                    <CodeBlock
                      id='aud-tts'
                      code={audioTTS}
                      copiedKey={copiedKey}
                      onCopy={copy}
                    />
                  </TabsContent>
                  <TabsContent value='stt' className='mt-4'>
                    <CodeBlock
                      id='aud-stt'
                      code={audioSTT}
                      copiedKey={copiedKey}
                      onCopy={copy}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Models */}
            <Card id='models'>
              <CardHeader>
                <CardTitle>模型列表 / Models</CardTitle>
                <CardDescription>
                  返回当前 API Key 可访问的模型清单。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock
                  id='models'
                  code={models}
                  copiedKey={copiedKey}
                  onCopy={copy}
                />
                <p className='text-muted-foreground mt-3 text-sm'>
                  Gemini 风格清单：<code>GET {publicBaseURL}beta/models</code>
                </p>
              </CardContent>
            </Card>

            {/* Moderations */}
            <Card id='moderations'>
              <CardHeader>
                <CardTitle>审查 / Moderations</CardTitle>
                <CardDescription>
                  调用上游审查模型对用户输入进行内容安全检测。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock
                  id='mod'
                  code={moderations}
                  copiedKey={copiedKey}
                  onCopy={copy}
                />
              </CardContent>
            </Card>

            {/* Rerank */}
            <Card id='rerank'>
              <CardHeader>
                <CardTitle>重排 / Rerank</CardTitle>
                <CardDescription>
                  对候选文档按与 query 的相关度重新打分排序，常用于 RAG 流程。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock
                  id='rerank'
                  code={rerank}
                  copiedKey={copiedKey}
                  onCopy={copy}
                />
              </CardContent>
            </Card>

            {/* Errors */}
            <Card id='errors'>
              <CardHeader>
                <CardTitle>错误码</CardTitle>
                <CardDescription>
                  错误响应统一格式：
                  <code className='bg-muted ml-1 rounded px-1.5 py-0.5'>
                    {`{ "error": { "code": "...", "message": "..." } }`}
                  </code>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr className='border-b'>
                        <th className='py-2 pr-4 text-left font-medium'>HTTP</th>
                        <th className='py-2 pr-4 text-left font-medium'>code</th>
                        <th className='py-2 text-left font-medium'>说明</th>
                      </tr>
                    </thead>
                    <tbody className='text-muted-foreground'>
                      <tr className='border-b'>
                        <td className='py-2 pr-4'>400</td>
                        <td className='py-2 pr-4'>INVALID_REQUEST</td>
                        <td className='py-2'>参数错误，缺少必填字段或值非法</td>
                      </tr>
                      <tr className='border-b'>
                        <td className='py-2 pr-4'>401</td>
                        <td className='py-2 pr-4'>—</td>
                        <td className='py-2'>API Key 无效、已过期或缺失</td>
                      </tr>
                      <tr className='border-b'>
                        <td className='py-2 pr-4'>403</td>
                        <td className='py-2 pr-4'>FORBIDDEN</td>
                        <td className='py-2'>该 Key 无权调用此模型 / 渠道</td>
                      </tr>
                      <tr className='border-b'>
                        <td className='py-2 pr-4'>404</td>
                        <td className='py-2 pr-4'>NOT_FOUND</td>
                        <td className='py-2'>资源不存在或不属于当前 Key</td>
                      </tr>
                      <tr className='border-b'>
                        <td className='py-2 pr-4'>429</td>
                        <td className='py-2 pr-4'>RATE_LIMITED</td>
                        <td className='py-2'>触发限流，请降低请求频率</td>
                      </tr>
                      <tr>
                        <td className='py-2 pr-4'>500</td>
                        <td className='py-2 pr-4'>INTERNAL_ERROR</td>
                        <td className='py-2'>服务器或上游异常</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card id='faq'>
              <CardHeader>
                <CardTitle>{t('FAQ')}</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4 text-sm'>
                <div>
                  <h4 className='mb-1 font-medium'>如何切换不同模型？</h4>
                  <p className='text-muted-foreground'>
                    修改请求体中的 <code>model</code> 字段即可。例如把
                    <code>gpt-4o-mini</code> 换成
                    <code>claude-3-5-sonnet-20241022</code>，URL 不变。
                  </p>
                </div>
                <div>
                  <h4 className='mb-1 font-medium'>如何使用流式响应？</h4>
                  <p className='text-muted-foreground'>
                    OpenAI / Gemini / Claude 都支持。OpenAI 设置
                    <code>stream: true</code>，Claude 同样设置
                    <code>stream: true</code>，Gemini 使用
                    <code>:streamGenerateContent</code> 端点。返回为 SSE。
                  </p>
                </div>
                <div>
                  <h4 className='mb-1 font-medium'>用量与日志在哪里查看？</h4>
                  <p className='text-muted-foreground'>
                    控制台 → 「日志」/「数据看板」可以查看每次调用的耗时、Token、扣费。
                  </p>
                </div>
                <div>
                  <h4 className='mb-1 font-medium'>支持哪些 SDK？</h4>
                  <p className='text-muted-foreground'>
                    任何兼容 OpenAI 的 SDK（官方
                    <code>openai</code>、<code>langchain</code>、
                    <code>llamaindex</code>、Cherry Studio、NextChat、
                    Lobe Chat 等）都可以直接使用，仅需替换 baseURL。
                    Claude 用户可继续使用
                    <code>@anthropic-ai/sdk</code>，配置
                    <code>baseURL: '{publicBaseURL}'</code>。
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
