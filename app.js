require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const methodOverride = require("method-override");
const path = require("path");

const User = require("./models/User");
const Category = require("./models/Category");
const PickupRequest = require("./models/PickupRequest");
const CollectionCentre = require("./models/CollectionCentre");
const RewardTransaction = require("./models/RewardTransaction");
const RewardRedemption = require("./models/RewardRedemption");

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------- DATABASE ---------- */

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB connection error:", err.message));

/* ---------- APP CONFIG ---------- */

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: process.env.SESSION_SECRET || "development_secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 4
  }
}));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

/* ---------- AUTH MIDDLEWARE ---------- */

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    if (!roles.includes(req.session.user.role)) {
      return res.status(403).send("Access denied");
    }

    next();
  };
}

function safeDate(value) {
  const d = new Date(value);

  return Number.isNaN(d.getTime()) ? null : d;
}

/* ---------- HOME ---------- */

app.get("/", (req, res) => {
  res.render("index");
});

/* =========================================================
   AUTH
========================================================= */

app.get("/register", (req, res) => {
  res.render("auth/register", {
    error: null
  });
});

app.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      address
    } = req.body;

    if (!name || !email || !password) {
      return res.render("auth/register", {
        error: "Name, email and password are required."
      });
    }

    const existing = await User.findOne({
      email: email.toLowerCase().trim()
    });

    if (existing) {
      return res.render("auth/register", {
        error: "Email is already registered."
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      address: address || "",
      role: "citizen"
    });

    req.session.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    };

    res.redirect("/citizen/dashboard");

  } catch (err) {
    console.log(err);

    res.render("auth/register", {
      error: "Registration failed."
    });
  }
});

app.get("/login", (req, res) => {
  res.render("auth/login", {
    error: null
  });
});

