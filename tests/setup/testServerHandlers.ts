import { http, HttpResponse } from 'msw';

export const handlers = [
  // Geolocation API mock
  http.get('https://ipapi.co/json/', () => {
    return HttpResponse.json({ country_code: 'US' });
  }),
  http.get('https://api.ipgeolocation.io/ipgeo', () => {
    return HttpResponse.json({ country_code2: 'BR' });
  }),
];

