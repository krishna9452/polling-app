const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../utils/auth');

const prisma = new PrismaClient();
const router = express.Router();

// Create a new poll
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { question, options, isPublished = false } = req.body;
    
    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Question and at least two options are required' });
    }

    const poll = await prisma.poll.create({
      data: {
        question,
        isPublished,
        creatorId: req.user.id,
        options: {
          create: options.map(option => ({ text: option })),
        },
      },
      include: {
        options: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json(poll);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all polls
router.get('/', async (req, res) => {
  try {
    const polls = await prisma.poll.findMany({
      where: { isPublished: true },
      include: {
        options: {
          include: {
            votes: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Calculate vote counts for each option
    const pollsWithVotes = polls.map(poll => ({
      ...poll,
      options: poll.options.map(option => ({
        ...option,
        voteCount: option.votes.length,
      })),
    }));

    res.json(pollsWithVotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific poll
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const poll = await prisma.poll.findUnique({
      where: { id },
      include: {
        options: {
          include: {
            votes: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Calculate vote counts for each option
    const pollWithVotes = {
      ...poll,
      options: poll.options.map(option => ({
        ...option,
        voteCount: option.votes.length,
      })),
    };

    res.json(pollWithVotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a poll
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { question, isPublished } = req.body;

    const poll = await prisma.poll.findUnique({
      where: { id },
      include: { creator: true },
    });

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    if (poll.creatorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this poll' });
    }

    const updatedPoll = await prisma.poll.update({
      where: { id },
      data: {
        question,
        isPublished,
      },
      include: {
        options: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json(updatedPoll);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a poll
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const poll = await prisma.poll.findUnique({
      where: { id },
      include: { creator: true },
    });

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    if (poll.creatorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this poll' });
    }

    await prisma.poll.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;