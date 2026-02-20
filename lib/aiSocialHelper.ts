import { getAIResponse } from './ai'

export interface ReplySuggestion {
  suggestion: string
  tone: 'friendly' | 'professional' | 'casual' | 'empathetic' | 'playful'
  explanation?: string
}

export interface ToneAnalysis {
  tone: string
  sentiment: 'positive' | 'neutral' | 'negative'
  issues: string[]
  suggestions: string[]
  confidence: number
}

/**
 * Get AI-suggested replies for a message
 */
export async function getReplySuggestions(
  message: string,
  chatHistory: Array<{ role: string; content: string }>,
  context?: string
): Promise<ReplySuggestion[]> {
  const prompt = `You are a helpful AI assistant that helps people communicate better and reduce social anxiety.

Context: ${context || 'A chat conversation'}

The other person just sent this message:
"${message}"

Recent conversation context:
${chatHistory.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

Generate 3-5 thoughtful reply suggestions that:
1. Are appropriate for the context
2. Show engagement and interest
3. Are natural and conversational
4. Help reduce social anxiety by being friendly and approachable

Return your response as a JSON array of objects with this exact format:
[
  {
    "suggestion": "the suggested reply text",
    "tone": "friendly|professional|casual|empathetic|playful",
    "explanation": "brief explanation of why this reply works well"
  }
]

Only return the JSON array, no other text.`

  try {
    const response = await getAIResponse(prompt, [])
    // Try to extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0]) as ReplySuggestion[]
      return suggestions.slice(0, 5)
    }
    // Fallback: parse entire response as JSON
    return JSON.parse(response) as ReplySuggestion[]
  } catch (error) {
    console.error('Error getting reply suggestions:', error)
    // Return fallback suggestions
    return [
      {
        suggestion: 'Thanks for your message!',
        tone: 'friendly',
        explanation: 'A simple, friendly acknowledgment',
      },
      {
        suggestion: 'That sounds interesting! Tell me more.',
        tone: 'casual',
        explanation: 'Shows interest and encourages conversation',
      },
    ]
  }
}

/**
 * Analyze the tone of a message before sending
 */
export async function analyzeTone(
  message: string,
  context?: string
): Promise<ToneAnalysis> {
  const prompt = `You are a helpful AI assistant that analyzes message tone to help people communicate better.

Analyze this message the user is about to send:
"${message}"

Context: ${context || 'A chat conversation'}

Analyze:
1. The overall tone (e.g., friendly, formal, casual, sarcastic, direct, etc.)
2. The sentiment (positive, neutral, or negative)
3. Any potential issues (e.g., sounds rude, too formal, unclear, etc.)
4. Suggestions for improvement if needed
5. Confidence level (0-100) in your analysis

Return your response as a JSON object with this exact format:
{
  "tone": "description of the tone",
  "sentiment": "positive|neutral|negative",
  "issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "confidence": 85
}

Only return the JSON object, no other text.`

  try {
    const response = await getAIResponse(prompt, [])
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as ToneAnalysis
    }
    return JSON.parse(response) as ToneAnalysis
  } catch (error) {
    console.error('Error analyzing tone:', error)
    return {
      tone: 'neutral',
      sentiment: 'neutral',
      issues: [],
      suggestions: [],
      confidence: 0,
    }
  }
}

/**
 * Get conversation starters
 */
export async function getConversationStarters(
  recipientName?: string,
  context?: string
): Promise<string[]> {
  const prompt = `You are a helpful AI assistant that helps people start conversations and reduce social anxiety.

Context: ${context || 'Starting a conversation'}
Recipient: ${recipientName || 'someone'}

Generate 5-7 natural, friendly conversation starters that:
1. Are appropriate for the context
2. Are easy to respond to
3. Show genuine interest
4. Help reduce social anxiety
5. Are not too generic or cliché

Return your response as a JSON array of strings:
["starter1", "starter2", "starter3"]

Only return the JSON array, no other text.`

  try {
    const response = await getAIResponse(prompt, [])
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as string[]
    }
    return JSON.parse(response) as string[]
  } catch (error) {
    console.error('Error getting conversation starters:', error)
    return [
      'Hey! How are you doing?',
      'Hope you\'re having a good day!',
      'What have you been up to?',
    ]
  }
}

/**
 * Get flirting assistance
 */
export async function getFlirtingSuggestions(
  message: string,
  chatHistory: Array<{ role: string; content: string }>,
  context?: string
): Promise<ReplySuggestion[]> {
  const prompt = `You are a helpful AI assistant that helps people with romantic communication in a respectful and appropriate way.

Context: ${context || 'A romantic conversation'}

The other person just sent:
"${message}"

Recent conversation:
${chatHistory.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

Generate 3-5 flirting suggestions that are:
1. Respectful and appropriate
2. Playful but not overly sexual
3. Genuine and authentic
4. Show interest without being pushy
5. Match the energy of the conversation

Return your response as a JSON array of objects:
[
  {
    "suggestion": "the suggested reply",
    "tone": "playful|casual|empathetic",
    "explanation": "why this works"
  }
]

Only return the JSON array, no other text.`

  try {
    const response = await getAIResponse(prompt, [])
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as ReplySuggestion[]
    }
    return JSON.parse(response) as ReplySuggestion[]
  } catch (error) {
    console.error('Error getting flirting suggestions:', error)
    return [
      {
        suggestion: 'You always know how to make me smile 😊',
        tone: 'playful',
        explanation: 'Shows appreciation in a light, positive way',
      },
    ]
  }
}

/**
 * Get conflict resolution help
 */
export async function getConflictResolutionHelp(
  message: string,
  chatHistory: Array<{ role: string; content: string }>,
  context?: string
): Promise<{
  analysis: string
  suggestions: string[]
  approach: 'apologetic' | 'diplomatic' | 'clarifying' | 'empathetic'
}> {
  const prompt = `You are a helpful AI assistant that helps people resolve conflicts and misunderstandings in conversations.

Context: ${context || 'A conversation with potential conflict or misunderstanding'}

The current situation:
"${message}"

Recent conversation:
${chatHistory.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n')}

Analyze the situation and provide:
1. A brief analysis of what might be causing tension
2. 3-5 specific suggestions for resolving it
3. The best approach (apologetic, diplomatic, clarifying, or empathetic)

Return your response as a JSON object:
{
  "analysis": "brief analysis of the situation",
  "suggestions": ["suggestion1", "suggestion2"],
  "approach": "apologetic|diplomatic|clarifying|empathetic"
}

Only return the JSON object, no other text.`

  try {
    const response = await getAIResponse(prompt, [])
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return JSON.parse(response)
  } catch (error) {
    console.error('Error getting conflict resolution help:', error)
    return {
      analysis: 'There seems to be a misunderstanding. It might help to clarify intentions.',
      suggestions: [
        'Acknowledge the other person\'s feelings',
        'Ask for clarification about what they meant',
        'Express your own perspective calmly',
      ],
      approach: 'diplomatic' as const,
    }
  }
}
