const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  msg_id: { type: String, index: true },
  wa_id: { type: String, required: true },
  from_me: { type: Boolean, default: false },
  body: { type: String, default: '' },
  media: { type: Object, default: null },
  status: { type: String, enum: ['sent','delivered','read','unknown'], default: 'unknown' },
  timestamp: { type: Date, default: Date.now },
  raw_payload: { type: Object },
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
