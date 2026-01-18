import { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

const WS_URL = 'ws://localhost:8080';

export interface WebRTCState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  status: string;
  isConnected: boolean;
  error: string | null;
}

export const useWebRTC = () => {
  const [state, setState] = useState<WebRTCState>({
    localStream: null,
    remoteStream: null,
    status: 'Idle',
    isConnected: false,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const userIdRef = useRef<string>(uuidv4());

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    setState(prev => ({
      ...prev,
      localStream: null,
      remoteStream: null,
      status: 'Idle',
      isConnected: false,
    }));
  }, []);

  const initPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
          senderId: userIdRef.current
        }));
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track', event.streams[0]);
      setState(prev => ({ ...prev, remoteStream: event.streams[0] }));
    };

    pc.onconnectionstatechange = () => {
       console.log('Connection state:', pc.connectionState);
       if (pc.connectionState === 'connected') {
           setState(prev => ({ ...prev, status: 'Connected' }));
       }
    };

    pcRef.current = pc;
    return pc;
  };

  const startCall = async () => {
    try {
      setState(prev => ({ ...prev, status: 'Initializing...' }));
      
      // Get User Media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setState(prev => ({ ...prev, localStream: stream }));

      // Connect WS
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WS Connected');
        setState(prev => ({ ...prev, isConnected: true, status: 'Signaling...' }));
        
        // Initialize Peer Connection
        const pc = initPeerConnection();
        
        // Add Tracks
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        // Create Offer
        createOffer(pc);
      };

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        handleSignalingMessage(message);
      };

      ws.onerror = (e) => {
        console.error('WS Error', e);
        setState(prev => ({ ...prev, error: 'WebSocket error' }));
      };

    } catch (err: any) {
      console.error('Start Call Error:', err);
      setState(prev => ({ ...prev, error: err.message }));
    }
  };

  const createOffer = async (pc: RTCPeerConnection) => {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      wsRef.current?.send(JSON.stringify({
        type: 'offer',
        sdp: offer,
        senderId: userIdRef.current
      }));
    } catch (e) {
      console.error('Error creating offer:', e);
    }
  };

  const handleSignalingMessage = async (message: any) => {
    if (message.senderId === userIdRef.current) return;
    const pc = pcRef.current;
    if (!pc) return; // Or create a new one if it's an incoming call (responder side logic - for MVP we assume we are initing or reacting to offer)

    // Handling Incoming Call Logic (if this client didn't start the call)
    // Note: this logic mixes "Caller" and "Callee" roles. 
    // If pc is null, we are the Callee.
    if (!pc) {
      // Callee Logic - we need to init everything upon receiving an offer
       if (message.type === 'offer') {
          setState((prev) => ({ ...prev, status: 'Incoming Call...' }));
          // Auto-answer for MVP or prompt user? 
          // Let's implement auto-join logic or basic setup
          const calleePc = initPeerConnection();
           // Get local media to reply
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          localStreamRef.current = stream;
          setState(prev => ({ ...prev, localStream: stream }));
          stream.getTracks().forEach(track => calleePc.addTrack(track, stream));
          
          await calleePc.setRemoteDescription(new RTCSessionDescription(message.sdp));
          const answer = await calleePc.createAnswer();
          await calleePc.setLocalDescription(answer);
          
          wsRef.current?.send(JSON.stringify({
              type: 'answer',
              sdp: answer,
              senderId: userIdRef.current
          }));
       }
       return;
    }

    try {
      if (message.type === 'offer') {
         // Negotiation needed or collision?
         await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
         const answer = await pc.createAnswer();
         await pc.setLocalDescription(answer);
         wsRef.current?.send(JSON.stringify({
           type: 'answer',
           sdp: answer,
           senderId: userIdRef.current
         }));
      } else if (message.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
      } else if (message.type === 'ice-candidate') {
        if (message.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
      }
    } catch (e) {
      console.error('Signaling Error', e);
    }
  };

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    ...state,
    startCall,
    endCall: cleanup,
  };
};
