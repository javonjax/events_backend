require('dotenv').config();
const express = require('express');
const app = express();
const PORT = 3000;
const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;
const TICKETMASTER_API_URL = 'https://app.ticketmaster.com/discovery/v2/events.json';

app.get('/api/events', async (request, response) => {
    try {
        const queryParams = new URLSearchParams({
            apikey: TICKETMASTER_API_KEY,
            ...request.query
        }).toString();

        const res = await fetch(`${TICKETMASTER_API_URL}?${queryParams}`);

        if(!res.ok) {
            throw new Error(`Network response error: ${res.statusText}`);
        }

        const events = await res.json();
        response.json(events);
    }
    catch(error) {
        console.log('Error fetching data from Ticketmaster:', error);
        response.status(500).json({ error: 'Internal server error.'});
    }
})


app.listen(PORT, () => {
    console.log(`Backend API listening at port ${PORT}`);
});
