# SmartWallet SDD y Roadmap Vivo

Fecha de referencia: 2026-07-08

Este documento funciona como SDD liviano: **Software Design & Delivery**. La idea es no perder la linea del producto, registrar decisiones, tachar lo realizado y mantener claro cual es el siguiente paso operativo.

## Vision del Producto

SmartWallet es una aplicacion de finanzas personales para registrar movimientos reales, entender gastos, controlar presupuestos, seguir objetivos, mirar ahorros en USD, administrar inversiones y generar reportes mensuales con IA.

El producto debe sentirse practico para uso diario: cargar datos rapido, ver alertas claras, sincronizar con backend real y recibir recomendaciones accionables sin convertirse en asesor financiero definitivo.

## Principios de Producto

- Primero datos reales, despues automatizaciones.
- Menos scroll, mas acciones directas.
- Cada dashboard debe responder: que paso, que importa y que hago ahora.
- La IA debe ayudar a interpretar, no inventar datos.
- Toda integracion externa debe tener fallback.
- La app web debe quedar preparada para una experiencia mobile futura.

## Estado General

### Ya realizado

- [x] ~~Backend FastAPI solido con estructura por routers, schemas, services y repositories.~~
- [x] ~~Auth con registro, login, JWT y rutas protegidas.~~
- [x] ~~CRUD real de categorias.~~
- [x] ~~CRUD real de movimientos.~~
- [x] ~~Dashboard mensual conectado a datos del backend.~~
- [x] ~~Frontend Next.js componentizado.~~
- [x] ~~Selector de idioma ES/EN.~~
- [x] ~~Boton para mostrar/ocultar password.~~
- [x] ~~Edicion y eliminacion de categorias y movimientos.~~
- [x] ~~Presupuestos reales con uso mensual y alertas.~~
- [x] ~~Objetivos de ahorro con aportes.~~
- [x] ~~Modulo de inversiones con activos, operaciones y cartera.~~
- [x] ~~Integraciones de mercado preparadas con proveedores externos.~~
- [x] ~~Actualizacion de precios de activos importantes con limitaciones del plan gratuito contempladas.~~
- [x] ~~Ahorro en dolares con registros manuales y deteccion desde movimientos.~~
- [x] ~~Reporte mensual IA real con OpenAI y stub como fallback.~~
- [x] ~~Reporte IA generado manualmente para evitar llamadas costosas en cada sync.~~
- [x] ~~Mejoras de UI/UX: sidebar funcional, cards mejoradas, navegacion por secciones y acciones rapidas.~~
- [x] ~~Script de arranque local `start-app.ps1`.~~
- [x] ~~Repositorio GitHub conectado en `main`.~~

## Roadmap por Etapas

### Etapa 1: Operacion Diaria Rapida

Objetivo: que cargar y revisar datos sea inmediato.

- [x] ~~Panel/modal global de carga rapida.~~
- [x] ~~Acciones rapidas para ingreso, gasto y compra USD.~~
- [x] ~~Accion rapida para registrar inversion.~~
- [x] ~~Crear categoria desde el flujo de movimiento si no existe.~~
- [x] ~~Duplicar movimiento frecuente.~~
- [x] ~~Plantillas de movimientos comunes basadas en movimientos recientes.~~
- [ ] Atajos mobile-first para carga desde celular.

### Etapa 2: Dashboard Mas Inteligente

Objetivo: pasar de mostrar numeros a explicar cambios.

- [x] ~~Comparacion contra mes anterior.~~
- [x] ~~Top 3 categorias de gasto.~~
- [x] ~~Categoria que mas subio.~~
- [x] ~~Saldo proyectado de fin de mes.~~
- [x] ~~Indicador de salud financiera.~~
- [x] ~~Alertas visibles por prioridad.~~
- [x] ~~Vista compacta sin exceso de scroll.~~

### Etapa 3: IA de Reporte Mensual

Objetivo: que la IA use todos los datos reales importantes.

- [x] ~~Integracion real con OpenAI para reporte mensual.~~
- [x] ~~Fallback stub cuando OpenAI falla o no hay cuota.~~
- [x] ~~Mejorar prompt con movimientos, presupuestos, objetivos, dolares e inversiones.~~
- [x] ~~Guardar historico de reportes por mes con selector de periodo.~~
- [ ] Mostrar diferencias entre reporte actual y anterior.
- [ ] Agregar acciones sugeridas con prioridad.
- [ ] Bloquear lenguaje de asesoramiento financiero definitivo.

