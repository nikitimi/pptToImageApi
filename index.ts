import express from "express"
import dotenv from "dotenv"
import FormData from "form-data"
import fs from "node:fs"
import multer from "multer"
import axios from "axios"
import approot from "app-root-path"
import { fromPath } from "pdf2pic"
import shelljs from "shelljs"

const upload = multer({ dest: "./uploads/" })
dotenv.config()
const app = express()
const PORT = process.env.PORT ?? 8000

app.get("/", (req, res) => {
  res.status(200).send("hello")
})

app.post("/uploadPpt", upload.single("uploaded_file"), async (req, res) => {
  shelljs.rm("--", `${approot}/images/*`)

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

    const pipeStream = response.data.pipe(fs.createWriteStream(filename))
    pipeStream.on("finish", async () => {
      const filepath = `${approot}/${filename}`
      const options = {
        density: 100,
        saveFilename: "untitled",
        savePath: "./images",
        format: "png",
        width: 1920,
        height: 1080,
      }
      const convert = fromPath(filepath, options)
      const result = await convert(req.body.page, {
        responseType: "image",
      })
      shelljs.rm("--", `${approot}/uploads/*`)
      shelljs.rm("--", `${approot}/result.pdf`)

      const pngResultPath = `${approot}/images/${result.name}`
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": fs.statSync(pngResultPath).size,
      })
      fs.createReadStream(pngResultPath).pipe(res)
    })
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
