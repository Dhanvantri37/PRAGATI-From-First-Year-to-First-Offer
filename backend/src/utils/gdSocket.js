/**
 * GD WebSocket — Upgraded with:
 *  • Groq AI (llama-3.3-70b) for all AI decisions
 *  • Groq TTS (playai-tts) for AI voice responses
 *  • WebRTC signaling for Google Meet-style video
 *  • Session persistence (rejoin after refresh)
 *  • 2-minute wait timer → AI auto-joins as moderator
 *  • Real-time topic monitoring & off-topic alerts
 *  • AI opens, guides, monitors, and concludes the GD
 *  • Notification broadcast on room creation
 *  • Per-participant 7-dimension AI evaluation
 */

const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── AI Moderator identity ──────────────────────────────────────────────────
const AI_MODERATOR = { id: 'ai-moderator', name: 'PRAGATI AI Moderator' };

// ── Groq text generation ───────────────────────────────────────────────────
async function groqChat(systemPrompt, userMessage, maxTokens = 300) {
  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });
    return res.choices[0]?.message?.content?.trim() || '';
  } catch (err) {
    console.error('[groqChat]', err.message);
    return '';
  }
}

// ── Groq TTS — returns base64 audio ───────────────────────────────────────
async function groqTTS(text) {
  try {
    const res = await groq.audio.speech.create({
      model: 'playai-tts',
      voice: 'Celeste-PlayAI',   // clear, professional female voice
      input: text,
      response_format: 'mp3',
    });
    const buffer = Buffer.from(await res.arrayBuffer());
    return buffer.toString('base64');
  } catch (err) {
    console.error('[groqTTS]', err.message);
    return null;
  }
}

// ── Groq STT — transcribe audio chunk ─────────────────────────────────────
async function groqSTT(audioBuffer, language = 'en') {
  try {
    const { File } = await import('node:buffer');
    const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });
    const res = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3-turbo',
      language,
      response_format: 'json',
    });
    return res.text || '';
  } catch (err) {
    console.error('[groqSTT]', err.message);
    return '';
  }
}

