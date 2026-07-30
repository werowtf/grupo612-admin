import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { signSession } from "@/lib/session";
async function main(){
  const u=await prisma.user.findUniqueOrThrow({where:{email:"admin@grupo612.mx"}});
  const uno=await prisma.venue.findUniqueOrThrow({where:{slug:"uno"}});
  const token=await signSession({sub:u.id,email:u.email,name:u.name,role:u.role});
  // Deposito real de Uno en junio para apuntar
  const dep=await prisma.bankTransaction.findFirst({where:{category:"DEPOSITO",direction:"ABONO",bankAccount:{venueId:uno.id}},orderBy:{date:"asc"}});
  const card=dep?Number(dep.amount.toString()):13618.5;
  const folio="TEST-JUN-UNO";
  let c=await prisma.corte.findFirst({where:{venueId:uno.id,folioCorteZ:folio}});
  if(!c) c=await prisma.corte.create({data:{venueId:uno.id,date:new Date("2026-06-01T12:00:00"),folioCorteZ:folio,source:"MANUAL",pagoVisa:card,totalFormasPago:card,totalVenta:card}});
  console.log("Deposito objetivo:", dep?.description, "monto", card, "fecha", dep?.date.toISOString().slice(0,10));
  console.log("TOKEN="+token);
  console.log("CORTEID="+c.id);
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
