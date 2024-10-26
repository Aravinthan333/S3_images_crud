import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

const reandomString = async () => crypto.randomBytes(32).toString("hex");

const prisma = new PrismaClient();

const PORT = process.env.PORT;

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const storage = multer.memoryStorage();
const upload = multer({ storage }).single("image");

// Home Page
app.get("/", (_, res) => {
  return res.status(200).json({
    success: true,
    message: "Server is running",
  });
});

// Create Image
app.post("/posts", upload, async (req, res) => {
  const caption = req.body.caption;
  const image = req.file;
  //   console.log(image.mimetype);

  //   const params = {
  //     Bucket: bucketName,
  //     Key: `images/${await reandomString()}`,
  //     Body: image.buffer,
  //     ContentType: image.mimetype,
  //   };

  //   const command = new PutObjectCommand(params);

  //   await s3.send(command);

  //   const post = await prisma.user.create({
  //     data: {
  //       caption,
  //       image: params.Key,
  //     },
  //   });

  const params = {
    Bucket: bucketName,
    Key: `images/${reandomString()}`,
    Body: image.buffer,
    ContentType: image.mimetype,
  };

  const command = new PutObjectCommand(params);

  await s3.send(command);

  const post = await prisma.user.create({
    data: {
      caption,
      image: params.Key,
    },
  });

  return res.status(201).json({
    success: true,
    message: "Image uploaded successfully",
    post,
  });
});

// Get All Images
app.get("/posts", async (req, res) => {
  let posts = await prisma.user.findMany({ orderBy: [{ id: "desc" }] });

  //   console.log("POSTS ==> \n", posts);

  // for (const post of posts) {
  //   const command = new GetObjectCommand({
  //     Bucket: bucketName,
  //     Key: post.image,
  //   });

  //     const url = await getSignedUrl(s3, command);
  //     post.image = url;
  //   }

  const newPosts = posts.map(async (post) => {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: post.image,
    });

    const url = await getSignedUrl(s3, command);
    return { ...post, image: url };
  });

  posts = await Promise.all(newPosts);

  console.log("newposts :", posts);
  return res.status(200).json({
    success: true,
    message: "All posts retrieved successfully",
    posts,
  });
});

app.delete("/posts/:id", async (req, res) => {
  const id = +req.params.id;
  const post = await prisma.user.findUnique({ where: { id } });

  const params = {
    Bucket: bucketName,
    Key: post.image,
  };

  const command = new DeleteObjectCommand(params);

  await s3.send(command);

  await prisma.user.delete({ where: { id } });
  return res.json({
    success: true,
    message: "Post deleted successfully",
    post,
  });
});

// Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
