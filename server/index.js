require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');

const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Corrected variable name: MONGODB_URI
const MONGO_URI = process.env.MONGODB_URI;

// Check if the URI is defined and exit if not
if (!MONGO_URI) {
  console.error('❌ MONGODB_URI not found in .env file');
  process.exit(1);
}

// Connect Mongo
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=>console.log('Mongo connected'))
  .catch(err=>console.error('Mongo err', err));

// Webhook endpoint (can POST sample payloads here)
app.post('/webhook', async (req, res) => {
  const payload = req.body;
  try {
    if (payload.event === 'message' || payload.type === 'message' || payload.message) {
      const m = await processIncomingMessage(payload);
      io.emit('message_created', m);
    } else if (payload.event === 'status' || payload.status) {
      const updated = await processStatusPayload(payload);
      if (updated) io.emit('message_status_updated', updated);
    } else {
      // handle arrays
      if (Array.isArray(payload.messages)) {
        for (const p of payload.messages) await processIncomingMessage(p);
      }
      if (Array.isArray(payload.statuses)) {
        for (const s of payload.statuses) await processStatusPayload(s);
      }
    }
    return res.status(200).send({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).send({ ok: false, err: err.message });
  }
});

// API: conversations
app.get('/api/conversations', async (req, res) => {
  try {
    const convs = await Message.aggregate([
      { $sort: { timestamp: -1 } },
      { $group: {
          _id: '$wa_id',
          lastMessage: { $first: '$$ROOT' },
          count: { $sum: 1 }
      }},
      { $project: { wa_id: '$_id', lastMessage: 1, count: 1, _id: 0 }},
      { $sort: { 'lastMessage.timestamp': -1 } }
    ]);
    res.json(convs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// API: messages for wa_id
app.get('/api/messages/:wa_id', async (req, res) => {
  try {
    const { wa_id } = req.params;
    const messages = await Message.find({ wa_id }).sort({ timestamp: 1 }).lean();
    res.json(messages);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// API: send message (store only)
app.post('/api/messages/:wa_id/send', async (req, res) => {
  try {
    const { wa_id } = req.params;
    const { body } = req.body;
    const msg = await Message.create({
      msg_id: new mongoose.Types.ObjectId().toString(),
      wa_id,
      from_me: true,
      body,
      status: 'sent',
      timestamp: new Date(),
      raw_payload: null
    });
    io.emit('message_created', msg);
    res.json(msg);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// helpers
async function processIncomingMessage(payload) {
  const msgId = payload.id || payload.meta_msg_id || payload.message?.id || payload.message?.mid || payload._id || (payload.raw && payload.raw.id);
  const wa_id = payload.from || payload.wa_id || payload.sender?.wa_id || payload.contacts?.[0]?.wa_id || payload.to;
  const body = payload.text?.body || payload.message?.text || payload.body || (payload.message && payload.message.caption) || '';
  const ts = payload.timestamp ? new Date(payload.timestamp) : (payload.timestamp_ms ? new Date(Number(payload.timestamp_ms)) : new Date());
  if (!wa_id || !msgId) {
    console.log('Skipping incoming, missing wa_id or msgId', { wa_id, msgId });
    return null;
  }
  const doc = {
    msg_id: String(msgId),
    wa_id: String(wa_id),
    from_me: payload.from_me || false,
    body,
    media: payload.media || null,
    status: payload.status || 'sent',
    timestamp: ts,
    raw_payload: payload
  };
  return await Message.findOneAndUpdate({ msg_id: doc.msg_id }, { $set: doc }, { upsert: true, new: true });
}

async function processStatusPayload(payload) {
  const idToFind = payload.meta_msg_id || payload.id || payload.messageId || payload.status?.id || payload._id;
  const newStatus = payload.status || payload.state || (payload.statuses && payload.statuses[0] && payload.statuses[0].status) || 'unknown';
  if (!idToFind) {
    console.log('No id in status payload, skipping');
    return null;
  }
  const updated = await Message.findOneAndUpdate({ msg_id: String(idToFind) }, { $set: { status: newStatus } }, { new: true });
  return updated;
}

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);
  socket.on('disconnect', ()=> console.log('socket disconnected', socket.id));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, ()=> console.log('Server listening on', PORT));