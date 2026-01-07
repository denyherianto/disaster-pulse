import { Logger } from '@nestjs/common';
import OpenAI from 'openai';

export type AgentTrace = {
  step: string;
  input: any;
  output: any;
  model: string;
  timestamp: string;
};

export abstract class GeminiAgent<TInput, TOutput> {
  protected abstract readonly logger: Logger;
  protected abstract readonly role: string;
  protected abstract readonly model: string;

  constructor(protected readonly maia: OpenAI) {}

  abstract buildPrompt(input: TInput): string;

  async run(input: TInput): Promise<{ result: TOutput; trace: AgentTrace }> {
    const prompt = this.buildPrompt(input);
    
    try {
      this.logger.debug(`[${this.role}] analyzing...`);
      
      const completion = await this.maia.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error('Empty response from AI');

      const result = JSON.parse(content) as TOutput;
      
      const trace: AgentTrace = {
        step: this.role,
        input,
        output: result,
        model: this.model,
        timestamp: new Date().toISOString(),
      };

      return { result, trace };

    } catch (error) {
      this.logger.error(`[${this.role}] Agent Failed:`, error);
      throw error;
    }
  }
}