Nota de avance 2026-07-28:

- El contexto del reporte mensual IA ahora incluye resumen mensual, insights de gasto, uso de presupuestos, objetivos de ahorro, registros de ahorro USD e informacion de cartera/inversiones.
- El proveedor OpenAI recibe el contexto enriquecido en JSON y el stub lo muestra como contexto de planificacion para mantener fallback util.
- Validado con tests backend focales de reportes IA.
- El frontend de Reportes IA ahora muestra historico, selector de periodo y permite generar/regenerar el mes seleccionado.
- Validado con Chrome DevTools sobre `http://localhost:3000`, typecheck y build frontend.

### Etapa 4: Notificaciones Internas

Objetivo: que el usuario no tenga que buscar problemas.

- [ ] Modelo backend de notificaciones.
- [ ] Inbox de notificaciones en frontend.
- [ ] Presupuesto cerca del limite.
- [ ] Presupuesto excedido.
- [ ] Reporte IA pendiente.
- [ ] Objetivo atrasado o sin aportes.
- [ ] Precio de activo actualizado.
- [ ] Variacion fuerte de cripto, accion o dolar.

### Etapa 5: Automatizaciones

Objetivo: reducir tareas manuales repetidas.

- [ ] Job mensual para generar reporte IA.
- [x] ~~Scheduler interno configurable para actualizacion automatica de precios.~~
- [x] ~~Scheduler local activado y validado con estado persistido.~~
- [ ] Extraer scheduler a worker/cron separado para Railway cuando la app este desplegada.
- [ ] Recalculo automatico de cartera.
- [ ] Deteccion automatica de anomalias de gasto.
- [ ] Recordatorios para cargar movimientos.
- [ ] Preparacion de movimientos recurrentes.

### Etapa 6: APIs Externas y Datos Reales

Objetivo: enriquecer SmartWallet con datos externos utiles.

- [x] ~~Integracion inicial con proveedores de mercado.~~
- [x] ~~DolarAPI para referencia USD/ARS.~~
- [x] ~~Alpha Vantage preparado con limitacion de plan gratuito.~~
- [x] ~~InvertirOnline agregado como integracion configurable preparada.~~
- [x] ~~InvertirOnline conectado como provider backend de solo lectura para cotizaciones.~~
- [ ] Cache de precios con politica clara por proveedor.
- [x] ~~Estado persistido de ejecucion automatica de precios para sobrevivir reinicios.~~
- [ ] Validar documentacion autenticada de IOL API.
- [ ] Conectar MCP de IOL cuando este disponible en Codex.
- [ ] Validar IOL con credenciales reales y APIs habilitadas.
- [ ] Implementar refresh token persistente para IOL si el uso real lo requiere.
- [ ] Mejor UI para explicar activos omitidos.
- [ ] Historial de cotizaciones por activo.
- [ ] Inflacion o referencias macroeconomicas.
- [ ] Configuracion por usuario de proveedores.

### Etapa 7: Mobile y Segundo Servicio

Objetivo: preparar carga instantanea desde celular.

- [ ] Definir si conviene PWA, app mobile o servicio liviano separado.
- [ ] Endpoint optimizado para carga rapida de gastos.
- [ ] Token/session flow seguro para mobile.
- [ ] UI mobile de carga en 2 o 3 toques.
- [ ] Sincronizacion inmediata con la app principal.
- [ ] Modo offline o cola local para cargar despues.

### Etapa 8: Produccion y Calidad

Objetivo: dejar el producto listo para operar sin fragilidad.

- [ ] CI con tests backend y build frontend.
- [ ] Deploy Railway o proveedor equivalente.
- [ ] Variables de entorno documentadas.
- [ ] Backups de base de datos.
- [ ] Logs y monitoreo basico.
- [ ] Manejo claro de errores de integraciones.
- [ ] Documentacion de instalacion y recuperacion.

## Backlog Priorizado Inmediato

