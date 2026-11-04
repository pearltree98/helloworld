import { createApp } from './app.js';
import { openDb } from './db.js';
import { seedIfEmpty } from './seed.js';

const repo = openDb();
seedIfEmpty(repo);

const port = Number(process.env.PORT) || 3000;
const server = createApp(repo).listen(port, () => {
  console.log(`미리봄이 http://localhost:${port} 에서 실행 중입니다.`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    server.close(() => {
      repo.close();
      process.exit(0);
    });
  });
}
