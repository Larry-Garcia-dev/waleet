# Pasarela de Pagos Cripto - USDT TRC-20

Sistema de recepcion de pagos en USDT (TRC-20) mediante direcciones unicas por usuario (HD Wallet), codigos QR y deteccion automatica de transacciones en la red TRON.

## Arquitectura MVC

```
src/
├── config/           # Configuracion (DB, blockchain, logger)
├── controllers/      # Manejo de requests HTTP
├── models/           # Acceso a datos (MySQL)
├── services/         # Logica de negocio (wallet, depositos, QR, sweep)
├── routes/           # Definicion de endpoints API
├── middleware/        # Auth, validacion, rate limiting, seguridad
├── jobs/             # Tareas programadas (monitoreo depositos, sweep)
├── utils/            # Utilidades (crypto, constantes)
├── app.js            # Configuracion Express
└── server.js         # Entry point
```

## Requisitos

- Node.js >= 18
- MySQL 8.0+
- API key de TronGrid (gratuita en [trongrid.io](https://trongrid.io))

## Instalacion

```bash
npm install
```

## Configuracion

1. Copiar `.env.example` a `.env`:
```bash
cp .env.example .env
```

2. Generar la semilla maestra (BIP39 mnemonic):
```bash
node -e "import('bip39').then(b => console.log(b.generateMnemonic()))"
```

3. Configurar en `.env`:
   - `MASTER_SEED_MNEMONIC`: La frase generada (12/24 palabras)
   - `DB_PASSWORD`: Contrasena de MySQL
   - `TRONGRID_API_KEY`: API key de TronGrid
   - `JWT_SECRET`: Clave aleatoria para JWT (min 64 chars)
   - `COLD_WALLET_ADDRESS`: Direccion TRC-20 de la wallet fria

4. Crear la base de datos:
```bash
mysql -u root -p < database/schema.sql
```

## Uso

### Iniciar servidor API
```bash
npm start
# o en desarrollo:
npm run dev
```

### Iniciar monitor de depositos (separado)
```bash
npm run job:deposits
```

### Iniciar sweep job (separado)
```bash
npm run job:sweep
```

## API Endpoints

### Autenticacion
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh token |
| POST | `/api/auth/change-password` | Cambiar contrasena |
| GET | `/api/auth/me` | Perfil del usuario |

### Wallet
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/wallet/generate` | Generar direccion TRC-20 unica |
| GET | `/api/wallet/my-wallets` | Listar wallets del usuario |
| GET | `/api/wallet/qr` | Obtener QR de deposito (base64/svg/raw) |
| GET | `/api/wallet/validate/:address` | Validar direccion TRC-20 |

### Depositos
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/deposits` | Historial de depositos |
| GET | `/api/deposits/:txHash` | Estado de un deposito |
| GET | `/api/deposits/check/:address` | Forzar verificacion |

### Admin (requiere ADMIN_USER_IDS)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/admin/users` | Listar usuarios |
| PUT | `/api/admin/users/:id/status` | Cambiar estado usuario |
| PUT | `/api/admin/users/:id/kyc` | Verificar KYC |
| GET | `/api/admin/deposits` | Todos los depositos |
| GET | `/api/admin/stats` | Estadisticas |
| GET | `/api/admin/audit-logs` | Logs de auditoria |
| POST | `/api/admin/sweep/trigger` | Ejecutar sweep manual |
| POST | `/api/admin/deposits/check-all` | Verificar todos los depositos |

## Seguridad Implementada

### Protecciones de Red
- **Helmet**: Cabeceras HTTP seguras (CSP, HSTS, X-Frame-Options, etc.)
- **CORS**: Origenes restringidos
- **Rate Limiting**: Limites por IP en toda la API y endpoints criticos
- **Slow Down**: Penalizacion progresiva en login/registro
- **HPP**: Proteccion contra HTTP Parameter Pollution
- **Bloqueo de scans**: Rutas comunes de vulnerabilidades bloqueadas

### Autenticacion y Autorizacion
- **JWT**: Tokens con expiracion, issuer y audience
- **Refresh Tokens**: Rotacion de tokens
- **Bcrypt**: Hash de contrasenas con 12 rounds
- **Password Policy**: Minimo 8 chars, mayusculas, minusculas, numeros, especiales
- **Admin隔离**: Endpoints admin separados con validacion de IDs

### Proteccion de Datos
- **Seed maestra**: Nunca se expone al frontend ni se guarda en BD
- **Private keys**: Se derivan al vuelo, nunca se almacenan
- **Derivation index**: Nunca se expone en respuestas API
- **Encryption at rest**: AES-256-GCM para datos sensibles
- **Timing-safe comparison**: Para valores sensibles
- **Sanitizacion de logs**: Datos sensibles redactados automaticamente

### Integridad de Transacciones
- **Idempotencia**: UNIQUE KEY en tx_hash previene doble acreditacion
- **Transacciones atomicas**: Deposito + acreditacion en una sola transaccion DB
- **Confirmaciones de bloque**: Se esperan 19+ confirmaciones antes de acreditar
- **Audit log inmutable**: Toda accion critica queda registrada

### Custodia de Fondos
- **HD Wallet (BIP44)**: Una seed, infinitas direcciones
- **Cold wallet sweep**: Barrido periodico a wallet fria
- **Registro inmutable**: Cada sweep queda logueado con tx_hash

## Flujo de un Deposito

```
1. Usuario se registra -> POST /api/auth/register
2. Genera su wallet    -> POST /api/wallet/generate
3. Obtiene su QR       -> GET /api/wallet/qr
4. Envía USDT a su direccion unica (red TRC-20)
5. El job de monitoreo detecta la transaccion (cada 15 min)
6. Espera 19+ confirmaciones de bloque
7. Acredita el balance al usuario (transaccion atomica)
8. Periodicamente, sweep mueve fondos a la wallet fria
```

## Variables de Entorno

Ver `.env.example` para la lista completa con descripciones.

## Checklist Pre-Produccion

- [ ] Seed maestra generada y almacenada cifrada (KMS/HSM)
- [ ] Direcciones probadas en testnet antes de produccion
- [ ] Confirmaciones minimas configuradas (19+)
- [ ] Idempotencia verificada (mismo tx_hash no acredita dos veces)
- [ ] Sweep a wallet fria probado con logs auditables
- [ ] Revision legal KYC/AML y licencias
- [ ] Plan de respuesta ante incidentes
- [ ] HTTPS configurado (via reverse proxy o directamente)
- [ ] Backups de base de datos automatizados
- [ ] Monitoreo y alertas configurados

## Nota Legal

Este software es una implementacion tecnica de referencia. Antes de operar con fondos de terceros, consulte con un abogado sobre los requisitos regulatorios aplicables en su jurisdiccion (KYC/AML, licencias de operador de pagos, etc.).

## Licencia

UNLICENSED - Uso privado.
