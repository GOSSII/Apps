import { PrismaClient, Prisma } from "@prisma/client";

// Models whose mutations are recorded in AuditLog. AuditLog itself is
// excluded, or every log write would log itself.
const AUDITED_MODELS = new Set([
  "User",
  "Vendor",
  "Product",
  "PurchaseLot",
  "StockMovement",
  "SellingPrice",
]);

const MUTATIONS = new Set([
  "create",
  "update",
  "upsert",
  "delete",
  "createMany",
  "updateMany",
  "deleteMany",
]);

// The actor for the current request. Set by the auth middleware per request;
// null means a system action (migration, seed, cron).
let currentActorId: string | null = null;
export function setActor(id: string | null) {
  currentActorId = id;
}

function makeClient() {
  const base = new PrismaClient();

  // Every mutation on an audited model writes an AuditLog row — one hook here
  // instead of a call at every site, so the log cannot have holes in it.
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !AUDITED_MODELS.has(model) || !MUTATIONS.has(operation)) {
            return query(args);
          }
          const result = await query(args);
          await base.auditLog.create({
            data: {
              actorId: currentActorId,
              action: operation.toUpperCase(),
              entity: model,
              entityId:
                typeof result === "object" && result !== null && "id" in result
                  ? String((result as { id: unknown }).id)
                  : null,
              after: result as unknown as Prisma.InputJsonValue,
            },
          });
          return result;
        },
      },
    },
  });
}

// Next.js hot-reload spawns many module instances in dev; keep one client.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof makeClient>;
};

export const db = globalForPrisma.prisma ?? makeClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
