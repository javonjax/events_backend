require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;
const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;
const TICKETMASTER_EVENTS_API_URL = 'https://app.ticketmaster.com/discovery/v2/events.json';
const TICKETMASTER_SUGGEST_API_URL = 'https://app.ticketmaster.com/discovery/v2/suggest';


app.use(cors());


/* 
    GET multiple events. 
*/
app.get('/api/events', async (request, response) => {
    try {

        const queryParams = new URLSearchParams({
            apikey: TICKETMASTER_API_KEY,
            size: 200,
            ...request.query
        }).toString();

        const res = await fetch(`${TICKETMASTER_EVENTS_API_URL}?${queryParams}`);
        
        if(!res.ok) {
            throw new Error(`${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();

        const events = data._embedded.events;

        // Converts date from YYYY-MM-DD to Weekday, Month DD. 
        const formatDate = (dateString) => {
            const [year, month, day] = dateString.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            const options = { month: 'short', day: 'numeric', weekday: 'short'}
            const formattedDate = date.toLocaleDateString('en-US', options);

            return formattedDate;
        };
        

        // Converts time from 24hr to 12hr format.
        const formatTime = (timeString) => {
            const [hours24, mins] = timeString.split(':');
            const period = hours24 >= 12 ? 'PM' : 'AM';
            const hours = hours24 % 12 || 12;
            const formattedTime = `${hours}:${mins} ${period}`;

            return formattedTime;
        };


        // Filter to remove objects that are missing data.
        const eventFilter = (event) => {
            return (
                event.name &&
                event.id &&
                event.dates.start.localDate &&
                event.dates.start.localTime &&
                event.dates.start.dateTime &&
                event.priceRanges &&
                event._embedded &&
                event._embedded.venues &&
                event._embedded.venues[0].city &&
                event._embedded.venues[0].state
            );
        };


        // Sorts event objects based on local datetime.
        const sortByDateTime = (a, b) => {
            const dateTimeA = new Date(a.date + 'T' + a.time + 'Z');
            const dateTimeB = new Date(b.date + 'T' + b.time + 'Z');

            return dateTimeA - dateTimeB;
        };


        // Retrieve information about events.
        const eventDetails = events.filter(eventFilter)
        .map(event => {

            return (
                    {
                        name: event.name,

                        id: event.id,

                        date: event.dates.start.localDate ? event.dates.start.localDate
                                                          : 'Local date unavailable.',

                        time: event.dates.start.localTime ? event.dates.start.localTime
                                                          : 'Local time unavailable.',

                        dateTimeUTC: event.dates.start.dateTime ? event.dates.start.dateTime
                                                                : 'DateTime unavailable.',

                        priceMin: event.priceRanges ? event.priceRanges[0].min + ' ' + event.priceRanges[0].currency 
                                                    : 'Price min unavailable.',

                        priceMax: event.priceRanges ? event.priceRanges[0].max + ' ' + event.priceRanges[0].currency
                                                    : 'Price unavailable.',

                        location: event._embedded.venues && event._embedded.venues[0].city && event._embedded.venues[0].state ? event._embedded.venues[0].city.name + ', ' + event._embedded.venues[0].state.stateCode
                                                                                                                              : 'Location unavailable.',

                        venue: event._embedded.venues ? event._embedded.venues[0].name
                                                      : 'Venue name unavailable.'
                    }
            );
        });


        // Sort events by local time.
        eventDetails.sort(sortByDateTime);
        

        // Convert local times to 12hr format.
        eventDetails.forEach((event) => {
            event.time = formatTime(event.time);
            event.date = formatDate(event.date);
        });


        response.json(eventDetails);
        
    }
    catch(error) {
        console.log('Error fetching data from Ticketmaster:\n', error);
        response.status(500).json({ error: 'Internal server error.'});
    }
});


app.get('/api/suggest', async (request, response) => {
    try {
        const query = request.query;
        const queryString = new URLSearchParams(query).toString();
        
        // startEndDateTime[0]=2024-07-01T00:00:00Z&startEndDateTime[1]=2024-08-31T23:59:59Z
        const queryParams = `apikey=${TICKETMASTER_API_KEY}&${queryString}`;
        const res = await fetch(`${TICKETMASTER_SUGGEST_API_URL}?${queryParams}`);

        if(!res.ok){
            throw new Error(`${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        console.log(data);
        response.send(data);
    }
    catch(error) {
        console.log('Error fetching data from Ticketmaster:\n', error);
        response.status(500).json({ error: 'Internal server error.'});
    }
});

app.listen(PORT, () => {
    console.log(`Backend API listening at port ${PORT}`);
});
