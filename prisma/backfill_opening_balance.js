const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting backfill of opening balance ledger entries...');
  
  const customers = await prisma.customer.findMany({
    include: {
      ledgers: {
        where: {
          note: {
            contains: 'အစ လက်ကျန် အကြွေး'
          }
        }
      }
    }
  });

  console.log(`Found ${customers.length} customers.`);
  
  let backfilledCount = 0;
  
  for (const customer of customers) {
    // If customer has a balance but no opening balance ledger entry
    if (customer.current_balance !== 0 && customer.ledgers.length === 0) {
      console.log(`Backfilling for customer: ${customer.name} (Balance: ${customer.current_balance})`);
      
      await prisma.ledger.create({
        data: {
          customerId: customer.id,
          type: customer.current_balance > 0 ? "CREDIT" : "DEBIT",
          saleType: "RETAIL",
          amount: Math.abs(customer.current_balance),
          note: "အစ လက်ကျန် အကြွေး (Opening Balance - Backfilled)",
          date: customer.createdAt || new Date(),
        }
      });
      
      backfilledCount++;
    }
  }
  
  console.log(`Backfill completed. Created ${backfilledCount} ledger entries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
