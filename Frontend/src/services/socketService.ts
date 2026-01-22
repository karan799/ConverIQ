import { io, Socket } from 'socket.io-client';

export interface Message {
  id?: number;
  speaker: 'Agent' | 'Client';
  text: string;
  sentiment_score?: number;
  sentiment_label?: string;
  timestamp?: string;
}

export interface PredictionUpdate {
  conversion_score: number;
  factors: Array<{
    type: string;
    label: string;
    evidence?: string;
    keywords?: string[];
    count?: number;
  }>;
  metrics?: {
    sentiment_score: number;
    buying_signal_score: number;
    engagement_score: number;
    response_quality: number;
    decision_maker_score?: number;
    high_value_score?: number;
  };
  timestamp: string;
}

export interface TranscriptionProgress {
  call_id: string;
  chunk: number;
  total: number;
  status: string;
}

export interface TranscriptionComplete {
  call_id: string;
  messages_count: number;
}

export interface TranscriptionError {
  call_id: string;
  error: string;
}

class SocketService {
  private socket: Socket | null = null;
  private serverUrl: string;

  constructor() {
    this.serverUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Don't create a new socket if already connected
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(this.serverUrl, {
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 10000,
        autoConnect: true
      });

      this.socket.on('connect', () => {
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        reject(error);
      });

      this.socket.on('connected', () => {
        // Connected to server
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  startConversation(
    callId: string,
    agentName: string,
    customerName: string,
    customerPhone: string
  ) {
    if (!this.socket) throw new Error('Socket not connected');

    this.socket.emit('start_conversation', {
      call_id: callId,
      agent_name: agentName,
      customer_name: customerName,
      customer_phone: customerPhone,
    });
  }

  sendMessage(callId: string, speaker: 'Agent' | 'Client', text: string) {
    if (!this.socket) throw new Error('Socket not connected');

    this.socket.emit('send_message', {
      call_id: callId,
      speaker,
      text,
    });
  }

  endConversation(callId: string) {
    if (!this.socket) throw new Error('Socket not connected');

    this.socket.emit('end_conversation', {
      call_id: callId,
    });
  }

  stopTranscription(callId: string) {
    if (!this.socket) throw new Error('Socket not connected');

    this.socket.emit('stop_transcription', {
      call_id: callId,
    });
  }

  joinConversation(callId: string) {
    if (!this.socket) throw new Error('Socket not connected');

    this.socket.emit('join_conversation', {
      call_id: callId,
    });
  }

  onConversationStarted(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('conversation_started', callback);
  }

  onNewMessage(callback: (data: { message: Message }) => void) {
    if (!this.socket) return;
    this.socket.on('new_message', callback);
  }

  onPredictionUpdate(callback: (data: PredictionUpdate) => void) {
    if (!this.socket) return;
    this.socket.on('prediction_update', callback);
  }

  onConversationEnded(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('conversation_ended', callback);
  }

  onError(callback: (data: { message: string }) => void) {
    if (!this.socket) return;
    this.socket.on('error', callback);
  }

  onTranscriptionProgress(callback: (data: TranscriptionProgress) => void) {
    if (!this.socket) return;
    this.socket.on('transcription_progress', callback);
  }

  onTranscriptionComplete(callback: (data: TranscriptionComplete) => void) {
    if (!this.socket) return;
    this.socket.on('transcription_complete', callback);
  }

  onTranscriptionError(callback: (data: TranscriptionError) => void) {
    if (!this.socket) return;
    this.socket.on('transcription_error', callback);
  }

  onTranscriptionStopped(callback: (data: { call_id: string; messages_count: number }) => void) {
    if (!this.socket) return;
    this.socket.on('transcription_stopped', callback);
  }

  offAllListeners() {
    if (!this.socket) return;
    this.socket.off('conversation_started');
    this.socket.off('new_message');
    this.socket.off('prediction_update');
    this.socket.off('conversation_ended');
    this.socket.off('error');
    this.socket.off('transcription_progress');
    this.socket.off('transcription_complete');
    this.socket.off('transcription_error');
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  async uploadAudio(callId: string, audioFile: File): Promise<{ success: boolean; messages_processed: number }> {
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('call_id', callId);

    const response = await fetch(`${this.serverUrl}/api/upload_audio`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload audio');
    }

    return response.json();
  }
}

const socketService = new SocketService();
export default socketService;
