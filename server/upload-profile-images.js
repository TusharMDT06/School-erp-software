require("dotenv").config();
const mongoose = require("mongoose");
const cloudinary = require("./src/config/cloudinary");
const User = require("./src/models/User.model");

const PROFILES = [
  {
    name: "Super Admin",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
    publicId: "superadmin_rajesh",
  },
  {
    name: "Dr. Rajeshwar Sharma",
    url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80",
    publicId: "admin_principal_rajeshwar",
  },
  {
    name: "Manoj Goyal (Accountant)",
    url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=500&auto=format&fit=crop&q=80",
    publicId: "accountant_manoj",
  },
  {
    name: "Vikram Malhotra",
    url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&auto=format&fit=crop&q=80",
    publicId: "teacher_vikram",
  },
  {
    name: "Sunita Verma",
    url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&auto=format&fit=crop&q=80",
    publicId: "teacher_sunita",
  },
  {
    name: "Ananya Deshmukh",
    url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=500&auto=format&fit=crop&q=80",
    publicId: "teacher_ananya",
  },
  {
    name: "Rohan Kulkarni",
    url: "https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=500&auto=format&fit=crop&q=80",
    publicId: "teacher_rohan_k",
  },
  {
    name: "Suresh Sharma",
    url: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=500&auto=format&fit=crop&q=80",
    publicId: "parent_suresh",
  },
  {
    name: "Meenakshi Sengupta",
    url: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=500&auto=format&fit=crop&q=80",
    publicId: "parent_meenakshi",
  },
  {
    name: "Aarav Sharma",
    url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80",
    publicId: "student_aarav",
  },
  {
    name: "Diya Sengupta",
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80",
    publicId: "student_diya",
  },
  {
    name: "Rohan Mehta",
    url: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=500&auto=format&fit=crop&q=80",
    publicId: "student_rohan_m",
  },
  {
    name: "Ananya Iyer",
    url: "https://images.unsplash.com/photo-1520409364224-63400afe26e5?w=500&auto=format&fit=crop&q=80",
    publicId: "student_ananya_i",
  },
  {
    name: "Kabir Khan",
    url: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=500&auto=format&fit=crop&q=80",
    publicId: "student_kabir",
  },
  {
    name: "Pooja Hegde",
    url: "https://images.unsplash.com/photo-1528892952291-009c663ce843?w=500&auto=format&fit=crop&q=80",
    publicId: "student_pooja",
  },
  {
    name: "Siddharth Rao",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
    publicId: "student_siddharth",
  },
  {
    name: "Ishaan Verma",
    url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&auto=format&fit=crop&q=80",
    publicId: "student_ishaan",
  },
  {
    name: "Tanvi Saxena",
    url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&auto=format&fit=crop&q=80",
    publicId: "student_tanvi",
  },
];

async function run() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    console.log(`Starting Cloudinary upload and profile sync for ${PROFILES.length} users...`);

    for (const item of PROFILES) {
      try {
        console.log(`Uploading portrait for ${item.name}...`);
        const uploadRes = await cloudinary.uploader.upload(item.url, {
          folder: "school_erp/profiles",
          public_id: item.publicId,
          overwrite: true,
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face" },
          ],
        });

        const updated = await User.findOneAndUpdate(
          { name: item.name },
          { profileImage: uploadRes.secure_url },
          { new: true }
        );

        if (updated) {
          console.log(`✅ [${updated.role}] ${updated.name} -> ${uploadRes.secure_url}`);
        } else {
          console.log(`⚠️ User not found in DB with name: ${item.name}`);
        }
      } catch (uploadErr) {
        console.error(`❌ Error for ${item.name}:`, uploadErr.message);
      }
    }

    console.log("All profiles successfully updated with Cloudinary photos!");
  } catch (err) {
    console.error("Fatal error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

run();
