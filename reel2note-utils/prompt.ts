/**
 * Prompt template for Ollama summarization
 */

interface SummaryResult {
  title: string;
  summary: string;
  concept: string;
  tools: string;
  steps: string;
  actionPlan: string;
  mistakes: string;
  bonusTips: string;
}

/**
 * Generate the prompt for Ollama to summarize the transcript
 * @param transcript - The transcribed text
 * @returns The formatted prompt
 */
export function generateSummaryPrompt(transcript: string): string {
  return `You are an expert AI educator. Convert the following reel transcript into a clear learning guide students can follow.

TRANSCRIPT:
${transcript}

Please provide a structured response in the following format (use emoji):

🎯 Title: [A clear, concise title]

📝 Brief Summary: [2-3 sentences describing what this reel teaches]

📚 What concept is being taught: [The main educational concept]

🛠 Tools & technologies mentioned: [List any tools, software, libraries mentioned]

👣 Step-by-step instructions: [Detailed numbered steps to follow]

✅ Action plan for students: [What students should do after watching]

⚠️ Common mistakes to avoid: [Potential pitfalls to watch out for]

🔥 Bonus tips / best practices: [Additional helpful advice]

Make the summary practical, actionable, and easy to follow for beginners.`;
}

/**
 * Parse the LLM response into structured JSON
 * @param response - The LLM response text
 * @returns Structured summary object
 */
export function parseSummaryResponse(response: string): SummaryResult {
  const sections = {
    title: '📯 Title',
    summary: '📝 Brief Summary',
    concept: '📚 What concept',
    tools: '🛠 Tools',
    steps: '👣 Step-by-step',
    actionPlan: '✅ Action plan',
    mistakes: '⚠️ Common mistakes',
    bonusTips: '🔥 Bonus tips'
  };

  const result: Partial<SummaryResult> = {};

  // Try to extract each section
  Object.entries(sections).forEach(([key, emoji]) => {
    const regex = new RegExp(`${emoji}[^\\n]*:(\\s*\\n)?([\\s\\S]*?)(?=\\n[🎯📝📚🛠👣✅⚠️🔥]|$)`, 'i');
    const match = response.match(regex);
    
    if (match && match[2]) {
      result[key as keyof SummaryResult] = match[2].trim();
    } else {
      result[key as keyof SummaryResult] = '';
    }
  });

  return result as SummaryResult;
}


