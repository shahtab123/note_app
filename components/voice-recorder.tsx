'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Mic, Square, RotateCcw, Play, Save, Pause } from "lucide-react"
import axios from 'axios'

export function VoiceRecorderComponent() {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const [transcription, setTranscription] = useState<string>('')
  const [isTranscribing, setIsTranscribing] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setDuration((prevDuration) => prevDuration + 1)
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [isRecording, isPaused])

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = time % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      mediaRecorderRef.current = new MediaRecorder(stream)
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        const audioUrl = URL.createObjectURL(audioBlob)
        setAudioUrl(audioUrl)
      }

      mediaRecorderRef.current.start(10) // Start recording and get data every 10ms
      setIsRecording(true)
      setIsPaused(false)
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      streamRef.current?.getTracks().forEach(track => track.stop())
      setIsRecording(false)
      setIsPaused(false)
    }
  }

  const resetRecording = () => {
    stopRecording()
    setDuration(0)
    setAudioUrl(null)
    audioChunksRef.current = []
  }

  const saveRecording = () => {
    if (audioUrl) {
      const a = document.createElement('a')
      a.href = audioUrl
      a.download = 'recorded_audio.wav'
      a.click()
    }
  }

  const toggleRecording = () => {
    if (!isRecording) {
      startRecording()
    } else if (isPaused) {
      resumeRecording()
    } else {
      pauseRecording()
    }
  }

  const transcribeAudio = async () => {
    if (!audioUrl) return;

    setIsTranscribing(true);
    console.log('Starting transcription...');

    try {
      const audioBlob = await fetch(audioUrl).then(r => r.blob());
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('model', 'whisper-large-v3');

      console.log('Sending request to /api/transcribe...');
      const response = await axios.post('/api/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('Received response:', response.data);
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      setTranscription(response.data.text);
    } catch (error: any) {
      console.error('Error transcribing audio:', error);
      setTranscription(`Error occurred during transcription: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsTranscribing(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-xl flex flex-col items-center">
        <div className="text-4xl font-bold mb-8 text-center">
          {formatTime(duration)}
        </div>
        <div className="relative mb-8">
          <button
            className={`w-48 h-48 rounded-full flex items-center justify-center transition-colors ${
              isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-300 hover:bg-gray-400'
            }`}
            onClick={isRecording ? stopRecording : startRecording}
            title={isRecording ? "Stop Recording" : "Start Recording"}
          >
            <Mic className="w-24 h-24 text-white" />
          </button>
          {isRecording && !isPaused && (
            <div className="absolute top-0 left-0 w-full h-full animate-ping rounded-full bg-red-500 opacity-75"></div>
          )}
        </div>
        <div className="flex justify-center space-x-4 mb-4">
          {isRecording && (
            <Button
              variant="default"
              size="lg"
              onClick={isPaused ? resumeRecording : pauseRecording}
            >
              {isPaused ? (
                <Play className="mr-2 h-4 w-4" />
              ) : (
                <Pause className="mr-2 h-4 w-4" />
              )}
              {isPaused ? "Resume" : "Pause"}
            </Button>
          )}
          <Button
            variant="outline"
            size="lg"
            onClick={resetRecording}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={saveRecording}
            disabled={!audioUrl}
          >
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              console.log('Transcribe button clicked');
              transcribeAudio();
            }}
            disabled={!audioUrl || isTranscribing}
          >
            {isTranscribing ? 'Transcribing...' : 'Transcribe'}
          </Button>
        </div>
        {audioUrl && (
          <audio controls src={audioUrl} className="w-full mb-4">
            Your browser does not support the audio element.
          </audio>
        )}
        
        <div className="w-full mt-4">
          <h3 className="text-lg font-semibold mb-2">Transcription:</h3>
          <textarea
            className="w-full h-32 p-2 border rounded"
            value={transcription}
            readOnly
            placeholder="Transcription will appear here after clicking 'Transcribe'"
          />
        </div>
      </div>
    </div>
  )
}
