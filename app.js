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
    activeChatId: 'is-general',
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

    // Visión por Computadora (tekit-vision C++)
    isVisionActive: true,
    visionInterval: null,
    lastVisionResult: null,
    visionSummary: null,

    // Motor de Transcripción (C++ con FastAPI vs Propio en JS vs Nativo W3C)
    activeEngine: (function() {
      try {
        return localStorage.getItem('teams_engine_choice') || 'cpp';
      } catch (e) {
        return 'cpp';
      }
    })(),
    neuralEngine: null,

    // Transcripción Nativa (Web Speech API)
    speechRecognition: null,
    isSpeechSupported: false,
    selectedLanguage: (function() {
      try {
        return localStorage.getItem('teams_transcribe_lang') || 'es-ES';
      } catch (e) {
        return 'es-ES';
      }
    })(),
    transcriptionEntries: [], // Array de { time: '00:04', speaker: 'Tú', text: '...' }
    currentInterimText: '',

    // Lista de Conversaciones de Teams
    conversations: [
      {
        id: 'is-general',
        title: 'Ingeniería de Software - General',
        subtitle: 'Canal General • 5 miembros',
        avatarText: 'IS',
        isTeam: true,
        lastTime: '10:32 AM',
        lastMessage: 'Carlos Ruiz: Si tienen unos minutos nos conectamos para cuadrar los pendientes.',
        messages: [
          {
            id: 'm1',
            sender: 'Ana Martínez',
            avatar: 'AM',
            isOutgoing: false,
            time: '10:30 AM',
            text: 'Hola a todos, ya dejé subida la versión con los ajustes solicitados. Por favor revísenla cuando tengan oportunidad.'
          },
          {
            id: 'm2',
            sender: 'Carlos Ruiz',
            avatar: 'CR',
            isOutgoing: false,
            time: '10:32 AM',
            text: 'Enterado Ana, estoy revisando el flujo principal. Si tienen unos minutos nos conectamos para cuadrar los pendientes.'
          }
        ]
      },
      {
        id: 'team-dev',
        title: 'Arquitectura y Rendimiento',
        subtitle: 'Canal Técnico • 3 miembros',
        avatarText: 'AR',
        isTeam: true,
        lastTime: 'Ayer',
        lastMessage: 'Mateo Gómez: Ya quedaron listos los módulos compilados.',
        messages: [
          {
            id: 'm3',
            sender: 'Mateo Gómez',
            avatar: 'MG',
            isOutgoing: false,
            time: 'Ayer',
            text: 'Ya quedaron integrados y optimizados los módulos de procesamiento en el repositorio.'
          }
        ]
      },
      {
        id: 'direct-sofia',
        title: 'Sofía Navarro',
        subtitle: 'Disponible • Chat directo',
        avatarText: 'SN',
        isTeam: false,
        lastTime: 'Lunes',
        lastMessage: 'Hola, ¿podemos revisar los requerimientos de la entrega?',
        messages: [
          {
            id: 'm4',
            sender: 'Sofía Navarro',
            avatar: 'SN',
            isOutgoing: false,
            time: 'Lunes',
            text: 'Hola, cuando tengas tiempo nos conectamos para revisar los últimos puntos antes de la entrega.'
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
    chatEngineSelect: document.getElementById('chat-engine-select'),
    chatLangSelect: document.getElementById('chat-lang-select'),
    startCallBtn: document.getElementById('btn-start-call'),
    startAudioOnlyBtn: document.getElementById('btn-start-audio-only'),
    quickCallInputBtn: document.getElementById('btn-quick-call-input'),
    helpInfoBtn: document.getElementById('btn-help-info'),
    helpModal: document.getElementById('help-modal'),
    closeModalBtn: document.getElementById('btn-close-modal'),
    closeModalFooterBtn: document.getElementById('btn-close-modal-footer'),

    // Elementos de la Llamada / Reunión
    meetingOverlay: document.getElementById('meeting-overlay'),
    meetingEngineSelect: document.getElementById('meeting-engine-select'),
    meetingLangSelect: document.getElementById('meeting-lang-select'),
    meetingName: document.getElementById('meeting-name'),
    meetingTimer: document.getElementById('meeting-timer'),
    speechStatus: document.getElementById('speech-recognition-status'),
    localVideo: document.getElementById('local-video'),
    localAvatarPlaceholder: document.getElementById('local-avatar-placeholder'),
    liveCaptionsBox: document.getElementById('live-captions-box'),
    liveCaptionText: document.getElementById('live-caption-text'),
    waveformCanvas: document.getElementById('audio-waveform-canvas'),
    hudRms: document.getElementById('hud-rms'),
    hudZcr: document.getElementById('hud-zcr'),
    hudCentroid: document.getElementById('hud-centroid'),
    hudClass: document.getElementById('hud-class'),
    toggleCameraBtn: document.getElementById('btn-toggle-camera'),
    toggleMicBtn: document.getElementById('btn-toggle-mic'),
    toggleCaptionsBtn: document.getElementById('btn-toggle-captions'),
    toggleVisionBtn: document.getElementById('btn-toggle-vision'),
    visionFaceCanvas: document.getElementById('vision-face-canvas'),
    visionCoachPill: document.getElementById('vision-coach-pill'),
    visionCoachDot: document.getElementById('vision-coach-dot'),
    visionCoachText: document.getElementById('vision-coach-text'),
    shareScreenBtn: document.getElementById('btn-share-screen'),
    callReactionBtn: document.getElementById('btn-call-reaction'),
    leaveCallBtn: document.getElementById('btn-leave-call'),
    audioLevelBar: document.getElementById('audio-level-bar')
  };

  // ========================================================
  // INICIALIZACIÓN
  // ========================================================
  function init() {
    checkProtocolAndEnvironment();
    initEngineSelectors();
    initLanguageSelectors();
    checkSpeechRecognitionSupport();
    renderConversations();
    renderMessages();
    setupEventListeners();
  }

  // ========================================================
  // GESTIÓN DE MOTOR DE IA (Propio sin librerías vs Nativo)
  // ========================================================
  function initEngineSelectors() {
    if (window.TeamsNeuralAcousticEngine && !state.neuralEngine) {
      state.neuralEngine = new window.TeamsNeuralAcousticEngine();
    }

    const saved = state.activeEngine || 'cpp';
    if (DOM.chatEngineSelect) DOM.chatEngineSelect.value = saved;
    if (DOM.meetingEngineSelect) DOM.meetingEngineSelect.value = saved;
  }

  function handleEngineChange(newEngine) {
    state.activeEngine = newEngine;
    try {
      localStorage.setItem('teams_engine_choice', newEngine);
    } catch (e) {}

    if (DOM.chatEngineSelect && DOM.chatEngineSelect.value !== newEngine) {
      DOM.chatEngineSelect.value = newEngine;
    }
    if (DOM.meetingEngineSelect && DOM.meetingEngineSelect.value !== newEngine) {
      DOM.meetingEngineSelect.value = newEngine;
    }

    if (state.isCallActive) {
      DOM.speechStatus.textContent = '🎙️ Grabación y subtítulos activos';
    }
  }

  // Comprobar estado de conexión con el backend
  let activeApiBase = 'http://127.0.0.1:8000';

  async function checkProtocolAndEnvironment() {
    const isCorrectServer = window.location.protocol.startsWith('http') && window.location.port === '8000';
    
    // Si ya estamos en http://127.0.0.1:8000 o http://localhost:8000, el entorno es óptimo
    if (isCorrectServer) {
      activeApiBase = '';
      return;
    }

    // Si estamos en file://, :8080 o :5500 (Live Server), buscar el backend activo en 8000 o 8080
    let connectedBase = null;
    for (const base of ['http://127.0.0.1:8000', 'http://localhost:8000', 'http://127.0.0.1:8080']) {
      try {
        const resp = await fetch(`${base}/api/health`, { method: 'GET' });
        if (resp.ok) {
          connectedBase = base;
          activeApiBase = base;
          break;
        }
      } catch (err) {}
    }

    if (connectedBase) {
      // Redirigir automáticamente al servidor activo para tener mismo origen, micrófono y cámara sin bloqueos
      try {
        window.location.replace(connectedBase);
        return;
      } catch (e) {}

      const banner = document.createElement('div');
      banner.id = 'protocol-warning-banner';
      banner.style.cssText = `
        background-color: #1F1F1F;
        color: #E1DFDD;
        border-bottom: 2px solid #5B5FC7;
        padding: 8px 16px;
        font-size: 13px;
        text-align: center;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      `;
      banner.innerHTML = `
        <span>🟢 <strong>Servidor C++ conectado</strong> (${connectedBase}). Entra desde: <a href="${connectedBase}" style="color: #9EA2FF; font-weight: 600; text-decoration: underline;">${connectedBase}</a></span>
        <button style="background: #5B5FC7; border: none; color: #FFF; cursor: pointer; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600;" onclick="window.location.href='${connectedBase}'">Abrir en Servidor</button>
        <button style="background: rgba(255,255,255,0.15); border: none; color: #FFF; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 12px;" onclick="this.parentElement.remove()">Continuar aquí</button>
      `;
      document.body.prepend(banner);
      return;
    }

    // Servidor no responde en 8080 ni 8000
    const banner = document.createElement('div');
    banner.id = 'protocol-warning-banner';
    banner.style.cssText = `
      background-color: #242424;
      color: #FFFFFF;
      border-bottom: 2px solid #C4314B;
      padding: 8px 16px;
      font-size: 13px;
      text-align: center;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    `;
    banner.innerHTML = `
      <span>ℹ️ Para conectar el motor de transcripción e IA en C++, ejecuta en la terminal <code>uvicorn server:app --reload</code> o <code>python server.py</code> y entra a <a href="http://127.0.0.1:8000" style="color: #A1A5D8; text-decoration: underline; font-weight: 600;">http://127.0.0.1:8000</a>.</span>
      <button style="background: rgba(255,255,255,0.15); border: none; color: #FFF; cursor: pointer; padding: 4px 10px; border-radius: 4px; font-size: 12px;" onclick="this.parentElement.remove()">Entendido</button>
    `;
    document.body.prepend(banner);
  }

  // ========================================================
  // GESTIÓN DE IDIOMAS DE TRANSCRIPCIÓN
  // ========================================================
  function getEffectiveLanguage() {
    if (state.selectedLanguage === 'auto') {
      return navigator.language || 'es-ES';
    }
    return state.selectedLanguage || 'es-ES';
  }

  function getLanguageName(code) {
    const names = {
      'auto': 'Automático (Navegador)',
      'es-ES': 'Español (España)',
      'es-MX': 'Español (Latam)',
      'en-US': 'English (US)',
      'en-GB': 'English (UK)',
      'fr-FR': 'Français',
      'pt-BR': 'Português (Brasil)',
      'de-DE': 'Deutsch',
      'it-IT': 'Italiano',
      'ja-JP': '日本語',
      'zh-CN': '中文 (普通话)'
    };
    return names[code] || code;
  }

  function handleLanguageChange(newLang) {
    state.selectedLanguage = newLang;
    try {
      localStorage.setItem('teams_transcribe_lang', newLang);
    } catch (e) {}

    // Sincronizar selectores en la UI
    if (DOM.chatLangSelect && DOM.chatLangSelect.value !== newLang) {
      DOM.chatLangSelect.value = newLang;
    }
    if (DOM.meetingLangSelect && DOM.meetingLangSelect.value !== newLang) {
      DOM.meetingLangSelect.value = newLang;
    }

    // Si la reunión está en curso, actualizar el motor en vivo
    if (state.isCallActive && state.speechRecognition) {
      const effectiveLang = getEffectiveLanguage();
      state.speechRecognition.lang = effectiveLang;
      DOM.speechStatus.textContent = `🎙️ Transcribiendo [${getLanguageName(newLang)}]...`;
      try {
        state.speechRecognition.stop();
        // onend se encarga de reanudar con el nuevo idioma
      } catch (err) {
        console.warn('Reinicio tras cambio de idioma:', err);
      }
    }
  }

  function initLanguageSelectors() {
    const saved = state.selectedLanguage || 'es-ES';
    if (DOM.chatLangSelect) {
      DOM.chatLangSelect.value = saved;
    }
    if (DOM.meetingLangSelect) {
      DOM.meetingLangSelect.value = saved;
    }
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

    // Generar las líneas de transcripción limpias sin etiquetas robóticas
    let transcriptionContentHtml = '';
    if (msg.transcription && msg.transcription.length > 0) {
      transcriptionContentHtml = msg.transcription.map(item => {
        let cleanSpeaker = item.speaker || 'Tú';
        // Normalizar nombres para que no aparezcan sufijos de motores
        cleanSpeaker = cleanSpeaker.replace(/\s*\([^)]*\)/g, '').trim();
        if (!cleanSpeaker) cleanSpeaker = 'Tú';

        return `
          <div class="transcription-line">
            <span class="transcription-ts">[${item.time}]</span>
            <span class="transcription-speaker">${escapeHtml(cleanSpeaker)}:</span>
            <span class="transcription-dialogue">${escapeHtml(item.text)}</span>
          </div>
        `;
      }).join('');
    } else {
      let emptyReason = 'No se detectó actividad de voz durante la llamada.';
      if (msg.speechError === 'browser-unsupported') {
        emptyReason = 'El navegador no tiene habilitado el soporte de reconocimiento de voz en directo.';
      } else if (msg.speechError === 'network') {
        emptyReason = 'No se pudo conectar con el servicio de transcripción de voz.';
      } else if (msg.speechError === 'not-allowed') {
        emptyReason = 'Permiso de micrófono no concedido.';
      }

      transcriptionContentHtml = `
        <div class="transcription-empty-notice">
          ${emptyReason}
        </div>
      `;
    }

    let visionSectionHtml = '';
    if (msg.visionSummary && msg.visionSummary.frames_received > 0) {
      const vs = msg.visionSummary;
      const covPct = Math.round(vs.coverage_pct !== undefined ? vs.coverage_pct : (vs.coverage * 100));
      const posPct = Math.round(vs.positive_ratio_pct !== undefined ? vs.positive_ratio_pct : (vs.positive_ratio * 100));
      const expSecs = vs.expression_seconds || {};

      const totalObs = Math.max(vs.observed_s || 1, 0.001);
      const felizPct = Math.round(((expSecs.feliz || 0) / totalObs) * 100);
      const neutralPct = Math.round(((expSecs.neutral || 0) / totalObs) * 100);
      const sorpresaPct = Math.round(((expSecs.sorpresa || 0) / totalObs) * 100);
      const tensionPct = Math.round((((expSecs.enojo || 0) + (expSecs.asco || 0) + (expSecs.miedo || 0) + (expSecs.triste || 0)) / totalObs) * 100);

      const dominantMap = {
        'feliz': 'Positiva / Agradable 😊',
        'neutral': 'Neutral / Enfocada 😐',
        'sorpresa': 'Atenta / Sorpresa 😮',
        'enojo': 'Concentrada / Tensión 🧐',
        'triste': 'Seria 🤔',
        'sin datos': 'Sin datos suficientes'
      };
      const dominantText = dominantMap[vs.dominant] || vs.dominant || 'Neutral';

      visionSectionHtml = `
        <!-- Sección de Análisis de Video y Expresiones (tekit-vision) -->
        <div class="card-vision-section">
          <div class="vision-section-header">
            <h5>
              <svg style="width: 15px; height: 15px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"></path>
              </svg>
              Análisis de video y expresiones (Visión por Computadora):
            </h5>
            <button class="btn-card-action btn-export-vision" title="Exportar reporte detallado JSON">
              📊 Exportar JSON
            </button>
          </div>

          <div class="vision-metrics-grid">
            <div class="vision-metric-box">
              <span class="vision-metric-label">Presencia en cámara</span>
              <span class="vision-metric-val">🎯 ${covPct}%</span>
            </div>
            <div class="vision-metric-box">
              <span class="vision-metric-label">Expresión dominante</span>
              <span class="vision-metric-val">${dominantText}</span>
            </div>
            <div class="vision-metric-box">
              <span class="vision-metric-label">Balance positivo</span>
              <span class="vision-metric-val">📈 ${posPct}%</span>
            </div>
          </div>

          <div class="vision-distribution-wrap">
            <div class="vision-distribution-title">Distribución de expresiones durante la llamada:</div>
            <div class="vision-segmented-bar">
              <div class="vision-segment seg-feliz" style="width: ${felizPct}%;" title="Positiva/Feliz: ${felizPct}%"></div>
              <div class="vision-segment seg-neutral" style="width: ${neutralPct}%;" title="Neutral: ${neutralPct}%"></div>
              <div class="vision-segment seg-sorpresa" style="width: ${sorpresaPct}%;" title="Sorpresa/Atenta: ${sorpresaPct}%"></div>
              <div class="vision-segment seg-tension" style="width: ${tensionPct}%;" title="Tensión/Seriedad: ${tensionPct}%"></div>
            </div>
            <div class="vision-legend-row">
              <span class="vision-legend-item"><span class="vision-legend-dot" style="background:#30D158;"></span> Positiva (${felizPct}%)</span>
              <span class="vision-legend-item"><span class="vision-legend-dot" style="background:#5B5FC7;"></span> Neutral (${neutralPct}%)</span>
              <span class="vision-legend-item"><span class="vision-legend-dot" style="background:#FF9F0A;"></span> Atenta (${sorpresaPct}%)</span>
              <span class="vision-legend-item"><span class="vision-legend-dot" style="background:#FF453A;"></span> Tensión (${tensionPct}%)</span>
            </div>
          </div>
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
            <p>Reunión finalizada • Grabación, transcripción y análisis disponibles</p>
          </div>
        </div>
        <div class="card-badges-row">
          <div class="card-duration-badge">
            ⏱️ ${msg.duration}
          </div>
          <div class="card-lang-badge">
            🌐 ${escapeHtml(msg.language || 'Español')}
          </div>
        </div>
      </div>

      <!-- Reproductor de Audio de la Llamada -->
      <div class="card-audio-section">
        <div class="audio-section-label">
          <span>Grabación de la llamada</span>
        </div>
        <div class="audio-controls-row">
          <audio controls class="teams-audio-player" src="${msg.audioUrl}"></audio>
          <a class="btn-download-audio" href="${msg.audioUrl}" download="grabacion_reunion.webm" title="Descargar grabación">
            Descargar grabación
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
            <button class="btn-card-action btn-copy-transcription" title="Copiar texto">
              Copiar texto
            </button>
            <button class="btn-card-action btn-export-txt" title="Exportar transcripción">
              Exportar (.txt)
            </button>
          </div>
        </div>

        <div class="transcription-text-box">
          ${transcriptionContentHtml}
        </div>
      </div>

      ${visionSectionHtml}
    `;

    // Eventos de copiar y descargar texto
    const copyBtn = card.querySelector('.btn-copy-transcription');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        let fullText = `=== TRANSCRIPCIÓN: ${msg.meetingName} (${msg.duration}) - [${msg.language || 'Español'}] ===\n\n`;
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
        fullText += `Idioma: ${msg.language || 'Español'}\n`;
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

    const exportVisionBtn = card.querySelector('.btn-export-vision');
    if (exportVisionBtn && msg.visionSummary) {
      exportVisionBtn.addEventListener('click', () => {
        const jsonStr = JSON.stringify(msg.visionSummary, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_video_${Date.now()}.json`;
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
      sender: 'Tú',
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
  // MÓDULO DE VISIÓN POR COMPUTADORA (TEKIT-VISION)
  // Análisis de video en vivo (detección de rostro y expresiones)
  // ========================================================
  const getApiBase = () => (window.location.protocol.startsWith('http') && window.location.port === '8000' ? '' : activeApiBase);

  function startVisionAnalysis() {
    stopVisionAnalysis();
    if (!state.isVisionActive) return;

    if (DOM.visionCoachText) {
      DOM.visionCoachText.textContent = 'Iniciando visión C++...';
      DOM.visionCoachDot.className = 'vision-coach-dot inactive';
    }

    // Resetear sesión en el backend C++
    fetch(`${getApiBase()}/api/vision/reset_session`, { method: 'POST' }).catch(() => {});

    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d');

    state.visionInterval = setInterval(async () => {
      if (!state.isCallActive || !state.isCameraOn || !DOM.localVideo) {
        if (DOM.visionFaceCanvas) {
          const ctx = DOM.visionFaceCanvas.getContext('2d');
          ctx.clearRect(0, 0, DOM.visionFaceCanvas.width, DOM.visionFaceCanvas.height);
        }
        return;
      }

      const video = DOM.localVideo;
      if (!video.videoWidth || !video.videoHeight) {
        try { video.play(); } catch (e) {}
        return;
      }

      // Muestrear a resolución óptima (320x240)
      const targetW = 320;
      const targetH = Math.round((video.videoHeight / video.videoWidth) * targetW) || 240;
      offscreenCanvas.width = targetW;
      offscreenCanvas.height = targetH;
      offscreenCtx.drawImage(video, 0, 0, targetW, targetH);

      offscreenCanvas.toBlob(async (blob) => {
        if (!blob || !state.isCallActive) return;

        const buildForm = () => {
          const fd = new FormData();
          fd.append('frame', blob, 'frame.jpg');
          fd.append('elapsed', (state.callDurationSeconds || 0).toString());
          fd.append('use_guide', '0');
          return fd;
        };

        try {
          let resp = await fetch(`${getApiBase()}/api/vision/analyze_frame`, {
            method: 'POST',
            body: buildForm()
          });

          if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`);
          }

          const data = await resp.json();
          if (data.status === 'success') {
            state.lastVisionResult = data;
            updateVisionOverlay(data, targetW, targetH);
          }
        } catch (err) {
          // Intentar reconexión directa en 127.0.0.1:8000 y localhost:8000 antes de mostrar desconectado
          let recovered = false;
          for (const candidate of ['http://127.0.0.1:8000', 'http://localhost:8000', 'http://127.0.0.1:8080']) {
            try {
              const retryResp = await fetch(`${candidate}/api/vision/analyze_frame`, {
                method: 'POST',
                body: buildForm()
              });
              if (retryResp.ok) {
                activeApiBase = candidate;
                const retryData = await retryResp.json();
                if (retryData.status === 'success') {
                  state.lastVisionResult = retryData;
                  updateVisionOverlay(retryData, targetW, targetH);
                  recovered = true;
                  break;
                }
              }
            } catch (retryErr) {}
          }

          if (!recovered && DOM.visionCoachText && state.isCallActive) {
            DOM.visionCoachDot.className = 'vision-coach-dot inactive';
            DOM.visionCoachText.textContent = 'Reconectando con servidor (127.0.0.1:8000)...';
          }
        }
      }, 'image/jpeg', 0.85);

    }, 750);
  }

  function stopVisionAnalysis() {
    if (state.visionInterval) {
      clearInterval(state.visionInterval);
      state.visionInterval = null;
    }
    if (DOM.visionFaceCanvas) {
      const ctx = DOM.visionFaceCanvas.getContext('2d');
      ctx.clearRect(0, 0, DOM.visionFaceCanvas.width, DOM.visionFaceCanvas.height);
    }
  }

  function updateVisionOverlay(data, frameW, frameH) {
    if (!DOM.visionCoachText || !DOM.visionCoachDot) return;

    if (data.found) {
      DOM.visionCoachDot.className = 'vision-coach-dot';
      let icon = '😊';
      if (data.expression === 'neutral') icon = '😐';
      else if (data.expression === 'sorpresa') icon = '😮';
      else if (data.expression === 'enojo') icon = '🧐';
      else if (data.expression === 'triste') icon = '🤔';

      DOM.visionCoachText.textContent = `${icon} ${data.expression_display || 'Atención activa'}`;

      // Dibujar marco elegante alrededor del rostro
      if (DOM.visionFaceCanvas && DOM.localVideo) {
        const canvas = DOM.visionFaceCanvas;
        const rect = DOM.localVideo.getBoundingClientRect();
        if (canvas.width !== rect.width || canvas.height !== rect.height) {
          canvas.width = rect.width;
          canvas.height = rect.height;
        }

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const scaleX = canvas.width / frameW;
        const scaleY = canvas.height / frameH;

        const bx = data.box.x * scaleX;
        const by = data.box.y * scaleY;
        const bw = data.box.w * scaleX;
        const bh = data.box.h * scaleY;

        // Marco estilo Microsoft Teams (rectángulo sutil + esquinas acentuadas)
        ctx.strokeStyle = 'rgba(127, 133, 245, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, by, bw, bh);

        ctx.strokeStyle = '#7F85F5';
        ctx.lineWidth = 3.0;

        const cornerLen = Math.min(bw, bh) * 0.22;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(bx, by + cornerLen);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + cornerLen, by);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(bx + bw - cornerLen, by);
        ctx.lineTo(bx + bw, by);
        ctx.lineTo(bx + bw, by + cornerLen);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(bx, by + bh - cornerLen);
        ctx.lineTo(bx, by + bh);
        ctx.lineTo(bx + cornerLen, by + bh);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(bx + bw - cornerLen, by + bh);
        ctx.lineTo(bx + bw, by + bh);
        ctx.lineTo(bx + bw, by + bh - cornerLen);
        ctx.stroke();
      }
    } else {
      DOM.visionCoachDot.className = 'vision-coach-dot inactive';
      DOM.visionCoachText.textContent = 'Buscando rostro...';
      if (DOM.visionFaceCanvas) {
        const ctx = DOM.visionFaceCanvas.getContext('2d');
        ctx.clearRect(0, 0, DOM.visionFaceCanvas.width, DOM.visionFaceCanvas.height);
      }
    }
  }

  function toggleVisionCoach() {
    state.isVisionActive = !state.isVisionActive;
    if (state.isVisionActive) {
      if (DOM.visionCoachPill) DOM.visionCoachPill.classList.remove('hidden');
      if (DOM.toggleVisionBtn) DOM.toggleVisionBtn.classList.add('active');
      startVisionAnalysis();
    } else {
      if (DOM.visionCoachPill) DOM.visionCoachPill.classList.add('hidden');
      if (DOM.toggleVisionBtn) DOM.toggleVisionBtn.classList.remove('active');
      stopVisionAnalysis();
    }
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
    state.lastSpeechError = null;

    DOM.meetingTimer.textContent = '00:00';
    DOM.liveCaptionText.textContent = 'Los subtítulos en directo aparecerán aquí cuando hables...';
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
        DOM.localVideo.play().catch(e => console.warn('Video play:', e));
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

    // 6. Iniciar Análisis de Video (tekit-vision)
    startVisionAnalysis();
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
      state.audioAnalyser.fftSize = 128; // 64 bins para visualizador y DSP

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
    const timeData = new Float32Array(bufferLength);

    state.audioAnalyser.getByteFrequencyData(dataArray);
    state.audioAnalyser.getFloatTimeDomainData(timeData);

    // Procesamiento acústico en tiempo real si el motor está disponible
    if (state.neuralEngine && state.activeEngine === 'neural') {
      const sampleRate = (state.audioContext && state.audioContext.sampleRate) || 44100;
      const res = state.neuralEngine.processFrame(timeData, dataArray, sampleRate);

      if (res.isVoice && res.text) {
        const currentCallTime = DOM.meetingTimer.textContent;
        const lastEntry = state.transcriptionEntries[state.transcriptionEntries.length - 1];
        if (!lastEntry || lastEntry.text !== res.text || lastEntry.time !== currentCallTime) {
          state.transcriptionEntries.push({
            time: currentCallTime,
            speaker: 'Tú',
            text: res.text
          });
          DOM.liveCaptionText.textContent = res.text;
        }
      }
    }

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
      state.lastSpeechError = 'browser-unsupported';
      DOM.speechStatus.textContent = '⚠️ Reconocimiento nativo no soportado (sólo audio)';
      DOM.liveCaptionText.textContent = 'Tu navegador no tiene activado SpeechRecognition nativo. El audio se grabará y podrás escucharlo y descargarlo al colgar.';
      return;
    }

    try {
      state.speechRecognition = new SpeechRecognition();
      state.speechRecognition.continuous = true;
      state.speechRecognition.interimResults = true;
      state.speechRecognition.lang = getEffectiveLanguage();

      DOM.speechStatus.textContent = `🎙️ Transcribiendo [${getLanguageName(state.selectedLanguage)}]...`;

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
              state.currentInterimText = '';
            }
          } else {
            interimTranscript += transcriptPart;
          }
        }

        if (interimTranscript) {
          state.currentInterimText = interimTranscript;
          DOM.liveCaptionText.textContent = interimTranscript;
        }
      };

      state.speechBlocked = false;

      state.speechRecognition.onerror = (event) => {
        console.warn('SpeechRecognition error:', event.error);
        state.lastSpeechError = event.error;
        if (event.error === 'not-allowed') {
          DOM.speechStatus.textContent = '❌ Permiso de micrófono denegado';
          state.speechBlocked = true;
        } else if (event.error === 'language-not-supported') {
          DOM.speechStatus.textContent = '⚠️ Idioma no soportado por el navegador';
        } else if (event.error === 'network') {
          DOM.speechStatus.textContent = '⚠️ Error de conexión de voz';
        }
      };

      // Si el motor de reconocimiento se detiene por silencio, reiniciarlo mientras la llamada siga activa
      state.speechRecognition.onend = () => {
        if (state.isCallActive && state.speechRecognition && !state.speechBlocked) {
          try {
            state.speechRecognition.lang = getEffectiveLanguage();
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

    // 5. Detener análisis de visión
    stopVisionAnalysis();

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

  // Conversión de audio a WAV PCM estándar en JavaScript puro sin librerías
  async function convertBlobToWav(blob) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const tempCtx = new AudioCtx();
      const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);

      const numChannels = 1;
      const sampleRate = audioBuffer.sampleRate;
      const format = 1; // PCM
      const bitDepth = 16;

      const channelData = audioBuffer.getChannelData(0);
      const dataLength = channelData.length * (bitDepth / 8);
      const buffer = new ArrayBuffer(44 + dataLength);
      const view = new DataView(buffer);

      const writeString = (v, offset, str) => {
        for (let i = 0; i < str.length; i++) {
          v.setUint8(offset + i, str.charCodeAt(i));
        }
      };

      writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + dataLength, true);
      writeString(view, 8, 'WAVE');
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, format, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
      view.setUint16(32, numChannels * (bitDepth / 8), true);
      view.setUint16(34, bitDepth, true);
      writeString(view, 36, 'data');
      view.setUint32(40, dataLength, true);

      let offset = 44;
      for (let i = 0; i < channelData.length; i++) {
        let s = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
      }

      tempCtx.close();
      return new Blob([view], { type: 'audio/wav' });
    } catch (e) {
      console.warn('Fallback al blob de audio original:', e);
      return blob;
    }
  }

  // Publicar la tarjeta de reunión en el chat activo
  async function finalizeMeetingPost(duration) {
    let audioUrl = '';
    let audioBlob = null;
    if (state.recordedAudioChunks.length > 0) {
      const mimeType = (state.mediaRecorder && state.mediaRecorder.mimeType) || 'audio/webm';
      audioBlob = new Blob(state.recordedAudioChunks, { type: mimeType });
      state.recordedAudioBlob = audioBlob;
      audioUrl = URL.createObjectURL(audioBlob);
    }

    const activeConv = state.conversations.find(c => c.id === state.activeChatId);
    if (!activeConv) return;

    let finalTranscriptions = [...state.transcriptionEntries];

    // Si hay audio grabado: procesar con el servicio de transcripción de backend
    if (audioBlob && finalTranscriptions.length === 0) {
      try {
        const wavBlob = await convertBlobToWav(audioBlob);
        const formData = new FormData();
        formData.append('audio', wavBlob, 'recording.wav');
        formData.append('lang', state.selectedLanguage || 'es-ES');

        const response = await fetch(`${getApiBase()}/api/transcribe`, {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success' && data.text) {
            finalTranscriptions = data.transcription || [
              {
                time: duration,
                speaker: state.selectedLanguage.startsWith('en') ? 'You' : 'Tú',
                text: data.text
              }
            ];
          }
        }
      } catch (apiErr) {
        console.warn('Transcripción backend no alcanzable, usando transcripción de audio local:', apiErr);
      }
    }

    // Si aún no hubo transcripciones pero hubo texto provisional
    if (finalTranscriptions.length === 0 && state.currentInterimText && state.currentInterimText.trim().length > 0) {
      finalTranscriptions.push({
        time: duration,
        speaker: 'Tú',
        text: state.currentInterimText.trim()
      });
    }

    // Obtener resumen de análisis de video de tekit-vision
    let visionSummary = null;
    try {
      const vForm = new FormData();
      vForm.append('elapsed', (state.callDurationSeconds || 0).toString());
      const vResp = await fetch(`${getApiBase()}/api/vision/finish_session`, {
        method: 'POST',
        body: vForm
      });
      if (vResp.ok) {
        const vData = await vResp.json();
        if (vData.status === 'success' && vData.summary) {
          visionSummary = vData.summary;
        }
      }
    } catch (vErr) {
      console.warn('No se pudo obtener resumen de video:', vErr);
    }

    const meetingCardMessage = {
      id: 'meeting_' + Date.now(),
      isMeetingCard: true,
      sender: 'Microsoft Teams',
      meetingName: activeConv.title,
      duration: duration,
      language: getLanguageName(state.selectedLanguage),
      speechError: state.lastSpeechError,
      audioUrl: audioUrl,
      transcription: finalTranscriptions,
      visionSummary: visionSummary,
      time: getCurrentTimeFormatted()
    };

    activeConv.messages.push(meetingCardMessage);
    activeConv.lastMessage = `📹 Reunión finalizada (${duration})`;
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
        DOM.speechStatus.textContent = `🎙️ Transcribiendo [${getLanguageName(state.selectedLanguage)}]...`;
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

    // Selectores de Motor de Transcripción (Propio vs Nativo)
    if (DOM.chatEngineSelect) {
      DOM.chatEngineSelect.addEventListener('change', (e) => handleEngineChange(e.target.value));
    }
    if (DOM.meetingEngineSelect) {
      DOM.meetingEngineSelect.addEventListener('change', (e) => handleEngineChange(e.target.value));
    }

    // Selectores de Idioma de Transcripción
    if (DOM.chatLangSelect) {
      DOM.chatLangSelect.addEventListener('change', (e) => handleLanguageChange(e.target.value));
    }
    if (DOM.meetingLangSelect) {
      DOM.meetingLangSelect.addEventListener('change', (e) => handleLanguageChange(e.target.value));
    }

    // Botones de llamada
    DOM.startCallBtn.addEventListener('click', () => startCall({ video: true }));
    DOM.startAudioOnlyBtn.addEventListener('click', () => startCall({ video: false }));
    DOM.quickCallInputBtn.addEventListener('click', () => startCall({ video: true }));

    // Controles de llamada
    DOM.leaveCallBtn.addEventListener('click', endCall);
    DOM.toggleCameraBtn.addEventListener('click', toggleCamera);
    DOM.toggleMicBtn.addEventListener('click', toggleMicrophone);
    DOM.toggleCaptionsBtn.addEventListener('click', toggleCaptions);
    if (DOM.toggleVisionBtn) DOM.toggleVisionBtn.addEventListener('click', toggleVisionCoach);
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

