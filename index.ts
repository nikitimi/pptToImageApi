import express from "express"
import dotenv from "dotenv"
import FormData from "form-data"
import fs from "node:fs"
import multer from "multer"
import axios from "axios"
import approot from "app-root-path"
import shelljs from "shelljs"

const upload = multer({ dest: "./uploads/" })
dotenv.config()
const app = express()
const PORT = process.env.PORT ?? 8000

app.get("/", (req, res) => {
  res.status(200).send("hello")
})

app.post("/uploadPpt", upload.single("uploaded_file"), async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*")
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  )
  // shelljs.rm("--", `${approot}/images/*`)

  const filename = "result.pdf"
  const pageNumber = req.body.page
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
      const pdfFilepath = `${approot}/${filename}`
      const pdfToImageFData = new FormData()
      pdfToImageFData.append(
        "instructions",
        JSON.stringify({
          parts: [
            {
              file: "document",
            },
          ],
          output: {
            type: "image",
            format: "webp",
            pages: {
              start: parseInt(pageNumber, 10) - 1,
              end: parseInt(pageNumber, 10) - 1,
            },
            width: 1920,
          },
        })
      )
      pdfToImageFData.append("document", fs.createReadStream(pdfFilepath))

      try {
        const webResult = await axios.post(
          "https://api.pspdfkit.com/build",
          pdfToImageFData,
          {
            headers: pdfToImageFData.getHeaders({
              Authorization: `Bearer ${process.env.LIVE_API_KEY}`,
            }),
            responseType: "stream",
          }
        )
        const webpFilename = "image.webp"
        const webpFilepath = `${approot}/images/${webpFilename}`
        const webpStream = fs.createWriteStream(webpFilepath)
        const pdfPipStream = webResult.data.pipe(webpStream)

        pdfPipStream.on("finish", () => {
          res.status(200).sendFile(webpFilepath)

          shelljs.rm("--", `${approot}/uploads/*`)
          shelljs.rm("--", `${approot}/result.pdf`)
        })
      } catch (err) {
        console.log(err)
      }
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
