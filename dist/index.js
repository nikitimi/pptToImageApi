"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const form_data_1 = __importDefault(require("form-data"));
const node_fs_1 = __importDefault(require("node:fs"));
const multer_1 = __importDefault(require("multer"));
const axios_1 = __importDefault(require("axios"));
const app_root_path_1 = __importDefault(require("app-root-path"));
const shelljs_1 = __importDefault(require("shelljs"));
const upload = (0, multer_1.default)({ dest: "./uploads/" });
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = (_a = process.env.PORT) !== null && _a !== void 0 ? _a : 8000;
app.get("/", (req, res) => {
    res.status(200).send("hello");
});
app.post("/uploadPpt", upload.single("uploaded_file"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    shelljs_1.default.rm("--", `${app_root_path_1.default}/images/*`);
    const filename = "result.pdf";
    const pageNumber = req.body.page;
    const formData = new form_data_1.default();
    formData.append("instructions", JSON.stringify({
        parts: [
            {
                file: "file",
            },
        ],
    }));
    try {
        if (req.file === undefined)
            return res.status(400).send("File not found");
        formData.append("file", node_fs_1.default.createReadStream(`${app_root_path_1.default}/${req.file.path}`));
        const response = yield axios_1.default.post("https://api.pspdfkit.com/build", formData, {
            headers: formData.getHeaders({
                Authorization: `Bearer ${process.env.LIVE_API_KEY}`,
            }),
            responseType: "stream",
        });
        const pipeStream = response.data.pipe(node_fs_1.default.createWriteStream(filename));
        pipeStream.on("finish", () => __awaiter(void 0, void 0, void 0, function* () {
            const pdfFilepath = `${app_root_path_1.default}/${filename}`;
            const pdfToImageFData = new form_data_1.default();
            pdfToImageFData.append("instructions", JSON.stringify({
                parts: [
                    {
                        file: "document",
                    },
                ],
                output: {
                    type: "image",
                    format: "png",
                    pages: {
                        start: parseInt(pageNumber, 10) - 1,
                        end: parseInt(pageNumber, 10) - 1,
                    },
                    width: 1920,
                },
            }));
            pdfToImageFData.append("document", node_fs_1.default.createReadStream(pdfFilepath));
            try {
                const webResult = yield axios_1.default.post("https://api.pspdfkit.com/build", pdfToImageFData, {
                    headers: pdfToImageFData.getHeaders({
                        Authorization: `Bearer ${process.env.LIVE_API_KEY}`,
                    }),
                    responseType: "stream",
                });
                const webpFilename = "image.png";
                const webpFilepath = `${app_root_path_1.default}/images/${webpFilename}`;
                const webpStream = node_fs_1.default.createWriteStream(webpFilepath);
                const pdfPipStream = webResult.data.pipe(webpStream);
                pdfPipStream.on("finish", () => {
                    // res.writeHead(200, {
                    //   "Content-Type": "image/png",
                    //   "Content-Length": fs.statSync(webpFilepath).size,
                    // })
                    // fs.createReadStream(webpFilepath).pipe(res)
                    res.status(200).sendFile(webpFilepath);
                    shelljs_1.default.rm("--", `${app_root_path_1.default}/uploads/*`);
                    shelljs_1.default.rm("--", `${app_root_path_1.default}/result.pdf`);
                });
            }
            catch (err) {
                console.log(err);
            }
        }));
    }
    catch (err) {
        console.log(err);
        res.status(400).send("error");
    }
}));
app
    .listen(PORT, () => {
    console.log(`Listening on http://localhost:${PORT}`);
})
    .on("error", (error) => {
    throw new Error(error.message);
});