1. Validar IOL con credenciales reales y APIs habilitadas.
2. Preparar deployment Railway con backend, Postgres y worker/cron de precios.
3. Validar documentacion autenticada y MCP de InvertirOnline.
4. Mostrar diferencias entre reporte IA actual y anterior.
5. Agregar acciones sugeridas con prioridad desde el reporte IA.
6. Notificaciones internas basicas.
7. Mejor explicacion de precios omitidos en inversiones.
8. Preparar vista mobile-first para carga diaria.

## Decisiones Tecnicas Actuales

- Backend: FastAPI, SQLAlchemy, Alembic, PostgreSQL.
- Frontend: Next.js, TypeScript, TailwindCSS.
- Estado: datos cargados desde backend real, sin mocks operativos confusos.
- IA: OpenAI real para reporte mensual, con fallback stub.
- Integraciones: proveedor externo desacoplado y con tolerancia a errores.
- Git: rama principal `main`.

## Reglas de Avance

- Antes de avanzar sobre SmartWallet, consultar la nota del proyecto en Obsidian: `02-Projects/AI Wallet/Tasks.md`.
- Al cerrar una mejora o detectar una tarea nueva, registrar el avance y pendientes en Obsidian.
- Mantener sincronizado este roadmap local con la nota operativa del vault.
- Cada etapa debe cerrar con validacion tecnica: tests, typecheck o build segun corresponda.
- Toda feature nueva debe quedar conectada a datos reales o marcada explicitamente como preparada/stub.
- No centralizar componentes grandes en un solo archivo.
- Mantener textos visibles en español e ingles.
- Si una integracion externa falla, la app debe seguir usable.
- Cada mejora completada debe tacharse en este documento.

## Etapa UX/UI y perfil - 2026-10-26

- [x] ~~Eliminar navegacion redundante en escritorio y acciones repetidas del inicio.~~
- [x] ~~Perfil autenticado con nombre editable, correo de solo lectura e idioma.~~
- [x] ~~Separar Inversiones en Cartera, Actividad, Analisis y Conexiones.~~
- [x] ~~Separar composicion Binance de credenciales y sincronizacion.~~
- [x] ~~Agregar noticias oficiales de politica monetaria con fuente, fecha, enlace y cache.~~
- [x] ~~Validar frontend con typecheck/build y backend con suite completa (84 tests).~~
- [x] ~~Probar perfil persistente, noticias y navegacion en escritorio y movil con cuenta ficticia.~~
- [ ] Comparar fuentes adicionales para acciones/CEDEARs (cobertura, licencia, costo y limites).
- [ ] Diseñar ideas de investigacion basadas en datos y riesgo; no generar ordenes ni recomendaciones de compra personalizadas sin una metodologia auditada.
- [ ] Validar el cambio en Railway antes de publicar; no se desplego en esta etapa.

## CEDEARs - 2026-10-26

- [x] ~~Separar CEDEARs de Alpha Vantage: el precio de la acción subyacente no equivale al del certificado local.~~
- [x] ~~Usar IOL para CEDEARs en ARS y conservar el precio anterior cuando la cotización no confirma moneda, no es ARS o es inválida.~~
- [x] ~~Excluir cotizaciones históricas de Alpha Vantage de la valuación y alertar sin borrar datos.~~
- [x] ~~Mostrar CEDEARs, fuente, fecha, moneda, precio y estado sin cotización en Cartera; carga en Actividad.~~
- [x] ~~Agregar pruebas de ruta IOL, falta de credenciales, moneda errónea, variante USD y legado; parser de moneda probado de forma aislada.~~
- [x] ~~Ejecutar pruebas backend en Python 3.12/Docker efímero, sin red y con fuentes de solo lectura: 22 focales y 90 en suite completa. `npm run typecheck` pasó.~~
- [x] ~~Completar `npm run build`: pasó al usar `NEXT_DIST_DIR=.next-cedear-build`, separado de la vista previa activa en `.next`. `npm run typecheck` también pasó.~~
- [ ] Validar la respuesta real de IOL con un CEDEAR en ARS autorizado y comprobar que incluya moneda; si no la incluye, no aceptar el precio automáticamente hasta tener otra verificación fiable.
- [x] ~~Smoke autenticado con cuenta ficticia: crear CEDEAR AAPL en ARS, registrar compra de 2 certificados, ver valuación ARS 24.000 y alternar ES/EN. Vista de 390 px sin overflow ni errores de consola. Frontend local `127.0.0.1:3002`, backend SQLite temporal `127.0.0.1:8002`.~~
- [x] ~~GitHub `origin/main` actualizado en `224beba`; Railway autodesplegó frontend, backend y worker Mercado Pago en `SUCCESS`. Login público cargó sin errores de consola.~~
- [ ] Validar una cotización CEDEAR real en producción con cuenta IOL autorizada; el despliegue no demuestra cobertura ni moneda de la API externa.

