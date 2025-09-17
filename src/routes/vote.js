const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../utils/auth');

const prisma = new PrismaClient();
const router = express.Router();

// Submit a vote
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { pollId, pollOptionId } = req.body;
    
    if (!pollId || !pollOptionId) {
      return res.status(400).json({ error: 'Poll ID and Poll Option ID are required' });
    }

    // Check if user has already voted on this poll
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_pollId: {
          userId: req.user.id,
          pollId,
        },
      },
    });

    if (existingVote) {
      return res.status(400).json({ error: 'You have already voted on this poll' });
    }

    // Create the vote
    const vote = await prisma.vote.create({
      data: {
        userId: req.user.id,
        pollId,
        pollOptionId,
      },
    });

    // Get updated poll data with vote counts
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: {
            votes: true,
          },
        },
      },
    });

    // Format data for broadcast
    const broadcastData = {
      type: 'VOTE_UPDATE',
      pollId,
      options: poll.options.map(option => ({
        id: option.id,
        text: option.text,
        voteCount: option.votes.length,
      })),
    };

    // Broadcast update to all connected clients using global function
    if (global.broadcastPollUpdate) {
      global.broadcastPollUpdate(pollId, broadcastData);
    }

    res.status(201).json(vote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get votes for a poll
router.get('/poll/:pollId', async (req, res) => {
  try {
    const { pollId } = req.params;
    const votes = await prisma.vote.findMany({
      where: { pollId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        pollOption: true,
      },
    });

    res.json(votes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;