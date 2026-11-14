const $ = (s) => document.querySelector(s);
const messages = $("#messages"), input = $("#messageInput"), voiceStatus = $("#voiceStatus");
const STORAGE = { chat: "kora_chat_v07", memory: "kora_memory_v07", voice: "kora_voice_v07", personality: "kora_personality_v07" };
let history = loadArray(STORAGE.chat), memories = loadArray(STORAGE.memory), selectedVoiceURI = localStorage.getItem(STORAGE.voice) || "";
let voiceObjectUrl = null;
const defaultPersonality = { tone: "natural", detail: "equilibrado", humor: "moderado" };
let personality = loadObject(STORAGE.personality, defaultPersonality);
function loadObject(key, fallback) { try { return { ...fallback, ...(JSON.parse(localStorage.getItem(key)) || {}) }; } catch { return { ...fallback }; } }
function savePersonality() { try { localStorage.setItem(STORAGE.personality, JSON.stringify(personality)); } catch {} }
function applyPersonality(text) { return text; }
async function askKoraAI(userText) {
  const endpoint = window.KORA_CONFIG?.API_ENDPOINT || "";
  if (!endpoint) throw new Error("IA_NO_CONFIGURADA");
  const recent = history.slice(-17, -1).slice(-16).map(m => ({ role: m.who === "user" ? "user" : "assistant", content: m.text }));
  const response = await fetch(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: userText, history: recent, memories: memories.slice(-40), personality })
  });
  if (!response.ok) throw new Error(`API_${response.status}`);
  const data = await response.json();
  if (!data.reply || typeof data.reply !== "string") throw new Error("RESPUESTA_INVALIDA");
  return data.reply;
}
function loadArray(key) { try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : []; } catch { return []; } }
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
function addMessage(text, who="kora", persist=true) {
  const el=document.createElement("div"); el.className=`message ${who==="user"?"user-message":"kora-message"}`;
  const label=document.createElement("b"), p=document.createElement("p"); label.textContent=who==="user"?"TÚ":"KORA"; p.textContent=String(text); el.append(label,p); messages.append(el); messages.scrollTop=messages.scrollHeight;
  if(persist){ history.push({text:String(text),who,time:Date.now()}); history=history.slice(-100); save(STORAGE.chat,history); }
}
function restoreChat(){ messages.replaceChildren(); history.forEach(m=>addMessage(m.text,m.who,false)); }
function availableVoices(){ return "speechSynthesis" in window ? speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith("es")) : []; }
function populateVoices(){ const select=$("#voiceSelect"), voices=availableVoices(); select.replaceChildren();
  const fallback=document.createElement("option"); fallback.value=""; fallback.textContent="Voz predeterminada del dispositivo"; select.append(fallback);
  voices.forEach(v=>{const o=document.createElement("option");o.value=v.voiceURI;o.textContent=`${v.name} (${v.lang})`;select.append(o);});
  if(voices.some(v=>v.voiceURI===selectedVoiceURI)) select.value=selectedVoiceURI; else {selectedVoiceURI="";select.value="";}
}
function speak(text){ if(!("speechSynthesis" in window)){voiceStatus.textContent="Este navegador no admite respuestas habladas.";return;}
  speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text);u.lang="es-AR";u.rate=.95;u.pitch=.88;u.volume=1;
  const voice=availableVoices().find(v=>v.voiceURI===selectedVoiceURI);if(voice)u.voice=voice;
  u.onstart=()=>voiceStatus.textContent="KORA está hablando…";u.onend=()=>voiceStatus.textContent="KORA está lista para escucharte";u.onerror=()=>voiceStatus.textContent="No se pudo reproducir el audio.";speechSynthesis.speak(u);
}
function remember(text){const clean=text.trim().replace(/[.!?]+$/g,"");if(!clean)return"Decime qué querés que recuerde.";if(memories.some(x=>x.toLowerCase()===clean.toLowerCase()))return"Ese dato ya está guardado en mi memoria local.";memories.push(clean);if(!save(STORAGE.memory,memories)){memories.pop();return"No pude guardar ese recuerdo; quizá no hay espacio disponible.";}return"Listo. Guardé ese dato en la memoria local de este dispositivo.";}
function memoryReply(){return memories.length?"Esto es lo que recuerdo: "+memories.map((x,i)=>`${i+1}. ${x}`).join("; "):"Todavía no tengo recuerdos guardados. Podés decirme: Recordá que…";}
function openSearch(query,site="google"){const q=encodeURIComponent(query);const url=site==="youtube"?`https://www.youtube.com/results?search_query=${q}`:`https://www.google.com/search?q=${q}`;window.open(url,"_blank","noopener,noreferrer");}
async function respond(text){const raw=text.trim(),q=raw.toLowerCase();if(!q)return;let answer;
 const m=raw.match(/^(?:kora[, ]*)?(?:recordá que|recorda que|recuerda que|guardá que|guarda que|guardá en memoria|guarda en memoria)\s+(.+)$/i);
 if(m) answer=remember(m[1]);
 else if(/^(?:kora[, ]*)?(?:qué recordás|que recordas|qué recuerdas|que recuerdas|mis recuerdos|mostrar memoria|ver memoria)\??$/i.test(q))answer=memoryReply();
 else if(/^(?:kora[, ]*)?(?:borrar memoria|olvidar todos los recuerdos|borrá todos mis recuerdos)$/i.test(q)){if(confirm("¿Borrar todos los recuerdos locales?")){memories=[];save(STORAGE.memory,memories);answer="Memoria local borrada.";}else answer="No borré nada.";}
 else if(/^(?:buscá|busca|buscar)\s+(?:en youtube|videos de)\s+(.+)/i.test(raw)){const term=raw.replace(/^(?:buscá|busca|buscar)\s+(?:en youtube|videos de)\s+/i,"");answer=`Buscando ${term} en YouTube.`;openSearch(term,"youtube");}
 else if(/^(?:buscá|busca|buscar)\s+(.+)/i.test(raw)){const term=raw.replace(/^(?:buscá|busca|buscar)\s+/i,"");answer=`Buscando ${term} en Google.`;openSearch(term);}
 else if(q.includes("google")&&q.includes("abrí")){answer="Abriendo Google.";window.open("https://www.google.com/","_blank","noopener,noreferrer");}
 else if(q.includes("youtube")&&q.includes("abrí")){answer="Abriendo YouTube.";window.open("https://www.youtube.com/","_blank","noopener,noreferrer");}
 else if(q.includes("whatsapp")){answer="Abriendo WhatsApp. Podés elegir el contacto, revisar el mensaje y enviarlo vos.";window.open("https://wa.me/","_blank","noopener,noreferrer");}
 else {
   const loading = addMessage("Estoy pensando…", "kora", false);
   try { answer = await askKoraAI(raw); loading.remove(); }
   catch (err) { loading.remove(); answer = err.message === "IA_NO_CONFIGURADA" ? "Todavía falta conectar el servidor de IA. La estructura ya está preparada; primero hay que publicar el backend y configurar su clave de forma segura." : "No pude comunicarme con el servicio de IA. Revisá la conexión e intentá nuevamente."; }
 }
 addMessage(answer);speak(answer);
}
restoreChat();if(!history.length)addMessage("Hola. Soy KORA. Esta versión conserva el historial y permite guardar recuerdos en este dispositivo. ¿Qué necesitás?");
$("#chatForm").addEventListener("submit",e=>{e.preventDefault();const v=input.value.trim();if(!v)return;addMessage(v,"user");input.value="";respond(v);});
$("#clearChat").addEventListener("click",()=>{if(!confirm("¿Limpiar el historial? Los recuerdos no se borrarán."))return;history=[];save(STORAGE.chat,history);messages.replaceChildren();addMessage("Historial limpiado. Tus recuerdos siguen guardados.");});
document.querySelectorAll("[data-command]").forEach(b=>b.addEventListener("click",()=>{addMessage(b.dataset.command,"user");respond(b.dataset.command);}));
$("#voiceSelect").addEventListener("change",e=>{selectedVoiceURI=e.target.value;try{localStorage.setItem(STORAGE.voice,selectedVoiceURI);}catch{};});
$("#testVoice").addEventListener("click",()=>speak("Hola. Soy KORA. Esta es una prueba de mi voz en este dispositivo."));
$("#stopSpeech").addEventListener("click",()=>{if("speechSynthesis" in window)speechSynthesis.cancel();voiceStatus.textContent="Audio detenido.";});
const settingsContent = $("#settingsContent");
$("#toggleSettings").addEventListener("click", () => {
  const opening = settingsContent.hidden;
  settingsContent.hidden = !opening;
  $("#toggleSettings").textContent = opening ? "Cerrar ajustes" : "Abrir ajustes";
  $("#toggleSettings").setAttribute("aria-expanded", String(opening));
});
for (const [id, key] of [["toneSelect","tone"],["detailSelect","detail"],["humorSelect","humor"]]) {
  const control = $("#"+id);
  control.value = personality[key];
  control.addEventListener("change", () => { personality[key] = control.value; savePersonality(); });
}
$("#voiceFile").addEventListener("change", e => {
  const file = e.target.files && e.target.files[0];
  const status = $("#voiceFileStatus"), preview = $("#voicePreview");
  if (!file) return;
  if (!file.type.includes("mpeg") && !file.name.toLowerCase().endsWith(".mp3")) {
    status.textContent = "Ese archivo no parece ser un MP3. Elegí un archivo .mp3.";
    e.target.value = ""; return;
  }
  if (file.size > 15 * 1024 * 1024) {
    status.textContent = "El MP3 supera los 15 MB. Elegí un archivo más pequeño.";
    e.target.value = ""; return;
  }
  if (voiceObjectUrl) URL.revokeObjectURL(voiceObjectUrl);
  voiceObjectUrl = URL.createObjectURL(file);
  preview.src = voiceObjectUrl; preview.hidden = false;
  status.textContent = `MP3 cargado: ${file.name}. Se reproduce localmente mientras esta página esté abierta; aún no se usa para generar la voz de KORA.`;
});
$("#removeVoiceFile").addEventListener("click", () => {
  if (voiceObjectUrl) URL.revokeObjectURL(voiceObjectUrl);
  voiceObjectUrl = null; $("#voiceFile").value = ""; $("#voicePreview").removeAttribute("src");
  $("#voicePreview").hidden = true; $("#voiceFileStatus").textContent = "No hay ningún MP3 seleccionado.";
});
$("#exportData").addEventListener("click",()=>{const data={app:"KORA",version:"0.7",exportedAt:new Date().toISOString(),history,memories,personality};const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="kora-respaldo.json";a.click();URL.revokeObjectURL(url);});
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;let recognition=null;
if(SR){recognition=new SR();recognition.lang="es-AR";recognition.interimResults=false;recognition.maxAlternatives=1;recognition.onstart=()=>voiceStatus.textContent="Te estoy escuchando…";recognition.onend=()=>voiceStatus.textContent="KORA está lista para escucharte";recognition.onerror=()=>voiceStatus.textContent="No pude usar el micrófono. Revisá los permisos.";recognition.onresult=e=>{const heard=e.results[0][0].transcript;addMessage(heard,"user");respond(heard);};}else voiceStatus.textContent="El reconocimiento de voz no está disponible en este navegador.";
$("#micButton").addEventListener("click",()=>{if(!recognition){addMessage("Este navegador no admite reconocimiento de voz. Podés escribirme.");return;}try{recognition.start();}catch{voiceStatus.textContent="Esperá un momento e intentá otra vez.";}});
if("speechSynthesis" in window){populateVoices();speechSynthesis.onvoiceschanged=populateVoices;}
if("serviceWorker" in navigator&&location.protocol.startsWith("http")){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));}
