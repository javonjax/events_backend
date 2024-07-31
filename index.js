require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;
const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;
const TICKETMASTER_API_URL = 'https://app.ticketmaster.com/discovery/v2/events.json';


app.use(cors());

app.get('/api/events', async (request, response) => {
    try {
        const queryParams = new URLSearchParams({
            apikey: TICKETMASTER_API_KEY,
            size: 200,
            ...request.query
        }).toString();

        const res = await fetch(`${TICKETMASTER_API_URL}?${queryParams}`);
        
        if(!res.ok) {
            throw new Error(`Network response error: ${res.statusText}`);
        }
        
        const data = await res.json();
        const events = data._embedded.events;

        const formatDate = (dateString) => {
            const date = new Date(dateString);
            const options = { month: 'short', day: 'numeric', weekday: 'short'}

            return date.toLocaleDateString('en-US', options);
        };
        
        const eventFilter = (event) => {
            return (
                event.name &&
                event.dates.start.dateTime &&
                event.priceRanges &&
                event._embedded.venues &&
                event._embedded.venues[0].city &&
                event._embedded.venues[0].state
            );
        };

        const eventDetails = events.filter(eventFilter)
        .map(event => ({
            name: event.name,

            date: event.dates.start.dateTime ? formatDate(event.dates.start.dateTime.split('T')[0])
                                             : 'Dates unavailable.',

            time: event.dates.start.dateTime ? event.dates.start.dateTime.split('T')[1].slice(0, -1) 
                                             : 'Time unavailable.',

            priceMin: event.priceRanges ? event.priceRanges[0].min + ' ' + event.priceRanges[0].currency 
                                        : 'Price unavailable.',

            priceMax: event.priceRanges ? event.priceRanges[0].max + ' ' + event.priceRanges[0].currency
                                        : 'Price unavailable.',

            location: event._embedded.venues && event._embedded.venues[0].city && event._embedded.venues[0].state ? event._embedded.venues[0].city.name + ', ' + event._embedded.venues[0].state.stateCode
                                                                                        : 'Location unavailable.',

            venue: event._embedded.venues ? event._embedded.venues[0].name
                                          : 'Venue name unavailable.'
        }))
        console.log(data);
        response.json(eventDetails);
    }
    catch(error) {
        console.log('Error fetching data from Ticketmaster:\n', error);
        response.status(500).json({ error: 'Internal server error.'});
    }
});


app.listen(PORT, () => {
    console.log(`Backend API listening at port ${PORT}`);
});
