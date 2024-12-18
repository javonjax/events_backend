require('dotenv').config();
const express = require('express');
const router =express.Router();

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;
const TICKETMASTER_EVENTS_API_URL = process.env.TICKETMASTER_EVENTS_API_URL;
const TICKETMASTER_SUGGEST_API_URL = process.env.TICKETMASTER_SUGGEST_API_URL;

// Converts date from YYYY-MM-DD to Weekday, Month DD.
const formatDate = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const options = { month: 'short', day: 'numeric', weekday: 'short' };
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

/* 
    GET multiple events. 
*/
router.get('/events', async (request, response) => {
  try {
    const queryParams = new URLSearchParams({
      apikey: TICKETMASTER_API_KEY,
      size: 200,
      ...request.query,
    }).toString();
    
    const currentPage = Number(request.query.page);
    console.log('curr page', currentPage)

    const res = await fetch(
      `${TICKETMASTER_EVENTS_API_URL}.json?${queryParams}`
    );

    if (!res.ok) {
      throw new Error(`Internal server error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    
    if (!data) {
      throw new Error(`No data found using the following parameters: ${request.query}.`);
    }
    const events = data._embedded.events;
    
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
    const eventDetails = events.filter(eventFilter).map((event) => {
      return {
        name: event.name,

        id: event.id,

        date: event.dates.start.localDate ? event.dates.start.localDate : null,

        time: event.dates.start.localTime ? event.dates.start.localTime : null,

        dateTimeUTC: event.dates.start.dateTime
          ? event.dates.start.dateTime
          : null,

        priceMin: event.priceRanges
          ? event.priceRanges[0].min + ' ' + event.priceRanges[0].currency
          : null,

        priceMax: event.priceRanges
          ? event.priceRanges[0].max + ' ' + event.priceRanges[0].currency
          : null,

        location:
          event._embedded.venues &&
          event._embedded.venues[0].city &&
          event._embedded.venues[0].state
            ? `${event._embedded.venues[0].city.name}, 
                  ${event._embedded.venues[0].state.stateCode || event._embedded.venues[0].state.name}` 
            : null,

        venue: event._embedded.venues ? event._embedded.venues[0].name : null,
      };
    });

    // Sort events by local time.
    eventDetails.sort(sortByDateTime);

    // Convert local times to 12hr format.
    eventDetails.forEach((event) => {
      event.time = formatTime(event.time);
      event.date = formatDate(event.date);
    });
  
    response.json({
      "events": [...eventDetails], 
      "nextPage": events.length >= 200 && currentPage < 4 ? currentPage + 1 : null
    });
  } catch (error) {
    console.log('Error fetching data from Ticketmaster:\n', error);
    response.status(500).json({ message: error});
  }
});

/*
    GET individual event by passing in an id.
*/
router.get('/events/:id', async (request, response) => {
    try {  
      const queryParams = new URLSearchParams({
        apikey: TICKETMASTER_API_KEY,
        ...request.query,
      }).toString();

      const eventId = request.params.id;

      // Find the appropriately sized image for the info page header.
      const findImage = (images) => {
        const detailImage = images.find((image) =>
          image.url.includes('ARTIST_PAGE')
        );
        if (detailImage && detailImage.url) {
          return detailImage.url;
        }
        return null;
      };

      const res = await fetch(
        `${TICKETMASTER_EVENTS_API_URL}/${eventId}.json?${queryParams}`
      );

      if (!res.ok) {
        throw new Error(`Internal server error ${res.status}: ${res.statusText}`);
      }

      const event = await res.json();

      const eventDetails = {
        name: event.name,

        date: event.dates?.start?.localDate
          ? formatDate(event.dates.start.localDate)
          : null,

        time: event.dates?.start?.localTime
          ? formatTime(event.dates.start.localTime)
          : null,

        priceMin: event.priceRanges?.[0].min
          ? '$' + event.priceRanges[0].min.toFixed(2)
          : null,

        priceMax: event.priceRanges?.[0].max
          ? '$' + event.priceRanges[0].max.toFixed(2)
          : null,

        info: event.info?.trim() || event.description?.trim() || null,

        image: event.images ? findImage(event.images) : null,

        seatmap: event.seatmap?.staticUrl || null,

        location:
          event._embedded?.venues?.[0]?.city?.name &&
          (event._embedded?.venues?.[0]?.state?.stateCode || event._embedded?.venues?.[0]?.state?.name)
            ? `${event._embedded.venues[0].city.name}, 
                  ${event._embedded?.venues?.[0]?.state?.stateCode || event._embedded?.venues?.[0]?.state?.name}` 
            : null,

        venue: event._embedded?.venues?.[0]?.name || null,

        address: event._embedded?.venues?.[0]?.address?.line1 && event._embedded?.venues?.[0]?.postalCode 
                  ? event._embedded?.venues?.[0]?.address?.line1 + ', ' + event._embedded?.venues?.[0]?.postalCode
                  : null,

        url: event.url || null,
      };
      
      response.json(eventDetails);
    } catch(error) {
      console.log('Error fetching data from Ticketmaster:\n', error);
      response.status(500).json({ message: error });
    }
});

router.get('/test/:id', async (request, response) => {
  try {  
    const queryParams = new URLSearchParams({
      apikey: TICKETMASTER_API_KEY,
      ...request.query,
    }).toString();

    const eventId = request.params.id;

    // Find the appropriately sized image for the info page header.
    const findImage = (images) => {
      const detailImage = images.find((image) =>
        image.url.includes('ARTIST_PAGE')
      );
      if (detailImage && detailImage.url) {
        return detailImage.url;
      }
      return null;
    };

    const res = await fetch(
      `${TICKETMASTER_EVENTS_API_URL}/${eventId}.json?${queryParams}`
    );

    if (!res.ok) {
      throw new Error(`${res.status}: ${res.statusText}`);
    }

    const event = await res.json();

    const eventDetails = {
      name: event.name,

      date: event.dates?.start?.localDate
        ? formatDate(event.dates.start.localDate)
        : null,

      time: event.dates?.start?.localTime
        ? formatTime(event.dates.start.localTime)
        : null,

      priceMin: event.priceRanges?.[0].min
        ? '$' + event.priceRanges[0].min.toFixed(2)
        : null,

      priceMax: event.priceRanges?.[0].max
        ? '$' + event.priceRanges[0].max.toFixed(2)
        : null,

      info: event.info?.trim() || event.description?.trim() || null,

      image: event.images ? findImage(event.images) : null,

      seatmap: event.seatmap?.staticUrl || null,

      location:
        event._embedded?.venues?.[0]?.city?.name &&
        (event._embedded?.venues?.[0]?.state?.stateCode || event._embedded?.venues?.[0]?.state?.name)
          ? `${event._embedded.venues[0].city.name}, 
                ${event._embedded?.venues?.[0]?.state?.stateCode || event._embedded?.venues?.[0]?.state?.name}` 
          : null,

      venue: event._embedded?.venues?.[0]?.name || null,

      url: event.url || null,
    };
    console.log(event);
    response.json(event);
  } catch(error) {
    console.log('Error fetching data from Ticketmaster:\n', error);
    response.status(500).json({ message: 'Internal server error.' });
  }
});

/*
  GET all classifications.
*/
router.get('/classes', async (request, response) => {
  try {  
    const queryParams = new URLSearchParams({
      apikey: TICKETMASTER_API_KEY,
      ...request.query,
    }).toString();

    const TICKETMASTER_CLASS_API_URL = process.env.TICKETMASTER_CLASS_API_URL;
    
    const res = await fetch(`${TICKETMASTER_CLASS_API_URL}.json?${queryParams}`);
    console.log(res.headers)

    if (!res.ok) {
      throw new Error(`${res.status}: ${res.statusText}`);
    }

    const event = await res.json();
    
    response.json(event);
  } catch(error) {
    console.log('Error fetching data from Ticketmaster:\n', error);
    response.status(500).json({ message: 'Internal server error.' });
  }
});

/*
  GET attraction details.
*/
router.get('/attractions/:id', async (request, response) => {
  try {  
    const queryParams = new URLSearchParams({
      apikey: TICKETMASTER_API_KEY,
      ...request.query,
    }).toString();
    console.log(request.params.id)
    const id = request.params.id;

    const TICKETMASTER_ATTRACTION_API_URL = process.env.TICKETMASTER_ATTRACTION_API_URL;
    
    const res = await fetch(`${TICKETMASTER_ATTRACTION_API_URL}/${id}.json?${queryParams}`);

    if (!res.ok) {
      throw new Error(`${res.status}: ${res.statusText}`);
    }

    const attraction = await res.json();
    
    response.json(attraction);
  } catch(error) {
    console.log('Error fetching data from Ticketmaster:\n', error);
    response.status(500).json({ message: 'Internal server error.' });
  }
});

/*
   Experimental searching 
*/
router.get('/suggest', async (request, response) => {
  try {
    const query = request.query;
    const queryString = new URLSearchParams(query).toString();
    const queryParams = `apikey=${TICKETMASTER_API_KEY}&${queryString}`;
    const res = await fetch(`${TICKETMASTER_SUGGEST_API_URL}?${queryParams}`);

    if (!res.ok) {
      throw new Error(`${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    console.log(data);
    response.send(data);
  } catch (error) {
    console.log('Error fetching data from Ticketmaster:\n', error);
    response.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
