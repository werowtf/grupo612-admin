@AGENTS.md

## Acceso al VPS (esta sesión)

- **Conexión:** `ssh vps <comando>` (alias en `~/.ssh/config` → `deploy@31.220.51.119`, sin root). Usar **PowerShell**: Git Bash no ve el agente de Windows y da `Permission denied (publickey)`. Si falla en PowerShell: `Start-Service ssh-agent` y `ssh-add`.
- **Este proyecto en el servidor:** G612 ADMIN (admin.grupo612.com.mx) · código/ruta `/srv/apps/admin` · contenedor `vps-admin-1` · base `g612_admin` · https://admin.grupo612.com.mx · deploy por GitHub Actions (werowtf/grupo612-admin), migraciones Prisma incluidas.
- **Solo lectura, sin pedir permiso:** usar la forma *sin comillas*, p. ej. `ssh vps docker logs --tail 100 vps-admin-1`, `ssh vps docker ps`, `ssh vps ls /srv/apps/admin`. Con comillas o pipes remotos se pide confirmación.
- **Alcance:** operar solo este proyecto. La infra compartida (`/srv/vps`: Caddyfile, docker-compose, `.env`, `env/*.env`, backups, cron) la cambia únicamente la sesión **Infra VPS** (carpeta `G612 ADMIN/vps`); desde aquí no se modifica. Otras apps (`/srv/apps/*` ajenas) no se tocan.
- **Datos de producción:** respaldo antes + transacción + verificación; nunca editar a mano sin que el usuario lo pida. Subir cambios = `git push` a `main` (deploy automático), solo cuando el usuario diga "sube".
- **Secretos:** nunca por el chat ni dentro del repo; viven en `/srv/vps/env/*.env` del servidor.
- Runbook completo del servidor: `C:\Users\geagu\OneDrive\Documentos\WERO\Clientes\G612 ADMIN\vps\GUIA.md`.