## Navegacion UX/UI - 2026-10-29

- [x] ~~Agrupar la barra lateral en Inicio, Dinero, Patrimonio y Analisis; mover Perfil al pie y quitar su acceso duplicado de la cabecera.~~
- [x] ~~Permitir plegar el menu de escritorio con preferencia local persistente, iconos con tooltip y vista activa accesible.~~
- [x] ~~Reemplazar la tira horizontal movil por barra inferior con Dashboard, Movimientos, Inversiones y Mas; incluir los demas destinos y sincronizacion en Mas.~~
- [x] ~~Dejar la cabecera con mes, idioma, sesion y salida; sincronizacion pasa al menu visible para cada tamaño.~~
- [x] ~~Validar con cuenta ficticia: escritorio 1440 px, movil 390/320 px y tablet 768 px, ES/EN, teclado, foco, sin overflow ni errores de consola. Typecheck y build web OK.~~
- [x] ~~Publicar `335fb4f` en GitHub; Railway frontend `SUCCESS`, backend y worker sin cambios. Login publico sin errores de consola. Navegacion autenticada validada solo con cuenta ficticia local.~~
- [x] ~~Segunda etapa: Dashboard con actividad reciente del periodo como bloque principal, prioridades a un lado, analisis detallado desplegable y estados vacios compactos en alertas/notificaciones.~~
- [x] ~~Mantener acceso a graficos, salud financiera, comparaciones y proyeccion; ocultar rankings sin datos y agregar textos ES/EN. Typecheck y build web aislado OK.~~
- [x] ~~Dashboard autenticado validado con backend SQLite de QA en `127.0.0.1:8003` y frontend en `127.0.0.1:3003`: registro, categoria y gasto ficticios; actividad reciente, analisis desplegable y ES/EN. Chrome sin errores de consola; 1440, 390 y 320 px sin overflow tras ajustar la columna movil.~~
- [x] ~~Publicado `ef92dc6` en `origin/main`; Railway `smartwallet-frontend` en `SUCCESS` y dominio publico con login cargando sin errores de consola. Backend online, sin cambios de codigo en esta entrega.~~
- [ ] Comprobar el Dashboard autenticado en produccion con una cuenta propia; no se usaron credenciales ni datos reales durante el smoke publico.
- [ ] Compose principal no pudo tomar `8000` porque lo ocupa otra vista previa de SmartWallet; no se detuvieron contenedores ajenos ni se tocaron datos reales. PostgreSQL iniciado durante el intento se detuvo. Falta decidir puerto/servicio antes de usar Compose principal.

## Rediseño visual y claves - 2026-10-29

- [x] ~~Renovar paleta, tipografía, superficies, navegación, login, métricas y gráficos sin modificar flujos financieros.~~
- [x] ~~Validar typecheck y build web aislado; smoke local con cuenta ficticia en escritorio y móvil, incluyendo Inversiones y Conexiones a 320 px sin overflow ni errores de consola.~~
- [x] ~~Auditar configuración sin exponer secretos: `OPENAI_API_KEY` está en `backend/.env` local, pero no entre las variables del backend Railway. Las claves de Binance, Mercado Pago, Alpha Vantage e IOL son por usuario y los campos de UI quedan vacíos por seguridad.~~
- [ ] Configurar `OPENAI_API_KEY` en Railway mediante variable secreta y confirmar `AI_PROVIDER=openai` si se desea el reporte IA real en producción; nunca subir `backend/.env` al repositorio.
- [ ] Comprobar con la cuenta productiva del usuario el estado de cada integración; no inferir pérdida de claves por campos vacíos.
