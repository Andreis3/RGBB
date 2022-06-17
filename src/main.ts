import createApp from './app';

async function bootstrap() {
  const app = await createApp();
  await app.listen(3005);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(127);
});
