import express from "express";
import dotenv from "dotenv";
// import AWS from "aws-sdk";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import crypto from "crypto";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded());

const prisma = new PrismaClient();

function randomImageName(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

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
const upload = multer({ storage });

app.get("/", (_, res) => {
  return res.send("Server is runing....");
});

app.get("/posts", async (req, res) => {
  const posts = await prisma.user.findMany({});

  console.log("POSTS ==> \n", posts);

  for (const post of posts) {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: post.image,
    });

    const url = await getSignedUrl(s3, command);
    post.image = url;
  }

  res.json(posts);
});

app.post("/upload", upload.single("image"), async (req, res) => {
  // console.log("req.body ==> ", req.body);
  // console.log("req.file ==> ", req.file);

  const params = {
    Bucket: bucketName,
    Key: randomImageName(),
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
  };

  // if (!params.Key) {
  //   throw new Error("Key is required.");
  // }

  // console.log("Bucket:", params.Bucket);
  // console.log("Key:", params.Key);

  const command = new PutObjectCommand(params);
  // console.log("command : ", command);

  await s3.send(command);

  const post = await prisma.user.create({
    data: {
      image: params.Key,
      caption: req.body.caption,
    },
  });

  return res.json({
    success: true,
    post,
  });
});

app.delete("/posts/:id", async (req, res) => {
  const id = +req.params.id; // here the id comes as string, so + is used to convert id to Int

  const post = await prisma.user.findUnique({ where: { id } });

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: post.image,
  });

  await s3.send(command);

  await prisma.user.delete({ where: { id } });

  return res.json(post);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("server is running @", PORT);
});
