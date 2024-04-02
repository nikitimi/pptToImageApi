import express from "express"
import dotenv from "dotenv"
import FormData from "form-data"
import fs from "node:fs"
import multer from "multer"
import axios from "axios"
import approot from "app-root-path"
import { fromPath } from "pdf2pic"

const upload = multer({ dest: "./uploads/" })
dotenv.config()
const app = express()
const PORT = process.env.PORT ?? 8000

app.get("/", (req, res) => {
  res.status(200).send("hello")
})

app.post("/uploadPpt", upload.single("uploaded_file"), async (req, res) => {
  const filename = "result.pdf"
  const formData = new FormData()
  formData.append(
    "instructions",
    JSON.stringify({
      parts: [
        {
          file: "file",
        },
      ],
    })
  )
  try {
    if (req.file === undefined) return res.status(400).send("File not found")
    formData.append("file", fs.createReadStream(`${approot}/${req.file.path}`))
    const response = await axios.post(
      "https://api.pspdfkit.com/build",
      formData,
      {
        headers: formData.getHeaders({
          Authorization: `Bearer ${process.env.LIVE_API_KEY}`,
        }),
        responseType: "stream",
      }
    )

    await response.data.pipe(fs.createWriteStream(filename))
    const filepath = `${approot}/${filename}`
    const options = {
      density: 100,
      saveFilename: "untitled",
      savePath: "./images",
      format: "png",
      width: 600,
      height: 600,
    }
    setTimeout(() => console.log("times up!"), 1000)
    const convert = fromPath(filepath, options)
    const pageToConvertAsImage = 1

    const result = await convert(pageToConvertAsImage, {
      responseType: "image",
    })
    console.log({ result })
    res.status(200).send(filepath)
  } catch (err) {
    console.log(err)
    res.status(400).send("error")
  }
})

app
  .listen(PORT, () => {
    console.log(`Listening on http://localhost:${PORT}`)
  })
  .on("error", (error) => {
    throw new Error(error.message)
  })
