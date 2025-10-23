import { Injectable } from '@nestjs/common';
import { AzureOpenAI } from 'openai';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class AiService {
  private client: AzureOpenAI;

  constructor() {
    const azureKey = process.env.AZURE_OPENAI_API_KEY;
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-04-01-preview';

    if (!azureKey || !azureEndpoint || !deployment) {
      throw new Error('Azure OpenAI yapılandırması eksik. .env dosyasını kontrol et.');
    }

    this.client = new AzureOpenAI({
      apiKey: azureKey,
      endpoint: azureEndpoint,
      deployment,
      apiVersion,
    });
    console.log("constructor çalıştı"); 
  }
  
  async detectAI(code: any): Promise<number> {
    console.log(JSON.stringify(code));
    console.log("burdayım");

    try {
      // Gelen veri tipine göre dönüştürme 
      const codeText =
        typeof code === 'string'
          ? code
          : Array.isArray(code)
          ? code.join('\n')
          : JSON.stringify(code);

      if (!codeText || codeText.trim().length === 0) {
        console.log(' Boş kod içeriği, analiz atlandı.');
        return 0;
      }

      const response = await this.client.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT!,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert code analyzer. Analyze the following code diff and determine the percentage likelihood that it was written with AI assistance (0-100%). Return only a number.',
          },
          { role: 'user', content: codeText },
        ],
        max_tokens: 500,
        temperature: 0.2,
        top_p: 1,
      });

      const text = response.choices?.[0]?.message?.content?.trim();
      if (!text) {
        console.log('Azure boş yanıt döndürdü.');
        return 0;
      }

      const match = text.match(/\d{1,3}/);
      const value = match ? parseInt(match[0]) : 0;

      return Math.min(100, Math.max(0, value));
    } catch (error) {
      console.error(' AI detection error:', error);

      /* const lengthScore = Math.min(80, Math.floor(code.length / 300)); //Uzunluk Puanı 
      const fileCount = (code.match(/File:/g) || []).length; 
      const fileScore = Math.min(50, fileCount * 8); //Dosya Puanı 
      const adds = (code.match(/^\+/gm) || []).length; 
      const dels = (code.match(/^\-/gm) || []).length; 
      const changeScore = Math.min(70, Math.floor((adds + dels) / 30) * 15); //Değişiklik Puanı 

      const baseScore = Math.floor(0.4 * lengthScore + 0.3 * fileScore + 0.3 * changeScore); 
      const randomFactor = Math.floor(Math.random() * 20) - 10; 
      const heuristic = Math.min(95, Math.max(5, baseScore + randomFactor));  */
      return 0;
    }
  }
}
