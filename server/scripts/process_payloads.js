require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Message = require('../models/Message');

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('❌ MONGODB_URI not found in .env file');
  process.exit(1);
}

const DIR = process.env.PAYLOAD_DIR || path.join(__dirname, 'payloads');

async function main() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB Atlas');

    const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));
    console.log(`📂 Found ${files.length} files in ${DIR}`);

    for (const file of files) {
      const fullPath = path.join(DIR, file);
      try {
        const json = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

        // Handle webhook payloads
        if (json.payload_type === 'whatsapp_webhook' && json.metaData?.entry) {
          for (const entry of json.metaData.entry) {
            if (!entry.changes) continue;
            for (const change of entry.changes) {
              const val = change.value || {};
              // Messages
              if (Array.isArray(val.messages)) {
                for (const msg of val.messages) {
                  const contact = (val.contacts && val.contacts[0]) || {};
                  const wa_id = contact.wa_id || msg.from || msg.to;
                  const name = contact.profile?.name || null;
                  await processIncoming({
                    id: msg.id,
                    wa_id,
                    from_me: false,
                    body: msg.text?.body || '',
                    status: msg.status || 'sent',
                    timestamp: msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date(),
                    sender_name: name,
                    raw: msg
                  });
                }
              }
              // Status updates
              if (Array.isArray(val.statuses)) {
                for (const st of val.statuses) {
                  await processStatus({
                    id: st.id,
                    status: st.status || st.state || 'unknown'
                  });
                }
              }
            }
          }
          continue; // move to next file
        }

        // Handle flat payloads
        if (json.event === 'message' || json.type === 'message' || json.message) {
          await processIncoming(json);
        } else if (json.event === 'status' || json.status || json.statuses) {
          if (Array.isArray(json.statuses)) {
            for (const s of json.statuses) await processStatus(s);
          } else {
            await processStatus(json);
          }
        } else if (Array.isArray(json.messages)) {
          for (const m of json.messages) await processIncoming(m);
        } else if (
          (json.id || json._id || json.meta_msg_id) &&
          (json.from || json.wa_id || (json.contacts && json.contacts[0]?.wa_id))
        ) {
          await processIncoming(json);
        } else {
          console.log(`⚠ Skipping unknown file: ${file}`);
        }

      } catch (err) {
        console.error(`❌ Error processing ${file}:`, err.message);
      }
    }

    console.log('✅ Processing complete');
    process.exit(0);

  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

async function processIncoming(payload) {
  const msgId = payload.id || payload.meta_msg_id || payload.message?.id ||
                payload._id || (payload.raw && payload.raw.id) ||
                'id_' + Math.random().toString(36).slice(2, 9);
  const wa_id = payload.wa_id || payload.from || payload.to ||
                (payload.contacts && payload.contacts[0]?.wa_id);
  const body = payload.body || payload.text?.body || payload.message?.text || '';
  const ts = payload.timestamp ? new Date(payload.timestamp) : new Date();

  if (!wa_id || !msgId) {
    console.log(`⚠ Missing wa_id or msg_id; skipping`);
    return;
  }

  await Message.findOneAndUpdate(
    { msg_id: String(msgId) },
    {
      $set: {
        msg_id: String(msgId),
        wa_id: String(wa_id),
        from_me: payload.from_me || false,
        body,
        media: payload.media || null,
        status: payload.status || 'sent',
        timestamp: ts,
        raw_payload: payload
      }
    },
    { upsert: true }
  );

  console.log(`💾 Upserted message ${msgId}`);
}

async function processStatus(payload) {
  const idToFind = payload.meta_msg_id || payload.id || payload.messageId || payload._id;
  const newStatus = payload.status || payload.state || 'unknown';
  if (!idToFind) {
    console.log('⚠ No id in status payload, skipping');
    return;
  }
  const updated = await Message.findOneAndUpdate(
    { msg_id: String(idToFind) },
    { $set: { status: newStatus } },
    { new: true }
  );
  console.log(`📌 Updated status for ${idToFind} -> ${newStatus}`, !!updated);
}

main();