// ── Generate GD topic via Groq ─────────────────────────────────────────────
async function generateTopic(room) {
  const cats = {
    TCS:       ['Digital India','AI Automation','Cybersecurity','Cloud Ethics'],
    Infosys:   ['AI in Finance','Blockchain','Digital Transformation'],
    Wipro:     ['Climate Tech','EdTech','Healthcare AI'],
    Cognizant: ['Remote Work','Diversity in Tech','Open Source'],
    Capgemini: ['Smart Cities','EV Revolution','Data Privacy'],
    Accenture: ['ESG Business','Future of Work','Digital Health'],
  };
  const list = cats[room.companyContext] || ['AI & Society','Startup Culture','India@2047','Education Reform','Mental Health'];
  const cat  = list[Math.floor(Math.random() * list.length)];

  const text = await groqChat(
    'You are a placement GD topic generator. Return ONLY the topic, no quotes, no explanation.',
    `Generate ONE debatable Group Discussion topic for ${room.companyContext || 'a top IT'} company placement.\nCategory: ${cat}\nDifficulty: ${room.difficulty}\nRules: 8-14 words, no question marks, must be a statement/proposition.`
  );

  if (text && text.length > 10) return text.replace(/['"]/g, '');
  const fallback = ['AI will eliminate more jobs than it creates','India needs Universal Basic Income now','Social media regulation harms free speech','Remote work permanently changes urban economies'];
  return fallback[Math.floor(Math.random() * fallback.length)];
}

// ── Broadcast AI voice message ─────────────────────────────────────────────
async function broadcastAIVoice(namespace, roomCode, text, type = 'moderation') {
  // Always emit text immediately
  namespace.to(roomCode).emit('ai-message', {
    userId: AI_MODERATOR.id,
    userName: AI_MODERATOR.name,
    text,
    type,       // 'opening' | 'moderation' | 'warning' | 'conclusion' | 'guide'
    isAI: true,
    ts: Date.now(),
  });
  // Fire TTS in background — emit audio when ready
  groqTTS(text).then(audioBase64 => {
    if (audioBase64) {
      namespace.to(roomCode).emit('ai-voice', { audioBase64, text, type });
    }
  });
}

// ── Check if a speech is off-topic ────────────────────────────────────────
async function checkTopicRelevance(topic, speech) {
  if (!speech || speech.length < 20) return { relevant: true, score: 80 };
  const reply = await groqChat(
    'You are a GD moderator. Respond ONLY with JSON.',
    `GD Topic: "${topic}"\nParticipant said: "${speech.slice(0, 300)}"\nRespond: {"relevant": true/false, "score": 0-100, "reason": "one short sentence"}`
  );
  try {
    return JSON.parse(reply.replace(/```json|```/g, ''));
  } catch {
    return { relevant: true, score: 70 };
  }
}

// ── Generate contextual AI moderator interjection ─────────────────────────
async function generateModeratorInterjection(topic, recentCaptions, type) {
  const context = recentCaptions.slice(-5).map(c => `${c.userName}: ${c.text}`).join('\n');
  const prompts = {
    opening:    `You are PRAGATI AI Moderator. Give a warm, professional GD opening (3-4 sentences). Welcome participants, introduce the topic "${topic}", explain they have time to discuss, and invite the first speaker.`,
    off_topic:  `You are PRAGATI AI Moderator. The discussion has drifted. Recent exchanges:\n${context}\n\nPolitely redirect to topic "${topic}" in 1-2 sentences. Be encouraging, not harsh.`,
    guide:      `You are PRAGATI AI Moderator. The discussion is going well. Topic: "${topic}"\nRecent:\n${context}\n\nAdd a thought-provoking angle or ask a question to deepen the discussion (1-2 sentences).`,
    silence:    `You are PRAGATI AI Moderator. There's been silence in the GD on topic "${topic}". Gently prompt participants to contribute with a specific question (1 sentence).`,
    time_warn:  `You are PRAGATI AI Moderator. 90 seconds remain in the GD on "${topic}". Ask participants to start summarizing their key points (1-2 sentences).`,
    conclusion: `You are PRAGATI AI Moderator. The GD on "${topic}" is ending. Deliver a warm, professional conclusion (3-4 sentences): summarize key themes discussed, appreciate participants' effort, announce evaluation is generating.`,
  };
  return await groqChat(
    'You are a professional, encouraging GD moderator. Keep responses concise and natural.',
    prompts[type] || prompts.guide,
    200
  );
}

// ── Generate contextual AI participant reply (turn-taking) ────────────────
async function generateAIParticipantReply(aiName, topic, conversationHistory, lastHumanSpeech) {
  // Build full conversation context
  const context = conversationHistory
    .slice(-8)
    .map(c => `${c.userName}: ${c.text}`)
    .join('\n');

  const prompt = `You are ${aiName}, a student participant in a Group Discussion for campus placement at a top IT company.

GD Topic: "${topic}"

Recent conversation:
${context}

The last person just said: "${lastHumanSpeech}"

Your task: Respond naturally as a GD participant. 
Rules:
- Keep your response to 2-3 sentences maximum
- Directly acknowledge or build upon what was just said
- Add a new angle, a counterpoint, or supporting evidence
- Use natural conversational language (not formal speech)
- Do NOT introduce yourself again
- Do NOT repeat what was already said
- Sound like a real student, not a robot
- Stay strictly on topic: "${topic}"

Respond now as ${aiName}:`;

  return await groqChat(
    `You are ${aiName}, a real student in a GD. Speak naturally, concisely, and stay on topic. Never break character.`,
    prompt,
    150
  );
}

// ── AI participant reply cooldown tracker ─────────────────────────────────
const aiReplyCooldown = {}; // roomCode → timestamp of last AI reply

// ── Full AI evaluation per participant ────────────────────────────────────
async function evaluateParticipant(participant, topic, allParticipants) {
  const speech = (participant.transcript || []).map(t => t.text).join(' ').slice(0, 1000);
  const totalDuration = allParticipants.reduce((s, p) => s + (p.speakingTime || 0), 0) || 1;
  const participationRatio = Math.round((participant.speakingTime / totalDuration) * 100);

  const prompt = `You are a senior corporate HR evaluator assessing a GD participant for placement.

GD Topic: "${topic}"
Participant: ${participant.name}
Speaking Time: ${participant.speakingTime}s out of ${totalDuration}s total (${participationRatio}% of discussion)
Word Count: ${participant.wordCount}
Filler Words: ${participant.fillerWords}
Interruptions: ${participant.interruptions}
Off-topic remarks: ${participant.offTopicCount || 0}
Full Transcript: "${speech}"

Score each dimension 0-100:
- communication: clarity, vocabulary, sentence structure
- confidence: assertiveness, pace, conviction
- leadership: taking initiative, guiding discussion, summarizing
- participation: engagement level, relevance, unique ideas
- fluency: smoothness, minimal fillers, natural flow
- relevance: how on-topic their contributions were
- teamwork: listening, building on others' points, not dominating

Also provide:
- 3 specific strengths (short phrases, be specific to their speech)
- 3 specific improvements (actionable, short)
- 3-sentence behavioral summary (professional HR tone)
- detailed feedback paragraph (4-5 sentences, very specific)
- placement readiness: "Ready" | "Near Ready" | "Needs Practice"

Respond ONLY in this exact JSON (no markdown):
{"communication":N,"confidence":N,"leadership":N,"participation":N,"fluency":N,"relevance":N,"teamwork":N,"overall":N,"strengths":["s1","s2","s3"],"improvements":["i1","i2","i3"],"summary":"...","detailedFeedback":"...","placementReadiness":"..."}`;

  try {
    const text = await groqChat('You are an expert HR evaluator. Return ONLY valid JSON, no markdown.', prompt, 600);
    const scores = JSON.parse(text.replace(/```json|```/g, '').trim());
    scores.overall = Math.round(
      (scores.communication + scores.confidence + scores.leadership +
       scores.participation + scores.fluency + scores.relevance + scores.teamwork) / 7
    );
    return scores;
  } catch (err) {
    console.error('[evaluateParticipant]', err.message);
    const base = 45 + Math.floor(Math.random() * 30);
    return {
      communication: base, confidence: base - 5, leadership: base - 10,
      participation: base + 5, fluency: base, relevance: base + 3, teamwork: base - 3,
      overall: base,
      strengths: ['Active participant', 'Relevant contributions', 'Clear examples'],
      improvements: ['Reduce filler words', 'Speak more assertively', 'Engage with others\' points'],
      summary: 'Showed decent participation with relevant contributions. With focused practice, can become a strong GD performer. Leadership and confidence are areas for further development.',
      detailedFeedback: 'The participant engaged with the discussion topic and made several relevant points. Communication was generally clear though filler words reduced impact. More assertive participation would strengthen overall performance.',
      placementReadiness: 'Needs Practice',
    };
  }
}

// ── Evaluate all participants ──────────────────────────────────────────────
async function evaluateAll(GDRoom, roomCode) {
  try {
    const room = await GDRoom.findOne({ roomCode });
    if (!room) return;
    for (let i = 0; i < room.participants.length; i++) {
      const p = room.participants[i];
      if (p.isAI) continue;
      room.participants[i].aiScore = await evaluateParticipant(p, room.topic, room.participants);
    }
    await room.save();
    return room;
  } catch (err) {
    console.error('[evaluateAll]', err.message);
  }
}

// ── Main socket registration ───────────────────────────────────────────────
function registerGDSocket(io, GDRoom) {
  const gdIO   = io.of('/gd');
  const mainIO = io;           // for cross-namespace notifications
  const timers = {};           // roomCode → various timer ids
  const recentCaptions = {};   // roomCode → last N captions array
  const silenceTimers = {};    // roomCode → silence detection timer

  gdIO.on('connection', socket => {
    console.log('[GD] socket connected:', socket.id);

    // ── JOIN ROOM ──────────────────────────────────────────────────────────
    socket.on('join-room', async ({ roomCode, userId, userName }) => {
      try {
        const room = await GDRoom.findOne({ roomCode });
        if (!room) { socket.emit('error', 'Room not found'); return; }

        // Session persistence — if room is active/locked and user was a prior participant, let them back in
        const wasParticipant = room.sessionParticipants?.some(sp => sp.userId?.toString() === userId);
        const isActiveSession = ['locked','prep','active'].includes(room.state);

        if (isActiveSession && !wasParticipant) {
          socket.emit('room-locked', { message: 'Group Discussion has already started. Please wait for the next session.' });
          return;
        }
        if (room.state === 'completed') {
          socket.emit('room-locked', { message: 'This session has ended. Please join a new room.' });
          return;
        }
        if (!isActiveSession && room.participants.length >= room.maxParticipants) {
          socket.emit('room-full', { message: 'Room is full.' }); return;
        }

        // Upsert participant
        const existing = room.participants.find(p => p.userId?.toString() === userId);
        if (!existing) {
          room.participants.push({ userId, name: userName, socketId: socket.id, isAI: false });
          // Track in session persistence list
          if (!room.sessionParticipants) room.sessionParticipants = [];
          if (!wasParticipant) room.sessionParticipants.push({ userId, name: userName, joinedAt: new Date() });
        } else {
          existing.socketId = socket.id;
        }
        await room.save();

        socket.join(roomCode);
        socket.data = { roomCode, userId, userName };

        // Init caption cache
        if (!recentCaptions[roomCode]) recentCaptions[roomCode] = [];

        const parts = room.participants.map(p => ({
          userId: p.userId, name: p.name, isAI: p.isAI,
          isMuted: p.isMuted, isCameraOff: p.isCameraOff,
        }));

        // Emit joined state — includes current topic/state so rejoin works
        socket.emit('joined', {
          roomCode, state: room.state, participants: parts,
          topic: ['locked','prep','active'].includes(room.state) ? room.topic : undefined,
          prepSecondsLeft: room.state === 'prep' ? room.prepSeconds : undefined,
          durationSeconds: room.durationSeconds,
        });

        gdIO.to(roomCode).emit('participant-update', {
          participants: parts, count: room.participants.length,
          required: room.minParticipants, max: room.maxParticipants, state: room.state,
        });

        // Check if we've hit minimum — start 2-minute wait timer or lock
        const humanCount = room.participants.filter(p => !p.isAI).length;
        if (room.state === 'waiting') {
          if (humanCount >= room.minParticipants) {
            // Enough humans — lock immediately
            clearTimeout(timers[`wait_${roomCode}`]);
            await doLock(room, roomCode, gdIO, GDRoom, timers, recentCaptions);
          } else if (humanCount === 1 && !room.waitTimerStarted) {
            // First human joined — start 2-min timer
            room.waitTimerStarted = new Date();
            await room.save();
            const waitMs = 2 * 60 * 1000; // 2 minutes
            gdIO.to(roomCode).emit('wait-timer-started', {
              message: `Waiting for more participants. AI will join in 2 minutes if minimum not reached.`,
              waitSeconds: 120,
            });
            timers[`wait_${roomCode}`] = setTimeout(async () => {
              const freshRoom = await GDRoom.findOne({ roomCode });
              if (!freshRoom || freshRoom.state !== 'waiting') return;
              // AI auto-joins as participant/moderator
              const aiNeeded = freshRoom.minParticipants - freshRoom.participants.filter(p => !p.isAI).length;
              const AI_NAMES = ['Arjun AI','Priya AI','Rahul AI','Sneha AI','Vikram AI'];
              for (let i = 0; i < Math.max(aiNeeded, 1); i++) {
                freshRoom.participants.push({
                  name: AI_NAMES[i % AI_NAMES.length], isAI: true,
                  speakingTime: 0, wordCount: 0,
                });
              }
              await freshRoom.save();
              gdIO.to(roomCode).emit('ai-joined', {
                message: 'Minimum participants not reached. AI participants have joined to start the discussion.',
                participants: freshRoom.participants.map(p => ({ userId: p.userId, name: p.name, isAI: p.isAI })),
              });
              await doLock(freshRoom, roomCode, gdIO, GDRoom, timers, recentCaptions);
            }, waitMs);
          }
        }
      } catch (err) { console.error('[join-room]', err.message); socket.emit('error', err.message); }
    });

    // ── WebRTC SIGNALING ───────────────────────────────────────────────────
    socket.on('webrtc-offer', ({ roomCode, toSocketId, offer, fromSocketId }) => {
      gdIO.to(toSocketId).emit('webrtc-offer', { offer, fromSocketId });
    });
    socket.on('webrtc-answer', ({ roomCode, toSocketId, answer, fromSocketId }) => {
      gdIO.to(toSocketId).emit('webrtc-answer', { answer, fromSocketId });
    });
    socket.on('webrtc-ice', ({ roomCode, toSocketId, candidate, fromSocketId }) => {
      gdIO.to(toSocketId).emit('webrtc-ice', { candidate, fromSocketId });
    });
    // Announce peer presence to room (for P2P mesh)
    socket.on('webrtc-ready', async ({ roomCode, userId }) => {
      socket.to(roomCode).emit('webrtc-peer-joined', { socketId: socket.id, userId });
    });

    // ── MEDIA STATUS ───────────────────────────────────────────────────────
    socket.on('media-status', async ({ roomCode, userId, isMuted, isCameraOff }) => {
      try {
        const room = await GDRoom.findOne({ roomCode });
        if (!room) return;
        const p = room.participants.find(p => p.userId?.toString() === userId);
        if (p) {
          if (isMuted !== undefined) p.isMuted = isMuted;
          if (isCameraOff !== undefined) p.isCameraOff = isCameraOff;
          await room.save();
        }
        gdIO.to(roomCode).emit('participant-media-update', { userId, isMuted, isCameraOff });
      } catch {}
    });

    // ── ACTIVE SPEAKER ─────────────────────────────────────────────────────
    socket.on('active-speaker', ({ roomCode, userId, speaking }) => {
      gdIO.to(roomCode).emit('active-speaker-update', { userId, speaking });
    });

    // ── SPEECH UPDATE (STT text from browser or server Whisper) ───────────
    socket.on('speech-update', async ({ roomCode, userId, text, delta }) => {
      try {
        const room = await GDRoom.findOne({ roomCode });
        if (!room || room.state !== 'active') return;
        const p = room.participants.find(p => p.userId?.toString() === userId);
        if (!p || !text) return;

        p.speakingTime += (delta?.speakingTime || 0);
        p.wordCount    += (delta?.wordCount || 0);
        p.fillerWords  += (delta?.fillerWords || 0);

        // Topic relevance check (async, non-blocking)
        checkTopicRelevance(room.topic, text).then(async rel => {
          if (!rel.relevant && rel.score < 40) {
            const freshRoom = await GDRoom.findOne({ roomCode });
            if (!freshRoom) return;
            const fp = freshRoom.participants.find(p => p.userId?.toString() === userId);
            if (fp) { fp.offTopicCount = (fp.offTopicCount || 0) + 1; }
            fp?.transcript?.push({ time: Date.now(), text, isOffTopic: true });
            freshRoom.aiModerator.interventions = (freshRoom.aiModerator.interventions || 0) + 1;
            await freshRoom.save();

            // AI intervenes — redirect to topic
            const intervention = await generateModeratorInterjection(
              freshRoom.topic, recentCaptions[roomCode] || [], 'off_topic'
            );
            if (intervention) {
              await broadcastAIVoice(gdIO, roomCode, intervention, 'warning');
              recentCaptions[roomCode] = [...(recentCaptions[roomCode] || []).slice(-10),
                { userName: AI_MODERATOR.name, text: intervention, isAI: true, ts: Date.now() }];
            }
          } else {
            const fp = (await GDRoom.findOne({ roomCode }))?.participants.find(p => p.userId?.toString() === userId);
            if (fp) {
              fp.topicRelevanceScore = Math.round(((fp.topicRelevanceScore || 70) + rel.score) / 2);
              fp.transcript.push({ time: Date.now(), text, isOffTopic: false });
              await (await GDRoom.findOne({ roomCode }))?.save().catch(() => {});
            }
          }
        });

        await room.save();

        // Broadcast caption
        const caption = { userId, userName: p.name, text, isAI: false, ts: Date.now() };
        gdIO.to(roomCode).emit('caption', caption);
        recentCaptions[roomCode] = [...(recentCaptions[roomCode] || []).slice(-20), caption];

        // ── AI Participant contextual reply ────────────────────────────────
        // Trigger after human speaks — AI participant responds naturally
        // Cooldown: only one AI reply per 15 seconds to avoid flooding
        const now = Date.now();
        const lastReply = aiReplyCooldown[roomCode] || 0;
        const cooldownMs = 15000;

        if (now - lastReply > cooldownMs) {
          const aiParticipants = room.participants.filter(p => p.isAI && !p.name.includes('Moderator'));
          if (aiParticipants.length > 0) {
            aiReplyCooldown[roomCode] = now;
            // Pick a random AI participant to reply
            const aiPart = aiParticipants[Math.floor(Math.random() * aiParticipants.length)];
            // Natural thinking delay: 2-5 seconds
            const thinkDelay = 2000 + Math.floor(Math.random() * 3000);
            setTimeout(async () => {
              try {
                const freshRoom = await GDRoom.findOne({ roomCode });
                if (!freshRoom || freshRoom.state !== 'active') return;
                const reply = await generateAIParticipantReply(
                  aiPart.name,
                  freshRoom.topic,
                  recentCaptions[roomCode] || [],
                  text
                );
                if (reply && reply.trim().length > 10) {
                  const aiCaption = {
                    userId: `ai-${aiPart.name}`,
                    userName: aiPart.name,
                    text: reply.trim(),
                    isAI: true,
                    type: 'participant',
                    ts: Date.now(),
                  };
                  gdIO.to(roomCode).emit('caption', aiCaption);
                  gdIO.to(roomCode).emit('ai-message', { ...aiCaption });
                  recentCaptions[roomCode] = [...(recentCaptions[roomCode] || []).slice(-20), aiCaption];
                  // Speak the reply
                  broadcastAIVoice(gdIO, roomCode, reply.trim(), 'participant');
                }
              } catch (err) { console.error('[aiParticipantReply]', err.message); }
            }, thinkDelay);
          }
        }

        // Reset silence timer
        resetSilenceTimer(roomCode, room.topic, gdIO, GDRoom, timers, silenceTimers, recentCaptions);

      } catch (err) { console.error('[speech-update]', err.message); }
    });

    // ── AUDIO CHUNK → server-side Whisper STT ─────────────────────────────
    socket.on('audio-chunk', async ({ roomCode, userId, audioBuffer, language }) => {
      try {
        const room = await GDRoom.findOne({ roomCode });
        if (!room || room.state !== 'active') return;
        const text = await groqSTT(Buffer.from(audioBuffer), language || 'en');
        if (text && text.trim().length > 3) {
          socket.emit('stt-result', { text, userId });
          // Re-emit as speech-update so same pipeline handles it
          socket.emit('forward-speech', { roomCode, userId, text });
        }
      } catch {}
    });

    // ── INTERRUPT ──────────────────────────────────────────────────────────
    socket.on('interrupt', async ({ roomCode, userId }) => {
      try {
        const room = await GDRoom.findOne({ roomCode });
        if (!room) return;
        const p = room.participants.find(p => p.userId?.toString() === userId);
        if (p) { p.interruptions += 1; await room.save(); }
      } catch {}
    });

    // ── CHAT MESSAGE (text fallback) ───────────────────────────────────────
    socket.on('chat-message', ({ roomCode, userId, userName, text }) => {
      gdIO.to(roomCode).emit('chat-message', { userId, userName, text, ts: Date.now() });
    });

    // ── MANUAL END ─────────────────────────────────────────────────────────
    socket.on('end-session', async ({ roomCode }) => {
      await doEnd(roomCode, gdIO, GDRoom, timers, silenceTimers);
    });

    // ── DISCONNECT ─────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const { roomCode, userId } = socket.data || {};
      if (!roomCode) return;
      try {
        const room = await GDRoom.findOne({ roomCode });
        if (!room) return;
        const p = room.participants.find(p => p.userId?.toString() === userId);
        if (p) p.socketId = null;
        await room.save();
        // Don't remove from participants — session persistence
        gdIO.to(roomCode).emit('participant-disconnected', {
          userId, userName: p?.name,
          message: `${p?.name || 'A participant'} temporarily disconnected.`,
        });
      } catch {}
    });
  });

  return gdIO;
}

