import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Bank } from "@/generated/prisma/enums";

const DEFAULT_PASSWORD = "Grupo612.2026";

interface VenueCfg {
  slug: string;
  name: string;
  rfc?: string;
  bank: Bank;
  accountNumber: string | null;
}

// Estructura real (2026-07): BanBajío sólo en Biznaga; Santander en las demás.
const VENUES: VenueCfg[] = [
  { slug: "biznaga", name: "Biznaga", rfc: "REX2105067V9", bank: "BANBAJIO", accountNumber: "44344893" },
  { slug: "unobar", name: "UNO Bar", bank: "SANTANDER", accountNumber: "22000831548" },
  { slug: "612rooftop", name: "612 Rooftop", bank: "SANTANDER", accountNumber: null },
  { slug: "comisariato", name: "Comisariato", bank: "SANTANDER", accountNumber: null },
];

const bankLabelShort: Record<Bank, string> = {
  SANTANDER: "Santander",
  BANBAJIO: "BanBajío",
  OTRO: "Otro",
};

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Migrar slugs antiguos preservando datos ya importados.
  await prisma.venue.updateMany({ where: { slug: "uno" }, data: { slug: "unobar", name: "UNO Bar" } });
  await prisma.venue.updateMany({ where: { slug: "trooftop" }, data: { slug: "612rooftop", name: "612 Rooftop" } });

  const venues: Record<string, string> = {}; // slug -> id
  for (const cfg of VENUES) {
    const venue = await prisma.venue.upsert({
      where: { slug: cfg.slug },
      update: { name: cfg.name, rfc: cfg.rfc },
      create: { slug: cfg.slug, name: cfg.name, rfc: cfg.rfc },
    });
    venues[cfg.slug] = venue.id;

    // Cuenta bancaria (una por sucursal). Usa findFirst para tolerar número nulo.
    const alias = `${cfg.name} — ${bankLabelShort[cfg.bank]}`;
    const existing = await prisma.bankAccount.findFirst({
      where: { venueId: venue.id, bank: cfg.bank },
    });
    if (existing) {
      await prisma.bankAccount.update({
        where: { id: existing.id },
        data: { alias, accountNumber: cfg.accountNumber ?? existing.accountNumber },
      });
    } else {
      await prisma.bankAccount.create({
        data: { venueId: venue.id, bank: cfg.bank, alias, accountNumber: cfg.accountNumber },
      });
    }
  }

  const allVenueIds = Object.values(venues);

  // ── Cafeterías (Comisariato): cafés-cliente + catálogo de productos ────
  // Datos reales tomados de "Cobranza Agosto 2026.xlsx" de la contadora externa.
  const PRODUCTOS_CAFETERIA: { name: string; price: number }[] = [
    { name: "Sándwich Jamón y Queso", price: 33 },
    { name: "Croissant Jamón y Queso", price: 44 },
    { name: "Burrito Carne", price: 32 },
    { name: "Burrito Marlin", price: 32 },
    { name: "Ensalada Verde con Pollo", price: 118 },
    { name: "Yogurth con Frutos Rojos", price: 77 },
  ];
  const CAFETERIAS = ["SUE", "Aeropuerto 1", "Café 40"];
  const comisariatoId = venues["comisariato"];
  if (comisariatoId) {
    for (let i = 0; i < CAFETERIAS.length; i++) {
      const cafeteria = await prisma.cafeteria.upsert({
        where: { venueId_name: { venueId: comisariatoId, name: CAFETERIAS[i] } },
        update: {},
        create: { venueId: comisariatoId, name: CAFETERIAS[i], sortOrder: i },
      });
      for (let j = 0; j < PRODUCTOS_CAFETERIA.length; j++) {
        const p = PRODUCTOS_CAFETERIA[j];
        await prisma.productoCafeteria.upsert({
          where: { cafeteriaId_name: { cafeteriaId: cafeteria.id, name: p.name } },
          update: {},
          create: { cafeteriaId: cafeteria.id, name: p.name, price: p.price, sortOrder: j },
        });
      }
    }
  }

  // ── Usuarios ────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@grupo612.mx" },
    update: {},
    create: { email: "admin@grupo612.mx", name: "Administrador", role: "ADMIN", passwordHash },
  });

  const contadora = await prisma.user.upsert({
    where: { email: "contabilidad@grupo612.mx" },
    update: { role: "CONTADOR" },
    create: { email: "contabilidad@grupo612.mx", name: "Contabilidad", role: "CONTADOR", passwordHash },
  });

  // Contadora EXTERNA: sólo sube estados de cuenta.
  const externa = await prisma.user.upsert({
    where: { email: "contadora.externa@grupo612.mx" },
    update: { role: "CONTADOR_EXTERNO" },
    create: {
      email: "contadora.externa@grupo612.mx",
      name: "Contadora externa",
      role: "CONTADOR_EXTERNO",
      passwordHash,
    },
  });

  // Persona de Compras: sólo registra egresos/compras.
  const compras = await prisma.user.upsert({
    where: { email: "compras@grupo612.mx" },
    update: { role: "COMPRAS" },
    create: {
      email: "compras@grupo612.mx",
      name: "Compras",
      role: "COMPRAS",
      passwordHash,
    },
  });

  // Acceso a todas las sucursales para contabilidad (interna/externa) y compras.
  for (const userId of [contadora.id, externa.id, compras.id]) {
    for (const venueId of allVenueIds) {
      await prisma.userVenue.upsert({
        where: { userId_venueId: { userId, venueId } },
        update: {},
        create: { userId, venueId },
      });
    }
  }

  console.log("Seed completo ✓");
  console.log("Sucursales:", VENUES.map((v) => v.name).join(", "));
  console.log("Usuarios:");
  console.log(`  ${admin.email} (ADMIN)                contraseña: ${DEFAULT_PASSWORD}`);
  console.log(`  ${contadora.email} (CONTADOR)      contraseña: ${DEFAULT_PASSWORD}`);
  console.log(`  ${externa.email} (CONTADOR_EXTERNO)  contraseña: ${DEFAULT_PASSWORD}`);
  console.log(`  ${compras.email} (COMPRAS)          contraseña: ${DEFAULT_PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
