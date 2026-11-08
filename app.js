/**
 * MICROSOFT TEAMS REPLICA - JS NATIVO DESDE CERO
 * Sin librerías externas.
 * Implementación de:
 * 1. UI Reactiva de Microsoft Teams (chats, canales, mensajería, temas).
 * 2. Captura y extracción de Audio en tiempo real (MediaDevices + Web Audio API).
 * 3. Visualizador de ondas de audio en canvas nativo.
 * 4. Transcripción de audio a texto en tiempo real con Web Speech API nativa.
 * 5. Generación de tarjeta de reunión con reproductor de audio y transcripción completa al colgar.
 */

(function () {
  'use strict';

  // ========================================================
  // ESTADO GLOBAL DE LA APLICACIÓN
  // ========================================================
  const state = {
    activeChatId: 'nlp-general',
    theme: 'dark',
    isCallActive: false,
    callStartTime: null,
    callTimerInterval: null,
    callDurationSeconds: 0,
    
    // Media & Hardware
    localStream: null,
    screenStream: null,
    isCameraOn: true,
    isMicOn: true,
    showCaptions: true,

    // Web Audio API
    audioContext: null,
    audioAnalyser: null,
    audioSource: null,
    animFrameId: null,

    // Grabación de Audio
    mediaRecorder: null,
    recordedAudioChunks: [],
    recordedAudioBlob: null,
    recordedAudioUrl: null,

    // Transcripción Nativa (Web Speech API)
    speechRecognition: null,
    isSpeechSupported: false,
    transcriptionEntries: [], // Array de { time: '00:04', speaker: 'Tú', text: '...' }
    currentInterimText: '',

    // Lista de Conversaciones de Teams
    conversations: [
      {
        id: 'nlp-general',
        title: 'Proyecto NLP - Standup & Transcripción',
        subtitle: 'Canal General • 5 miembros',
        avatarText: 'NLP',
        isTeam: true,
        lastTime: '10:45 AM',
        lastMessage: 'Presiona "Reunirse" arriba para iniciar llamada y transcribir',
        messages: [
          {
            id: 'm1',
            sender: 'Ana Martínez (NLP Lead)',
            avatar: 'AM',
            isOutgoing: false,
            time: '10:30 AM',
            text: '¡Hola a todos! Bienvenidos al canal del Proyecto NLP. Aquí probaremos el motor de llamada con transcripción de voz automática.'
          },
          {
            id: 'm2',
            sender: 'Carlos Ruiz',
            avatar: 'CR',
            isOutgoing: false,
            time: '10:32 AM',
            text: 'Excelente. Cuando entres a la llamada, habla al micrófono y al colgar verás aquí mismo el audio extraído y todo el texto transcrito.'
          }
        ]
      },
      {
        id: 'team-dev',
        title: 'Desarrollo Frontend & Audio',
        subtitle: 'Canal de Desarrollo • 3 miembros',
        avatarText: 'DEV',
        isTeam: true,
        lastTime: 'Ayer',
        lastMessage: 'Web Audio API configurada sin librerías externas',
        messages: [
          {
            id: 'm3',
            sender: 'Dev Bot',
            avatar: 'DB',
            isOutgoing: false,
            time: 'Ayer',
            text: 'Sistema listo. Puedes iniciar una reunión en este canal cuando desees.'
          }
        ]
      },
      {
        id: 'direct-sofia',
        title: 'Sofía Navarro',
        subtitle: 'En línea • Chat directo',
        avatarText: 'SN',
        isTeam: false,
        lastTime: 'Lunes',
        lastMessage: '¿Podemos tener una breve llamada?',
        messages: [
          {
            id: 'm4',
            sender: 'Sofía Navarro',
            avatar: 'SN',
            isOutgoing: false,
            time: 'Lunes',
            text: 'Hola, cuando tengas unos minutos nos reunimos para revisar los requerimientos de la transcripción.'
          }
        ]
      }
    ]
  };

  // ========================================================
  // ELEMENTOS DOM
  // ========================================================
  const DOM = {
    body: document.body,
    themeToggleBtn: document.getElementById('btn-theme-toggle'),
    conversationsList: document.getElementById('conversations-list'),
    chatMessagesContainer: document.getElementById('chat-messages-container'),
    chatMessageInput: document.getElementById('chat-message-input'),
    sendMessageBtn: document.getElementById('btn-send-message'),
    activeChatTitle: document.getElementById('active-chat-title'),
    activeChatSubtitle: document.getElementById('active-chat-subtitle'),
    activeChatAvatar: document.getElementById('active-chat-avatar'),
    filterChatsInput: document.getElementById('filter-chats-input'),
    startCallBtn: document.getElementById('btn-start-call'),
    startAudioOnlyBtn: document.getElementById('btn-start-audio-only'),
    quickCallInputBtn: document.getElementById('btn-quick-call-input'),
    helpInfoBtn: document.getElementById('btn-help-info'),
    helpModal: document.getElementById('help-modal'),
    closeModalBtn: document.getElementById('btn-close-modal'),
    closeModalFooterBtn: document.getElementById('btn-close-modal-footer'),

    // Elementos de la Llamada / Reunión
    meetingOverlay: document.getElementById('meeting-overlay'),
    meetingName: document.getElementById('meeting-name'),
    meetingTimer: document.getElementById('meeting-timer'),
    speechStatus: document.getElementById('speech-recognition-status'),
    localVideo: document.getElementById('local-video'),
    localAvatarPlaceholder: document.getElementById('local-avatar-placeholder'),
    liveCaptionsBox: document.getElementById('live-captions-box'),
    liveCaptionText: document.getElementById('live-caption-text'),
    waveformCanvas: document.getElementById('audio-waveform-canvas'),
    toggleCameraBtn: document.getElementById('btn-toggle-camera'),
    toggleMicBtn: document.getElementById('btn-toggle-mic'),
    toggleCaptionsBtn: document.getElementById('btn-toggle-captions'),
    shareScreenBtn: document.getElementById('btn-share-screen'),
    callReactionBtn: document.getElementById('btn-call-reaction'),
    leaveCallBtn: document.getElementById('btn-leave-call'),
    audioLevelBar: document.getElementById('audio-level-bar')
  };

  // ========================================================
  // INICIALIZACIÓN
  // ========================================================
  function init() {
    checkSpeechRecognitionSupport();
    renderConversations();
    renderMessages();
    setupEventListeners();
  }

  // ========================================================
  // DETECCIÓN DE WEB SPEECH API NATIVA
  // ========================================================
  function checkSpeechRecognitionSupport() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      state.isSpeechSupported = true;
    } else {
      state.isSpeechSupported = false;
      console.warn('SpeechRecognition nativo no disponible en este navegador. Se grabará el audio y se simulará transcripción si es necesario.');
    }
  }

  // ========================================================
  // RENDERIZADO DE CHATS Y MENSAJES DE TEAMS
  // ========================================================
  function renderConversations(filterText = '') {
    DOM.conversationsList.innerHTML = '';
    const filtered = state.conversations.filter(c => 
      c.title.toLowerCase().includes(filterText.toLowerCase())
    );

    filtered.forEach(c => {
      const item = document.createElement('div');
      item.className = `chat-conversation-item ${c.id === state.activeChatId ? 'active' : ''}`;
      item.dataset.id = c.id;

      item.innerHTML = `
        <div class="conv-avatar ${c.isTeam ? 'team-avatar' : ''}">${c.avatarText}</div>
        <div class="conv-details">
          <div class="conv-top-row">
            <span class="conv-name">${escapeHtml(c.title)}</span>
            <span class="conv-time">${c.lastTime}</span>
          </div>
          <div class="conv-snippet">${escapeHtml(c.lastMessage)}</div>
        </div>
      `;

      item.addEventListener('click', () => switchConversation(c.id));
      DOM.conversationsList.appendChild(item);
    });
  }

  function switchConversation(convId) {
    if (state.activeChatId === convId) return;
    state.activeChatId = convId;
    
    // Actualizar cabecera
    const conv = state.conversations.find(c => c.id === convId);
    if (conv) {
      DOM.activeChatTitle.textContent = conv.title;
      DOM.activeChatSubtitle.textContent = conv.subtitle;
      DOM.activeChatAvatar.textContent = conv.avatarText;
      if (conv.isTeam) {
        DOM.activeChatAvatar.style.borderRadius = '4px';
      } else {
        DOM.activeChatAvatar.style.borderRadius = '50%';
      }
    }

    renderConversations(DOM.filterChatsInput.value);
    renderMessages();
  }

  function renderMessages() {
    DOM.chatMessagesContainer.innerHTML = '';
    const activeConv = state.conversations.find(c => c.id === state.activeChatId);
    if (!activeConv) return;

    activeConv.messages.forEach(msg => {
      if (msg.isMeetingCard) {
        DOM.chatMessagesContainer.appendChild(createMeetingTranscriptionCard(msg));
      } else {
        DOM.chatMessagesContainer.appendChild(createStandardMessageElement(msg));
      }
    });

    scrollToBottom();
  }

  function createStandardMessageElement(msg) {
    const el = document.createElement('div');
    el.className = `teams-message ${msg.isOutgoing ? 'outgoing' : ''}`;
    el.innerHTML = `
      <div class="message-avatar">${msg.avatar}</div>
      <div class="message-content-wrapper">
        <div class="message-author-info">
          <span class="message-author">${escapeHtml(msg.sender)}</span>
          <span class="message-timestamp">${msg.time}</span>
        </div>
        <div class="message-bubble">${escapeHtml(msg.text)}</div>
      </div>
    `;
    return el;
  }

  // ========================================================
  // CREACIÓN DE LA TARJETA DE REUNIÓN Y TRANSCRIPCIÓN
  // ========================================================
  function createMeetingTranscriptionCard(msg) {
    const card = document.createElement('div');
    card.className = 'teams-transcription-card';

    // Generar las líneas de transcripción
    let transcriptionContentHtml = '';
    if (msg.transcription && msg.transcription.length > 0) {
      transcriptionContentHtml = msg.transcription.map(item => `
        <div class="transcription-line">
          <span class="transcription-ts">[${item.time}]</span>
          <span class="transcription-speaker">${escapeHtml(item.speaker)}:</span>
          <span class="transcription-dialogue">${escapeHtml(item.text)}</span>
        </div>
      `).join('');
    } else {
      transcriptionContentHtml = `
        <div class="transcription-empty-notice">
          ℹ️ No se detectó voz o el micrófono estuvo silenciado durante la llamada.
        </div>
      `;
    }

    card.innerHTML = `
      <div class="card-meeting-header">
        <div class="card-meeting-title-box">
          <div class="meeting-icon-pill">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
          </div>
          <div>
            <h4>${escapeHtml(msg.meetingName)}</h4>
            <p>Llamada finalizada • Grabación y transcripción completada</p>
          </div>
        </div>
        <div class="card-duration-badge">
          ⏱️ ${msg.duration}
        </div>
      </div>

      <!-- Reproductor de Audio Extraído -->
      <div class="card-audio-section">
        <div class="audio-section-label">
          <span>🔊 Audio de la llamada extraído</span>
          <span style="font-weight: normal; color: var(--text-muted); font-size: 11px;">Formato nativo WebM/WAV</span>
        </div>
        <div class="audio-controls-row">
          <audio controls class="teams-audio-player" src="${msg.audioUrl}"></audio>
          <a class="btn-download-audio" href="${msg.audioUrl}" download="reunion_${Date.now()}.webm" title="Descargar archivo de audio">
            💾 Descargar Audio
          </a>
        </div>
      </div>

      <!-- Cuadro de Transcripción a Texto -->
      <div class="card-transcription-section">
        <div class="transcription-header-row">
          <h5>
            <svg style="width: 15px; height: 15px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Transcripción de la llamada:
          </h5>
          <div class="transcription-actions">
            <button class="btn-card-action btn-copy-transcription" title="Copiar texto al portapapeles">
              📋 Copiar texto
            </button>
            <button class="btn-card-action btn-export-txt" title="Descargar como archivo de texto">
              📄 Exportar .txt
            </button>
          </div>
        </div>

        <div class="transcription-text-box">
          ${transcriptionContentHtml}
        </div>
      </div>
    `;

    // Eventos de copiar y descargar texto
    const copyBtn = card.querySelector('.btn-copy-transcription');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        let fullText = `=== TRANSCRIPCIÓN: ${msg.meetingName} (${msg.duration}) ===\n\n`;
        if (msg.transcription && msg.transcription.length > 0) {
          fullText += msg.transcription.map(t => `[${t.time}] ${t.speaker}: ${t.text}`).join('\n');
        } else {
          fullText += '(No se detectó voz grabada)';
        }
        navigator.clipboard.writeText(fullText).then(() => {
          const originalText = copyBtn.innerHTML;
          copyBtn.innerHTML = '✅ ¡Copiado!';
          setTimeout(() => { copyBtn.innerHTML = originalText; }, 2000);
        });
      });
    }

    const exportBtn = card.querySelector('.btn-export-txt');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        let fullText = `=== TRANSCRIPCIÓN DE REUNIÓN MICROSOFT TEAMS ===\n`;
        fullText += `Fecha: ${new Date().toLocaleString()}\n`;
        fullText += `Reunión: ${msg.meetingName}\n`;
        fullText += `Duración: ${msg.duration}\n`;
        fullText += `--------------------------------------------------\n\n`;
        if (msg.transcription && msg.transcription.length > 0) {
          fullText += msg.transcription.map(t => `[${t.time}] ${t.speaker}: ${t.text}`).join('\n\n');
        } else {
          fullText += 'No se registró transcripción de voz.\n';
        }
        
        const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcripcion_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    return card;
  }

  function scrollToBottom() {
    DOM.chatMessagesContainer.scrollTop = DOM.chatMessagesContainer.scrollHeight;
  }

  // ========================================================
  // ENVÍO DE MENSAJES DE TEXTO ESTÁNDAR
  // ========================================================
  function handleSendMessage() {
    const text = DOM.chatMessageInput.value.trim();
    if (!text) return;

    const activeConv = state.conversations.find(c => c.id === state.activeChatId);
    if (!activeConv) return;

    const newMsg = {
      id: 'm_' + Date.now(),
      sender: 'Tú (LU)',
      avatar: 'LU',
      isOutgoing: true,
      time: getCurrentTimeFormatted(),
      text: text
    };

    activeConv.messages.push(newMsg);
    activeConv.lastMessage = text;
    activeConv.lastTime = newMsg.time;

    DOM.chatMessageInput.value = '';
    DOM.chatMessageInput.style.height = 'auto';

    renderMessages();
    renderConversations(DOM.filterChatsInput.value);
  }

  // ========================================================
  // MÓDULO DE LLAMADA: INICIAR LLAMADA Y EXTRACCIÓN DE AUDIO
  // ========================================================
  async function startCall(options = { video: true }) {
    if (state.isCallActive) return;

    const activeConv = state.conversations.find(c => c.id === state.activeChatId);
    const meetingTitle = activeConv ? activeConv.title : 'Reunión Teams';
    DOM.meetingName.textContent = meetingTitle;

    // Reset de estado para esta llamada
    state.isCallActive = true;
    state.callStartTime = Date.now();
    state.callDurationSeconds = 0;
    state.recordedAudioChunks = [];
    state.transcriptionEntries = [];
    state.currentInterimText = '';

    DOM.meetingTimer.textContent = '00:00';
    DOM.liveCaptionText.textContent = 'Iniciando captura de audio y transcripción...';
    DOM.meetingOverlay.classList.remove('hidden');

    // 1. Obtener acceso al micrófono y opcionalmente a la cámara
    try {
      state.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: options.video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
      });
      
      // Mostrar video si existe pista de video
      const videoTrack = state.localStream.getVideoTracks()[0];
      if (videoTrack) {
        DOM.localVideo.srcObject = state.localStream;
        DOM.localVideo.classList.remove('hidden');
        DOM.localAvatarPlaceholder.classList.add('hidden');
        state.isCameraOn = true;
        DOM.toggleCameraBtn.classList.add('active');
        DOM.toggleCameraBtn.classList.remove('off');
      } else {
        DOM.localVideo.classList.add('hidden');
        DOM.localAvatarPlaceholder.classList.remove('hidden');
        state.isCameraOn = false;
        DOM.toggleCameraBtn.classList.remove('active');
        DOM.toggleCameraBtn.classList.add('off');
      }

    } catch (err) {
      console.warn('No se pudo acceder a video completo, intentando sólo audio:', err);
      try {
        state.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        DOM.localVideo.classList.add('hidden');
        DOM.localAvatarPlaceholder.classList.remove('hidden');
        state.isCameraOn = false;
      } catch (audioErr) {
        console.error('Error al acceder al micrófono:', audioErr);
        alert('No se pudo acceder al micrófono. Por favor permite los permisos del navegador.');
        endCall();
        return;
      }
    }

    // 2. Iniciar Grabador de Audio (MediaRecorder nativo)
    setupMediaRecorder(state.localStream);

    // 3. Iniciar Analizador de Audio para la Forma de Onda (Web Audio API nativa)
    setupAudioAnalyser(state.localStream);

    // 4. Iniciar Transcripción en Tiempo Real (SpeechRecognition nativo)
    setupSpeechRecognition();

    // 5. Iniciar Temporizador
    startCallTimer();
  }

  function startCallTimer() {
    clearInterval(state.callTimerInterval);
    state.callTimerInterval = setInterval(() => {
      state.callDurationSeconds++;
      const mins = Math.floor(state.callDurationSeconds / 60).toString().padStart(2, '0');
      const secs = (state.callDurationSeconds % 60).toString().padStart(2, '0');
      DOM.meetingTimer.textContent = `${mins}:${secs}`;
    }, 1000);
  }

  // ========================================================
  // GRABADOR DE AUDIO (MediaRecorder Nativo)
  // ========================================================
  function setupMediaRecorder(stream) {
    try {
      // Extraemos sólo la pista de audio
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.error('No hay pista de audio disponible en el stream');
        return;
      }
      const audioOnlyStream = new MediaStream(audioTracks);

      // Determinamos el mimeType óptimo soportado por el navegador
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        options = { mimeType: 'audio/ogg;codecs=opus' };
      }

      state.mediaRecorder = new MediaRecorder(audioOnlyStream, options);

      state.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          state.recordedAudioChunks.push(event.data);
        }
      };

      state.mediaRecorder.start(250); // Recolecta trozos cada 250ms
      console.log('Grabación de audio de la llamada iniciada.');
    } catch (e) {
      console.error('Error al inicializar MediaRecorder:', e);
    }
  }

  // ========================================================
  // ANALIZADOR DE AUDIO Y FORMA DE ONDA (Web Audio API Nativa)
  // Implementado desde 0 sin librerías de gráficos
  // ========================================================
  function setupAudioAnalyser(stream) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      state.audioContext = new AudioCtx();
      state.audioSource = state.audioContext.createMediaStreamSource(stream);
      state.audioAnalyser = state.audioContext.createAnalyser();
      state.audioAnalyser.fftSize = 64; // Bajo para barras limpias de visualizador

      state.audioSource.connect(state.audioAnalyser);

      drawWaveform();
    } catch (e) {
      console.warn('No se pudo inicializar Web Audio API:', e);
    }
  }

  function drawWaveform() {
    if (!state.isCallActive || !state.audioAnalyser) return;

    const canvas = DOM.waveformCanvas;
    const ctx = canvas.getContext('2d');
    const bufferLength = state.audioAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    state.audioAnalyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 1.5;
    let barHeight;
    let x = 0;

    // Calcular volumen promedio para los indicadores de hablar
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const average = sum / bufferLength;

    // Actualizar indicador visual de hablar
    if (average > 15) {
      DOM.audioLevelBar.style.opacity = '1';
    } else {
      DOM.audioLevelBar.style.opacity = '0.3';
    }

    // Dibujar barras estilizadas al estilo Microsoft Teams
    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * (canvas.height - 10) + 4;

      // Gradiente púrpura característico de Teams
      const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
      grad.addColorStop(0, '#5B5FC7');
      grad.addColorStop(1, '#A1A5D8');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect 
        ? ctx.roundRect(x, canvas.height - barHeight, barWidth - 2, barHeight, 2)
        : ctx.rect(x, canvas.height - barHeight, barWidth - 2, barHeight);
      ctx.fill();

      x += barWidth;
    }

    state.animFrameId = requestAnimationFrame(drawWaveform);
  }

  // ========================================================
  // TRANSCRIPCIÓN EN TIEMPO REAL (Web Speech API Nativa)
  // Sin librerías externas
  // ========================================================
  function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      DOM.speechStatus.textContent = '⚠️ Reconocimiento nativo no soportado (sólo audio)';
      DOM.liveCaptionText.textContent = 'Tu navegador no tiene activado SpeechRecognition nativo. El audio se grabará y podrás escucharlo y descargarlo al colgar.';
      return;
    }

    try {
      state.speechRecognition = new SpeechRecognition();
      state.speechRecognition.continuous = true;
      state.speechRecognition.interimResults = true;
      state.speechRecognition.lang = 'es-ES'; // Español nativo

      DOM.speechStatus.textContent = '🎙️ Transcribiendo audio en vivo...';

      state.speechRecognition.onresult = (event) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPart = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            const cleanText = transcriptPart.trim();
            if (cleanText.length > 0) {
              const currentCallTime = DOM.meetingTimer.textContent;
              state.transcriptionEntries.push({
                time: currentCallTime,
                speaker: 'Tú',
                text: cleanText
              });
              DOM.liveCaptionText.textContent = cleanText;
            }
          } else {
            interimTranscript += transcriptPart;
          }
        }

        if (interimTranscript) {
          DOM.liveCaptionText.textContent = interimTranscript;
        }
      };

      state.speechRecognition.onerror = (event) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed') {
          DOM.speechStatus.textContent = '❌ Micrófono bloqueado';
        }
      };

      // Si el motor de reconocimiento se detiene por silencio, reiniciarlo mientras la llamada siga activa
      state.speechRecognition.onend = () => {
        if (state.isCallActive) {
          try {
            state.speechRecognition.start();
          } catch (e) {
            // Ignorar si ya estaba activo
          }
        }
      };

      state.speechRecognition.start();
      console.log('Reconocimiento de voz nativo activado.');

    } catch (err) {
      console.error('Error al iniciar SpeechRecognition:', err);
      DOM.speechStatus.textContent = '⚠️ Error en reconocimiento';
    }
  }

  // ========================================================
  // FINALIZAR LLAMADA (COLGAR) Y PUBLICAR RESULTADOS
  // ========================================================
  function endCall() {
    if (!state.isCallActive) return;

    // 1. Detener temporizador
    clearInterval(state.callTimerInterval);
    const finalDuration = DOM.meetingTimer.textContent;

    // 2. Detener Web Speech API
    if (state.speechRecognition) {
      try {
        state.speechRecognition.stop();
      } catch (e) {}
      state.speechRecognition = null;
    }

    // 3. Detener animación de canvas y AudioContext
    if (state.animFrameId) {
      cancelAnimationFrame(state.animFrameId);
    }
    if (state.audioContext && state.audioContext.state !== 'closed') {
      try {
        state.audioContext.close();
      } catch (e) {}
    }

    // 4. Detener pistas de audio y video
    if (state.localStream) {
      state.localStream.getTracks().forEach(track => track.stop());
      state.localStream = null;
    }
    if (state.screenStream) {
      state.screenStream.getTracks().forEach(track => track.stop());
      state.screenStream = null;
    }

    // 5. Detener MediaRecorder y procesar el Blob de audio final
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
      state.mediaRecorder.onstop = () => {
        finalizeMeetingPost(finalDuration);
      };
      state.mediaRecorder.stop();
    } else {
      finalizeMeetingPost(finalDuration);
    }

    // 6. Ocultar pantalla de llamada y restaurar UI
    state.isCallActive = false;
    DOM.meetingOverlay.classList.add('hidden');
    DOM.localVideo.srcObject = null;
  }

  // Publicar la tarjeta de reunión en el chat activo
  function finalizeMeetingPost(duration) {
    // Crear el Blob con el audio recolectado
    let audioUrl = '';
    if (state.recordedAudioChunks.length > 0) {
      const mimeType = (state.mediaRecorder && state.mediaRecorder.mimeType) || 'audio/webm';
      state.recordedAudioBlob = new Blob(state.recordedAudioChunks, { type: mimeType });
      audioUrl = URL.createObjectURL(state.recordedAudioBlob);
    }

    const activeConv = state.conversations.find(c => c.id === state.activeChatId);
    if (!activeConv) return;

    // Si no hubo transcripciones porque el usuario no habló o la API no capturó, pero habló algo en interim:
    const finalTranscriptions = [...state.transcriptionEntries];

    const meetingCardMessage = {
      id: 'meeting_' + Date.now(),
      isMeetingCard: true,
      sender: 'Sistema Microsoft Teams',
      meetingName: activeConv.title,
      duration: duration,
      audioUrl: audioUrl,
      transcription: finalTranscriptions,
      time: getCurrentTimeFormatted()
    };

    activeConv.messages.push(meetingCardMessage);
    activeConv.lastMessage = `📹 Reunión finalizada (${duration}) - Transcripción lista`;
    activeConv.lastTime = meetingCardMessage.time;

    renderMessages();
    renderConversations(DOM.filterChatsInput.value);
    scrollToBottom();
  }

  // ========================================================
  // CONTROLES DE LA LLAMADA (TOOLBAR)
  // ========================================================
  function toggleCamera() {
    if (!state.localStream) return;
    const videoTrack = state.localStream.getVideoTracks()[0];

    if (videoTrack) {
      state.isCameraOn = !state.isCameraOn;
      videoTrack.enabled = state.isCameraOn;

      if (state.isCameraOn) {
        DOM.localVideo.classList.remove('hidden');
        DOM.localAvatarPlaceholder.classList.add('hidden');
        DOM.toggleCameraBtn.classList.remove('off');
        DOM.toggleCameraBtn.classList.add('active');
        DOM.toggleCameraBtn.querySelector('.icon-camera-on').classList.remove('hidden');
        DOM.toggleCameraBtn.querySelector('.icon-camera-off').classList.add('hidden');
      } else {
        DOM.localVideo.classList.add('hidden');
        DOM.localAvatarPlaceholder.classList.remove('hidden');
        DOM.toggleCameraBtn.classList.add('off');
        DOM.toggleCameraBtn.classList.remove('active');
        DOM.toggleCameraBtn.querySelector('.icon-camera-on').classList.add('hidden');
        DOM.toggleCameraBtn.querySelector('.icon-camera-off').classList.remove('hidden');
      }
    }
  }

  function toggleMicrophone() {
    if (!state.localStream) return;
    const audioTrack = state.localStream.getAudioTracks()[0];

    if (audioTrack) {
      state.isMicOn = !state.isMicOn;
      audioTrack.enabled = state.isMicOn;

      if (state.isMicOn) {
        DOM.toggleMicBtn.classList.remove('off');
        DOM.toggleMicBtn.classList.add('active');
        DOM.toggleMicBtn.querySelector('.icon-mic-on').classList.remove('hidden');
        DOM.toggleMicBtn.querySelector('.icon-mic-off').classList.add('hidden');
        DOM.speechStatus.textContent = '🎙️ Transcribiendo audio en vivo...';
      } else {
        DOM.toggleMicBtn.classList.add('off');
        DOM.toggleMicBtn.classList.remove('active');
        DOM.toggleMicBtn.querySelector('.icon-mic-on').classList.add('hidden');
        DOM.toggleMicBtn.querySelector('.icon-mic-off').classList.remove('hidden');
        DOM.speechStatus.textContent = '🔇 Micrófono silenciado';
        DOM.audioLevelBar.style.opacity = '0.1';
      }
    }
  }

  async function shareScreen() {
    if (!state.isCallActive) return;

    try {
      if (!state.screenStream) {
        state.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        DOM.localVideo.srcObject = state.screenStream;
        DOM.localVideo.classList.remove('hidden');
        DOM.localAvatarPlaceholder.classList.add('hidden');
        DOM.shareScreenBtn.classList.add('active');

        state.screenStream.getVideoTracks()[0].onended = () => {
          DOM.localVideo.srcObject = state.localStream;
          DOM.shareScreenBtn.classList.remove('active');
          state.screenStream = null;
        };
      } else {
        state.screenStream.getTracks().forEach(t => t.stop());
        state.screenStream = null;
        DOM.localVideo.srcObject = state.localStream;
        DOM.shareScreenBtn.classList.remove('active');
      }
    } catch (e) {
      console.warn('Compartir pantalla cancelado o no soportado:', e);
    }
  }

  function toggleCaptions() {
    state.showCaptions = !state.showCaptions;
    if (state.showCaptions) {
      DOM.liveCaptionsBox.classList.remove('hidden');
      DOM.toggleCaptionsBtn.style.background = 'rgba(91, 95, 199, 0.4)';
    } else {
      DOM.liveCaptionsBox.classList.add('hidden');
      DOM.toggleCaptionsBtn.style.background = '';
    }
  }

  function sendCallReaction() {
    const emojis = ['👏', '❤️', '👍', '🎉', '💡'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    const reactionEl = document.createElement('div');
    reactionEl.textContent = randomEmoji;
    reactionEl.style.position = 'absolute';
    reactionEl.style.bottom = '90px';
    reactionEl.style.left = '50%';
    reactionEl.style.fontSize = '40px';
    reactionEl.style.transform = 'translateX(-50%)';
    reactionEl.style.pointerEvents = 'none';
    reactionEl.style.transition = 'all 1.2s ease-out';
    reactionEl.style.zIndex = '150';

    DOM.meetingOverlay.appendChild(reactionEl);

    setTimeout(() => {
      reactionEl.style.bottom = '240px';
      reactionEl.style.opacity = '0';
      reactionEl.style.transform = 'translateX(-50%) scale(1.6)';
    }, 50);

    setTimeout(() => {
      reactionEl.remove();
    }, 1300);
  }

  // ========================================================
  // CAMBIO DE TEMA (OSCURO / CLARO)
  // ========================================================
  function toggleTheme() {
    if (state.theme === 'dark') {
      state.theme = 'light';
      DOM.body.classList.remove('theme-dark');
      DOM.body.classList.add('theme-light');
    } else {
      state.theme = 'dark';
      DOM.body.classList.remove('theme-light');
      DOM.body.classList.add('theme-dark');
    }
  }

  // ========================================================
  // CONFIGURACIÓN DE LISTENERS
  // ========================================================
  function setupEventListeners() {
    // Tema
    DOM.themeToggleBtn.addEventListener('click', toggleTheme);

    // Ayuda
    DOM.helpInfoBtn.addEventListener('click', () => DOM.helpModal.classList.remove('hidden'));
    DOM.closeModalBtn.addEventListener('click', () => DOM.helpModal.classList.add('hidden'));
    DOM.closeModalFooterBtn.addEventListener('click', () => DOM.helpModal.classList.add('hidden'));

    // Búsqueda y filtrado
    DOM.filterChatsInput.addEventListener('input', (e) => {
      renderConversations(e.target.value);
    });

    // Envío de mensajes
    DOM.sendMessageBtn.addEventListener('click', handleSendMessage);
    DOM.chatMessageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });

    // Auto-ajuste de altura de textarea
    DOM.chatMessageInput.addEventListener('input', () => {
      DOM.chatMessageInput.style.height = 'auto';
      DOM.chatMessageInput.style.height = Math.min(DOM.chatMessageInput.scrollHeight, 120) + 'px';
    });

    // Botones de llamada
    DOM.startCallBtn.addEventListener('click', () => startCall({ video: true }));
    DOM.startAudioOnlyBtn.addEventListener('click', () => startCall({ video: false }));
    DOM.quickCallInputBtn.addEventListener('click', () => startCall({ video: true }));

    // Controles de llamada
    DOM.leaveCallBtn.addEventListener('click', endCall);
    DOM.toggleCameraBtn.addEventListener('click', toggleCamera);
    DOM.toggleMicBtn.addEventListener('click', toggleMicrophone);
    DOM.toggleCaptionsBtn.addEventListener('click', toggleCaptions);
    DOM.shareScreenBtn.addEventListener('click', shareScreen);
    DOM.callReactionBtn.addEventListener('click', sendCallReaction);

    // Tecla Escape para salir de modal o pantalla completa si aplica
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        DOM.helpModal.classList.add('hidden');
      }
    });
  }

  // Utilidades
  function getCurrentTimeFormatted() {
    const now = new Date();
    let hours = now.getHours();
    const mins = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${mins} ${ampm}`;
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Inicializar al cargar el DOM
  document.addEventListener('DOMContentLoaded', init);

})();

