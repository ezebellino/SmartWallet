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

- [ ] Comparacion contra mes anterior.
- [ ] Top 3 categorias de gasto.
- [ ] Categoria que mas subio.
- [ ] Saldo proyectado de fin de mes.
- [ ] Indicador de salud financiera.
- [ ] Alertas visibles por prioridad.
- [ ] Vista compacta sin exceso de scroll.

### Etapa 3: IA de Reporte Mensual

Objetivo: que la IA use todos los datos reales importantes.

- [x] ~~Integracion real con OpenAI para reporte mensual.~~
- [x] ~~Fallback stub cuando OpenAI falla o no hay cuota.~~
- [ ] Mejorar prompt con movimientos, presupuestos, objetivos, dolares e inversiones.
- [ ] Guardar historico de reportes por mes.
- [ ] Mostrar diferencias entre reporte actual y anterior.
- [ ] Agregar acciones sugeridas con prioridad.
- [ ] Bloquear lenguaje de asesoramiento financiero definitivo.

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
- [ ] Job de actualizacion de precios.
- [ ] Recalculo automatico de cartera.
- [ ] Deteccion automatica de anomalias de gasto.
- [ ] Recordatorios para cargar movimientos.
- [ ] Preparacion de movimientos recurrentes.

### Etapa 6: APIs Externas y Datos Reales

Objetivo: enriquecer SmartWallet con datos externos utiles.

- [x] ~~Integracion inicial con proveedores de mercado.~~
- [x] ~~DolarAPI para referencia USD/ARS.~~
- [x] ~~Alpha Vantage preparado con limitacion de plan gratuito.~~
- [ ] Cache de precios con politica clara por proveedor.
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

1. Panel global de carga rapida de movimientos.
2. Crear categoria desde movimiento.
3. Dashboard con comparacion contra mes anterior.
4. Historico de reportes IA.
5. Notificaciones internas basicas.
6. Mejor explicacion de precios omitidos en inversiones.
7. Preparar vista mobile-first para carga diaria.

## Decisiones Tecnicas Actuales

- Backend: FastAPI, SQLAlchemy, Alembic, PostgreSQL.
- Frontend: Next.js, TypeScript, TailwindCSS.
- Estado: datos cargados desde backend real, sin mocks operativos confusos.
- IA: OpenAI real para reporte mensual, con fallback stub.
- Integraciones: proveedor externo desacoplado y con tolerancia a errores.
- Git: rama principal `main`.

## Reglas de Avance

- Cada etapa debe cerrar con validacion tecnica: tests, typecheck o build segun corresponda.
- Toda feature nueva debe quedar conectada a datos reales o marcada explicitamente como preparada/stub.
- No centralizar componentes grandes en un solo archivo.
- Mantener textos visibles en español e ingles.
- Si una integracion externa falla, la app debe seguir usable.
- Cada mejora completada debe tacharse en este documento.
