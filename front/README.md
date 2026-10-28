# Voto a dois

Aplicativo gratuito de relacionamento por afinidade, mantido pela Ducks tech, grupo independente de desenvolvimento, sem fins lucrativos e sem vínculo partidário.

Contato: duckstech@hotmail.com.

## Desenvolvimento

Use Node arm64: `export PATH=/opt/homebrew/bin:$PATH`.
Na pasta `front`, execute `npm install` e `npm run dev`. O proxy de `/api` encaminha ao backend local. Veja `.env.example` para configuração.

Validação: `npm run build`, `npm run lint` e `node --test test/*.test.js`.

## Marca provisória

O wordmark fica em `src/components/Logo.jsx`. O símbolo tipográfico V2 fica em `public/icons/brand.svg`, com cópia em `public/favicon.svg`. Ao escolher o logo definitivo, atualize esses SVGs e os PNGs de `public/icons` (192, 512, maskable 512 e Apple 180 px). Preserve a área segura do ícone maskable. O manifesto é gerado em `pwa/build.js`.
