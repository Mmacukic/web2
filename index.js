require('dotenv').config();
const express = require('express');
const { query } = require('./database');
const generateQRCode = require('./qr');
const { auth } = require('express-openid-connect');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;
// Endpoint: Get total number of tickets.

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: 'a long, randomly-generated string stored in env',
  baseURL: 'https://web2-cxc8.onrender.com',
  clientID: 'WcvPnCb3Xr4kpHyBqsyTRSVGgVjJqFBx',
  issuerBaseURL: 'https://dev-wfwbzvgde1azdrnn.eu.auth0.com'
};

app.use(auth(config));

app.get('/', async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) FROM tickets');
    const message = req.oidc.isAuthenticated() ? 'Logged in' : 'Logged out';
    res.send(`${message}. Total tickets generated: ${result.rows[0].count}`);
  } catch (error) {
    res.status(500).send('Failed to retrieve ticket count');
  }
});
// Configure the JWKS client with your Auth0 domain.
const client = jwksClient({
  jwksUri: 'https://dev-wfwbzvgde1azdrnn.eu.auth0.com/.well-known/jwks.json'
});
const { requiresAuth } = require('express-openid-connect');

app.get('/profile', requiresAuth(), (req, res) => {
  res.send(JSON.stringify(req.oidc.user));
});
// Function to get the signing key.
const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
};

// Middleware to validate the access token.
const validateAccessToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send('Missing authorization header');
  }

  const token = authHeader.split(' ')[1];

  // Verify the JWT using the signing key.
  jwt.verify(
    token,
    getKey,
    {
      audience: 'https://dev-wfwbzvgde1azdrnn.eu.auth0.com/api/v2/', // The audience should match your Auth0 API identifier.
      issuer: 'https://dev-wfwbzvgde1azdrnn.eu.auth0.com/', // Replace with your Auth0 domain.
      algorithms: ['RS256']
    },
    (err, decoded) => {
      if (err) {
        return res.status(401).send('Invalid token');
      }
      req.user = decoded;
      next();
    }
  );
};
// Endpoint: Generate a new ticket.
app.post('/api/ticket', validateAccessToken, async (req, res) => {
  const { vatin, firstName, lastName } = req.body;

  if (!vatin || !firstName || !lastName) {
    return res.status(400).send('Missing required fields');
  }

  try {
    // Check if vatin already has 3 tickets.
    const result = await query('SELECT COUNT(*) FROM tickets WHERE vatin = $1', [vatin]);
    if (parseInt(result.rows[0].count) >= 3) {
      return res.status(400).send('Cannot generate more than 3 tickets for this VATIN');
    }

    const { v4: uuidv4 } = require('uuid');
    const ticketId = uuidv4();

    await query(
      'INSERT INTO tickets (id, vatin, first_name, last_name, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [ticketId, vatin, firstName, lastName]
    );

    const qrCode = await generateQRCode(ticketId);
    res.status(201).json({ ticketId, qrCode });
  } catch (error) {
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