// ── SILENCE DETECTION ─────────────────────────────────────────────────────
function resetSilenceTimer(roomCode, topic, namespace, GDRoom, timers, silenceTimers, recentCaptions) {
  clearTimeout(silenceTimers[roomCode]);
  silenceTimers[roomCode] = setTimeout(async () => {
    const room = await GDRoom.findOne({ roomCode });
    if (!room || room.state !== 'active') return;
    const msg = await generateModeratorInterjection(topic, recentCaptions[roomCode] || [], 'silence');
    if (msg) {
      await broadcastAIVoice(namespace, roomCode, msg, 'guide');
      recentCaptions[roomCode] = [...(recentCaptions[roomCode] || []).slice(-10),
        { userName: AI_MODERATOR.name, text: msg, isAI: true, ts: Date.now() }];
    }
  }, 25000); // 25 seconds of silence triggers AI
}

// ── LOCK & START ───────────────────────────────────────────────────────────
async function doLock(room, roomCode, namespace, GDRoom, timers, recentCaptions) {
  try {
    const topic = await generateTopic(room);
    room.topic    = topic;
    room.state    = 'locked';
    room.lockedAt = new Date();
    await room.save();

    namespace.to(roomCode).emit('room-locked-announce', {
      message: 'The Group Discussion session is now locked.',
      participants: room.participants.map(p => ({ name: p.name, isAI: p.isAI })),
    });

    // PREP phase
    room.state = 'prep';
    await room.save();

    const prepMsg = await generateModeratorInterjection(topic, [], 'opening');
    namespace.to(roomCode).emit('prep-phase', {
      duration: room.prepSeconds, topic,
      message: `You have ${room.prepSeconds} seconds to prepare your thoughts.`,
    });

    // AI reads the opening during prep
    if (prepMsg) {
      setTimeout(() => broadcastAIVoice(namespace, roomCode, prepMsg, 'opening'), 2000);
    }

    const prepTimer = setTimeout(async () => {
      const r = await GDRoom.findOne({ roomCode });
      if (!r || r.state === 'completed') return;
      r.state     = 'active';
      r.startedAt = new Date();
      r.aiModerator.hasOpened = true;
      await r.save();

      namespace.to(roomCode).emit('discussion-start', {
        topic, duration: r.durationSeconds,
        message: `The topic is: "${topic}". You have ${Math.round(r.durationSeconds / 60)} minutes. Begin now.`,
      });

      // AI starts the discussion
      setTimeout(async () => {
        const openMsg = await generateModeratorInterjection(topic, [], 'opening');
        if (openMsg) {
          await broadcastAIVoice(namespace, roomCode, openMsg, 'opening');
          if (!recentCaptions[roomCode]) recentCaptions[roomCode] = [];
          recentCaptions[roomCode].push({ userName: AI_MODERATOR.name, text: openMsg, isAI: true, ts: Date.now() });
        }
      }, 4000);

      // Mid-session guidance at 40% mark
      const midpoint = Math.floor(r.durationSeconds * 0.4) * 1000;
      setTimeout(async () => {
        const fr = await GDRoom.findOne({ roomCode });
        if (!fr || fr.state !== 'active') return;
        const guideMsg = await generateModeratorInterjection(topic, recentCaptions[roomCode] || [], 'guide');
        if (guideMsg) {
          await broadcastAIVoice(namespace, roomCode, guideMsg, 'guide');
          recentCaptions[roomCode] = [...(recentCaptions[roomCode] || []).slice(-10),
            { userName: AI_MODERATOR.name, text: guideMsg, isAI: true, ts: Date.now() }];
        }
      }, midpoint);

      // 90-second warning
      const warnDelay = Math.max((r.durationSeconds - 90) * 1000, 0);
      setTimeout(async () => {
        const fr = await GDRoom.findOne({ roomCode });
        if (!fr || fr.state !== 'active') return;
        const warnMsg = await generateModeratorInterjection(topic, recentCaptions[roomCode] || [], 'time_warn');
        if (warnMsg) {
          await broadcastAIVoice(namespace, roomCode, warnMsg, 'warning');
        }
        namespace.to(roomCode).emit('time-warning', { secondsLeft: 90 });
      }, warnDelay);

      // Auto-end
      const endTimer = setTimeout(() => doEnd(roomCode, namespace, GDRoom, timers, {}), r.durationSeconds * 1000);
      timers[roomCode] = endTimer;

    }, room.prepSeconds * 1000);
    timers[`prep_${roomCode}`] = prepTimer;

  } catch (err) { console.error('[doLock]', err.message); }
}