app.post("/login", async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body;

    const user = await User.findOne({
      email: (email || "").toLowerCase().trim()
    });

    if (!user || !(await user.comparePassword(password || ""))) {
      return res.render("auth/login", {
        error: "Invalid email or password."
      });
    }

    req.session.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    };

    if (user.role === "admin") {
      return res.redirect("/admin/dashboard");
    }

    if (user.role === "agent") {
      return res.redirect("/agent/dashboard");
    }

    return res.redirect("/citizen/dashboard");

  } catch (err) {
    console.log(err);

    res.render("auth/login", {
      error: "Login failed."
    });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

/* =========================================================
   CITIZEN
========================================================= */

/* ---------- Citizen Dashboard ---------- */

app.get("/citizen/dashboard", requireRole("citizen"), async (req, res) => {

  const requests = await PickupRequest.find({
    citizen: req.session.user.id
  })
    .populate("category")
    .populate("assignedAgent", "name email")
    .sort({ createdAt: -1 });

  const credits = await RewardTransaction.aggregate([
    {
      $match: {
        citizen: new mongoose.Types.ObjectId(req.session.user.id)
      }
    },
    {
      $group: {
        _id: null,
        total: {
          $sum: "$points"
        }
      }
    }
  ]);

  const redemptions = await RewardRedemption.aggregate([
    {
      $match: {
        citizen: new mongoose.Types.ObjectId(req.session.user.id)
      }
    },
    {
      $group: {
        _id: null,
        total: {
          $sum: "$points"
        }
      }
    }
  ]);

  const totalCredits = credits[0]?.total || 0;
  const totalRedeemed = redemptions[0]?.total || 0;

  const walletPoints = totalCredits - totalRedeemed;

  res.render("citizen/dashboard", {
    requests,
    walletPoints
  });
});

/* ---------- New Pickup ---------- */

app.get("/citizen/pickups/new", requireRole("citizen"), async (req, res) => {

  const categories = await Category.find().sort({
    name: 1
  });

  res.render("citizen/new-pickup", {
    categories,
    error: null
  });
});

/* ---------- Create Pickup ---------- */

app.post("/citizen/pickups", requireRole("citizen"), async (req, res) => {

  try {

    const {
      category,
      quantity,
      approximateWeight,
      area,
      address,
      preferredDate
    } = req.body;

    const categories = await Category.find().sort({
      name: 1
    });

    if (
      !category ||
      !quantity ||
      !approximateWeight ||
      !area ||
      !address ||
      !preferredDate
    ) {
      return res.render("citizen/new-pickup", {
        categories,
        error: "All pickup fields are required."
      });
    }

    const date = safeDate(preferredDate);

    if (!date) {
      return res.render("citizen/new-pickup", {
        categories,
        error: "Please enter a valid preferred date."
      });
    }

    await PickupRequest.create({
      citizen: req.session.user.id,
      category,
      quantity: Number(quantity),
      approximateWeight: Number(approximateWeight),
      area: area.trim(),
      address: address.trim(),
      preferredDate: date,
      status: "Requested"
    });

    res.redirect("/citizen/dashboard");

  } catch (err) {

    console.log(err);

    res.status(500).send(
      "Could not create pickup request."
    );
  }
});

/* =========================================================
   REWARD WALLET
========================================================= */

/* ---------- Wallet Helper ---------- */

async function getWalletData(citizenId) {

  const transactions = await RewardTransaction.find({
    citizen: citizenId
  })
    .populate("pickupRequest")
    .sort({ createdAt: -1 });

  const redemptions = await RewardRedemption.find({
    citizen: citizenId
  })
    .sort({ createdAt: -1 });

  const totalCredits = transactions.reduce(
    (sum, transaction) => sum + transaction.points,
    0
  );

  const totalRedeemed = redemptions.reduce(
    (sum, redemption) => sum + redemption.points,
    0
  );

  const points = totalCredits - totalRedeemed;

  const history = [
    ...transactions.map(transaction => ({
      createdAt: transaction.createdAt,
      type: "Credit",
      points: transaction.points,
      description: transaction.description
    })),

    ...redemptions.map(redemption => ({
      createdAt: redemption.createdAt,
      type: "Redeemed",
      points: -redemption.points,
      description: redemption.rewardName
    }))
  ].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return {
    points,
    history
  };
}

/* ---------- Wallet Page ---------- */

app.get("/citizen/wallet", requireRole("citizen"), async (req, res) => {

  const wallet = await getWalletData(
    req.session.user.id
  );

  res.render("citizen/wallet", {
    points: wallet.points,
    history: wallet.history,
    error: null
  });
});

/* ---------- Redeem Reward ---------- */

app.post("/citizen/wallet/redeem", requireRole("citizen"), async (req, res) => {

  try {

    const {
      reward
    } = req.body;

    const rewards = {
      voucher: {
        name: "Eco Recycling Voucher",
        points: 50
      },

      kit: {
        name: "Eco Recycling Kit",
        points: 100
      }
    };

    const selectedReward = rewards[reward];

    if (!selectedReward) {

      const wallet = await getWalletData(
        req.session.user.id
      );

      return res.render("citizen/wallet", {
        points: wallet.points,
        history: wallet.history,
        error: "Invalid reward selected."
      });
    }

    const wallet = await getWalletData(
      req.session.user.id
    );

    if (wallet.points < selectedReward.points) {

      return res.render("citizen/wallet", {
        points: wallet.points,
        history: wallet.history,
        error:
          `You need ${selectedReward.points} points to redeem this reward.`
      });
    }

    await RewardRedemption.create({
      citizen: req.session.user.id,
      rewardName: selectedReward.name,
      points: selectedReward.points
    });

    res.redirect("/citizen/wallet");

  } catch (err) {

    console.log(err);

    res.status(500).send(
      "Could not redeem reward."
    );
  }
});

/* =========================================================
   AGENT
========================================================= */

app.get("/agent/dashboard", requireRole("agent"), async (req, res) => {

  const pickups = await PickupRequest.find({
    assignedAgent: req.session.user.id
  })
    .populate("citizen", "name email phone")
    .populate("category")
    .sort({ preferredDate: 1 });

  res.render("agent/dashboard", {
    pickups
  });
});

/* ---------- Agent Status Update ---------- */

app.post(
  "/agent/pickups/:id/status",
  requireRole("agent"),
  async (req, res) => {

    const {
      status
    } = req.body;

    const allowed = [
      "Scheduled",
      "Collected",
      "Recycled"
    ];

    if (!allowed.includes(status)) {
      return res.status(400).send(
        "Invalid status."
      );
    }

    const pickup = await PickupRequest.findOne({
      _id: req.params.id,
      assignedAgent: req.session.user.id
    }).populate("category");

    if (!pickup) {
      return res.status(404).send(
        "Pickup not found."
      );
    }

    const validNext = {
      Scheduled: ["Collected"],
      Collected: ["Recycled"],
      Recycled: []
    };

    if (!validNext[pickup.status]?.includes(status)) {

      return res.status(400).send(
        `Invalid status transition from ${pickup.status}.`
      );
    }

    pickup.status = status;

    await pickup.save();

    /* Reward points when recycled */

    if (status === "Recycled") {

      const alreadyRewarded =
        await RewardTransaction.findOne({
          pickupRequest: pickup._id
        });

      if (!alreadyRewarded) {

        const points = Math.round(
          pickup.approximateWeight *
          pickup.category.rewardPointsPerKg
        );

        await RewardTransaction.create({
          citizen: pickup.citizen,
          pickupRequest: pickup._id,
          points,
          type: "credit",
          description:
            `${pickup.category.name} recycling reward`
        });
      }
    }

    res.redirect("/agent/dashboard");
  }
);

/* =========================================================
   ADMIN DASHBOARD
========================================================= */

app.get("/admin/dashboard", requireRole("admin"), async (req, res) => {

  const totalRequests =
    await PickupRequest.countDocuments();

  const totalCollected =
    await PickupRequest.aggregate([
      {
        $match: {
          status: "Recycled"
        }
      },
      {
        $group: {
          _id: null,
          weight: {
            $sum: "$approximateWeight"
          }
        }
      }
    ]);

  /* ---------- Category Breakdown ---------- */

  const categoryBreakdown =
    await PickupRequest.aggregate([
      {
        $match: {
          status: "Recycled"
        }
      },

      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category"
        }
      },

      {
        $unwind: "$category"
      },

      {
        $group: {
          _id: "$category.name",
          weight: {
            $sum: "$approximateWeight"
          },
          requests: {
            $sum: 1
          }
        }
      },

      {
        $sort: {
          weight: -1
        }
      }
    ]);

  /* ---------- Area Breakdown ---------- */

  const areaBreakdown =
    await PickupRequest.aggregate([
      {
        $match: {
          status: "Recycled"
        }
      },

      {
        $group: {
          _id: "$area",
          weight: {
            $sum: "$approximateWeight"
          },
          requests: {
            $sum: 1
          }
        }
      },

      {
        $sort: {
          weight: -1
        }
      }
    ]);

  /* ---------- Pending Requests ---------- */

  const pending =
    await PickupRequest.find({
      status: "Requested"
    })
      .populate("citizen", "name email")
      .populate("category")
      .sort({ createdAt: -1 });

  /* ---------- Scheduled Requests ---------- */

  const scheduled =
    await PickupRequest.find({
      status: "Scheduled",
      assignedAgent: null
    })
      .populate("citizen", "name email")
      .populate("category")
      .sort({ preferredDate: 1 });

  const agents =
    await User.find({
      role: "agent"
    }).sort({
      name: 1
    });

  res.render("admin/dashboard", {

    totalRequests,

    totalWeight:
      totalCollected[0]?.weight || 0,

    categoryBreakdown,

    areaBreakdown,

    pending,

    scheduled,

    agents
  });
});

