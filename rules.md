# Reglas y Estatutos del Proyecto: Godzilla Consulting

## 1. Gestión de Dependencias y Comandos (Estatuto General)
* **Uso Obligatorio de pnpm**: Queda estrictamente prohibido utilizar `npm` o `yarn` para cualquier comando de ejecución o instalación. Todos los proyectos y scripts en este entorno deben gestionarse exclusivamente con `pnpm` (ej. `pnpm install`, `pnpm run dev`, `pnpm run build`).

## 2. Optimización Móvil y Responsive
* **Layouts Divididos**: Evitar layouts paralelos/divididos horizontalmente en pantallas móviles. Cambiar a apilamiento vertical (`flex-col md:flex-row`).
* **Anchos Flexibles**: No utilizar anchos fijos mayores a `320px` sin adaptabilidad responsiva (`w-full` o similar).
