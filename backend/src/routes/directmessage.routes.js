const router  = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { DirectMessage } = require('../models/index');
const mongoose = require('mongoose');

// GET /api/direct-messages/conversations — list all conversations for the logged-in user
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const myId = req.user._id;
    const convs = await DirectMessage.find({ participants: myId })
      .populate('participants', 'name department role')
      .sort({ updatedAt: -1 });

    const result = convs.map(c => {
      const other = c.participants.find(p => p._id.toString() !== myId.toString());
      const lastMsg = c.messages[c.messages.length - 1];
      // Count unread: messages from others that came after last message from me
      const myLastIdx = [...c.messages].reverse().findIndex(m => m.from.toString() === myId.toString());
      const unread = myLastIdx > 0 ? myLastIdx : (c.messages.filter(m => m.from.toString() !== myId.toString()).length > 0 ? c.messages.filter(m => m.from.toString() !== myId.toString()).length : 0);
      return {
        conversationId: c._id,
        studentId: other?._id,
        studentName: other?.name || 'Unknown',
        studentDept: other?.department || '',
        lastMessage: lastMsg?.text ? (lastMsg.text.length > 40 ? lastMsg.text.slice(0,40)+'…' : lastMsg.text) : null,
        updatedAt: c.updatedAt,
        unread: myLastIdx <= 0 ? 0 : myLastIdx,
      };
    });
    res.json({ conversations: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/direct-messages/:otherUserId — fetch conversation
router.get('/:otherUserId', authenticate, async (req, res) => {
  try {
    const myId    = req.user._id;
    const otherId = req.params.otherUserId;

    let conv = await DirectMessage.findOne({
      participants: { $all: [myId, otherId] }
    }).populate('messages.from', 'name role');

    if (!conv) return res.json({ messages: [] });
    res.json({ messages: conv.messages });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/direct-messages/:otherUserId — send message
router.post('/:otherUserId', authenticate, async (req, res) => {
  try {
    const myId    = req.user._id;
    const otherId = req.params.otherUserId;
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text required' });

    let conv = await DirectMessage.findOne({
      participants: { $all: [myId, otherId] }
    });

    if (!conv) {
      conv = await DirectMessage.create({
        participants: [myId, otherId],
        messages: [{ from: myId, text: text.trim() }]
      });
    } else {
      conv.messages.push({ from: myId, text: text.trim() });
      await conv.save();
    }

    await conv.populate('messages.from', 'name role');
    res.json({ messages: conv.messages });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
