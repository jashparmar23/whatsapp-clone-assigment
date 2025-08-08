const API_BASE = ''; // same origin

let selectedWa = null;
const convsEl = document.getElementById('conversations');
const messagesEl = document.getElementById('messages');
const headerEl = document.getElementById('chatHeader');
const inputEl = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');

async function loadConversations() {
  const res = await fetch('/api/conversations');
  const data = await res.json();
  convsEl.innerHTML = '';
  data.forEach(c => {
    const div = document.createElement('div');
    div.className = 'chat-list-item';
    div.innerHTML = '<div style="font-weight:bold">'+ (c.wa_id || 'unknown') +'</div><div class="meta">'+ (c.lastMessage? c.lastMessage.body : '') +'</div>';
    div.onclick = () => selectConversation(c.wa_id);
    convsEl.appendChild(div);
  });
}

async function selectConversation(wa) {
  selectedWa = wa;
  headerEl.textContent = 'Chat — ' + wa;
  await loadMessages(wa);
}

async function loadMessages(wa) {
  messagesEl.innerHTML = '';
  const res = await fetch('/api/messages/' + encodeURIComponent(wa));
  const data = await res.json();
  data.forEach(m => addMessageToUI(m));
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addMessageToUI(m) {
  const div = document.createElement('div');
  div.className = 'bubble ' + (m.from_me ? 'right' : 'left');
  div.innerHTML = '<div>'+ (m.body || '[media]') +'</div><div class="meta">'+ (new Date(m.timestamp).toLocaleString()) + (m.from_me ? (' • ' + (m.status || '')) : '') +'</div>';
  messagesEl.appendChild(div);
}

sendBtn.onclick = async () => {
  const text = inputEl.value.trim();
  if (!text || !selectedWa) return alert('Select a conversation and type a message');
  const res = await fetch('/api/messages/' + encodeURIComponent(selectedWa) + '/send', {
    method: 'POST',
    headers: {'content-type':'application/json'},
    body: JSON.stringify({ body: text })
  });
  const msg = await res.json();
  addMessageToUI(msg);
  inputEl.value = '';
  messagesEl.scrollTop = messagesEl.scrollHeight;
};

const socket = io();
socket.on('message_created', (m) => {
  if (m.wa_id === selectedWa) addMessageToUI(m);
  loadConversations();
});
socket.on('message_status_updated', (m) => {
  // simple: reload current conversation
  if (m && m.wa_id === selectedWa) loadMessages(selectedWa);
  loadConversations();
});

loadConversations();
