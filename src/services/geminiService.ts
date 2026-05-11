import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ExtractedData {
  teachers: { name: string; subject?: string }[];
  subjects: { name: string; workload: number }[];
  turmas: {
    name: string;
    schedule: Record<string, { teacher: string; subject: string }>;
  }[];
}

export async function extractScheduleFromImage(base64Data: string, mimeType: string): Promise<ExtractedData> {
  const prompt = `Analise a tabela de horários escolar do 'COLÉGIO ESTADUAL CÍVICO-MILITAR GREGÓRIO SZEREMETA'.
Sua tarefa é extrair a GRADE COMPLETA de aulas de forma exaustiva.

LAYOUT DA IMAGEM:
- A imagem é uma tabela com COLUNAS representando as TURMAS (ex: "6A", "7B", "1A", "1B", "1º ANO A", "9A").
- As LINHAS representam os PERÍODOS (1ª a 6ª aula) agrupados por DIA DA SEMANA (SEG, TER, QUA, QUI, SEX).

REGRAS DE EXTRAÇÃO (CRÍTICO):
1. IDENTIFICAÇÃO DE TURMAS: Procure por nomes curtos no topo das colunas. 
   - ATENÇÃO: Ignore colunas que listam apenas números sequenciais (1, 2, 3...) de alunos. 
   - IGNORE QUALQUER COLUNA QUE TENHA UMA SEQUÊNCIA NUMÉRICA LONGA como título ou conteúdo predominante.
2. GRADE (SCHEDULE): Extraia TODAS as células de aula para cada turma real.
3. CHAVES DO SCHEDULE: Use rigorosamente o formato "dia-periodo" (ex: "seg-1", "seg-2", "ter-1", ..., "sex-6").
4. CONTEÚDO: Extraia Disciplina e Professor. Mapeie "teacher" e "subject".
5. EXAUSTIVIDADE: Tente extrair o máximo de turmas possível.

MAPEAR PARA ESTE JSON:
{
  "teachers": [{"name": "NOME COMPLETO", "subject": "MATÉRIA"}],
  "subjects": [{"name": "MATÉRIA", "workload": 5}],
  "turmas": [
    {
      "name": "NOME DA TURMA (ex: 6A)",
      "schedule": {
        "seg-1": { "teacher": "PROFESSOR", "subject": "MATERIA" }
      }
    }
  ]
}

REGRAS FINAIS:
- Retorne APENAS o JSON puro.
- Expanda abreviações (MAT -> MATEMATICA, PORT -> PORTUGUES, GEO -> GEOGRAFIA, HIST -> HISTORIA, CIEN -> CIENCIAS).`

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { data: base64Data, mimeType } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            teachers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { 
                  name: { type: Type.STRING },
                  subject: { type: Type.STRING }
                },
                required: ["name"]
              }
            },
            subjects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { 
                  name: { type: Type.STRING },
                  workload: { type: Type.NUMBER }
                },
                required: ["name", "workload"]
              }
            },
            turmas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  schedule: {
                    type: Type.OBJECT,
                    additionalProperties: {
                      type: Type.OBJECT,
                      properties: {
                        teacher: { type: Type.STRING },
                        subject: { type: Type.STRING }
                      },
                      required: ["teacher", "subject"]
                    }
                  }
                },
                required: ["name", "schedule"]
              }
            }
          },
          required: ["teachers", "subjects", "turmas"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Gemini returned empty response");
    }

    return JSON.parse(response.text) as ExtractedData;
  } catch (error) {
    console.error("Error extracting schedule:", error);
    throw error;
  }
}
