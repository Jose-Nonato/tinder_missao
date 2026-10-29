# Missão a Dois

Aplicativo gratuito de relacionamento por afinidade, mantido pela Ducks tech, grupo independente de desenvolvimento, sem fins lucrativos e sem vínculo partidário.

Contato: duckstech@hotmail.com.

## Desenvolvimento

Use Node arm64: `export PATH=/opt/homebrew/bin:$PATH`.
Na pasta `front`, execute `npm install` e `npm run dev`. O proxy de `/api` encaminha ao backend local. Veja `.env.example` para configuração.

Validação: `npm run build`, `npm run lint` e `node --test test/*.test.js`.

## Marca

O nome e o wordmark ficam em `src/components/Logo.jsx`. O símbolo é a onça de `public/logo_onca.png`, que é a fonte de `public/icons/logo.webp` (usado no app), de `public/favicon.png` e dos PNGs de `public/icons` (192, 512, maskable 512 e Apple 180 px). Ao trocar a imagem, gere de novo esses arquivos e preserve a área segura do ícone maskable. O manifesto é gerado em `pwa/build.js`.
