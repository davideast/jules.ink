import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

const allowedOrigins = ['http://localhost:4321', 'http://localhost:3000'];

app.use('/*', cors({
  origin: (origin) => {
    if (!origin) return null;
    return allowedOrigins.includes(origin) ? origin : null;
  },
}));

app.get('/', (c) => c.text('Hello'));

async function test() {
  const req1 = new Request('http://localhost/', {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://malicious.com',
      'Access-Control-Request-Method': 'GET',
    }
  });

  const res1 = await app.fetch(req1);
  console.log("Malicious Headers:");
  res1.headers.forEach((value, key) => {
    console.log(`${key}: ${value}`);
  });

  const req2 = new Request('http://localhost/', {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:4321',
      'Access-Control-Request-Method': 'GET',
    }
  });

  const res2 = await app.fetch(req2);
  console.log("Trusted Headers:");
  res2.headers.forEach((value, key) => {
    console.log(`${key}: ${value}`);
  });
}
test();
