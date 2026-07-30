// Genera un Excel con los jurados de la evaluación final creados el
// 2026-07-17 (nombre, correo y código de acceso). Datos en duro: no lee
// Firestore.
// Uso: npx tsx scripts/export-jurados-xlsx.ts

import * as XLSX from 'xlsx';

const JURADOS = [
  { Nombre: 'Perla Toro', Correo: 'perlatoro@comfama.com.co', 'Código de acceso': '0602', 'Rol en la organización': 'Responsable Comunicaciones' },
  { Nombre: 'Patricia Vahos', Correo: 'patriciavahos@comfama.com.co', 'Código de acceso': '3637', 'Rol en la organización': 'Responsable Talento Humano' },
  { Nombre: 'Angela Gonzalez', Correo: 'angelagonzalez@comfama.com.co', 'Código de acceso': '0740', 'Rol en la organización': 'Responsable Tecnología y Datos' },
  { Nombre: 'Mauricio Perez', Correo: 'mauricioperez@comfama.com.co', 'Código de acceso': '9029', 'Rol en la organización': 'Responsable Estrategia y Proyectos' },
  { Nombre: 'Nicolas Correa', Correo: 'nicolascorrea@comfama.com.co', 'Código de acceso': '7675', 'Rol en la organización': 'Responsable Servicios Organizacionales' },
  { Nombre: 'Santiago Jiménez Londoño', Correo: 'sjimene8@eafit.edu.co', 'Código de acceso': '4537', 'Rol en la organización': 'Profesor Universidad EAFIT' },
];

const ws = XLSX.utils.json_to_sheet(JURADOS);
// Ancho de columnas legible y códigos como texto (conserva el cero inicial).
ws['!cols'] = [{ wch: 20 }, { wch: 34 }, { wch: 16 }, { wch: 38 }];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Jurados final');
const OUT = 'docs/jurados-evaluacion-final.xlsx';
XLSX.writeFile(wb, OUT);
console.log(`Archivo generado: ${OUT} (${JURADOS.length} jurados)`);
