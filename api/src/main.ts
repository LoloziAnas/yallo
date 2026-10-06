import { API_PORT } from '@yallo/shared';
import { createApi } from './server';

const port = Number(process.env.PORT) || API_PORT;
// Listen on all interfaces so phones on the same network can reach the API.
const host = process.env.HOST || '0.0.0.0';

createApi().http.listen(port, host, () => {
  console.log(`Yallo mock API on http://localhost:${port}  (live feed: ws://localhost:${port}/api/live)`);
});
