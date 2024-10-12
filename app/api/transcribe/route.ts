import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import FormData from 'form-data'

export async function POST(req: NextRequest) {
  console.log('Received request in /api/transcribe')
  try {
    const formData = await req.formData()
    const file = formData.get('file') as Blob

    if (!file) {
      console.error('No file provided')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('File received:', file.type, file.size)

    const buffer = Buffer.from(await file.arrayBuffer())

    const groqFormData = new FormData()
    groqFormData.append('file', buffer, { filename: 'audio.wav', contentType: file.type })
    groqFormData.append('model', 'whisper-large-v3')

    console.log('Sending request to Groq API...')
    const groqResponse = await axios.post(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      groqFormData,
      {
        headers: {
          ...groqFormData.getHeaders(),
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
      }
    )

    console.log('Received response from Groq API:', groqResponse.data)
    return NextResponse.json(groqResponse.data)
  } catch (error: any) {
    console.error('Error in /api/transcribe:', error.response?.data || error.message)
    return NextResponse.json(
      { error: error.response?.data?.error || 'An error occurred during transcription' },
      { status: error.response?.status || 500 }
    )
  }
}
