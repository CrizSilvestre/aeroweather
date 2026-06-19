# AeroWeather

Convierte el PDF de **ONAMET** (*Pronóstico Regional del Este y Marino para Punta Cana y áreas vecinas*)
en un **correo corporativo de Outlook** listo para enviar — Asunto `Weather`, distribución por **CCO**,
fuente **Arial 12 pt** e imágenes meteorológicas incrustadas.

Pensado para el equipo de Operaciones del **Aeropuerto Internacional de Punta Cana (PUJ)**.

> 100 % local: el PDF y las imágenes se procesan **dentro del navegador**. Nada se sube a Internet.

---

## Flujo del usuario

1. **Subir** el PDF de ONAMET (arrastrar y soltar).
2. **Subir** las imágenes (Radar/Satélite y Windy) — se redimensionan a un ancho estándar.
3. **Revisar** la vista previa del correo y la lista de validación.
4. **Generar** → se descarga `Weather-AAAA-MM-DD.eml`.
5. **Doble clic** en el `.eml` → Outlook abre un **borrador nuevo y editable**
   (Asunto `Weather`, CCO ya cargado, cuerpo Arial 12 con imágenes) → **Enviar**.

## Ejecutar en local

```bash
npm install      # solo la primera vez (descarga pdf.js)
npm run serve    # http://localhost:4178
```

No requiere build. Para producción basta con **servir la carpeta como sitio estático**
(IIS interno, SharePoint, Azure Static Web Apps, etc.).

## Pruebas

```bash
npm test         # valida el parser y el .eml contra un PDF real de ONAMET
```

`test/parse.test.mjs` ejecuta la **misma** extracción de pdf.js que usa el navegador y comprueba
fecha, temperatura, las 4 secciones de pronóstico, marino, marítimas, playa y salida/puesta del sol.
`test/eml.test.mjs` construye el `.eml` y verifica `X-Unsent`, `Subject: Weather`, `Bcc`, imágenes
`cid` y que el HTML quede en Arial 12 pt.

## Por qué un archivo `.eml` (cabecera `X-Unsent: 1`)

Un navegador no puede, por seguridad, controlar Outlook directamente. La forma fiable de obtener un
correo **HTML con imágenes y CCO** es generar un `.eml` con la cabecera `X-Unsent: 1`: al abrirlo,
Outlook de escritorio lo trata como un **borrador en redacción** (no como un mensaje recibido) con
todo precargado. `mailto:` no sirve aquí porque es solo texto plano y tiene límite de longitud.

## Arquitectura

Cliente puro, sin servidor ni base de datos. Lógica separada de la UI para poder probarla:

| Módulo | Responsabilidad |
|---|---|
| `src/pdfText.mjs` | Reconstruye líneas de texto desde pdf.js |
| `src/parser.mjs` | Texto ONAMET → estructura (fecha, secciones, días, sol) |
| `src/emailTemplate.mjs` | Estructura → HTML corporativo fijo (Arial 12 pt) |
| `src/eml.mjs` | HTML + imágenes → `.eml` con `X-Unsent` |
| `src/imageResize.mjs` | Redimensiona con Canvas manteniendo proporción |
| `src/validate.mjs` | Checklist previo (PDF, secciones, imágenes, CCO) |
| `src/config.mjs` | Valores por defecto (CCO, asunto, fuente, tamaños) |
| `app.mjs` | Orquestación de la interfaz |
| `vendor/` | pdf.js incrustado (funciona **offline**) |

## Configuración

- **CCO por defecto:** `src/config.mjs` → `defaultBcc`. Editable en la propia web y se guarda en el
  navegador (`localStorage`); cada usuario puede añadir o quitar destinatarios.
- **Firma:** *no se inserta ninguna firma*. Cada remitente usa la firma que ya tiene configurada en
  Outlook, que es la que debe aparecer en el correo final.
- **Asunto** fijo `Weather`; **fuente** Arial 12 pt; **estructura** del correo fija (mandato corporativo).

## Seguridad

- El PDF y las imágenes **nunca salen del equipo**.
- ⚠️ **No publicar en GitHub Pages público:** expondría la lista de correos de distribución. Usar
  hosting **interno** o **Azure Static Web Apps con Entra ID (Azure AD)** para acceso solo del personal.

## Roadmap

- **Fase 2:** Add-in de Outlook (Office.js) para abrir el borrador con un clic, sin descargar el `.eml`.
- **Fase 3:** Microsoft Graph / Power Automate para detectar el correo de ONAMET y crear el borrador
  automáticamente; historial de reportes, usuarios, estadísticas y validación con IA.
