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
      id: 'google/gemma-4-31b-it',
      name: 'Gemma 4 31B IT',
      provider: 'nvidia',
      isFree: true,
      context: '128k',
      description: 'Dense 31B free NIM endpoint — reliable for SEO executive summaries.',
      tag: 'Recommended Free',
    },
    {
      id: 'nvidia/nemotron-3.5-lightning-30b-a3b',
      name: 'Nemotron 3.5 Lightning 30B',
      provider: 'nvidia',
      isFree: true,
      context: '128k',
      description: 'Fastest 30B A3B MoE for specialized agentic SEO tasks.',
      tag: 'Ultra Fast',
    },
    {
      id: 'deepseek-ai/deepseek-v4.1-flash',
      name: 'DeepSeek V4.1 Flash',
      provider: 'nvidia',
      isFree: true,
      context: '128k',
      description: '552B MoE (8B active) free endpoint with multimodal support.',
      tag: 'MoE Free',
    },
    {
      id: 'z-ai/glm-5.3-flash',
      name: 'GLM 5.3 Flash',
      provider: 'nvidia',
      isFree: true,
      context: '128k',
      description: 'Multimodal MoE with reasoning and tool calling on free NIM credits.',
      tag: 'Reasoning Free',
    },
    {
      id: 'moonshotai/kimi-k3',
      name: 'Kimi K3',
      provider: 'nvidia',
      isFree: true,
      context: '256k',
      description: 'Long-horizon coding and agentic tool use on free NIM endpoint.',
      tag: 'Long Context',
    },
    {
      id: 'nvidia/nemotron-3-super-120b-a12b',
      name: 'Nemotron 3 Super 120B',
      provider: 'nvidia',
      isFree: true,
      context: '1M',
      description: 'Hybrid Mamba-Transformer MoE for deep planning and tool calling.',
      tag: 'Flagship Free',
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
