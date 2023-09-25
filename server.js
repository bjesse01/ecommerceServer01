const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const serviceAccount = require("./ecommerceapi-25299.json");
const bodyParser = require("body-parser");
const db = require("./src/database");
require("dotenv").config();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();

app.use(express.json());
app.use(bodyParser.json());
app.use(cors());

//DATABASE CONNECTION
db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL: ", err);
    return;
  }
  console.log("Connected to database");
});

//GENERATE TIME AND DATA
function generateDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  const formattedDate = `${day}-${month}-${year}`;
  const formattedTime = `${hours}:${minutes}:${seconds}`;
  return { date: formattedDate, time: formattedTime };
}

//FOR EMAIL
app.post("/sendEmail", (req, res) => {
  const { date, time } = generateDateTime();
  const { email, message } = req.body;

  const sqlQuery =
    "INSERT INTO reviews (date, time, email, message) VALUES (?, ?, ?, ?)";
  const values = [date, time, email, message];

  db.query(sqlQuery, values, (err) => {
    if (err) {
      res.status(500).json({ error: "Failed to save data" });
    } else {
      res.status(200).json({ message: "Data saved successfully" });
    }
  });
});

app.get("/mailData", (req, res) => {
  const sqlQuery = "SELECT * FROM reviews";
  db.query(sqlQuery, (err, results) => {
    if (err) {
      console.error("Error executing sql query: ", err);
      res.status(500).json({ error: "Failed to retrieve data" });
    } else {
      res.status(200).json(results);
    }
  });
});

// FOR EXPRESS
app.get("/api/clothings", async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection("cloth").get();
    const docs = [];
    snapshot.forEach((doc) => {
      const docData = doc.data();
      docs.push({ id: doc.id, ...docData });
    });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/clothings/:category", (req, res) => {
  const category = req.params.category;

  const clothingRef = admin.firestore().collection("cloth");
  const query = clothingRef.where("category", "==", category);

  query
    .get()
    .then((snapshot) => {
      const products = snapshot.docs.map((doc) => doc.data());
      res.json(products);
    })
    .catch((error) => {
      console.error("error fetching data: ", error);
      res.status(500).send("Error fetching data");
    });
});

app.get("/api/clothings/search", (req, res) => {
  const searchTerm = req.query.search;
  const clothingRef = admin.firestore().collection("cloth");
  const query = clothingRef.where("name", "==", searchTerm);

  query
    .get()
    .then((snapshot) => {
      const clothes = snapshot.docs.map((doc) => doc.data());
      res.json(clothes);
    })
    .catch((error) => {
      console.error("Error fetching data: ", error);
      res.status(500).send("Error fetching data.");
    });
});

app.get("/api/clothings/id/:id", async (req, res) => {
  const clothingId = req.params.id;

  try {
    const clothingRef = admin.firestore().collection("cloth").doc(clothingId);
    const doc = await clothingRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Product not found." });
    }

    const products = doc.data();
    return res.json(products);
  } catch (error) {
    console.error("Error getting item: ", error);
    res.status(500).send("Server error");
  }
});

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server on ${port}`);
});
