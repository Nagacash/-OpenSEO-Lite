export interface ModelOption {
  id: string;
  name: string;
  provider: 'openrouter' | 'nvidia' | 'openai';
  isFree?: boolean;
  context: string;
  description: string;
  tag: string;
}

export const POPULAR_MODELS: Record<'openrouter' | 'nvidia' | 'openai', ModelOption[]> = {
  openrouter: [
    {
      id: 'meta-llama/llama-3.3-70b-instruct:free',
      name: 'Llama 3.3 70B Instruct',
      provider: 'openrouter',
      isFree: true,
      context: '128k',
      description: 'Top-tier open reasoning model. Exceptional for technical SEO analysis & actionable recommendations.',
      tag: 'Recommended Free',
    },
    {
      id: 'mistralai/mistral-7b-instruct:free',
      name: 'Mistral 7B Instruct',
      provider: 'openrouter',
      isFree: true,
      context: '32k',
      description: 'Ultra fast, crisp executive writing and issue classification.',
      tag: 'Fast Free',
    },
    {
      id: 'qwen/qwen-2.5-72b-instruct:free',
      name: 'Qwen 2.5 72B Instruct',
      provider: 'openrouter',
      isFree: true,
      context: '32k',
      description: 'Strong multilingual and technical coding benchmark capabilities.',
      tag: 'High Capacity Free',
    },
    {
      id: 'google/gemini-2.0-flash-exp:free',
      name: 'Gemini 2.0 Flash (Exp)',
      provider: 'openrouter',
      isFree: true,
      context: '1M',
      description: 'Massive context window with lightning fast inference.',
      tag: 'Experimental Free',
    },
    {
      id: 'deepseek/deepseek-r1:free',
      name: 'DeepSeek R1',
      provider: 'openrouter',
      isFree: true,
      context: '64k',
      description: 'State of the art reasoning with transparent thought traces.',
      tag: 'Reasoning Free',
    },
    {
      id: 'anthropic/claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet',
      provider: 'openrouter',
      isFree: false,
      context: '200k',
      description: 'Industry benchmark for editorial synthesis and nuanced diagnosis.',
      tag: 'Paid Tier',
    },
  ],
  nvidia: [
    {
      id: 'meta/llama-3.1-70b-instruct',
      name: 'Meta Llama 3.1 70B',
      provider: 'nvidia',
      isFree: true,
      context: '128k',
      description: 'High-throughput enterprise inference hosted on NVIDIA DGX Cloud.',
      tag: 'Cloud Credit Free',
    },
    {
      id: 'nvidia/nemotron-4-340b-instruct',
      name: 'NVIDIA Nemotron-4 340B',
      provider: 'nvidia',
      isFree: true,
      context: '4k',
      description: 'Massive foundational model tuned by NVIDIA for synthetic generation and diagnostics.',
      tag: 'Flagship NVIDIA',
    },
    {
      id: 'mistralai/mistral-large-2-instruct',
      name: 'Mistral Large 2',
      provider: 'nvidia',
      isFree: true,
      context: '128k',
      description: 'Enterprise reasoning with multi-language fluency and structured output precision.',
      tag: 'Enterprise Fast',
    },
    {
      id: 'meta/llama-3.1-8b-instruct',
      name: 'Meta Llama 3.1 8B',
      provider: 'nvidia',
      isFree: true,
      context: '128k',
      description: 'Sub-second latency model for instant on-page feedback.',
      tag: 'Ultra Fast',
    },
  ],
  openai: [
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      isFree: false,
      context: '128k',
      description: 'Cost-effective, highly reliable JSON parsing and tactical strategy generation.',
      tag: 'Efficient',
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      isFree: false,
      context: '128k',
      description: 'OpenAI flagship model with deep multimodal reasoning.',
      tag: 'Flagship',
    },
  ],
};
