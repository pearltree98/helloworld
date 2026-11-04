import { createApp } from './app.js';
import { openDb } from './db.js';
import { seedIfEmpty } from './seed.js';

const repo = openDb();
seedIfEmpty(repo);

const port = Number(process.env.PORT) || 3000;
const server = createApp(repo).listen(port, () => {
  console.log(`Stepback is running at http://localhost:${port}`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    server.close(() => {
      repo.close();
      process.exit(0);
    });
  });
}
