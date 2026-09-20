require("dotenv").config();

const mongoose = require("mongoose");
const User = require("./models/User");
const Category = require("./models/Category");
const CollectionCentre = require("./models/CollectionCentre");

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  await User.deleteMany({});
  await Category.deleteMany({});
  await CollectionCentre.deleteMany({});

  await User.create([
    {
      name: "System Admin",
      email: "admin@ewaste.com",
      password: "Admin@123",
      role: "admin"
    },
    {
      name: "Collection Agent",
      email: "agent@ewaste.com",
      password: "Agent@123",
      role: "agent"
    }
  ]);

  await Category.insertMany([
    { name: "Mobiles", rewardPointsPerKg: 50 },
    { name: "Batteries", rewardPointsPerKg: 30 },
    { name: "Appliances", rewardPointsPerKg: 20 },
    { name: "Cables", rewardPointsPerKg: 40 }
  ]);

  await CollectionCentre.insertMany([
    {
      name: "Green Recycling Hub",
      area: "Ghaziabad",
      address: "Industrial Area, Ghaziabad, Uttar Pradesh",
      contact: "9876543210"
    },
    {
      name: "Eco Recycle Centre",
      area: "Noida",
      address: "Sector 62, Noida, Uttar Pradesh",
      contact: "9876501234"
    }
  ]);

  console.log("Seed completed.");
  console.log("Admin: admin@ewaste.com / Admin@123");
  console.log("Agent: agent@ewaste.com / Agent@123");

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});