/* =========================================================
   ADMIN APPROVE + ASSIGN
========================================================= */

/* ---------- Approve ---------- */

app.post(
  "/admin/pickups/:id/approve",
  requireRole("admin"),
  async (req, res) => {

    const pickup =
      await PickupRequest.findById(
        req.params.id
      );

    if (!pickup) {
      return res.status(404).send(
        "Pickup not found."
      );
    }

    if (pickup.status !== "Requested") {

      return res.status(400).send(
        "Only Requested pickups can be approved."
      );
    }

    pickup.status = "Scheduled";

    await pickup.save();

    res.redirect("/admin/dashboard");
  }
);

/* ---------- Assign Agent ---------- */

app.post(
  "/admin/pickups/:id/assign",
  requireRole("admin"),
  async (req, res) => {

    const {
      agentId
    } = req.body;

    const agent =
      await User.findOne({
        _id: agentId,
        role: "agent"
      });

    if (!agent) {

      return res.status(400).send(
        "Invalid collection agent."
      );
    }

    const pickup =
      await PickupRequest.findById(
        req.params.id
      );

    if (!pickup) {

      return res.status(404).send(
        "Pickup not found."
      );
    }

    if (pickup.status !== "Scheduled") {

      return res.status(400).send(
        "Pickup must be Scheduled before assigning an agent."
      );
    }

    pickup.assignedAgent = agent._id;

    await pickup.save();

    res.redirect("/admin/dashboard");
  }
);