// ── END SESSION ────────────────────────────────────────────────────────────
async function doEnd(roomCode, namespace, GDRoom, timers, silenceTimers) {
  try {
    if (timers[roomCode]) { clearTimeout(timers[roomCode]); delete timers[roomCode]; }
    if (silenceTimers[roomCode]) { clearTimeout(silenceTimers[roomCode]); delete silenceTimers[roomCode]; }

    const room = await GDRoom.findOne({ roomCode });
    if (!room || room.state === 'completed') return;
    room.state   = 'completed';
    room.endedAt = new Date();
    room.aiModerator.hasConcluded = true;
    await room.save();

    // AI conclusion
    const conclusionMsg = await generateModeratorInterjection(room.topic, [], 'conclusion');
    if (conclusionMsg) {
      await broadcastAIVoice(namespace, roomCode, conclusionMsg, 'conclusion');
    }

    namespace.to(roomCode).emit('session-ended', {
      message: 'Session ended. Generating personalised AI evaluation reports…', roomCode,
    });

    // Evaluate all — takes a few seconds
    setTimeout(async () => {
      const evaluated = await evaluateAll(GDRoom, roomCode);
      if (evaluated) {
        namespace.to(roomCode).emit('evaluation-ready', {
          roomCode,
          participants: evaluated.participants.map(p => ({
            userId: p.userId, name: p.name, isAI: p.isAI, aiScore: p.aiScore,
            speakingTime: p.speakingTime, wordCount: p.wordCount,
            fillerWords: p.fillerWords, interruptions: p.interruptions,
            offTopicCount: p.offTopicCount,
          })),
        });
      }
    }, 3000);

  } catch (err) { console.error('[doEnd]', err.message); }
}

module.exports = { registerGDSocket, evaluateParticipant };
