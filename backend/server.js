// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const StellarSdk = require('@stellar/stellar-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());                    // Security headers
app.use(cors());                      // Allow frontend connections
app.use(express.json());              // Parse JSON bodies

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'Stellar Quest Backend is running!' });
});

// Stellar connection test
app.get('/api/health', (req, res) => {
    try {
        const server = new StellarSdk.Horizon.Server(process.env.RPC_URL);
        res.json({ status: 'ok', network: process.env.STELLAR_NETWORK });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});