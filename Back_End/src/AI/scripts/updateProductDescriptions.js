
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../../config/db.js";
import Product from "../../models/Product.js";

const descriptions = [
  {
    id: "6ada8fc7271c0612de99c748",
    description:
      "Classic Adidas Superstar sneakers, bringing an iconic streetwear silhouette to everyday footwear.",
  },
  {
    id: "6ada8fc7271c0612de99c74b",
    description:
      "Adilette Aqua slip-on slides, a casual footwear option for everyday use.",
  },
  {
    id: "6ada8fc7271c0612de99c74d",
    description:
      "A classic Adidas Adicolor T-shirt, designed for casual everyday outfits.",
  },
  {
    id: "6ada8fc7271c0612de99c751",
    description:
      "An Adidas Originals pullover hoodie featuring the recognizable Trefoil collection identity.",
  },
  {
    id: "6ada8fc7271c0612de99c752",
    description:
      "A casual crewneck sweatshirt from the Adidas Adicolor collection.",
  },
  {
    id: "6ada8fc7271c0612de99c756",
    description:
      "Casual cargo-style trousers from the Adidas Essentials collection.",
  },
  {
    id: "6ada8fc7271c0612de99c75a",
    description:
      "An everyday Adidas backpack featuring the recognizable three-stripe design.",
  },
  {
    id: "6ada8fc7271c0612de99c761",
    description:
      "A men's polo shirt from the Adidas Essentials collection.",
  },
  {
    id: "6aea301eafd92277f8c7cbe5",
    description:
      "A classic polo shirt with a collared design for casual everyday outfits.",
  },
  {
    id: "6ada8fc7271c0612de99c747",
    description:
      "Adidas Gazelle Indoor sneakers, part of the iconic Originals footwear collection.",
  },
  {
    id: "6ada8fc7271c0612de99c749",
    description:
      "Adizero SL2 running shoes from Adidas' performance running collection.",
  },
  {
    id: "6ada8fc7271c0612de99c74a",
    description:
      "Adilette Comfort slides, casual slip-on footwear for everyday wear.",
  },
  {
    id: "6ada8fc7271c0612de99c74c",
    description:
      "An Adidas Essentials tracksuit, combining coordinated sportswear styling with everyday versatility.",
  },
  {
    id: "6ada8fc7271c0612de99c753",
    description:
      "An Adidas Essentials windbreaker jacket, designed for casual and outdoor-inspired outfits.",
  },
  {
    id: "6ada8fc7271c0612de99c758",
    description:
      "Casual shorts from the Adidas Adicolor Essentials collection.",
  },
  {
    id: "6ada8fc7271c0612de99c759",
    description:
      "A three-pack of cushioned Adidas sports socks for everyday and athletic wear.",
  },
  {
    id: "6ada8fc7271c0612de99c75b",
    description:
      "An Adidas duffel bag for carrying everyday belongings and sports equipment.",
  },
  {
    id: "6ada8fc7271c0612de99c75e",
    description:
      "Anthony Edwards 1 signature basketball shoes from Adidas Basketball.",
  },
  {
    id: "6ada8fc7271c0612de99c762",
    description:
      "Women's Adidas training leggings designed for workout and activewear outfits.",
  },
  {
    id: "6ada8fc7271c0612de99c745",
    description:
      "Adidas Ultraboost 5X running shoes from the iconic Ultraboost footwear collection.",
  },
  {
    id: "6ada8fc7271c0612de99c754",
    description:
      "A classic Adidas track jacket featuring the brand's signature sporty style.",
  },
  {
    id: "6ada8fc7271c0612de99c755",
    description:
      "Adidas Tiro 24 training pants from the football-inspired sportswear collection.",
  },
  {
    id: "6ada8fc7271c0612de99c757",
    description:
      "Adidas Own the Run running shorts from the performance running collection.",
  },
  {
    id: "6ada8fc7271c0612de99c75c",
    description:
      "A casual Adidas cap from the Adicolor collection.",
  },
  {
    id: "6ada8fc7271c0612de99c75f",
    description:
      "Adidas Barricade tennis shoes, designed for tennis and court sports.",
  },
  {
    id: "6ada8fc7271c0612de99c760",
    description:
      "Grand Court 2.0 sneakers from Adidas' kids' footwear collection.",
  },
  {
    id: "6ae8c6f5f6007e9ec2b10b9c",
    description:
      "Sneakers listed under the Golen goose product name in your catalog.",
  },
  {
    id: "6ada8fc7271c0612de99c746",
    description:
      "Adidas Samba OG sneakers, an iconic Originals model with roots in football heritage.",
  },
  {
    id: "6ada8fc7271c0612de99c74e",
    description:
      "An Adidas Own the Run T-shirt from the performance running collection.",
  },
  {
    id: "6ada8fc7271c0612de99c74f",
    description:
      "An Adidas Originals T-shirt featuring the iconic Trefoil identity.",
  },
  {
    id: "6ada8fc7271c0612de99c750",
    description:
      "An Adidas Essentials fleece hoodie for casual everyday outfits.",
  },
  {
    id: "6ada8fc7271c0612de99c75d",
    description:
      "Harden Volume 9 signature basketball shoes from Adidas Basketball.",
  },
];

const run = async () => {
  try {
    await connectDB();

    console.log(`Total descriptions prepared: ${descriptions.length}`);

    const ids = descriptions.map((item) => item.id);

    if (new Set(ids).size !== ids.length) {
      throw new Error("Duplicate product IDs found in descriptions.");
    }

    const products = await Product.find({
      _id: { $in: ids },
    }).select("_id name description");

    const foundIds = new Set(
      products.map((product) => product._id.toString()),
    );

    const missingIds = ids.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      console.error("Some products were not found:");
      console.error(missingIds);
      throw new Error("Aborting: not all products were found.");
    }

    console.log("\nProducts ready for update:\n");

    for (const item of descriptions) {
      const product = products.find(
        (product) => product._id.toString() === item.id,
      );

      console.log(`${product.name}`);
      console.log(`New description: ${item.description}\n`);
    }

    if (!process.argv.includes("--apply")) {
      console.log("DRY RUN: No database changes were made.");
      console.log("Run with --apply to save these descriptions.");
      return;
    }

    const operations = descriptions.map((item) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { description: item.description } },
      },
    }));

    const result = await Product.bulkWrite(operations);

    console.log("\nDescriptions updated successfully!");
    console.log(`Matched: ${result.matchedCount}`);
    console.log(`Modified: ${result.modifiedCount}`);
  } catch (error) {
    console.error("Update failed:", error);
  } finally {
    await mongoose.disconnect();
  }
};

run();
