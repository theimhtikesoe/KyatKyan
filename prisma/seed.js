
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const customers = [
  {
    "id": "0ae2d424-0999-571d-8a07-c88620c8c003",
    "name": "၄+၈၄",
    "routeTag": null,
    "current_balance": 0
  },
  {
    "id": "e8f256aa-0f47-5f44-a320-e6a177b07aac",
    "name": "မိုးမခ စက်",
    "routeTag": null,
    "current_balance": 277500
  },
  {
    "id": "4e47571a-c783-506c-8b69-4079444e4326",
    "name": "ကိုထွန်းတင်",
    "routeTag": null,
    "current_balance": 0
  },
  {
    "id": "c7684c4b-cbde-5026-9d46-c6a8b2558c58",
    "name": "ကိုဇော်မင်း",
    "routeTag": null,
    "current_balance": 0
  },
  {
    "id": "c32f59ac-6151-5b66-abd9-0e74f96f88c7",
    "name": "Diamond Rain",
    "routeTag": null,
    "current_balance": 0
  },
  {
    "id": "b82a3f9a-529a-5fd1-8251-630cd44562a6",
    "name": "မသီတာဝင်း",
    "routeTag": null,
    "current_balance": 0
  },
  {
    "id": "7f82a9b5-51ab-5bac-b163-ad9a556ece6c",
    "name": "ဦးအုန်းကျော်ဇော်",
    "routeTag": null,
    "current_balance": 1125000
  },
  {
    "id": "e9472ca2-d166-5c9f-b2f9-bcbf5a34ec44",
    "name": "Phoe Seng",
    "routeTag": null,
    "current_balance": 0
  },
  {
    "id": "5132c3e0-c5f1-5781-b1e1-6d60454ac3a7",
    "name": "မသီတာနွယ်",
    "routeTag": null,
    "current_balance": 0
  },
  {
    "id": "4f68ef54-8b80-5719-a757-57bc0d05a642",
    "name": "မိုးမျိုးအောင်",
    "routeTag": null,
    "current_balance": 1207500
  },
  {
    "id": "45b363ba-8bfb-5348-8d05-bbd5f19a94c1",
    "name": "မနန္ဒာဝင်း",
    "routeTag": null,
    "current_balance": 525000
  },
  {
    "id": "1ef7874a-8592-5d1a-b262-0e0b8aace6d5",
    "name": "ဦးစိုင်းထွန်းအောင်",
    "routeTag": null,
    "current_balance": 647000
  },
  {
    "id": "3a1f029e-3664-5ddc-a531-67215627c746",
    "name": "အောင်လံစတိုး",
    "routeTag": null,
    "current_balance": 0
  },
  {
    "id": "18e14e5e-8ea8-5ee8-b47e-ab17eb2e2387",
    "name": "မသီတာဇင်",
    "routeTag": null,
    "current_balance": 270000
  },
  {
    "id": "47b05e51-ddcd-5602-9982-5af2f18a5591",
    "name": "မူမူအဖွဲ့",
    "routeTag": null,
    "current_balance": 1376000
  },
  {
    "id": "a3fec0b9-a5a5-5268-b554-a4144d74a71a",
    "name": "ကိုကို",
    "routeTag": null,
    "current_balance": 0
  },
  {
    "id": "1429fa86-a6ed-54a8-a0a5-702c0647e4fc",
    "name": "ဦးစိုင်းဘုန်းမြတ်",
    "routeTag": null,
    "current_balance": 1125000
  },
  {
    "id": "8029f0ae-08aa-530a-8e20-30912d68a16e",
    "name": "Sai Swam Mai",
    "routeTag": null,
    "current_balance": 2930000
  },
  {
    "id": "3b344fb4-85b1-568d-9e31-3b237ceeede3",
    "name": "လွိုင်ခမ်း",
    "routeTag": null,
    "current_balance": 0
  },
  {
    "id": "d1e7299c-d744-5388-82df-22c121d46926",
    "name": "မသီတာနက်",
    "routeTag": null,
    "current_balance": 4200000
  },
  {
    "id": "67d31d20-ea14-5063-8b14-51abd60ed5ec",
    "name": "စတားချိတ်",
    "routeTag": null,
    "current_balance": 0
  },
  {
    "id": "4e111e7b-14f5-5204-ba13-6f5adff0470f",
    "name": "ဟောလိဝုဒ်",
    "routeTag": null,
    "current_balance": 0
  },
  {
    "id": "682caee3-2bc2-5000-b970-4dbf98b483f1",
    "name": "ယွန်းသစ္စာ",
    "routeTag": null,
    "current_balance": 0
  },
  {
    "id": "91e09d13-0d18-5c16-8331-da10e148339d",
    "name": "5 Star",
    "routeTag": "5 star",
    "current_balance": 0
  },
  {
    "id": "39146693-a2ef-5661-9b1e-fc1ae22aac6e",
    "name": "ကိုထွန်းလင်းဦး",
    "routeTag": null,
    "current_balance": 0
  },
  {
    "id": "28070cd2-9c1a-558a-af6b-a92508ef7950",
    "name": "လှိုင်ထက်ဇော်",
    "routeTag": null,
    "current_balance": 0
  },
  {
    "id": "0d447ab7-9763-58ed-8b90-9186ffd7a5b6",
    "name": "ပုဂံသား",
    "routeTag": null,
    "current_balance": 394000
  },
  {
    "id": "7a75beb0-cb65-5e6c-a030-3ee9fcdd285f",
    "name": "ကံကော် + မီတာ",
    "routeTag": "ကံကော်",
    "current_balance": 110000
  }
];
  const ledgers = [
  {
    "customerId": "0ae2d424-0999-571d-8a07-c88620c8c003",
    "amount": 117000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-17T00:00:00Z",
    "note": "18/5 Paid"
  },
  {
    "customerId": "0ae2d424-0999-571d-8a07-c88620c8c003",
    "amount": 117000,
    "type": "DEBIT",
    "saleType": "RETAIL",
    "date": "2026-05-17T00:00:00Z",
    "note": "18/5 Paid"
  },
  {
    "customerId": "e8f256aa-0f47-5f44-a320-e6a177b07aac",
    "amount": 537000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-17T00:00:00Z",
    "note": "18/5 Paid"
  },
  {
    "customerId": "e8f256aa-0f47-5f44-a320-e6a177b07aac",
    "amount": 537000,
    "type": "DEBIT",
    "saleType": "RETAIL",
    "date": "2026-05-17T00:00:00Z",
    "note": "18/5 Paid"
  },
  {
    "customerId": "4e47571a-c783-506c-8b69-4079444e4326",
    "amount": 309000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-17T00:00:00Z",
    "note": "17/5 Paid"
  },
  {
    "customerId": "4e47571a-c783-506c-8b69-4079444e4326",
    "amount": 309000,
    "type": "DEBIT",
    "saleType": "RETAIL",
    "date": "2026-05-17T00:00:00Z",
    "note": "17/5 Paid"
  },
  {
    "customerId": "c7684c4b-cbde-5026-9d46-c6a8b2558c58",
    "amount": 660000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-17T00:00:00Z",
    "note": "18/5 Paid"
  },
  {
    "customerId": "c7684c4b-cbde-5026-9d46-c6a8b2558c58",
    "amount": 660000,
    "type": "DEBIT",
    "saleType": "RETAIL",
    "date": "2026-05-17T00:00:00Z",
    "note": "18/5 Paid"
  },
  {
    "customerId": "c32f59ac-6151-5b66-abd9-0e74f96f88c7",
    "amount": 308000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-17T00:00:00Z",
    "note": "Paid"
  },
  {
    "customerId": "c32f59ac-6151-5b66-abd9-0e74f96f88c7",
    "amount": 308000,
    "type": "DEBIT",
    "saleType": "RETAIL",
    "date": "2026-05-17T00:00:00Z",
    "note": "Paid"
  },
  {
    "customerId": "b82a3f9a-529a-5fd1-8251-630cd44562a6",
    "amount": 175000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-17T00:00:00Z",
    "note": "19/5 Paid"
  },
  {
    "customerId": "b82a3f9a-529a-5fd1-8251-630cd44562a6",
    "amount": 175000,
    "type": "DEBIT",
    "saleType": "RETAIL",
    "date": "2026-05-17T00:00:00Z",
    "note": "19/5 Paid"
  },
  {
    "customerId": "7f82a9b5-51ab-5bac-b163-ad9a556ece6c",
    "amount": 1125000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-17T00:00:00Z",
    "note": "Partial deduction entry (189,000) written on book"
  },
  {
    "customerId": "e9472ca2-d166-5c9f-b2f9-bcbf5a34ec44",
    "amount": 4200000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-17T00:00:00Z",
    "note": "20/5 Paid"
  },
  {
    "customerId": "e9472ca2-d166-5c9f-b2f9-bcbf5a34ec44",
    "amount": 4200000,
    "type": "DEBIT",
    "saleType": "RETAIL",
    "date": "2026-05-17T00:00:00Z",
    "note": "20/5 Paid"
  },
  {
    "customerId": "0ae2d424-0999-571d-8a07-c88620c8c003",
    "amount": 1475000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-17T00:00:00Z",
    "note": "18/5 Paid"
  },
  {
    "customerId": "0ae2d424-0999-571d-8a07-c88620c8c003",
    "amount": 1475000,
    "type": "DEBIT",
    "saleType": "RETAIL",
    "date": "2026-05-17T00:00:00Z",
    "note": "18/5 Paid"
  },
  {
    "customerId": "4f68ef54-8b80-5719-a757-57bc0d05a642",
    "amount": 1207500,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-18T00:00:00Z",
    "note": ""
  },
  {
    "customerId": "45b363ba-8bfb-5348-8d05-bbd5f19a94c1",
    "amount": 525000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-18T00:00:00Z",
    "note": ""
  },
  {
    "customerId": "1ef7874a-8592-5d1a-b262-0e0b8aace6d5",
    "amount": 647000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-18T00:00:00Z",
    "note": ""
  },
  {
    "customerId": "3a1f029e-3664-5ddc-a531-67215627c746",
    "amount": 347000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-18T00:00:00Z",
    "note": "18/5 Paid"
  },
  {
    "customerId": "3a1f029e-3664-5ddc-a531-67215627c746",
    "amount": 347000,
    "type": "DEBIT",
    "saleType": "RETAIL",
    "date": "2026-05-18T00:00:00Z",
    "note": "18/5 Paid"
  },
  {
    "customerId": "18e14e5e-8ea8-5ee8-b47e-ab17eb2e2387",
    "amount": 270000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-18T00:00:00Z",
    "note": ""
  },
  {
    "customerId": "47b05e51-ddcd-5602-9982-5af2f18a5591",
    "amount": 1376000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-18T00:00:00Z",
    "note": ""
  },
  {
    "customerId": "a3fec0b9-a5a5-5268-b554-a4144d74a71a",
    "amount": 399200,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-18T00:00:00Z",
    "note": "18/5 Paid"
  },
  {
    "customerId": "a3fec0b9-a5a5-5268-b554-a4144d74a71a",
    "amount": 399200,
    "type": "DEBIT",
    "saleType": "RETAIL",
    "date": "2026-05-18T00:00:00Z",
    "note": "18/5 Paid"
  },
  {
    "customerId": "1429fa86-a6ed-54a8-a0a5-702c0647e4fc",
    "amount": 1125000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-18T00:00:00Z",
    "note": ""
  },
  {
    "customerId": "8029f0ae-08aa-530a-8e20-30912d68a16e",
    "amount": 2930000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-19T00:00:00Z",
    "note": "Corrected from 377,000 on book"
  },
  {
    "customerId": "3b344fb4-85b1-568d-9e31-3b237ceeede3",
    "amount": 1005000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-19T00:00:00Z",
    "note": "20/5 Paid"
  },
  {
    "customerId": "3b344fb4-85b1-568d-9e31-3b237ceeede3",
    "amount": 1005000,
    "type": "DEBIT",
    "saleType": "RETAIL",
    "date": "2026-05-19T00:00:00Z",
    "note": "20/5 Paid"
  },
  {
    "customerId": "d1e7299c-d744-5388-82df-22c121d46926",
    "amount": 4200000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-19T00:00:00Z",
    "note": "Linked value (1,950,750) recorded below"
  },
  {
    "customerId": "67d31d20-ea14-5063-8b14-51abd60ed5ec",
    "amount": 420000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-19T00:00:00Z",
    "note": "20/5 Paid"
  },
  {
    "customerId": "67d31d20-ea14-5063-8b14-51abd60ed5ec",
    "amount": 420000,
    "type": "DEBIT",
    "saleType": "RETAIL",
    "date": "2026-05-19T00:00:00Z",
    "note": "20/5 Paid"
  },
  {
    "customerId": "4e111e7b-14f5-5204-ba13-6f5adff0470f",
    "amount": 361500,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-19T00:00:00Z",
    "note": "19/5 Paid"
  },
  {
    "customerId": "4e111e7b-14f5-5204-ba13-6f5adff0470f",
    "amount": 361500,
    "type": "DEBIT",
    "saleType": "RETAIL",
    "date": "2026-05-19T00:00:00Z",
    "note": "19/5 Paid"
  },
  {
    "customerId": "682caee3-2bc2-5000-b970-4dbf98b483f1",
    "amount": 361500,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-19T00:00:00Z",
    "note": "19/5 Paid"
  },
  {
    "customerId": "682caee3-2bc2-5000-b970-4dbf98b483f1",
    "amount": 361500,
    "type": "DEBIT",
    "saleType": "RETAIL",
    "date": "2026-05-19T00:00:00Z",
    "note": "19/5 Paid"
  },
  {
    "customerId": "91e09d13-0d18-5c16-8331-da10e148339d",
    "amount": 1050000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-19T00:00:00Z",
    "note": "20/5 Paid"
  },
  {
    "customerId": "91e09d13-0d18-5c16-8331-da10e148339d",
    "amount": 1050000,
    "type": "DEBIT",
    "saleType": "RETAIL",
    "date": "2026-05-19T00:00:00Z",
    "note": "20/5 Paid"
  },
  {
    "customerId": "39146693-a2ef-5661-9b1e-fc1ae22aac6e",
    "amount": 203000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-20T00:00:00Z",
    "note": "20/5 Paid"
  },
  {
    "customerId": "39146693-a2ef-5661-9b1e-fc1ae22aac6e",
    "amount": 203000,
    "type": "DEBIT",
    "saleType": "RETAIL",
    "date": "2026-05-20T00:00:00Z",
    "note": "20/5 Paid"
  },
  {
    "customerId": "28070cd2-9c1a-558a-af6b-a92508ef7950",
    "amount": 430000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-20T00:00:00Z",
    "note": "Paid"
  },
  {
    "customerId": "28070cd2-9c1a-558a-af6b-a92508ef7950",
    "amount": 430000,
    "type": "DEBIT",
    "saleType": "RETAIL",
    "date": "2026-05-20T00:00:00Z",
    "note": "Paid"
  },
  {
    "customerId": "e8f256aa-0f47-5f44-a320-e6a177b07aac",
    "amount": 277500,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-20T00:00:00Z",
    "note": "Entry line 2"
  },
  {
    "customerId": "0d447ab7-9763-58ed-8b90-9186ffd7a5b6",
    "amount": 394000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-20T00:00:00Z",
    "note": "Book value (13,69,800) crossed out"
  },
  {
    "customerId": "7a75beb0-cb65-5e6c-a030-3ee9fcdd285f",
    "amount": 110000,
    "type": "CREDIT",
    "saleType": "RETAIL",
    "date": "2026-05-20T00:00:00Z",
    "note": ""
  }
];

  console.log("Seeding customers...");
  for (const c of customers) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        routeTag: c.routeTag,
        current_balance: c.current_balance,
      },
      create: c,
    });
  }

  console.log("Seeding ledger entries...");
  // Clear existing ledgers to avoid duplicates on re-seed if desired, 
  // but usually we just append or use a clean slate.
  // await prisma.ledger.deleteMany({}); 

  for (const l of ledgers) {
    await prisma.ledger.create({
      data: l
    });
  }
  
  console.log("Seeding complete! 🚀");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
