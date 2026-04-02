/**
 * fix_permissions.mjs
 * Aplica el sistema de roles al AdminStudio:
 *  - isCM: role === 'cm' → solo calendario
 *  - isEditor: role === 'admin' o is_superadmin → vista completa (Cockers, Alex, dani, JareG, Oscar)
 *  - isSuperAdmin: is_superadmin → además puede borrar usuarios (solo Oscar + JareG)
 */

import { readFileSync, writeFileSync } from 'fs';

const path = 'src/components/AdminStudio.jsx';
let c = readFileSync(path, 'utf8');

// ── 1. Inyectar constantes de permisos después del useEffect de perfil ──────
const AFTER_PROFILE_EFFECT = "         .catch(err => console.error('Error al cargar perfil', err));\r\n     }\r\n }, []);";
const PERMISSION_CONSTANTS = `         .catch(err => console.error('Error al cargar perfil', err));
     }
 }, []);

 // ── Permisos por Rol ─────────────────────────────────────────────────────
 // isCM        → role='cm' (Judith): solo calendario/studio
 // isEditor    → role='admin' (Cockers/Alex/dani/JareG/Oscar): edita todo
 // isSuperAdmin→ is_superadmin=true (Oscar/JareG): además borra usuarios
 const isCM        = adminProfile?.role === 'cm';
 const isEditor    = adminProfile?.role === 'admin' || adminProfile?.is_superadmin === true;
 const isSuperAdmin= adminProfile?.is_superadmin === true;
 const canEditSite = isEditor;`;

if (c.includes(AFTER_PROFILE_EFFECT)) {
    c = c.replace(AFTER_PROFILE_EFFECT, PERMISSION_CONSTANTS);
    console.log('✅ Constantes de permisos inyectadas');
} else {
    console.error('❌ No se encontró el anchor del useEffect de perfil');
    process.exit(1);
}

// ── 2. Botón Guardar Borrador: reemplazar chequeo de rol/username ───────────
c = c.replace(
    /disabled=\{saving \|\| !selectedNodeId \|\| !isRecursosValid \|\| adminProfile\?\.role === 'cm' \|\| adminProfile\?\.username\?\.toLowerCase\(\) === 'judith'\}/g,
    `disabled={saving || !selectedNodeId || !isRecursosValid || isCM}`
);

// ── 3. Botón Publicar: mismo fix ─────────────────────────────────────────────
c = c.replace(
    /disabled=\{!selectedNodeId \|\| !isRecursosValid \|\| adminProfile\?\.role === 'cm' \|\| adminProfile\?\.username\?\.toLowerCase\(\) === 'judith'\}/g,
    `disabled={!selectedNodeId || !isRecursosValid || isCM}`
);

// ── 4. Sidebar: condición CM correcta ────────────────────────────────────────
c = c.replace(
    /adminProfile\?\.role === 'cm' \|\| adminProfile\?\.username\?\.toLowerCase\(\) === 'judith'/g,
    `isCM`
);

// ── 5. Botones con adminProfile?.id === 4 → usar isCM ────────────────────────
c = c.replace(
    /adminProfile\?\.role === 'cm' \|\| adminProfile\?\.id === 4/g,
    `isCM`
);
c = c.replace(
    /adminProfile\?\.id === 4/g,
    `isCM`
);

// ── 6. Actualizar badge de rol del sidebar ───────────────────────────────────
// Cambiar "Panel CM (Judith)" -> "Panel CM"
c = c.replace('>📅</span> Panel CM (Judith)', '>📅</span> Panel CM');

writeFileSync(path, c);
console.log('✅ Sistema de permisos actualizado correctamente');
console.log('Roles:');
console.log('  isCM       = role === cm (Judith)');
console.log('  isEditor   = role === admin (Cockers, Alex, dani, JareG, Oscar)');
console.log('  isSuperAdmin = is_superadmin (Oscar, JareG) - puede borrar usuarios');