/* =========================================================
   ADMIN COLLECTION CENTRES
========================================================= */

app.get(
  "/admin/centres",
  requireRole("admin"),
  async (req, res) => {

    const centres =
      await CollectionCentre.find()
        .sort({ createdAt: -1 });

    res.render("admin/centres", {
      centres
    });
  }
);

app.post(
  "/admin/centres",
  requireRole("admin"),
  async (req, res) => {

    const {
      name,
      area,
      address,
      contact
    } = req.body;

    if (!name || !area || !address) {

      return res.status(400).send(
        "Name, area and address are required."
      );
    }

    await CollectionCentre.create({
      name,
      area,
      address,
      contact
    });

    res.redirect("/admin/centres");
  }
);

app.post(
  "/admin/centres/:id/delete",
  requireRole("admin"),
  async (req, res) => {

    await CollectionCentre.findByIdAndDelete(
      req.params.id
    );

    res.redirect("/admin/centres");
  }
);

/* =========================================================
   ADMIN CATEGORIES
========================================================= */

app.get(
  "/admin/categories",
  requireRole("admin"),
  async (req, res) => {

    const categories =
      await Category.find()
        .sort({ name: 1 });

    res.render("admin/categories", {
      categories
    });
  }
);

app.post(
  "/admin/categories",
  requireRole("admin"),
  async (req, res) => {

    const {
      name,
      rewardPointsPerKg
    } = req.body;

    if (!name || rewardPointsPerKg === "") {

      return res.status(400).send(
        "Category name and reward points are required."
      );
    }

    await Category.create({
      name: name.trim(),
      rewardPointsPerKg:
        Number(rewardPointsPerKg)
    });

    res.redirect("/admin/categories");
  }
);

app.post(
  "/admin/categories/:id/delete",
  requireRole("admin"),
  async (req, res) => {

    await Category.findByIdAndDelete(
      req.params.id
    );

    res.redirect("/admin/categories");
  }
);

/* =========================================================
   404 + ERROR
========================================================= */

app.use((req, res) => {
  res.status(404).render("404");
});

app.use((err, req, res, next) => {

  console.log(err);

  res.status(500).send(
    "Something went wrong."
  );
});

/* ---------- START SERVER ---------- */

app.listen(PORT, () => {

  console.log(
    `Server running at http://localhost:${PORT}`
  );

});