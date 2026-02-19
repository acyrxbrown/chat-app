import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '')

export async function getAIResponse(prompt: string, chatHistory?: Array<{ role: string; content: string }>) {
  try {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured')
    }

    // Use Gemini 2.5 Flash model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // Build conversation history
    const history = chatHistory || []
    
    // Add system instruction
    const systemInstruction = `You are a helpful AI assistant named Assistant. You are integrated into a chat application. 
    Be concise, friendly, and helpful. When users tag you with @assistant, respond naturally to their questions.
    Keep responses conversational and appropriate for a chat context.`

    // Format messages for Gemini
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemInstruction }],
        },
        {
          role: 'model',
          parts: [{ text: 'Hello! I\'m Assistant, your AI helper. How can I assist you today?' }],
        },
        ...history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
      ],
    })

    const result = await chat.sendMessage(prompt)
    const response = await result.response
    const text = response.text()

    return text
  } catch (error) {
    console.error('Error getting AI response:', error)
    throw error
  }
}

export function detectAITag(message: string): boolean {
  // Check if message contains @assistant tag
  // Match @assistant anywhere in the message, with or without trailing space/punctuation
  const aiTagPattern = /@assistant\b/i
  return aiTagPattern.test(message)
}

export function extractAIPrompt(message: string): string {
  // Remove @assistant tag and return the prompt
  return message.replace(/@assistant\b[:;,]?\s*/i, '').trim()
}
