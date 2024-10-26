require('dotenv').config();
const express = require('express');
const { query } = require('./database');
const generateQRCode = require('./qr');
const { v4: uuidv4 } = require('uuid');
const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

// Endpoint: Get total number of tickets.
app.get('/', async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) FROM tickets');
    res.send(`Total tickets generated: ${result.rows[0].count}`);
  } catch (error) {
    res.status(500).send('Failed to retrieve ticket count');
  }
});

// Endpoint: Generate a new ticket.
app.post('/api/ticket', async (req, res) => {
  const { vatin, firstName, lastName } = req.body;

  if (!vatin || !firstName || !lastName) {
    return res.status(400).send('Missing required fields: vatin, firstName, lastName');
  }

  try {
    // Check if vatin already has 3 tickets.
    const result = await query('SELECT COUNT(*) FROM tickets WHERE vatin = $1', [vatin]);
    if (parseInt(result.rows[0].count) >= 3) {
      return res.status(400).send('Cannot generate more than 3 tickets for this VATIN');
    }

    const ticketId = uuidv4();

    await query(
      'INSERT INTO tickets (id, vatin, first_name, last_name, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [ticketId, vatin, firstName, lastName]
    );

    const qrCode = await generateQRCode(ticketId);
    res.status(201).json({ ticketId, qrCode });
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to create ticket');
  }
});

// Endpoint: Get ticket details.
app.get('/ticket/:id', async (req, res) => {
  const ticketId = req.params.id;
  try {
    const result = await query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
    if (result.rows.length === 0) {
      return res.status(404).send('Ticket not found');
    }

    const ticket = result.rows[0];
    res.json({
      vatin: ticket.vatin,
      firstName: ticket.first_name,
      lastName: ticket.last_name,
      createdAt: ticket.created_at,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to retrieve ticket details');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
